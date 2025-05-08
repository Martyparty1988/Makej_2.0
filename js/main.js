// main.js
import { initDB } from './db.js';
import { initUI, setupTaskFilter, setupOfflineIndicator } from './ui.js';
import { initTimer, setupKeyboardShortcuts } from './timer.js';
import { initCharts } from './charts.js';
import { initExportFunctions } from './export.js';
import { enableSwipeNavigation, addQuickTaskButton, checkStorageUsage } from './enhancements.js';

async function bootstrap() {
  await initDB();
  initUI();
  initTimer();
  initCharts();
  initExportFunctions();
  
  // New enhancements
  setupTaskFilter();
  setupKeyboardShortcuts();
  setupOfflineIndicator();
  enableSwipeNavigation();
  addQuickTaskButton();
  checkStorageUsage();
  
  registerSW();
  setupInstallPrompt();
}

function registerSW() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/service-worker.js');
  }
}

let deferredPrompt;
function setupInstallPrompt() {
  window.addEventListener('beforeinstallprompt', e => {
    e.preventDefault();
    deferredPrompt = e;
    const btn = document.createElement('button');
    btn.textContent = 'Instalovat aplikaci';
    btn.className = 'btn primary-btn install-btn';
    document.body.appendChild(btn);
    btn.addEventListener('click', () => {
      deferredPrompt.prompt();
      deferredPrompt.userChoice.then(choice => {
        if (choice.outcome === 'accepted') btn.remove();
        deferredPrompt = null;
      });
    });
  });
}

document.addEventListener('DOMContentLoaded', bootstrap);