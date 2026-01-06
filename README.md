# Math Facts

This repository contains a small web app for timed math fact assessments with basic student progress tracking.

Features
- Timed per-question assessments (3s, 6s, 10s)
- Records each student assessment and each answer (whether correct, response time)
- Shows correct answers when the student is wrong or time runs out
- Simple teacher view to see past assessments and per-assessment stats

Run locally

1. Install dependencies:

```bash
npm install
```

2. Start the server:

```bash
npm start
```

3. Open http://localhost:3000

Notes
- No authentication is implemented — this is a simple prototype. Teachers can add students and run assessments for them.
- Persistence is stored in a SQLite database at `./data.sqlite`.
