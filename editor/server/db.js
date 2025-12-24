const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'zen.db');
const db = new Database(dbPath);

// Create the posts table if it doesn't exist
db.exec(`
  CREATE TABLE IF NOT EXISTS posts (
    id TEXT PRIMARY KEY,
    title TEXT,
    content BLOB,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

console.log('Database initialized at', dbPath);

module.exports = db;
