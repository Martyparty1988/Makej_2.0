// timer.js
import { RATES, DEDUCTION_RATES, saveWorkLog } from './db.js';
import { showNotification } from './ui.js';

let state = {
  running: false,
  startTime: null,
  pausedTime: 0,
  interval: null,
  person: 'maru',
  activity: '',
  subcategory: '',
  note: ''
};

export function initTimer() {
  document.querySelectorAll('.person-tab').forEach(btn =>
    btn.addEventListener('click', () => selectPerson(btn))
  );
  document.getElementById('timer-start').addEventListener('click', startTimer);
  document.getElementById('timer-stop').addEventListener('click', stopTimer);
  restoreState();
}

function selectPerson(btn) {
  document.querySelectorAll('.person-tab').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  state.person = btn.dataset.person;
  updateDisplay();
}

function updateDisplay() {
  const elapsed = state.running
    ? Date.now() - state.startTime
    : state.pausedTime;
  const rate = RATES[state.person];
  const earnings = ((elapsed/3600000)*rate)|0;
  document.getElementById('current-earnings').textContent = `${earnings} Kč`;
  document.getElementById('current-deduction').textContent =
    `${Math.round(earnings * DEDUCTION_RATES[state.person])} Kč`;
  document.getElementById('current-net').textContent =
    `${earnings - Math.round(earnings * DEDUCTION_RATES[state.person])} Kč`;
}

function startTimer() {
  const task = document.getElementById('task-select').value;
  if (!task) return showNotification('Vyberte úkol před spuštěním.', 'warning');
  state.running = true;
  state.activity = task;
  state.subcategory = document.getElementById('task-subcategory').value;
  state.note = document.getElementById('task-note').value;
  state.startTime = Date.now() - state.pausedTime;
  state.interval = setInterval(updateDisplay, 1000);
  document.getElementById('timer-start').disabled = true;
  document.getElementById('timer-stop').disabled = false;
  showNotification('Časovač spuštěn', 'success');
  saveState();
}

async function stopTimer() {
  clearInterval(state.interval);
  document.getElementById('timer-start').disabled = false;
  document.getElementById('timer-stop').disabled = true;
  const end = Date.now();
  const duration = end - state.startTime;
  const earnings = Math.round((duration/3600000) * RATES[state.person]);
  const log = {
    id: `${Date.now()}`,
    person: state.person,
    activity: state.activity,
    subcategory: state.subcategory,
    note: state.note,
    startTime: new Date(state.startTime).toISOString(),
    endTime: new Date(end).toISOString(),
    duration,
    earnings
  };
  await saveWorkLog(log);
  resetTimer();
  showNotification('Zastaveno a uloženo', 'success');
}

function resetTimer() {
  state = { running:false, startTime:null, pausedTime:0, interval:null, person:state.person, activity:'', subcategory:'', note:'' };
  localStorage.removeItem('timerState');
  updateDisplay();
}

function saveState() {
  localStorage.setItem('timerState', JSON.stringify({
    running: state.running,
    startTime: state.startTime,
    pausedTime: Date.now() - state.startTime,
    person: state.person
  }));
}

function restoreState() {
  const saved = JSON.parse(localStorage.getItem('timerState')||'{}');
  if (saved.running) {
    state = { ...state, ...saved };
    startTimer();
  }
}
