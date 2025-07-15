const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const db = new sqlite3.Database(path.join(__dirname, 'db.sqlite'));

// Initialize tables
db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      name TEXT PRIMARY KEY,
      project TEXT
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS task_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT,
      project TEXT,
      task TEXT,
      status TEXT,
      timestamp TEXT
    )
  `);
});

module.exports = {
  db,

  addUser(name, project) {
    return new Promise((resolve, reject) => {
      db.run(
        `INSERT OR IGNORE INTO users (name, project) VALUES (?, ?)`,
        [name, project],
        function (err) {
          if (err) return reject(err);
          resolve();
        }
      );
    });
  },

  deleteUser(name) {
    return new Promise((resolve, reject) => {
      db.run(`DELETE FROM users WHERE name = ?`, [name], function (err) {
        if (err) return reject(err);
        db.run(`DELETE FROM task_logs WHERE name = ?`, [name], function (err2) {
          if (err2) return reject(err2);
          resolve();
        });
      });
    });
  },

  getUsers() {
    return new Promise((resolve, reject) => {
      db.all(`SELECT * FROM users`, [], (err, rows) => {
        if (err) return reject(err);
        resolve(rows);
      });
    });
  },

  logTask({ name, project, task, status, timestamp }) {
    return new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO task_logs (name, project, task, status, timestamp) VALUES (?, ?, ?, ?, ?)`,
        [name, project, task, status, timestamp],
        function (err) {
          if (err) return reject(err);
          resolve();
        }
      );
    });
  },

  getLogs() {
    return new Promise((resolve, reject) => {
      db.all(`SELECT * FROM task_logs ORDER BY id DESC`, [], (err, rows) => {
        if (err) return reject(err);
        resolve(rows);
      });
    });
  }
};
