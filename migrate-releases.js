import Database from 'better-sqlite3';
const db = new Database('data/registry.db');

try {
    db.transaction(() => {
        db.exec(`
            CREATE TABLE releases_new (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                release_number VARCHAR(50) UNIQUE NOT NULL,
                description TEXT,
                notes TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                created_by VARCHAR(255),
                closed_at TIMESTAMP,
                closed_by VARCHAR(255),
                status VARCHAR(20) DEFAULT 'open' CHECK(status IN ('open', 'closed', 'archived'))
            );

            INSERT INTO releases_new (id, release_number, notes, created_at, created_by, status)
            SELECT id, release_number, notes, created_at, created_by, 
                   CASE WHEN status = 'active' THEN 'open' ELSE status END
            FROM releases;

            DROP TABLE releases;
            ALTER TABLE releases_new RENAME TO releases;
        `);
    })();
    console.log('Migration successful: table releases updated with new status constraints.');
} catch (e) {
    console.error('Migration failed:', e.message);
} finally {
    db.close();
}
