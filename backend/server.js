import express from 'express';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import cron from 'node-cron';
import dotenv from 'dotenv';

import pool, { initDatabase } from './db.js';
import { extractTextFromPdf } from './services/pdfExtractor.js';
import { parseResume } from './services/resumeParser.js';
import { searchJobs } from './services/jobSearch.js';
import { matchJobs } from './services/jobMatcher.js';
import { sendJobMatchEmail } from './services/emailSender.js';
import { createGCashPayment, checkPaymentStatus, createPaymentFromSource } from './services/payment.js';
import passport from 'passport';
import session from 'express-session';
import { configureAuth } from './services/auth.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

dotenv.config(); // Force restart 2

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// CORS - make origin flexible for trailing slashes
const frontendOrigin = (process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/$/, '');
const backendOrigin = (process.env.BACKEND_URL || 'http://localhost:3001').replace(/\/$/, '');
console.log('CORS Origins:', { frontendOrigin, backendOrigin });

app.use(cors({
    origin: [frontendOrigin, backendOrigin],
    credentials: true
}));
app.use(express.json());

// Trust proxy for Render (required for secure cookies behind reverse proxy)
app.set('trust proxy', 1);

// Session Config
const isProduction = process.env.NODE_ENV === 'production' || process.env.RENDER || process.env.BACKEND_URL?.includes('render.com');
app.use(session({
    secret: process.env.SESSION_SECRET || 'secret',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: isProduction, // true for HTTPS in production
        sameSite: isProduction ? 'none' : 'lax', // 'none' for cross-origin in production
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
}));

// Passport Config
configureAuth();
app.use(passport.initialize());
app.use(passport.session());

// JWT Secret
const JWT_SECRET = process.env.SESSION_SECRET || 'jwt-secret-key';

// Generate JWT token for user
const generateToken = (user) => {
    return jwt.sign(
        { id: user.id, email: user.email, display_name: user.display_name, profile_picture: user.profile_picture },
        JWT_SECRET,
        { expiresIn: '7d' }
    );
};

// Verify JWT token middleware
const verifyToken = async (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        try {
            const decoded = jwt.verify(token, JWT_SECRET);
            // Fetch fresh user data from database
            const result = await pool.query('SELECT * FROM settings WHERE email = $1', [decoded.email]);
            if (result.rows.length > 0) {
                req.user = result.rows[0];
                req.isTokenAuth = true;
            }
        } catch (err) {
            console.log('JWT verification failed:', err.message);
        }
    }
    next();
};

// Apply token verification middleware
app.use(verifyToken);

// Authentication check - ONLY use JWT for cross-origin (session cookies unreliable)
const isUserAuthenticated = (req) => {
    // In production, only trust JWT tokens (session cookies don't work cross-origin)
    if (isProduction) {
        return !!req.isTokenAuth;
    }
    // In development, accept both session and JWT
    return req.isAuthenticated() || req.isTokenAuth;
};

// Authentication middleware
const requireAuth = (req, res, next) => {
    if (!isUserAuthenticated(req)) {
        return res.status(401).json({ error: 'Authentication required' });
    }
    next();
};

// File upload config
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path.join(__dirname, 'uploads'));
    },
    filename: (req, file, cb) => {
        cb(null, `resume-${Date.now()}.pdf`);
    }
});
const upload = multer({ storage });

// Create uploads folder if not exists
import fs from 'fs';
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

// Scheduler reference
let schedulerTask = null;

// Progress tracking
let workflowProgress = {
    running: false,
    current: 0,
    total: 0,
    status: '',
    cancelled: false
};

// Get progress
app.get('/api/progress', (req, res) => {
    res.json(workflowProgress);
});

// Cancel workflow
app.post('/api/cancel', (req, res) => {
    if (workflowProgress.running) {
        workflowProgress.cancelled = true;
        workflowProgress.status = 'Cancelling...';
        res.json({ success: true, message: 'Cancel requested' });
    } else {
        res.json({ success: false, message: 'No workflow running' });
    }
});

// DEBUG: Test email endpoint (requires authentication)
app.post('/api/test-email', requireAuth, async (req, res) => {
    console.log('=== EMAIL DEBUG START ===');
    console.log('GMAIL_USER:', process.env.GMAIL_USER);
    console.log('GMAIL_APP_PASSWORD exists:', !!process.env.GMAIL_APP_PASSWORD);
    console.log('GMAIL_APP_PASSWORD length:', process.env.GMAIL_APP_PASSWORD?.length);

    try {
        const settingsResult = await pool.query('SELECT * FROM settings ORDER BY id DESC LIMIT 1');
        const settings = settingsResult.rows[0];
        console.log('Email recipient:', settings?.email);

        // Test with a simple email
        const testJobs = [{
            job_title: 'Test Job',
            company: 'Test Company',
            employment_type: 'Full-time',
            remote: 'Yes',
            salary: '$100,000',
            qualifications: 'Test qualifications',
            match_score: 5,
            match_reason: 'This is a test email',
            apply_link: '<a href="https://example.com">Apply</a>'
        }];

        await sendJobMatchEmail(settings.email, testJobs, 0);
        console.log('=== EMAIL SENT SUCCESSFULLY ===');
        res.json({ success: true, message: `Test email sent to ${settings.email}!` });
    } catch (error) {
        console.error('=== EMAIL ERROR ===');
        console.error('Error name:', error.name);
        console.error('Error message:', error.message);
        console.error('Full error:', error);
        res.status(500).json({ success: false, error: error.message, details: error.toString() });
    }
});

// Get settings
app.get('/api/settings', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM settings ORDER BY id DESC LIMIT 1');
        res.json(result.rows[0] || {});
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Update settings
app.post('/api/settings', async (req, res) => {
    const { email, job_query, expected_salary, match_threshold, job_limit, auto_run } = req.body;

    try {
        const result = await pool.query(`
      UPDATE settings 
      SET email = $1, job_query = $2, expected_salary = $3, match_threshold = $4, job_limit = $5, auto_run = $6, updated_at = NOW()
      WHERE id = (SELECT id FROM settings ORDER BY id DESC LIMIT 1)
      RETURNING *
    `, [email, job_query, expected_salary, match_threshold, job_limit || 30, auto_run]);

        // Update scheduler based on auto_run setting
        if (auto_run && !schedulerTask) {
            startScheduler();
        } else if (!auto_run && schedulerTask) {
            stopScheduler();
        }

        res.json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Upload resume
app.post('/api/upload', upload.single('resume'), async (req, res) => {
    try {
        console.log('Upload request received');

        if (!req.file) {
            console.log('No file in request');
            return res.status(400).json({ error: 'No file uploaded' });
        }

        // Get user_id if authenticated
        const userId = isUserAuthenticated(req) ? req.user.id : null;

        console.log('File received:', req.file.filename);
        const filePath = req.file.path;
        console.log('File path:', filePath);

        console.log('Extracting text from PDF...');
        const rawText = await extractTextFromPdf(filePath);
        console.log('PDF text extracted, length:', rawText.length);

        console.log('Parsing resume with AI...');
        const parsedData = await parseResume(rawText);
        console.log('Resume parsed successfully');

        // Save to database with user_id
        await pool.query(`
      INSERT INTO resumes (user_id, filename, raw_text, parsed_data)
      VALUES ($1, $2, $3, $4)
    `, [userId, req.file.filename, rawText, JSON.stringify({ parsed: parsedData })]);

        console.log('Resume saved to database');

        res.json({
            success: true,
            filename: req.file.filename,
            preview: rawText.substring(0, 500) + '...'
        });
    } catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get latest resume (for authenticated user only)
app.get('/api/resume', async (req, res) => {
    try {
        // Only return resume if user is authenticated
        if (!isUserAuthenticated(req)) {
            return res.json(null);
        }
        const userId = req.user.id;
        const result = await pool.query(
            'SELECT * FROM resumes WHERE user_id = $1 ORDER BY id DESC LIMIT 1',
            [userId]
        );
        res.json(result.rows[0] || null);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Run workflow manually
app.post('/api/run', async (req, res) => {
    try {
        const runResult = await runWorkflow();
        res.json(runResult);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get latest results (for authenticated user only)
app.get('/api/results', async (req, res) => {
    try {
        // Only return results if user is authenticated
        if (!isUserAuthenticated(req)) {
            return res.json([]);
        }
        const userId = req.user.id;
        const result = await pool.query(`
      SELECT * FROM job_matches 
      WHERE user_id = $1
      ORDER BY created_at DESC, match_score DESC 
      LIMIT 50
    `, [userId]);
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get run history
app.get('/api/history', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM run_history ORDER BY created_at DESC LIMIT 10');
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ============== WORKFLOW LOGIC ==============

async function runWorkflow() {
    console.log('Starting workflow...');

    // Reset progress
    workflowProgress = {
        running: true,
        current: 0,
        total: 0,
        status: 'Starting...',
        cancelled: false
    };

    try {
        // Get settings
        workflowProgress.status = 'Loading settings...';
        const settingsResult = await pool.query('SELECT * FROM settings ORDER BY id DESC LIMIT 1');
        const settings = settingsResult.rows[0];

        if (!settings) {
            throw new Error('No settings found');
        }

        // Get latest resume
        workflowProgress.status = 'Loading resume...';
        const resumeResult = await pool.query('SELECT * FROM resumes ORDER BY id DESC LIMIT 1');
        const resume = resumeResult.rows[0];

        if (!resume) {
            throw new Error('No resume uploaded');
        }

        const parsedResume = resume.parsed_data?.parsed || resume.raw_text;

        // Search for jobs
        workflowProgress.status = 'Searching for jobs...';
        console.log(`Searching for: ${settings.job_query}`);
        const jobs = await searchJobs(settings.job_query, 10);
        console.log(`Found ${jobs.length} jobs`);

        // Match jobs (limited by job_limit setting)
        const jobLimit = settings.job_limit || 30;
        workflowProgress.total = Math.min(jobs.length, jobLimit);
        console.log(`Matching up to ${jobLimit} jobs...`);

        // Progress callback
        const progressCallback = (current, total, status) => {
            workflowProgress.current = current;
            workflowProgress.total = total;
            workflowProgress.status = status;
        };

        // Cancel check
        const cancelCheck = () => workflowProgress.cancelled;

        const matchedJobs = await matchJobs(jobs, parsedResume, settings.expected_salary, jobLimit, progressCallback, cancelCheck);

        // Check if cancelled
        if (workflowProgress.cancelled) {
            workflowProgress.running = false;
            workflowProgress.status = 'Cancelled';
            return { success: false, message: 'Workflow cancelled', cancelled: true };
        }

        console.log(`Matched ${matchedJobs.length} jobs`);

        // Filter by threshold
        workflowProgress.status = 'Filtering results...';
        const goodMatches = matchedJobs.filter(j => j.match_score >= settings.match_threshold);
        console.log(`${goodMatches.length} jobs meet threshold`);

        // Clear old matches and save new ones
        await pool.query('DELETE FROM job_matches');

        for (const job of matchedJobs) {
            await pool.query(`
        INSERT INTO job_matches 
        (job_title, company, employment_type, remote, salary, benefits, responsibilities, qualifications, apply_link, match_score, match_reason)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      `, [
                job.job_title, job.company, job.employment_type, job.remote,
                job.salary, job.benefits, job.responsibilities, job.qualifications,
                job.apply_link, job.match_score, job.match_reason
            ]);
        }

        // Send email only if we have jobs meeting the threshold
        let emailSent = false;
        if (goodMatches.length > 0) {
            console.log(`Attempting to send email to ${settings.email} with ${goodMatches.length} jobs meeting threshold...`);
            try {
                await sendJobMatchEmail(settings.email, goodMatches, settings.match_threshold);
                emailSent = true;
                console.log(`Email sent successfully to ${settings.email}!`);
            } catch (emailError) {
                console.error('Email failed:', emailError.message);
                console.error('Full error:', emailError);
            }
        } else {
            console.log(`No jobs meet threshold of ${settings.match_threshold} - email not sent`);
        }

        // Log run history
        await pool.query(`
      INSERT INTO run_history (status, jobs_found, jobs_matched, email_sent)
      VALUES ($1, $2, $3, $4)
    `, ['success', jobs.length, goodMatches.length, emailSent]);

        // Reset progress
        workflowProgress.running = false;
        workflowProgress.status = 'Complete';

        return {
            success: true,
            jobsFound: jobs.length,
            jobsMatched: goodMatches.length,
            emailSent,
            message: emailSent
                ? `Email sent! ${goodMatches.length}/${matchedJobs.length} jobs matched (score ≥ ${settings.match_threshold})`
                : `Done. ${goodMatches.length}/${matchedJobs.length} jobs match threshold of ${settings.match_threshold}. No email sent.`
        };

    } catch (error) {
        console.error('Workflow error:', error.message);

        // Reset progress on error
        workflowProgress.running = false;
        workflowProgress.status = 'Error: ' + error.message;

        await pool.query(`
      INSERT INTO run_history (status, jobs_found, jobs_matched, email_sent, error_message)
      VALUES ($1, $2, $3, $4, $5)
    `, ['error', 0, 0, false, error.message]);

        throw error;
    }
}

// ============== SCHEDULER ==============

function startScheduler() {
    if (schedulerTask) return;

    // Run every hour
    schedulerTask = cron.schedule('0 * * * *', async () => {
        console.log('Scheduled run starting...');
        try {
            await runWorkflow();
        } catch (error) {
            console.error('Scheduled run failed:', error.message);
        }
    });

    console.log('Scheduler started (hourly)');
}

function stopScheduler() {
    if (schedulerTask) {
        schedulerTask.stop();
        schedulerTask = null;
        console.log('Scheduler stopped');
    }
}


// ============== AUTH ENDPOINTS ==============

app.get('/auth/google', (req, res, next) => {
    const state = req.query.returnTo ? Buffer.from(JSON.stringify({ returnTo: req.query.returnTo })).toString('base64') : undefined;
    passport.authenticate('google', { scope: ['profile', 'email'], state })(req, res, next);
});

app.get('/auth/google/callback',
    passport.authenticate('google', { failureRedirect: process.env.FRONTEND_URL || 'http://localhost:5173' }),
    (req, res) => {
        // Debug: Log session info after successful auth
        console.log('=== GOOGLE OAUTH CALLBACK ===');
        console.log('User:', req.user?.email);

        // Generate JWT token for the user
        const token = generateToken(req.user);
        console.log('JWT Token generated for user:', req.user?.email);

        // Successful authentication
        const frontendUrl = (process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/$/, '');

        // Include token in redirect URL
        let redirectUrl = `${frontendUrl}?login=success&token=${token}`;

        if (req.query.state) {
            try {
                const state = JSON.parse(Buffer.from(req.query.state, 'base64').toString());
                if (state.returnTo === 'upgrade') {
                    redirectUrl += '&action=upgrade';
                }
            } catch (e) {
                console.error('Failed to parse state', e);
            }
        }

        console.log('Redirecting to frontend with token');
        res.redirect(redirectUrl);
    }
);

app.get('/auth/logout', (req, res, next) => {
    req.logout((err) => {
        if (err) { return next(err); }
        const frontendUrl = (process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/$/, '');
        res.redirect(`${frontendUrl}?logout=true`);
    });
});

// Local Login
app.post('/auth/login', (req, res, next) => {
    passport.authenticate('local', (err, user, info) => {
        if (err) return next(err);
        if (!user) return res.status(400).json({ error: info.message });
        req.logIn(user, (err) => {
            if (err) return next(err);
            return res.json({ success: true, user });
        });
    })(req, res, next);
});

// Local Signup

app.post('/auth/signup', async (req, res) => {
    const { email, password, displayName } = req.body;
    try {
        const existingUser = await pool.query('SELECT * FROM settings WHERE email = $1', [email]);
        if (existingUser.rows.length > 0) {
            return res.status(400).json({ error: 'Email already exists' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = await pool.query(`
            INSERT INTO settings (email, password_hash, display_name, job_limit)
            VALUES ($1, $2, $3, 50)
            RETURNING *
        `, [email, hashedPassword, displayName]);

        req.logIn(newUser.rows[0], (err) => {
            if (err) return res.status(500).json({ error: 'Login failed after signup' });
            res.json({ success: true, user: newUser.rows[0] });
        });
    } catch (error) {
        console.error('Signup error:', error);
        res.status(500).json({ error: 'Signup failed' });
    }
});

app.get('/api/user', (req, res) => {
    // Prevent caching
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');

    console.log('GET /api/user - isTokenAuth:', req.isTokenAuth);
    console.log('GET /api/user - isSessionAuth:', req.isAuthenticated());
    console.log('GET /api/user - req.user:', req.user?.email);

    if (isUserAuthenticated(req)) {
        res.json(req.user);
    } else {
        res.json(null);
    }
});

// Get settings (returns defaults for non-authenticated users)
app.get('/api/settings', async (req, res) => {
    try {
        // Return default empty values for non-authenticated users
        if (!isUserAuthenticated(req)) {
            return res.json({
                email: '',
                job_query: '',
                expected_salary: '',
                match_threshold: 7,
                job_limit: 50,
                auto_run: false
            });
        }

        const email = req.user.email;
        const result = await pool.query('SELECT * FROM settings WHERE email = $1', [email]);
        res.json(result.rows[0] || {
            email: email,
            job_query: 'Software Engineer',
            expected_salary: 100000,
            match_threshold: 7,
            job_limit: 50,
            auto_run: false
        });
    } catch (error) {
        console.error('Fetch settings error:', error);
        res.status(500).json({ error: 'Failed to fetch settings' });
    }
});


// Get subscription status
app.get('/api/subscription', async (req, res) => {
    try {
        // If not logged in, return free
        if (!isUserAuthenticated(req)) {
            return res.json({ status: 'free', limit: parseInt(process.env.FREE_JOB_LIMIT) || 50 });
        }

        const email = req.user.email;

        const sub = await pool.query('SELECT * FROM subscriptions WHERE email = $1', [email]);

        if (sub.rows.length === 0 || sub.rows[0].status !== 'pro') {
            return res.json({ status: 'free', limit: parseInt(process.env.FREE_JOB_LIMIT) || 50 });
        }

        const subscription = sub.rows[0];
        const isExpired = subscription.expires_at && new Date(subscription.expires_at) < new Date();

        if (isExpired) {
            return res.json({ status: 'expired', limit: parseInt(process.env.FREE_JOB_LIMIT) || 50 });
        }

        return res.json({
            status: 'pro',
            limit: parseInt(process.env.PRO_JOB_LIMIT) || 500,
            expiresAt: subscription.expires_at
        });
    } catch (error) {
        console.error('Subscription check error:', error);
        res.json({ status: 'free', limit: parseInt(process.env.FREE_JOB_LIMIT) || 50 });
    }
});

// Create GCash payment for Pro subscription
app.post('/api/subscribe', async (req, res) => {
    try {
        const settings = await pool.query('SELECT email FROM settings ORDER BY id DESC LIMIT 1');
        const email = settings.rows[0]?.email;

        if (!email) {
            return res.status(400).json({ error: 'Please set your email first' });
        }

        const baseUrl = req.headers.origin || `http://localhost:${process.env.PORT || 3001}`;
        const successUrl = `${baseUrl}?payment=success`;
        const failedUrl = `${baseUrl}?payment=failed`;

        const payment = await createGCashPayment(email, successUrl, failedUrl);

        // Store pending subscription
        await pool.query(`
            INSERT INTO subscriptions (email, status, source_id) 
            VALUES ($1, 'pending', $2)
            ON CONFLICT (email) DO UPDATE SET 
                status = 'pending',
                source_id = $2,
                updated_at = NOW()
        `, [email, payment.id]);

        res.json({ checkoutUrl: payment.checkoutUrl, sourceId: payment.id });
    } catch (error) {
        console.error('Subscribe error:', error);
        res.status(500).json({ error: 'Failed to create payment' });
    }
});

// Verify payment after redirect
app.post('/api/verify-payment', async (req, res) => {
    try {
        const settings = await pool.query('SELECT email FROM settings ORDER BY id DESC LIMIT 1');
        const email = settings.rows[0]?.email;

        if (!email) {
            return res.status(400).json({ error: 'No email found' });
        }

        const sub = await pool.query('SELECT source_id FROM subscriptions WHERE email = $1', [email]);

        if (sub.rows.length === 0 || !sub.rows[0].source_id) {
            return res.status(400).json({ error: 'No pending payment found' });
        }

        const sourceId = sub.rows[0].source_id;
        const status = await checkPaymentStatus(sourceId);

        if (status.status === 'chargeable') {
            // Complete the payment
            const payment = await createPaymentFromSource(sourceId, status.amount);

            // Activate Pro subscription for 30 days
            const expiresAt = new Date();
            expiresAt.setDate(expiresAt.getDate() + 30);

            await pool.query(`
                UPDATE subscriptions SET 
                    status = 'pro',
                    payment_id = $1,
                    expires_at = $2,
                    updated_at = NOW()
                WHERE email = $3
            `, [payment.id, expiresAt, email]);

            return res.json({ success: true, status: 'pro', expiresAt });
        } else if (status.status === 'paid') {
            const existingSub = await pool.query('SELECT expires_at FROM subscriptions WHERE email = $1', [email]);
            return res.json({ success: true, status: 'pro', expiresAt: existingSub.rows[0]?.expires_at });
        } else {
            return res.json({ success: false, status: status.status });
        }
    } catch (error) {
        console.error('Verify payment error:', error);
        res.status(500).json({ error: 'Failed to verify payment' });
    }
});

// ============== START SERVER ==============

async function start() {
    try {
        await initDatabase();

        // Check if auto_run is enabled
        const settings = await pool.query('SELECT auto_run FROM settings ORDER BY id DESC LIMIT 1');
        if (settings.rows[0]?.auto_run) {
            startScheduler();
        }

        app.listen(PORT, () => {
            console.log(`Server running on http://localhost:${PORT}`);
        });
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
}

start();
