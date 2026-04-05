const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, 'photos.db'));

db.exec(`
  CREATE TABLE IF NOT EXISTS photos (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    filename    TEXT    NOT NULL,
    uploader    TEXT    NOT NULL,
    caption     TEXT    DEFAULT '',
    uploaded_at TEXT    DEFAULT (datetime('now'))
  )
`);

const insertPhoto = db.prepare(
  'INSERT INTO photos (filename, uploader, caption) VALUES (?, ?, ?)'
);

const getAllPhotos = db.prepare(
  'SELECT * FROM photos ORDER BY uploaded_at DESC'
);

const deletePhoto = db.prepare('DELETE FROM photos WHERE id = ?');

module.exports = { insertPhoto, getAllPhotos, deletePhoto };
