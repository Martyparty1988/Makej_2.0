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
  const rows = type === 'workLogs' ? await getAllWorkLogs() : await getAllFinanceRecords();
  if (!rows.length) return showNotification('Žádná data k exportu', 'warning');
  const csv = [Object.keys(rows[0]).join(','), ...rows.map(r => Object.values(r).join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${type}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  showNotification(`Export ${type} hotov`, 'success');
}

function backupJSON() {
  const backup = {
    workLogs: getAllWorkLogs(),
    financeRecords: getAllFinanceRecords(),
    settings: getSettings(),
    debts: getAllDebts(),
    debtPayments: getAllDebtPayments(),
    sharedBudget: getSharedBudget()
  };
  const json = JSON.stringify(backup);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'backup.json';
  a.click();
  URL.revokeObjectURL(url);
  showNotification('Záloha vytvořena', 'success');
}

function importBackup(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = async (event) => {
    const data = JSON.parse(event.target.result);
    // Logika pro obnovení dat (zjednodušena)
    await Promise.all([
      db.transaction(['workLogs'], 'readwrite').objectStore('workLogs').clear(),
      db.transaction(['financeRecords'], 'readwrite').objectStore('financeRecords').clear(),
      db.transaction(['debts'], 'readwrite').objectStore('debts').clear(),
      db.transaction(['debtPayments'], 'readwrite').objectStore('debtPayments').clear(),
      db.transaction(['settings'], 'readwrite').objectStore('settings').clear(),
      db.transaction(['sharedBudget'], 'readwrite').objectStore('sharedBudget').clear()
    ]);
    await Promise.all([
      ...data.workLogs.map(log => saveWorkLog(log)),
      ...data.financeRecords.map(rec => saveFinanceRecord(rec)),
      ...data.debts.map(debt => saveDebt(debt)),
      ...data.debtPayments.map(pay => savePayment(pay)),
      ...Object.entries(data.settings).map(([key, value]) => saveSettings(key, value)),
      updateSharedBudget(data.sharedBudget.balance || 0)
    ]);
    showNotification('Data obnovena', 'success');
  };
  reader.readAsText(file);
}

function clearAllData() {
  if (confirm('Opravdu chcete smazat všechna data? Tato akce je nevratná!')) {
    Promise.all([
      db.transaction(['workLogs'], 'readwrite').objectStore('workLogs').clear(),
      db.transaction(['financeRecords'], 'readwrite').objectStore('financeRecords').clear(),
      db.transaction(['debts'], 'readwrite').objectStore('debts').clear(),
      db.transaction(['debtPayments'], 'readwrite').objectStore('debtPayments').clear(),
      db.transaction(['settings'], 'readwrite').objectStore('settings').clear(),
      db.transaction(['sharedBudget'], 'readwrite').objectStore('sharedBudget').clear()
    ]).then(() => {
      initializeDefaultData().then(() => showNotification('Data smazána', 'success'));
    });
  }
}