import Database from 'better-sqlite3';
const db = new Database('data/registry.db');

try {
    // Migration: Update status column and data
    db.exec(`
        UPDATE releases SET status = 'open' WHERE status = 'active';
        UPDATE releases SET status = 'open' WHERE status IS NULL;
    `);
    console.log('Status updated to "open"');
} catch (e) {
    console.error(e.message);
}

db.close();
