import Database from 'better-sqlite3';
import path from 'path';

const db = new Database('data/registry.db');

const updates = [
    'ALTER TABLE releases ADD COLUMN description TEXT',
    'ALTER TABLE releases ADD COLUMN closed_at TIMESTAMP',
    'ALTER TABLE releases ADD COLUMN closed_by VARCHAR(255)',
    "UPDATE releases SET status = 'open' WHERE status = 'active'",
    "UPDATE releases SET status = 'open' WHERE status IS NULL"
];

updates.forEach(sql => {
    try {
        db.exec(sql);
        console.log(`Executed: ${sql}`);
    } catch (e) {
        console.log(`Skipped (likely exists): ${sql}`);
    }
});

db.close();
