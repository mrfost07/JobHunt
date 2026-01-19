import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Strategy as LocalStrategy } from 'passport-local';
import bcrypt from 'bcrypt';
import pool from '../db.js';

export function configureAuth() {
    // Google Strategy
    passport.use(new GoogleStrategy({
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: `${process.env.BACKEND_URL || 'http://localhost:3001'}/auth/google/callback`,
        passReqToCallback: true
    },
        async (req, accessToken, refreshToken, profile, done) => {
            try {
                const email = profile.emails[0].value;
                const googleId = profile.id;
                const displayName = profile.displayName;
                const photo = profile.photos && profile.photos[0] ? profile.photos[0].value : null;

                // Check if user exists
                const existingUser = await pool.query('SELECT * FROM settings WHERE email = $1', [email]);

                if (existingUser.rows.length > 0) {
                    // Update existing user with google info
                    await pool.query(`
                    UPDATE settings 
                    SET google_id = $1, display_name = $2, profile_picture = $3, updated_at = NOW()
                    WHERE email = $4
                `, [googleId, displayName, photo, email]);
                    // Remove sensitive fields before returning
                    const { password_hash, ...safeUser } = existingUser.rows[0];
                    return done(null, safeUser);
                } else {
                    // Create new user
                    const newUser = await pool.query(`
                    INSERT INTO settings (email, google_id, display_name, profile_picture, job_limit)
                    VALUES ($1, $2, $3, $4, 50)
                    RETURNING *
                `, [email, googleId, displayName, photo]);
                    const { password_hash: _, ...safeNewUser } = newUser.rows[0];
                    return done(null, safeNewUser);
                }
            } catch (error) {
                return done(error, null);
            }
        }));

    // Local Strategy
    passport.use(new LocalStrategy({
        usernameField: 'email',
        passwordField: 'password'
    }, async (email, password, done) => {
        try {
            const user = await pool.query('SELECT * FROM settings WHERE email = $1', [email]);
            if (user.rows.length === 0) {
                return done(null, false, { message: 'Incorrect email.' });
            }

            if (!user.rows[0].password_hash) {
                return done(null, false, { message: 'Please sign in with Google.' });
            }

            const match = await bcrypt.compare(password, user.rows[0].password_hash);
            if (!match) {
                return done(null, false, { message: 'Incorrect password.' });
            }

            // Remove sensitive fields
            const { password_hash, ...safeUser } = user.rows[0];
            return done(null, safeUser);
        } catch (error) {
            return done(error);
        }
    }));

    passport.serializeUser((user, done) => {
        done(null, user.email);
    });

    passport.deserializeUser(async (email, done) => {
        try {
            const user = await pool.query('SELECT * FROM settings WHERE email = $1', [email]);
            if (user.rows.length > 0) {
                done(null, user.rows[0]);
            } else {
                done(new Error('User not found'), null);
            }
        } catch (error) {
            done(error, null);
        }
    });
}
