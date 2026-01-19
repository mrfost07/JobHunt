import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// Initialize database tables
export async function initDatabase() {
  const client = await pool.connect();
  try {
    // Settings table
    await client.query(`
      CREATE TABLE IF NOT EXISTS settings (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) NOT NULL,
        google_id VARCHAR(255),
        display_name VARCHAR(255),
        profile_picture TEXT,
        password_hash VARCHAR(255),
        job_query VARCHAR(255) DEFAULT 'Software Engineer',
        expected_salary INTEGER DEFAULT 100000,
        match_threshold INTEGER DEFAULT 7,
        job_limit INTEGER DEFAULT 30,
        auto_run BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);


    // Add missing columns if they don't exist
    await client.query(`
      ALTER TABLE settings ADD COLUMN IF NOT EXISTS job_limit INTEGER DEFAULT 30;
      ALTER TABLE settings ADD COLUMN IF NOT EXISTS google_id VARCHAR(255);
      ALTER TABLE settings ADD COLUMN IF NOT EXISTS display_name VARCHAR(255);
      ALTER TABLE settings ADD COLUMN IF NOT EXISTS profile_picture TEXT;
      ALTER TABLE settings ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255);
    `);

    // Resumes table
    await client.query(`
      CREATE TABLE IF NOT EXISTS resumes (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES settings(id),
        filename VARCHAR(255),
        raw_text TEXT,
        parsed_data JSONB,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Add user_id column to resumes if not exists
    await client.query(`
      ALTER TABLE resumes ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES settings(id)
    `);

    // Job matches table
    await client.query(`
      CREATE TABLE IF NOT EXISTS job_matches (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES settings(id),
        job_title TEXT,
        company TEXT,
        employment_type VARCHAR(100),
        remote VARCHAR(50),
        salary TEXT,
        benefits TEXT,
        responsibilities TEXT,
        qualifications TEXT,
        apply_link TEXT,
        match_score INTEGER,
        match_reason TEXT,
        email_sent BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Add user_id column to job_matches if not exists
    await client.query(`
      ALTER TABLE job_matches ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES settings(id)
    `);

    // Alter existing columns to TEXT if they exist as VARCHAR
    await client.query(`
      ALTER TABLE job_matches 
      ALTER COLUMN job_title TYPE TEXT,
      ALTER COLUMN company TYPE TEXT,
      ALTER COLUMN salary TYPE TEXT
    `).catch(() => { });

    // Run history table
    await client.query(`
      CREATE TABLE IF NOT EXISTS run_history (
        id SERIAL PRIMARY KEY,
        status VARCHAR(50),
        jobs_found INTEGER,
        jobs_matched INTEGER,
        email_sent BOOLEAN,
        error_message TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Subscriptions table
    await client.query(`
      CREATE TABLE IF NOT EXISTS subscriptions (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE,
        status VARCHAR(50) DEFAULT 'free',
        payment_id VARCHAR(255),
        source_id VARCHAR(255),
        expires_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Insert default settings if none exist
    const settings = await client.query('SELECT * FROM settings LIMIT 1');
    if (settings.rows.length === 0) {
      const defaultEmail = process.env.GMAIL_USER || 'user@example.com';
      await client.query(`
        INSERT INTO settings (email, job_query, expected_salary, match_threshold, auto_run)
        VALUES ($1, 'Software Engineer', 100000, 7, false)
      `, [defaultEmail]);
    }

    console.log('Database initialized successfully');
  } finally {
    client.release();
  }
}

export default pool;
