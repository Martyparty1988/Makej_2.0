// export.js
import { getAllWorkLogs, getAllFinanceRecords, getAllDebts, getSettings, getSharedBudget } from './db.js';
import { showNotification } from './ui.js';

export function initExportFunctions() {
  document.getElementById('export-work-logs').addEventListener('click', () => exportCSV('workLogs'));
  document.getElementById('export-finance').addEventListener('click', () => exportCSV('finance'));
  document.getElementById('backup-data').addEventListener('click', backupJSON);
  document.getElementById('clear-all-data').addEventListener('click', clearAllData);
  
  // Add PDF export option
  const pdfBtn = document.createElement('button');
  pdfBtn.id = 'export-pdf';
  pdfBtn.className = 'btn export-btn';
  pdfBtn.innerHTML = '<i class="fas fa-file-pdf"></i> Export do PDF';
  pdfBtn.addEventListener('click', exportPDF);
  
  const exportBtns = document.querySelector('.export-buttons');
  exportBtns.insertBefore(pdfBtn, document.getElementById('backup-data'));
  
  // Load jsPDF library
  const script = document.createElement('script');
  script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
  document.head.appendChild(script);
}

async function exportCSV(type) {
  const rows = type === 'workLogs' ? await getAllWorkLogs() : await getAllFinanceRecords();
  if (!rows.length) return showNotification('Žádná data k exportu', 'warning');
  
  // Format data for CSV export
  const formattedRows = rows.map(row => {
    const newRow = { ...row };
    
    // Format dates if they exist
    if (newRow.startTime) {
      newRow.startTime = new Date(newRow.startTime).toLocaleString();
    }
    if (newRow.endTime) {
      newRow.endTime = new Date(newRow.endTime).toLocaleString();
    }
    
    // Format duration to hours if it exists
    if (newRow.duration) {
      newRow.durationHours = (newRow.duration / (1000 * 60 * 60)).toFixed(2);
    }
    
    return newRow;
  });
  
  // Create CSV content
  const headers = Object.keys(formattedRows[0]);
  const csv = [
    headers.join(','),
    ...formattedRows.map(row => headers.map(h => {
      // Ensure special characters are escaped
      let value = row[h] || '';
      if (typeof value === 'string' && (value.includes(',') || value.includes('"') || value.includes('\n'))) {
        value = `"${value.replace(/"/g, '""')}"`;
      }
      return value;
    }).join(','))
  ].join('\n');
  
  // Download the CSV file
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${type}_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  
  showNotification(`Export ${type} hotov`, 'success');
}

async function backupJSON() {
  // Collect all data for backup
  const [workLogs, financeRecords, debts, budget, settings] = await Promise.all([
    getAllWorkLogs(),
    getAllFinanceRecords(), 
    getAllDebts(),
    getSharedBudget(),
    getAllSettings()
  ]);
  
  const backup = {
    workLogs,
    financeRecords,
    debts,
    budget,
    settings,
    exportDate: new Date().toISOString(),
    appVersion: '1.0'
  };
  
  // Create and download JSON file
  const json = JSON.stringify(backup, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `vykazy_backup_${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
  
  showNotification('Záloha vytvořena', 'success');
}

async function getAllSettings() {
  // Get all the settings keys
  const keys = ['theme', 'rentAmount', 'rentDay', 'initialized'];
  const settings = {};
  
  // Get values for each key
  for (const key of keys) {
    const setting = await getSettings(key);
    if (setting && setting.value !== undefined) {
      settings[key] = setting.value;
    }
  }
  
  return settings;
}

function clearAllData() {
  if (!confirm('Opravdu chcete smazat všechna data? Tato akce je nevratná!')) {
    return;
  }
  
  // Show a confirmation dialog with additional warning
  const confirmPrompt = prompt('Pro potvrzení napište "SMAZAT". Tato akce je nevratná a smaže všechna vaše data.');
  
  if (confirmPrompt !== 'SMAZAT') {
    showNotification('Mazání zrušeno', 'info');
    return;
  }
  
  // Offer to create a backup before clearing
  if (confirm('Chcete před smazáním vytvořit zálohu dat?')) {
    backupJSON();
  }
  
  // Clear all stores
  const stores = ['workLogs', 'financeRecords', 'debts', 'debtPayments', 'settings', 'sharedBudget'];
  const clearPromises = stores.map(store => {
    return new Promise((resolve, reject) => {
      const transaction = indexedDB.open('WorkTrackerDB', 1).onsuccess = event => {
        const db = event.target.result;
        const transaction = db.transaction([store], 'readwrite');
        const objectStore = transaction.objectStore(store);
        const request = objectStore.clear();
        
        request.onsuccess = () => resolve();
        request.onerror = () => reject();
      };
    });
  });
  
  // Wait for all clear operations to complete
  Promise.all(clearPromises)
    .then(() => {
      // Reinitialize with default data
      showNotification('Data smazána. Obnovuji výchozí nastavení...', 'success');
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    })
    .catch(error => {
      showNotification('Chyba při mazání dat', 'error');
      console.error('Error clearing data:', error);
    });
}

async function exportPDF() {
  // Check if jsPDF is loaded
  if (!window.jspdf) {
    showNotification('Načítám PDF knihovnu...', 'info');
    
    // Try to load jsPDF if not available
    return new Promise((resolve) => {
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
      script.onload = () => {
        exportPDF();
        resolve();
      };
      document.head.appendChild(script);
    });
  }
  
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  
  // Add header
  doc.setFontSize(20);
  doc.setTextColor(13, 110, 253); // primary-color
  doc.text('Pracovní Výkazy', 105, 15, null, null, 'center');
  
  doc.setFontSize(12);
  doc.setTextColor(51, 51, 51);
  doc.text(`Vytvořeno: ${new Date().toLocaleString()}`, 105, 25, null, null, 'center');
  
  // Get all data
  const [workLogs, budget, settings] = await Promise.all([
    getAllWorkLogs(),
    getSharedBudget(),
    getAllSettings()
  ]);
  
  // Sort work logs by date (newest first)
  workLogs.sort((a, b) => new Date(b.endTime) - new Date(a.endTime));
  
  // Calculate summary statistics
  const totalHours = workLogs.reduce((sum, log) => sum + (log.duration / (1000 * 60 * 60)), 0);
  const totalEarnings = workLogs.reduce((sum, log) => sum + (log.earnings || 0), 0);
  
  // Add summary section
  let y = 40;
  doc.setFontSize(16);
  doc.setTextColor(13, 110, 253);
  doc.text('Souhrnné Statistiky', 15, y);
  y += 10;
  
  doc.setFontSize(10);
  doc.setTextColor(51, 51, 51);
  doc.text(`Celkem záznamů: ${workLogs.length}`, 15, y); y += 7;
  doc.text(`Celkem odpracováno: ${totalHours.toFixed(2)} hodin`, 15, y); y += 7;
  doc.text(`Celkem vyděláno: ${totalEarnings} Kč`, 15, y); y += 7;
  doc.text(`Aktuální rozpočet: ${budget.balance || 0} Kč`, 15, y); y += 15;
  
  // Add recent logs table
  doc.setFontSize(16);
  doc.setTextColor(13, 110, 253);
  doc.text('Poslední Záznamy', 15, y);
  y += 10;
  
  // Table headers
  doc.setFontSize(9);
  doc.setTextColor(51, 51, 51);
  doc.setFont(undefined, 'bold');
  
  doc.text('Datum', 15, y);
  doc.text('Osoba', 45, y);
  doc.text('Úkol', 65, y);
  doc.text('Trvání', 140, y);
  doc.text('Výdělek', 170, y);
  y += 7;
  
  // Table content
  doc.setFont(undefined, 'normal');
  
  // Show last 20 entries
  workLogs.slice(0, 20).forEach(log => {
    const date = new Date(log.endTime).toLocaleDateString();
    const hours = (log.duration / (1000 * 60 * 60)).toFixed(2);
    const person = log.person || 'maru';
    const activity = log.activity || '';
    
    // Check if we need a new page
    if (y > 270) {
      doc.addPage();
      y = 20;
    }
    
    doc.text(date, 15, y);
    doc.text(person, 45, y);
    doc.text(activity.substring(0, 40), 65, y);
    doc.text(`${hours}h`, 140, y);
    doc.text(`${log.earnings || 0} Kč`, 170, y);
    
    y += 7;
  });
  
  // Add footer with page numbers
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(`Strana ${i} z ${pageCount}`, 105, 285, null, null, 'center');
  }
  
  // Save the PDF file
  doc.save(`vykazy_report_${new Date().toISOString().slice(0, 10)}.pdf`);
  showNotification('PDF exportován', 'success');
}