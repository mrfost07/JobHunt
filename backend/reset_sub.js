import pool from './db.js';

async function reset() {
    try {
        await pool.query("UPDATE subscriptions SET status = 'free', expires_at = NULL");
        await pool.query("UPDATE settings SET job_limit = 50");
        console.log('Reset complete: All subscriptions set to free, limits reset.');
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

reset();
