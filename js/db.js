// db.js
export const RATES = { maru: 275, marty: 400 };
export const DEDUCTION_RATES = { maru: 0.3333, marty: 0.5 };
let db;

export async function initDB() {
  return new Promise((res, rej) => {
    const req = indexedDB.open('WorkTrackerDB', 1);
    req.onupgradeneeded = e => {
      db = e.target.result;
      // Create object stores
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
      
      // Add version monitoring
      db.onversionchange = () => {
        db.close();
        alert("Databáze byla aktualizována. Prosím obnovte stránku.");
        window.location.reload();
      };
      
      initializeDefaultData().then(res);
    };
    req.onerror = e => rej(e.target.error);
  });
}

async function initializeDefaultData() {
  const init = await getSettings('initialized');
  if (init && init.value) return;
  
  await saveSettings('initialized', true);
  
  // Add default task categories
  const defaultTasks = [
    { name: 'Development', active: true },
    { name: 'Design', active: true },
    { name: 'Meeting', active: true },
    { name: 'Admin', active: true },
    { name: 'Research', active: true }
  ];
  
  const taskStore = db.transaction(['taskCategories'], 'readwrite').objectStore('taskCategories');
  for (const task of defaultTasks) {
    await new Promise(resolve => {
      const req = taskStore.add(task);
      req.onsuccess = resolve;
    });
  }
  
  // Default rent settings
  await saveSettings('rentAmount', 10000);
  await saveSettings('rentDay', 1);
  await updateSharedBudget(0);
  
  // Default theme
  await saveSettings('theme', window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
}

export async function getSharedBudget() {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['sharedBudget'], 'readonly');
    const store = transaction.objectStore('sharedBudget');
    const request = store.get(1);
    request.onsuccess = () => resolve(request.result || { id: 1, balance: 0 });
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
      budget.lastUpdated = new Date().toISOString();
      
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

export async function getAllSettings() {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['settings'], 'readonly');
    const store = transaction.objectStore('settings');
    const request = store.getAll();
    request.onsuccess = () => {
      // Convert array of {key, value} objects to a single object for easier access
      const settings = {};
      request.result.forEach(item => {
        settings[item.key] = item.value;
      });
      resolve(settings);
    };
    request.onerror = () => reject(request.error);
  });
}

export async function saveWorkLog(log) {
  return new Promise((resolve, reject) => {
    if (!log.id) {
      log.id = Date.now().toString();
    }
    
    // Add created timestamp if not present
    if (!log.created) {
      log.created = new Date().toISOString();
    }
    
    const transaction = db.transaction(['workLogs'], 'readwrite');
    const store = transaction.objectStore('workLogs');
    const request = store.add(log);
    
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    
    // After saving, update budget with earnings
    transaction.oncomplete = () => {
      if (log.earnings) {
        updateSharedBudget(log.earnings);
      }
    };
  });
}

export async function getAllWorkLogs(filters = {}) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['workLogs'], 'readonly');
    const store = transaction.objectStore('workLogs');
    const request = store.getAll();
    
    request.onsuccess = () => {
      let results = request.result;
      
      // Apply filters if provided
      if (filters.person) {
        results = results.filter(log => log.person === filters.person);
      }
      if (filters.startDate) {
        const startDate = new Date(filters.startDate);
        results = results.filter(log => new Date(log.startTime) >= startDate);
      }
      if (filters.endDate) {
        const endDate = new Date(filters.endDate);
        results = results.filter(log => new Date(log.endTime) <= endDate);
      }
      if (filters.activity) {
        results = results.filter(log => log.activity === filters.activity);
      }
      
      resolve(results);
    };
    request.onerror = () => reject(request.error);
  });
}

export async function updateWorkLog(log) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['workLogs'], 'readwrite');
    const store = transaction.objectStore('workLogs');
    
    // First get the original log to calculate earning difference
    const getRequest = store.get(log.id);
    
    getRequest.onsuccess = () => {
      const oldLog = getRequest.result;
      const earningsDiff = (log.earnings || 0) - (oldLog.earnings || 0);
      
      // Update the log
      const updateRequest = store.put(log);
      updateRequest.onsuccess = () => resolve(log);
      updateRequest.onerror = () => reject(updateRequest.error);
      
      // Update budget with earnings difference if any
      if (earningsDiff !== 0) {
        transaction.oncomplete = () => {
          updateSharedBudget(earningsDiff);
        };
      }
    };
    
    getRequest.onerror = () => reject(getRequest.error);
  });
}

export async function deleteWorkLog(id) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['workLogs'], 'readwrite');
    const store = transaction.objectStore('workLogs');
    
    // First get the log to subtract earnings from budget
    const getRequest = store.get(id);
    
    getRequest.onsuccess = () => {
      const log = getRequest.result;
      const earnings = log?.earnings || 0;
      
      // Delete the log
      const deleteRequest = store.delete(id);
      deleteRequest.onsuccess = () => resolve();
      deleteRequest.onerror = () => reject(deleteRequest.error);
      
      // Update budget by subtracting earnings
      if (earnings !== 0) {
        transaction.oncomplete = () => {
          updateSharedBudget(-earnings);
        };
      }
    };
    
    getRequest.onerror = () => reject(getRequest.error);
  });
}

export async function saveFinanceRecord(rec) {
  return new Promise((resolve, reject) => {
    if (!rec.id) {
      rec.id = Date.now().toString();
    }
    
    // Add created timestamp if not present
    if (!rec.created) {
      rec.created = new Date().toISOString();
    }
    
    // Default date to today if not provided
    if (!rec.date) {
      rec.date = new Date().toISOString();
    }
    
    const transaction = db.transaction(['financeRecords'], 'readwrite');
    const store = transaction.objectStore('financeRecords');
    const request = store.add(rec);
    
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    
    // After saving, update budget
    transaction.oncomplete = () => {
      // Add amount for income, subtract for expense
      const amount = rec.type === 'income' ? rec.amount : -rec.amount;
      updateSharedBudget(amount);
    };
  });
}

export async function getAllFinanceRecords(filters = {}) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['financeRecords'], 'readonly');
    const store = transaction.objectStore('financeRecords');
    const request = store.getAll();
    
    request.onsuccess = () => {
      let results = request.result;
      
      // Apply filters if provided
      if (filters.type) {
        results = results.filter(rec => rec.type === filters.type);
      }
      if (filters.startDate) {
        const startDate = new Date(filters.startDate);
        results = results.filter(rec => new Date(rec.date) >= startDate);
      }
      if (filters.endDate) {
        const endDate = new Date(filters.endDate);
        results = results.filter(rec => new Date(rec.date) <= endDate);
      }
      if (filters.category) {
        results = results.filter(rec => rec.category === filters.category);
      }
      
      resolve(results);
    };
    request.onerror = () => reject(request.error);
  });
}

export async function saveDebt(debt) {
  return new Promise((resolve, reject) => {
    if (!debt.id) {
      debt.id = Date.now().toString();
    }
    
    // Add created timestamp if not present
    if (!debt.created) {
      debt.created = new Date().toISOString();
    }
    
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

export async function getAllDebtPayments() {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['debtPayments'], 'readonly');
    const store = transaction.objectStore('debtPayments');
    const request = store.getAll();
    
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function savePayment(payment) {
  return new Promise((resolve, reject) => {
    if (!payment.id) {
      payment.id = Date.now().toString();
    }
    
    // Add created timestamp if not present
    if (!payment.created) {
      payment.created = new Date().toISOString();
    }
    
    const transaction = db.transaction(['debtPayments'], 'readwrite');
    const store = transaction.objectStore('debtPayments');
    const request = store.add(payment);
    
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function getTaskCategories() {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['taskCategories'], 'readonly');
    const store = transaction.objectStore('taskCategories');
    const request = store.getAll();
    
    request.onsuccess = () => {
      // Filter to only return active categories
      const categories = request.result.filter(cat => cat.active);
      resolve(categories);
    };
    request.onerror = () => reject(request.error);
  });
}

export async function saveTaskCategory(category) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['taskCategories'], 'readwrite');
    const store = transaction.objectStore('taskCategories');
    
    const request = store.put(category);
    request.onsuccess = () => resolve(category);
    request.onerror = () => reject(request.error);
  });
}

export async function getExpenseCategories() {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['expenseCategories'], 'readonly');
    const store = transaction.objectStore('expenseCategories');
    const request = store.getAll();
    
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveExpenseCategory(category) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['expenseCategories'], 'readwrite');
    const store = transaction.objectStore('expenseCategories');
    
    const request = store.put(category);
    request.onsuccess = () => resolve(category);
    request.onerror = () => reject(request.error);
  });
}

export async function backupDatabase() {
  const backup = {
    version: 1,
    date: new Date().toISOString(),
    data: {}
  };
  
  // Get all data from each store
  const stores = ['workLogs', 'financeRecords', 'taskCategories', 'expenseCategories', 
                  'debts', 'debtPayments', 'settings', 'sharedBudget'];
  
  for (const storeName of stores) {
    backup.data[storeName] = await getAllData(storeName);
  }
  
  return backup;
}

async function getAllData(storeName) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([storeName], 'readonly');
    const store = transaction.objectStore(storeName);
    const request = store.getAll();
    
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function restoreDatabase(backup) {
  // Validate backup
  if (!backup || !backup.data) {
    throw new Error('Neplatná záloha');
  }
  
  // Clear each store and then add backup data
  const stores = Object.keys(backup.data);
  
  for (const storeName of stores) {
    await clearStore(storeName);
    
    if (backup.data[storeName] && backup.data[storeName].length > 0) {
      await addBulkData(storeName, backup.data[storeName]);
    }
  }
  
  return true;
}

async function clearStore(storeName) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([storeName], 'readwrite');
    const store = transaction.objectStore(storeName);
    const request = store.clear();
    
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

async function addBulkData(storeName, data) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([storeName], 'readwrite');
    const store = transaction.objectStore(storeName);
    
    let completed = 0;
    let errors = 0;
    
    data.forEach(item => {
      const request = store.add(item);
      
      request.onsuccess = () => {
        completed++;
        if (completed + errors === data.length) {
          if (errors > 0) {
            reject(new Error(`${errors} chyb při obnovení dat`));
          } else {
            resolve();
          }
        }
      };
      
      request.onerror = () => {
        console.error(`Error adding item to ${storeName}:`, item, request.error);
        errors++;
        completed++;
        if (completed + errors === data.length) {
          if (errors > 0) {
            reject(new Error(`${errors} chyb při obnovení dat`));
          } else {
            resolve();
          }
        }
      };
    });
    
    // Handle empty data array
    if (data.length === 0) {
      resolve();
    }
  });
}