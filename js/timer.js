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
  document.querySelectorAll('.worker-option input').forEach(input =>
    input.addEventListener('change', () => selectPerson(input))
  );
  document.getElementById('timer-start').addEventListener('click', startTimer);
  document.getElementById('timer-stop').addEventListener('click', stopTimer);
  restoreState();
}

function selectPerson(input) {
  state.person = input.value;
  updateDisplay();
}

function updateDisplay() {
  const elapsed = state.running
    ? Date.now() - state.startTime
    : state.pausedTime;
  const rate = RATES[state.person];
  const earnings = Math.round((elapsed / 3600000) * rate);
  const seconds = Math.floor((elapsed / 1000) % 60);
  const minutes = Math.floor((elapsed / (1000 * 60)) % 60);
  const hours = Math.floor((elapsed / (1000 * 60 * 60)));
  
  document.getElementById('hours-tens').textContent = Math.floor(hours / 10);
  document.getElementById('hours-ones').textContent = hours % 10;
  document.getElementById('minutes-tens').textContent = Math.floor(minutes / 10);
  document.getElementById('minutes-ones').textContent = minutes % 10;
  document.getElementById('seconds-tens').textContent = Math.floor(seconds / 10);
  document.getElementById('seconds-ones').textContent = seconds % 10;
  document.getElementById('current-earnings').textContent = `${earnings} Kč`;
  document.getElementById('current-deduction').textContent = `${Math.round(earnings * DEDUCTION_RATES[state.person])} Kč`;
  document.getElementById('current-net').textContent = `${earnings - Math.round(earnings * DEDUCTION_RATES[state.person])} Kč`;
  
  // Animation for running timer
  const timerDisplay = document.querySelector('.timer-display');
  if (state.running) {
    timerDisplay.classList.add('running');
  } else {
    timerDisplay.classList.remove('running');
  }
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
  
  // Notify with title if tab is not active
  if ('Notification' in window && Notification.permission === 'granted') {
    // Update page title with timer info
    const updateTitle = () => {
      if (!document.hasFocus() && state.running) {
        const timeStr = document.getElementById('hours-tens').textContent + 
                        document.getElementById('hours-ones').textContent + ':' +
                        document.getElementById('minutes-tens').textContent + 
                        document.getElementById('minutes-ones').textContent;
        document.title = `[${timeStr}] ${state.activity} - Pracovní Výkazy`;
      } else {
        document.title = 'Pracovní Výkazy';
      }
    };
    
    // Set interval for title updates
    const titleInterval = setInterval(updateTitle, 10000);
    // Store in state to clear later
    state.titleInterval = titleInterval;
    
    // Initial update
    updateTitle();
  }
}

async function stopTimer() {
  clearInterval(state.interval);
  if (state.titleInterval) clearInterval(state.titleInterval);
  document.title = 'Pracovní Výkazy';
  
  document.getElementById('timer-start').disabled = false;
  document.getElementById('timer-stop').disabled = true;
  
  const end = Date.now();
  const duration = end - state.startTime;
  const earnings = Math.round((duration / 3600000) * RATES[state.person]);
  
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
  
  // Send notification if allowed
  if ('Notification' in window && Notification.permission === 'granted') {
    const hours = (duration / (1000 * 60 * 60)).toFixed(1);
    new Notification('Časovač zastaven', { 
      body: `${state.activity}: ${hours}h - ${earnings} Kč`,
      icon: 'data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>⏱️</text></svg>'
    });
  }
}

function resetTimer() {
  state = { 
    running: false, 
    startTime: null, 
    pausedTime: 0, 
    interval: null, 
    titleInterval: null, 
    person: state.person, 
    activity: '', 
    subcategory: '', 
    note: '' 
  };
  localStorage.removeItem('timerState');
  updateDisplay();
}

function saveState() {
  localStorage.setItem('timerState', JSON.stringify({
    running: state.running,
    startTime: state.startTime,
    pausedTime: Date.now() - state.startTime,
    person: state.person,
    activity: state.activity,
    subcategory: state.subcategory,
    note: state.note
  }));
}

function restoreState() {
  const saved = JSON.parse(localStorage.getItem('timerState') || '{}');
  if (saved.running) {
    state = { ...state, ...saved };
    
    // Restore activity in form fields
    if (saved.activity) {
      document.getElementById('task-select').value = saved.activity;
    }
    if (saved.subcategory) {
      document.getElementById('task-subcategory').value = saved.subcategory;
    }
    if (saved.note) {
      document.getElementById('task-note').value = saved.note;
    }
    
    startTimer();
  }
}

export function setupKeyboardShortcuts() {
  document.addEventListener('keydown', e => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') return;
    
    if (e.key === 's' && !e.ctrlKey) {
      const startBtn = document.getElementById('timer-start');
      if (!startBtn.disabled) startBtn.click();
    }
    
    if (e.key === 'p' || e.key === 'Escape') {
      const stopBtn = document.getElementById('timer-stop');
      if (!stopBtn.disabled) stopBtn.click();
    }
  });
  
  // Show available shortcuts
  const tip = document.createElement('div');
  tip.className = 'keyboard-tip';
  tip.innerHTML = '<small>Shortcuts: <b>S</b> = Start, <b>P</b> or <b>Esc</b> = Stop</small>';
  tip.style.cssText = 'text-align: center; color: var(--secondary-color); margin-top: 8px; font-size: var(--font-size-xs);';
  
  const controlsContainer = document.querySelector('.timer-controls');
  controlsContainer.parentNode.insertBefore(tip, controlsContainer.nextSibling);
}