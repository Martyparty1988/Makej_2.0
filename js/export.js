// export.js
import { getAllWorkLogs, getAllFinanceRecords } from './db.js';
import { showNotification } from './ui.js';

export function initExportFunctions() {
  document.getElementById('export-work-logs').addEventListener('click', () => exportCSV('workLogs'));
  document.getElementById('export-finance').addEventListener('click', () => exportCSV('finance'));
  document.getElementById('import-data-input').addEventListener('change', importBackup);
  document.getElementById('backup-data').addEventListener('click', backupJSON);
  document.getElementById('clear-all-data').addEventListener('click', clearAllData);
}

async function exportCSV(type) {
  const rows = type==='workLogs' ? await getAllWorkLogs() : await getAllFinanceRecords();
  if (!rows.length) return showNotification('Žádná data k exportu', 'warning');
  const csv = [Object.keys(rows[0]).join(','), ...rows.map(r=>Object.values(r).join(','))].join('\n');
  const blob = new Blob([csv], {type:'text/csv'}), url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href=url; a.download=`${type}.csv`; a.click();
  showNotification(`Export ${type} hotov`, 'success');
}

function backupJSON() {
  // Stejná logika jako původní app.js: načíst všechny store + settings, zabalit do JSON, uložit.
}

function importBackup(e) {
  // Stejná restore logika…
}

function clearAllData() {
  // Stejná clearDatabase() s confirm()…
}
