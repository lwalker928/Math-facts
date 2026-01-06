const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const DB_PATH = process.env.DB_PATH || './data.sqlite';

let dbHandle = null;

module.exports = {
  async init() {
    dbHandle = await open({ filename: DB_PATH, driver: sqlite3.Database });
    await dbHandle.exec(`
      CREATE TABLE IF NOT EXISTS students (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS assessments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        student_id INTEGER NOT NULL,
        time_limit INTEGER NOT NULL,
        total_questions INTEGER DEFAULT 20,
        started_at TEXT
      );
      CREATE TABLE IF NOT EXISTS results (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        assessment_id INTEGER NOT NULL,
        question TEXT,
        given_answer TEXT,
        correct_answer TEXT,
        correct INTEGER,
        response_time INTEGER,
        created_at TEXT
      );
    `);
  },
  run(sql, params = []) { return dbHandle.run(sql, params); },
  get(sql, params = []) { return dbHandle.get(sql, params); },
  all(sql, params = []) { return dbHandle.all(sql, params); }
};
