const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const db = require('./db');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(bodyParser.json());
app.use(require('cors')());
app.use(express.static(path.join(__dirname, 'public')));

// Students
app.get('/api/students', async (req, res) => {
  const students = await db.all('SELECT * FROM students ORDER BY id');
  res.json(students);
});

app.post('/api/students', async (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'Name required' });
  const result = await db.run('INSERT INTO students (name) VALUES (?)', [name]);
  const student = await db.get('SELECT * FROM students WHERE id = ?', [result.lastID]);
  res.json(student);
});

// Start assessment
app.post('/api/assessments/start', async (req, res) => {
  const { studentId, timeLimit = 6, totalQuestions = 20 } = req.body;
  if (!studentId) return res.status(400).json({ error: 'studentId required' });
  const result = await db.run(
    'INSERT INTO assessments (student_id, time_limit, total_questions, started_at) VALUES (?, ?, ?, datetime("now"))',
    [studentId, timeLimit, totalQuestions]
  );
  const assessment = await db.get('SELECT * FROM assessments WHERE id = ?', [result.lastID]);
  res.json(assessment);
});

// Record an answer for assessment
app.post('/api/assessments/:id/answer', async (req, res) => {
  const assessmentId = req.params.id;
  const { question, givenAnswer, correctAnswer, responseTime, correct } = req.body;
  if (!question) return res.status(400).json({ error: 'question required' });
  await db.run(
    'INSERT INTO results (assessment_id, question, given_answer, correct_answer, correct, response_time, created_at) VALUES (?, ?, ?, ?, ?, ?, datetime("now"))',
    [assessmentId, question, String(givenAnswer), String(correctAnswer), correct ? 1 : 0, responseTime || 0]
  );
  if (!correct) {
    res.json({ ok: true, correctAnswer });
  } else {
    res.json({ ok: true });
  }
});

// Get student assessments + aggregate stats
app.get('/api/students/:id/assessments', async (req, res) => {
  const studentId = req.params.id;
  const assessments = await db.all('SELECT * FROM assessments WHERE student_id = ? ORDER BY started_at DESC', [studentId]);
  // attach stats
  for (const a of assessments) {
    const stats = await db.get(
      'SELECT COUNT(*) as total, SUM(correct) as correct, AVG(response_time) as avg_time FROM results WHERE assessment_id = ?',
      [a.id]
    );
    a.stats = {
      total: stats.total || 0,
      correct: stats.correct || 0,
      avg_time: stats.avg_time ? Number(stats.avg_time).toFixed(2) : null
    };
  }
  res.json(assessments);
});

// Get recent results for an assessment
app.get('/api/assessments/:id/results', async (req, res) => {
  const id = req.params.id;
  const results = await db.all('SELECT * FROM results WHERE assessment_id = ? ORDER BY id', [id]);
  res.json(results);
});

// fallback to index
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// initialize DB and start
(async () => {
  await db.init();
  app.listen(PORT, () => console.log(`Server listening on http://localhost:${PORT}`));
})();
