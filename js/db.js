// db.js
export const RATES = { maru: 275, marty: 400 };
export const DEDUCTION_RATES = { maru: 0.3333, marty: 0.5 };
let db;

export async function initDB() {
  return new Promise((res, rej) => {
    const req = indexedDB.open('WorkTrackerDB', 1);
    req.onupgradeneeded = e => {
      db = e.target.result;
      db.createObjectStore('workLogs', { keyPath: 'id', autoIncrement: true });
      db.createObjectStore('financeRecords', { keyPath: 'id', autoIncrement: true });
      db.createObjectStore('taskCategories', { keyPath: 'name' });
      db.createObjectStore('expenseCategories', { keyPath: 'name' });
      db.createObjectStore('debts', { keyPath: 'id', autoIncrement: true });
      db.createObjectStore('debtPayments', { keyPath: 'id', autoIncrement: true });
      db.createObjectStore('settings', { keyPath: 'key' });
      db.createObjectStore('sharedBudget', { keyPath: 'id', autoIncrement: true });
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
  await saveSettings('initialized', true);
  await db.transaction(['taskCategories'], 'readwrite')
    .objectStore('taskCategories')
    .add({ name: 'Vývoj', active: true });
  await saveSettings('rentAmount', 10000);
  await saveSettings('rentDay', 1);
  await updateSharedBudget(0);
}

export async function getSharedBudget() {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['sharedBudget'], 'readonly');
    const store = transaction.objectStore('sharedBudget');
    const request = store.get(1);
    request.onsuccess = () => resolve(request.result || { balance: 0 });
    request.onerror = () => reject(request.error);
  });
}

export async function updateSharedBudget(amount) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['sharedBudget'], 'readwrite');
    const store = transaction.objectStore('sharedBudget');
    const request = store.get(1);
    request.onsuccess = () => {
      const budget = request.result || { id: 1, balance: 0 };
      budget.balance = (budget.balance || 0) + amount;
      store.put(budget).onsuccess = () => resolve(budget);
    };
    request.onerror = () => reject(request.error);
  });
}

export async function saveSettings(key, value) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['settings'], 'readwrite');
    const store = transaction.objectStore('settings');
    store.put({ key, value }).onsuccess = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
}

export async function getSettings(key) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['settings'], 'readonly');
    const store = transaction.objectStore('settings');
    const request = store.get(key);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveWorkLog(log) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['workLogs'], 'readwrite');
    const store = transaction.objectStore('workLogs');
    const request = store.add(log);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function getAllWorkLogs(filters = {}) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['workLogs'], 'readonly');
    const store = transaction.objectStore('workLogs');
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveFinanceRecord(rec) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['financeRecords'], 'readwrite');
    const store = transaction.objectStore('financeRecords');
    const request = store.add(rec);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function getAllFinanceRecords() {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['financeRecords'], 'readonly');
    const store = transaction.objectStore('financeRecords');
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveDebt(debt) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['debts'], 'readwrite');
    const store = transaction.objectStore('debts');
    const request = store.add(debt);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function getAllDebts() {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['debts'], 'readonly');
    const store = transaction.objectStore('debts');
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function savePayment(pay) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['debtPayments'], 'readwrite');
    const store = transaction.objectStore('debtPayments');
    const request = store.add(pay);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}