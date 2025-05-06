// ui.js
import {
  getSharedBudget, getAllWorkLogs, getAllFinanceRecords,
  getAllDebts, saveSettings
} from './db.js';
import { updateCharts } from './charts.js';

export function initUI() {
  initNavigation();
  loadAllData();
  initCategoryManagement();
  initRentSettings();
  initTheme();
  requestNotificationPermission();
}

export function showNotification(msg, type='info') {
  const n = document.getElementById('notification');
  n.textContent = msg;
  n.className = `notification ${type}`;
  n.style.display='block';
  setTimeout(()=>n.style.display='none', 3000);
}

function initNavigation() {
  document.querySelectorAll('nav a').forEach(link => {
    link.addEventListener('click', e => {
      e.preventDefault();
      document.querySelectorAll('nav a').forEach(l=>l.classList.remove('active'));
      document.querySelectorAll('main>section').forEach(s=>s.classList.remove('active'));
      link.classList.add('active');
      document.getElementById(link.dataset.section).classList.add('active');
      window.location.hash = link.dataset.section;
    });
  });
  if (window.location.hash) {
    const sec = window.location.hash.slice(1);
    document.querySelector(`nav a[data-section="${sec}"]`)?.click();
  }
}

export async function loadAllData() {
  const budget = await getSharedBudget();
  document.getElementById('shared-budget').textContent = `${budget.balance} Kč`;
  updateCharts();
}

function initCategoryManagement() {
  // Původní addTaskCategory, deleteTaskCategory, addExpenseCategory…
}

function initRentSettings() {
  // Původní initRentSettings(), loadRentSettings(), saveRentSettings()
}

async function initTheme() {
  const s = await getSettings('theme');
  const dark = s && s.value==='dark';
  document.body.classList.toggle('dark-mode', dark);
  document.getElementById('dark-mode-toggle').checked = dark;
  document.getElementById('dark-mode-toggle').addEventListener('change', async e=>{
    document.body.classList.toggle('dark-mode', e.target.checked);
    await saveSettings('theme', e.target.checked ? 'dark':'light');
  });
}

function requestNotificationPermission() {
  if ('Notification' in window) Notification.requestPermission();
}
