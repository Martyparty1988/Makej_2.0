// db.js
export const RATES = { maru: 275, marty: 400 };
export const DEDUCTION_RATES = { maru: 0.3333, marty: 0.5 };
let db;

export async function initDB() {
  return new Promise((res, rej) => {
    const req = indexedDB.open('WorkTrackerDB', 1);
    req.onupgradeneeded = e => {
      db = e.target.result;
      // Vytvoř objektové obchody: workLogs, financeRecords, taskCategories, expenseCategories,
      // debts, debtPayments, settings, sharedBudget
    };
    req.onsuccess = e => {
      db = e.target.result;
      initializeDefaultData().then(res);
    };
    req.onerror = e => rej(e.target.error);
  });
}

async function initializeDefaultData() {
  const init = await getSettings('initialized');
  if (init && init.value) return;
  // Přidej výchozí task/expense kategorie, rentAmount, rentDay, sharedBudget…
  await saveSettings('initialized', true);
}

// 💾 Shared Budget
export async function getSharedBudget() { /* … */ }
export async function updateSharedBudget(amount) { /* … */ }

// ⚙ Settings
export async function saveSettings(key, value) { /* … */ }
export async function getSettings(key) { /* … */ }

// 🕒 Work Logs
export async function saveWorkLog(log) { /* … */ }
export async function getAllWorkLogs(filters) { /* … */ }

// 💰 Finance Records
export async function saveFinanceRecord(rec) { /* … */ }
export async function getAllFinanceRecords() { /* … */ }

// 🤝 Debts & Payments
export async function saveDebt(debt) { /* … */ }
export async function getAllDebts() { /* … */ }
export async function savePayment(pay) { /* … */ }
