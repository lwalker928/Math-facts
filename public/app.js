const api = path => fetch(path).then(r => r.json());

let state = { studentId: null, assessmentId: null, timeLimit: 6, totalQuestions: 20, curIndex: 0 };
let currentQuestion = null;
let timer = null;
let timeRemaining = 0;

function el(id){ return document.getElementById(id); }

async function loadStudents(){
  const students = await api('/api/students');
  const sel = el('studentSelect');
  sel.innerHTML = '';
  students.forEach(s => {
    const o = document.createElement('option'); o.value = s.id; o.textContent = s.name; sel.appendChild(o);
  });
  if (students.length) {
    sel.value = students[0].id; state.studentId = students[0].id; loadProgress();
  }
}

el('addStudent').addEventListener('click', async ()=>{
  const name = el('newStudentName').value.trim();
  if (!name) return alert('Enter a name');
  const s = await fetch('/api/students', { method:'POST', headers:{'content-type':'application/json'}, body:JSON.stringify({ name })}).then(r=>r.json());
  el('newStudentName').value = '';
  await loadStudents();
  el('studentSelect').value = s.id; state.studentId = s.id; loadProgress();
});

el('studentSelect').addEventListener('change', ()=>{ state.studentId = el('studentSelect').value; loadProgress(); });

el('start').addEventListener('click', async ()=>{
  if (!state.studentId) return alert('Choose or add a student');
  state.timeLimit = Number(el('timeLimit').value);
  state.totalQuestions = Number(el('qCount').value) || 20;
  const assessment = await fetch('/api/assessments/start', { method:'POST', headers:{'content-type':'application/json'}, body:JSON.stringify({ studentId: state.studentId, timeLimit: state.timeLimit, totalQuestions: state.totalQuestions })}).then(r=>r.json());
  state.assessmentId = assessment.id;
  state.curIndex = 0;
  el('totalQ').textContent = state.totalQuestions;
  el('curIndex').textContent = 0;
  el('assessment').classList.remove('hidden');
  el('feedback').textContent = '';
  nextQuestion();
});

function randInt(a,b){ return Math.floor(Math.random()*(b-a+1))+a; }

function makeQuestion(){
  const ops = ['+','-','*'];
  const op = ops[Math.floor(Math.random()*ops.length)];
  let a = randInt(1,12);
  let b = randInt(1,12);
  if (op === '-' && a < b) [a,b] = [b,a];
  const q = `${a} ${op} ${b}`;
  let ans = eval(q);
  return { question:q, answer:ans };
}

function submitAnswer(given){
  clearInterval(timer);
  const correct = Number(given) === currentQuestion.answer;
  const body = { question: currentQuestion.question, givenAnswer: given, correctAnswer: currentQuestion.answer, responseTime: state.timeLimit - timeRemaining, correct };
  fetch(`/api/assessments/${state.assessmentId}/answer`, { method:'POST', headers:{'content-type':'application/json'}, body:JSON.stringify(body)}).then(r=>r.json()).then(res=>{
    if (!correct) el('feedback').innerHTML = `<span style="color:#b00">Wrong — correct answer: ${currentQuestion.answer}</span>`;
    else el('feedback').innerHTML = `<span style="color:green">Correct</span>`;
    setTimeout(()=>{ nextQuestion(); }, 900);
  });
}

function nextQuestion(){
  state.curIndex += 1;
  if (state.curIndex > state.totalQuestions) {
    el('assessment').classList.add('hidden');
    loadProgress();
    alert('Assessment complete');
    return;
  }
  el('curIndex').textContent = state.curIndex;
  currentQuestion = makeQuestion();
  el('questionText').textContent = currentQuestion.question;
  el('answerInput').value = '';
  el('feedback').textContent = '';
  startTimer();
}

function startTimer(){
  timeRemaining = state.timeLimit;
  el('timeRemaining').textContent = timeRemaining;
  timer = setInterval(()=>{
    timeRemaining -= 1;
    el('timeRemaining').textContent = timeRemaining;
    if (timeRemaining <= 0){
      clearInterval(timer);
      el('feedback').innerHTML = `<span style="color:#b00">Time up — correct answer: ${currentQuestion.answer}</span>`;
      // submit as wrong
      const body = { question: currentQuestion.question, givenAnswer: '', correctAnswer: currentQuestion.answer, responseTime: state.timeLimit, correct: false };
      fetch(`/api/assessments/${state.assessmentId}/answer`, { method:'POST', headers:{'content-type':'application/json'}, body:JSON.stringify(body)}).then(()=> setTimeout(()=> nextQuestion(), 900));
    }
  }, 1000);
}

el('submitAnswer').addEventListener('click', ()=>{ submitAnswer(el('answerInput').value.trim()); });

el('answerInput').addEventListener('keydown', (e)=>{ if (e.key === 'Enter') submitAnswer(el('answerInput').value.trim()); });

async function loadProgress(){
  if (!state.studentId) return;
  const as = await api(`/api/students/${state.studentId}/assessments`);
  const area = el('progressArea');
  if (!as.length) { area.innerHTML = '<em>No assessments yet</em>'; return; }
  let html = '<table><thead><tr><th>ID</th><th>Started</th><th>TimeLimit</th><th>Questions</th><th>Correct</th><th>Total</th><th>Avg Time (s)</th><th>View</th></tr></thead><tbody>';
  as.forEach(a=>{
    html += `<tr><td>${a.id}</td><td>${a.started_at}</td><td>${a.time_limit}</td><td>${a.total_questions}</td><td>${a.stats.correct}</td><td>${a.stats.total}</td><td>${a.stats.avg_time || '-'} </td><td><button onclick="viewResults(${a.id})">View</button></td></tr>`;
  });
  html += '</tbody></table>';
  area.innerHTML = html;
}

async function viewResults(id){
  const r = await api(`/api/assessments/${id}/results`);
  let s = `<h3>Results for assessment ${id}</h3><table><tr><th>#</th><th>Question</th><th>Given</th><th>Correct</th><th>Time(s)</th></tr>`;
  r.forEach((row, i)=> s += `<tr><td>${i+1}</td><td>${row.question}</td><td>${row.given_answer}</td><td>${row.correct_answer}</td><td>${row.response_time}</td></tr>`);
  s += '</table>';
  el('progressArea').innerHTML = s;
}

// initial load
loadStudents();
