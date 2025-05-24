const sqlite3 = require('sqlite3').verbose();
const path = require('path');

class Database {
  constructor() {
    this.db = new sqlite3.Database(path.join(__dirname, 'calendar.db'), (err) => {
      if (err) {
        console.error('Error opening database:', err);
      } else {
        console.log('Connected to SQLite database');
        this.init();
      }
    });
  }

  init() {
    // 创建用户表
    this.db.run(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 创建事件表
    this.db.run(`
      CREATE TABLE IF NOT EXISTS events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        date TEXT NOT NULL,
        event TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id)
      )
    `);
  }

  getUser(username) {
    return new Promise((resolve, reject) => {
      this.db.get('SELECT * FROM users WHERE username = ?', [username], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  }

  createUser(username, hashedPassword) {
    return new Promise((resolve, reject) => {
      this.db.run('INSERT INTO users (username, password) VALUES (?, ?)', 
        [username, hashedPassword], 
        function(err) {
          if (err) reject(err);
          else resolve(this.lastID);
        }
      );
    });
  }

  getUserEvents(userId) {
    return new Promise((resolve, reject) => {
      this.db.all('SELECT * FROM events WHERE user_id = ? ORDER BY date, id', 
        [userId], 
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });
  }

  createEvent(userId, date, event) {
    return new Promise((resolve, reject) => {
      this.db.run('INSERT INTO events (user_id, date, event) VALUES (?, ?, ?)', 
        [userId, date, event], 
        function(err) {
          if (err) reject(err);
          else resolve(this.lastID);
        }
      );
    });
  }

  deleteEvent(userId, eventId) {
    return new Promise((resolve, reject) => {
      this.db.run('DELETE FROM events WHERE id = ? AND user_id = ?', 
        [eventId, userId], 
        function(err) {
          if (err) reject(err);
          else resolve(this.changes > 0);
        }
      );
    });
  }
}

module.exports = Database;
