// ui.js
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
  updateBudgetCircle();
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
  
  // Set default section
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
  updateBudgetCircle(budget.balance);
  
  // Load work logs and update summary
  const logs = await getAllWorkLogs();
  updateWorkSummary(logs);
  
  // Update recent logs table
  updateRecentLogs(logs);
  
  // Update charts
  updateCharts();
}

function updateWorkSummary(logs) {
  const totalHours = logs.reduce((sum, log) => sum + (log.duration / (1000 * 60 * 60)), 0);
  const totalEarnings = logs.reduce((sum, log) => sum + log.earnings, 0);
  
  document.querySelector('.summary-item:nth-child(1) .value').textContent = totalHours.toFixed(1);
  document.querySelector('.summary-item:nth-child(2) .value').textContent = `${totalEarnings} Kč`;
}

function updateRecentLogs(logs) {
  const tbody = document.querySelector('.recent-logs tbody');
  tbody.innerHTML = '';
  
  if (logs.length === 0) {
    tbody.innerHTML = '<tr class="empty-row"><td colspan="3">Žádné záznamy</td></tr>';
    return;
  }
  
  // Sort by endTime descending
  logs.sort((a, b) => new Date(b.endTime) - new Date(a.endTime));
  
  // Take the 10 most recent logs
  logs.slice(0, 10).forEach(log => {
    const tr = document.createElement('tr');
    const hours = (log.duration / (1000 * 60 * 60)).toFixed(1);
    
    tr.innerHTML = `
      <td>${log.activity}</td>
      <td>${hours}h</td>
      <td>${log.earnings} Kč</td>
    `;
    
    tbody.appendChild(tr);
  });
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

export function updateBudgetCircle(balance = 0, goal = 20000) {
  const percent = Math.min(100, Math.max(0, (balance / goal) * 100));
  const circle = document.querySelector('.circle');
  if (!circle) return;
  
  const circumference = 2 * Math.PI * 60;
  circle.style.strokeDasharray = `${(percent * circumference) / 100} ${circumference}`;
  
  // Color based on percentage
  const color = 
    percent < 25 ? '#dc3545' : 
    percent < 50 ? '#ffc107' : 
    percent < 75 ? '#0d6efd' : '#28a745';
    
  circle.style.stroke = color;
  document.querySelector('.budget-amount').style.color = color;
}

export function setupTaskFilter() {
  const input = document.createElement('input');
  input.className = 'task-filter';
  input.placeholder = 'Filter tasks...';
  input.style.marginBottom = '8px';
  input.style.width = '100%';
  input.style.padding = 'var(--spacing-sm) var(--spacing-md)';
  input.style.borderRadius = 'var(--border-radius-md)';
  input.style.border = '1px solid #dee2e6';
  
  const container = document.querySelector('.recent-logs .table-container');
  container.parentNode.insertBefore(input, container);
  
  input.addEventListener('input', () => {
    const filter = input.value.toLowerCase();
    const rows = document.querySelectorAll('.recent-logs tbody tr:not(.empty-row)');
    
    rows.forEach(row => {
      const text = row.textContent.toLowerCase();
      row.style.display = text.includes(filter) ? '' : 'none';
    });
  });
}

export function setupOfflineIndicator() {
  const indicator = document.createElement('div');
  indicator.id = 'offline-indicator';
  indicator.innerHTML = '<i class="fas fa-wifi-slash"></i> Offline';
  indicator.style.cssText = `
    display: none;
    position: fixed;
    top: 60px;
    left: 0;
    right: 0;
    text-align: center;
    background: var(--warning-color);
    color: black;
    padding: 5px;
    font-size: 14px;
    font-weight: bold;
    z-index: 1000;
  `;
  
  document.body.appendChild(indicator);
  
  window.addEventListener('online', () => {
    indicator.style.display = 'none';
  });
  
  window.addEventListener('offline', () => {
    indicator.style.display = 'block';
  });
  
  if (!navigator.onLine) indicator.style.display = 'block';
}

function requestNotificationPermission() {
  if ('Notification' in window) Notification.requestPermission();
}