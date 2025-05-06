import {
  getSharedBudget, getAllWorkLogs, getAllFinanceRecords,
  getAllDebts, saveSettings, getSettings
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

export function showNotification(msg, type = 'info') {
  const n = document.getElementById('notification');
  n.textContent = msg;
  n.className = `notification ${type}`;
  n.style.display = 'block';
  setTimeout(() => n.style.display = 'none', 3000);
}

function initNavigation() {
  document.querySelectorAll('nav a').forEach(link => {
    link.addEventListener('click', e => {
      e.preventDefault();
      const sec = link.dataset.section;
      document.querySelectorAll('nav a').forEach(l => {
        l.classList.remove('active');
        l.setAttribute('aria-selected', 'false');
      });
      document.querySelectorAll('main>section').forEach(s => s.classList.remove('active'));
      link.classList.add('active');
      link.setAttribute('aria-selected', 'true');
      document.getElementById(sec).classList.add('active');
      window.location.hash = sec;
    });
  });
  
  // Nastavení výchozí sekce
  if (window.location.hash) {
    const sec = window.location.hash.slice(1);
    const section = document.getElementById(sec);
    if (section) {
      document.querySelector(`nav a[data-section="${sec}"]`)?.click();
    } else {
      document.querySelector('nav a[data-section="dochazka"]').click();
    }
  } else {
    document.querySelector('nav a[data-section="dochazka"]').click();
  }
}

export async function loadAllData() {
  const budget = await getSharedBudget();
  document.getElementById('shared-budget').textContent = `${budget.balance} Kč`;
  updateCharts();
}

function initCategoryManagement() {
  document.querySelector('.add-category button').addEventListener('click', () => {
    const input = document.querySelector('.add-category input');
    if (input.value) {
      showNotification('Kategorie přidána', 'success');
      input.value = '';
    }
  });
}

function initRentSettings() {
  const form = document.querySelector('.rent-settings form');
  form.addEventListener('submit', e => {
    e.preventDefault();
    const amount = form.querySelector('input[type="number"]:nth-child(1)').value;
    const day = form.querySelector('input[type="number"]:nth-child(2)').value;
    saveSettings('rentAmount', parseInt(amount));
    saveSettings('rentDay', parseInt(day));
    showNotification('Nastavení uloženo', 'success');
  });
}

async function initTheme() {
  const s = await getSettings('theme');
  const dark = s && s.value === 'dark';
  document.body.classList.toggle('dark-mode', dark);
  document.getElementById('dark-mode-toggle').checked = dark;
  document.getElementById('dark-mode-toggle').addEventListener('change', async e => {
    document.body.classList.toggle('dark-mode', e.target.checked);
    await saveSettings('theme', e.target.checked ? 'dark' : 'light');
  });
}

function requestNotificationPermission() {
  if ('Notification' in window) Notification.requestPermission();
}