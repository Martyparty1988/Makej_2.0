// enhancements.js - Additional features for the work tracking app

export function enableSwipeNavigation() {
  let startX, startY;
  const threshold = 100;
  
  document.addEventListener('touchstart', e => {
    startX = e.touches[0].clientX;
    startY = e.touches[0].clientY;
  });
  
  document.addEventListener('touchend', e => {
    if (!startX || !startY) return;
    
    const endX = e.changedTouches[0].clientX;
    const endY = e.changedTouches[0].clientY;
    
    const diffX = endX - startX;
    const diffY = endY - startY;
    
    // Only handle horizontal swipes (ignore more vertical ones)
    if (Math.abs(diffX) < Math.abs(diffY) || Math.abs(diffX) < threshold) return;
    
    // Don't handle swipes that started on form inputs
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || 
        e.target.tagName === 'SELECT' || e.target.tagName === 'BUTTON') return;
    
    const sections = ['dochazka', 'finance', 'srazky', 'prehledy', 'nastaveni'];
    const currentIndex = sections.findIndex(s => 
      document.getElementById(s).classList.contains('active')
    );
    
    if (diffX > 0 && currentIndex > 0) {
      // Swipe right - go to previous section
      document.querySelector(`nav a[data-section="${sections[currentIndex-1]}"]`).click();
    } else if (diffX < 0 && currentIndex < sections.length - 1) {
      // Swipe left - go to next section
      document.querySelector(`nav a[data-section="${sections[currentIndex+1]}"]`).click();
    }
    
    startX = startY = null;
  });
  
  // Add swipe hint
  const swipeHint = document.createElement('div');
  swipeHint.className = 'swipe-hint';
  swipeHint.textContent = 'Swipe pro navigaci';
  swipeHint.style.cssText = `
    position: fixed;
    bottom: 15px;
    left: 50%;
    transform: translateX(-50%);
    background: rgba(0,0,0,0.6);
    color: white;
    padding: 5px 10px;
    border-radius: 20px;
    font-size: 12px;
    opacity: 0.7;
    z-index: 100;
  `;
  
  document.body.appendChild(swipeHint);
  
  // Hide hint after 5 seconds
  setTimeout(() => {
    swipeHint.style.opacity = '0';
    swipeHint.style.transition = 'opacity 0.5s ease';
    setTimeout(() => swipeHint.remove(), 500);
  }, 5000);
}

export function addQuickTaskButton() {
  const btn = document.createElement('button');
  btn.className = 'floating-add-btn';
  btn.innerHTML = '<i class="fas fa-plus"></i>';
  btn.setAttribute('aria-label', 'Rychlý záznam');
  btn.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    width: 56px;
    height: 56px;
    border-radius: 50%;
    background: var(--primary-color);
    color: white;
    border: none;
    box-shadow: 0 3px 8px rgba(0,0,0,0.2);
    z-index: 999;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 20px;
    cursor: pointer;
    transition: transform 0.2s, background-color 0.2s;
  `;
  
  // Add hover effect
  btn.addEventListener('mouseenter', () => {
    btn.style.transform = 'scale(1.1)';
    btn.style.backgroundColor = 'var(--primary-dark)';
  });
  
  btn.addEventListener('mouseleave', () => {
    btn.style.transform = 'scale(1)';
    btn.style.backgroundColor = 'var(--primary-color)';
  });
  
  document.body.appendChild(btn);
  
  // Create quick entry modal
  const modal = document.createElement('div');
  modal.className = 'quick-entry-modal';
  modal.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0,0,0,0.5);
    display: none;
    align-items: center;
    justify-content: center;
    z-index: 1000;
  `;
  
  const modalContent = document.createElement('div');
  modalContent.className = 'modal-content';
  modalContent.style.cssText = `
    background: var(--card-bg);
    border-radius: var(--border-radius-lg);
    width: 90%;
    max-width: 400px;
    box-shadow: 0 4px 15px rgba(0,0,0,0.2);
    padding: 20px;
  `;
  
  modalContent.innerHTML = `
    <h3>Rychlý Záznam</h3>
    <form id="quick-form">
      <div class="form-group" style="margin-bottom: 10px;">
        <select id="quick-person" required style="width: 100%; margin-bottom: 10px;">
          <option value="maru">Maru (275 Kč/h)</option>
          <option value="marty">Marty (400 Kč/h)</option>
        </select>
      </div>
      <div class="form-group" style="margin-bottom: 10px;">
        <select id="quick-task" required style="width: 100%; margin-bottom: 10px;">
          <option value="">-- Vyberte úkol --</option>
          <option value="Development">Development</option>
          <option value="Design">Design</option>
          <option value="Meeting">Meeting</option>
          <option value="Research">Research</option>
        </select>
      </div>
      <div class="form-group" style="margin-bottom: 10px;">
        <input type="number" id="quick-hours" placeholder="Počet hodin" required step="0.1" min="0.1" style="width: 100%; margin-bottom: 10px;">
      </div>
      <div class="form-group" style="margin-bottom: 10px;">
        <textarea id="quick-note" placeholder="Poznámka (volitelná)" style="width: 100%; margin-bottom: 10px;"></textarea>
      </div>
      <div class="form-actions" style="display: flex; gap: 10px;">
        <button type="button" id="quick-cancel" class="btn" style="flex: 1; background: var(--secondary-color); color: white;">Zrušit</button>
        <button type="submit" class="btn" style="flex: 1; background: var(--success-color); color: white;">Uložit</button>
      </div>
    </form>
  `;
  
  modal.appendChild(modalContent);
  document.body.appendChild(modal);
  
  // Open modal on button click
  btn.addEventListener('click', () => {
    modal.style.display = 'flex';
    document.getElementById('quick-task').focus();
  });
  
  // Close modal on cancel
  document.getElementById('quick-cancel').addEventListener('click', () => {
    modal.style.display = 'none';
  });
  
  // Close modal on outside click
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.style.display = 'none';
    }
  });
  
  // Handle form submission
  document.getElementById('quick-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const person = document.getElementById('quick-person').value;
    const task = document.getElementById('quick-task').value;
    const hours = parseFloat(document.getElementById('quick-hours').value);
    const note = document.getElementById('quick-note').value;
    
    if (!person || !task || isNaN(hours) || hours <= 0) {
      alert('Vyplňte prosím všechna povinná pole.');
      return;
    }
    
    // Create log entry
    try {
      const rate = person === 'maru' ? 275 : 400;
      const now = new Date();
      const startTime = new Date(now - (hours * 60 * 60 * 1000));
      
      const log = {
        person,
        activity: task,
        note,
        startTime: startTime.toISOString(),
        endTime: now.toISOString(),
        duration: hours * 60 * 60 * 1000,
        earnings: Math.round(hours * rate)
      };
      
      // Import saveWorkLog function dynamically
      const { saveWorkLog } = await import('./db.js');
      const { showNotification, loadAllData } = await import('./ui.js');
      
      await saveWorkLog(log);
      modal.style.display = 'none';
      
      // Clear form
      document.getElementById('quick-form').reset();
      
      // Show notification and refresh data
      showNotification('Záznam uložen', 'success');
      loadAllData();
      
    } catch (error) {
      console.error('Error saving log:', error);
      alert('Nastala chyba při ukládání záznamu.');
    }
  });
}

export function checkStorageUsage() {
  if (!navigator.storage || !navigator.storage.estimate) {
    console.log('Storage API not supported');
    return;
  }
  
  navigator.storage.estimate().then(estimate => {
    const used = Math.round(estimate.usage / 1024 / 1024 * 100) / 100;
    const quota = Math.round(estimate.quota / 1024 / 1024 * 100) / 100;
    const percent = Math.round(used / quota * 100);
    
    // Create storage info element
    const storageInfo = document.createElement('div');
    storageInfo.className = 'storage-info';
    storageInfo.style.cssText = `
      margin-top: 15px;
      padding: 15px;
      background-color: rgba(0, 0, 0, 0.02);
      border-radius: var(--border-radius-md);
    `;
    
    storageInfo.innerHTML = `
      <div style="margin-bottom: 8px; font-size: var(--font-size-sm); color: var(--secondary-color);">
        Využití úložiště
      </div>
      <div style="height: 8px; background-color: rgba(0, 0, 0, 0.1); border-radius: 4px; overflow: hidden; margin-bottom: 5px;">
        <div style="height: 100%; width: ${percent}%; background-color: var(--primary-color); border-radius: 4px;"></div>
      </div>
      <div style="font-size: var(--font-size-xs); color: var(--secondary-color); text-align: right;">
        ${used} MB z ${quota} MB (${percent}%)
      </div>
    `;
    
    // Add clear data button
    const dataManagement = document.querySelector('.data-management');
    if (dataManagement) {
      dataManagement.appendChild(storageInfo);
    }
  }).catch(error => {
    console.error('Error getting storage estimate:', error);
  });
}
