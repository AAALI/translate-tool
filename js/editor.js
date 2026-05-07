/**
 * Editor module: inline cell editing, debounced auto-save, undo stack, keyboard nav.
 * Depends on: utils.js, storage.js, app.js (state)
 */

const DEBOUNCE_MS = 1500;
const PERIODIC_SAVE_MS = 30000;
const UNDO_LIMIT = 50;

let autoSaveTimer = null;
let periodicSaveTimer = null;
let activeCell = null; // { row, filename, key, textarea }

/**
 * Initialize periodic auto-save interval.
 */
function initPeriodicSave() {
  if (periodicSaveTimer) clearInterval(periodicSaveTimer);
  periodicSaveTimer = setInterval(() => {
    if (state.draft) {
      const ok = saveDraft(state.draft);
      if (ok) {
        state.lastSavedAt = new Date().toISOString();
        updateSaveStatus('saved');
      }
    }
  }, PERIODIC_SAVE_MS);
}

/**
 * Stop periodic auto-save.
 */
function stopPeriodicSave() {
  if (periodicSaveTimer) {
    clearInterval(periodicSaveTimer);
    periodicSaveTimer = null;
  }
}

/**
 * Schedule an auto-save after debounce delay.
 * @param {string} filename
 * @param {string} key  dot-notation key
 * @param {string} newValue
 * @param {string} oldValue
 */
function scheduleAutoSave(filename, key, newValue, oldValue) {
  clearTimeout(autoSaveTimer);
  updateSaveStatus('pending');

  autoSaveTimer = setTimeout(() => {
    commitSave(filename, key, newValue, oldValue);
  }, DEBOUNCE_MS);
}

/**
 * Immediately persist a change to the draft and localStorage.
 */
function commitSave(filename, key, newValue, oldValue) {
  if (!state.draft || !state.draft.files[filename]) return;

  const fileData = state.draft.files[filename];

  // Update nested current value
  setNestedValue(fileData.current, key, newValue);
  fileData.hasChanges = true;

  // Append to changeLog (keep deduplicated per key — only track latest)
  const existingIdx = fileData.changeLog.findIndex(c => c.key === key);
  const logEntry = {
    key,
    oldValue: existingIdx >= 0 ? fileData.changeLog[existingIdx].oldValue : oldValue,
    newValue,
    timestamp: new Date().toISOString(),
  };
  if (existingIdx >= 0) {
    fileData.changeLog[existingIdx] = logEntry;
  } else {
    fileData.changeLog.push(logEntry);
  }

  state.draft.metadata.lastModifiedAt = new Date().toISOString();

  const ok = saveDraft(state.draft);
  if (ok) {
    state.lastSavedAt = new Date().toISOString();
    updateSaveStatus('saved');
    updateProgressBar();
    updateChangeCount();
  } else {
    updateSaveStatus('error');
  }
}

/**
 * Push a change onto the undo stack.
 */
function pushUndo(filename, key, oldValue, newValue) {
  state.undoStack.push({ filename, key, oldValue, newValue });
  if (state.undoStack.length > UNDO_LIMIT) {
    state.undoStack.shift();
  }
}

/**
 * Undo the last change.
 */
function undoLastChange() {
  if (state.undoStack.length === 0) {
    showToast('Nothing to undo', 'info');
    return;
  }
  const { filename, key, oldValue } = state.undoStack.pop();
  const fileData = state.draft?.files[filename];
  if (!fileData) return;

  setNestedValue(fileData.current, key, oldValue);

  // Remove from changeLog if same as original
  const originalValue = getNestedValue(fileData.original, key);
  if (oldValue === originalValue) {
    const idx = fileData.changeLog.findIndex(c => c.key === key);
    if (idx >= 0) fileData.changeLog.splice(idx, 1);
  } else {
    const idx = fileData.changeLog.findIndex(c => c.key === key);
    if (idx >= 0) fileData.changeLog[idx].newValue = oldValue;
  }

  fileData.hasChanges = fileData.changeLog.length > 0;
  state.draft.metadata.lastModifiedAt = new Date().toISOString();
  saveDraft(state.draft);
  state.lastSavedAt = new Date().toISOString();

  // Refresh the cell in the DOM
  refreshCell(filename, key, oldValue);
  updateProgressBar();
  updateChangeCount();
  showToast('Change undone', 'success');
}

/**
 * Open a cell for inline editing.
 * @param {HTMLElement} cell  the <td> element
 * @param {string} filename
 * @param {string} key
 */
function openCellEditor(cell, filename, key) {
  if (activeCell) closeCellEditor(true); // save any open cell first

  const fileData = state.draft?.files[filename];
  if (!fileData) return;

  const currentVal = getNestedValue(fileData.current, key);
  const originalVal = getNestedValue(fileData.original, key);
  const displayVal = currentVal !== undefined ? currentVal : '';
  const rtl = isRTL(String(displayVal)) || isRTL(String(originalVal || ''));

  cell.classList.add('cell-editing');

  const textarea = document.createElement('textarea');
  textarea.className = 'cell-textarea';
  textarea.value = displayVal === null ? '' : String(displayVal);
  textarea.setAttribute('dir', rtl ? 'rtl' : 'ltr');
  textarea.setAttribute('spellcheck', 'false');
  textarea.setAttribute('data-key', key);
  textarea.setAttribute('data-filename', filename);

  // Auto-resize height
  textarea.style.height = 'auto';

  cell.innerHTML = '';
  cell.appendChild(textarea);

  textarea.focus();
  textarea.select();

  const savedOldValue = displayVal;

  textarea.addEventListener('input', () => {
    textarea.style.height = 'auto';
    textarea.style.height = textarea.scrollHeight + 'px';
    scheduleAutoSave(filename, key, textarea.value, savedOldValue);
  });

  textarea.addEventListener('blur', () => {
    closeCellEditor(true, textarea.value, savedOldValue);
  });

  textarea.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      closeCellEditor(false);
    } else if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      closeCellEditor(true, textarea.value, savedOldValue);
      navigateCell('down');
    } else if (e.key === 'Tab') {
      e.preventDefault();
      closeCellEditor(true, textarea.value, savedOldValue);
      navigateCell(e.shiftKey ? 'up' : 'down');
    }
  });

  activeCell = { cell, filename, key, textarea, savedOldValue };
}

/**
 * Close the currently active cell editor.
 * @param {boolean} save  whether to save the current value
 * @param {string} [newVal]
 * @param {string} [oldVal]
 */
function closeCellEditor(save, newVal, oldVal) {
  if (!activeCell) return;
  const { cell, filename, key, textarea, savedOldValue } = activeCell;

  clearTimeout(autoSaveTimer);
  activeCell = null;
  cell.classList.remove('cell-editing');

  const finalNewVal = newVal !== undefined ? newVal : (textarea?.value ?? '');
  const finalOldVal = oldVal !== undefined ? oldVal : savedOldValue;

  if (save && finalNewVal !== finalOldVal) {
    pushUndo(filename, key, finalOldVal, finalNewVal);
    commitSave(filename, key, finalNewVal, finalOldVal);
  }

  // Restore cell display
  refreshCell(filename, key, finalNewVal);
}

/**
 * Refresh a single cell's display after an edit.
 */
function refreshCell(filename, key, value) {
  const cell = document.querySelector(`[data-cell-key="${CSS.escape(key)}"][data-cell-file="${CSS.escape(filename)}"]`);
  if (!cell) return;

  const fileData = state.draft?.files[filename];
  const originalVal = fileData ? getNestedValue(fileData.original, key) : '';
  const currentVal = value !== undefined ? value : (fileData ? getNestedValue(fileData.current, key) : '');
  const changed = String(currentVal) !== String(originalVal);
  const empty = !currentVal && currentVal !== 0;
  const rtl = isRTL(String(currentVal || '')) || isRTL(String(originalVal || ''));

  cell.className = 'cell-target px-3 py-2 cursor-pointer transition-colors' +
    (changed ? ' cell-changed' : '') +
    (empty ? ' cell-empty' : '');
  cell.setAttribute('dir', rtl ? 'rtl' : 'ltr');

  const display = empty
    ? `<span class="cell-placeholder">Click to translate…</span>`
    : escapeHTML(String(currentVal));

  const badge = changed ? `<span class="cell-badge-changed" title="Modified">●</span>` : '';

  cell.innerHTML = `${badge}${display}`;
}

/**
 * Navigate to the next/previous editable cell in the table.
 * @param {'up'|'down'} direction
 */
function navigateCell(direction) {
  const cells = Array.from(document.querySelectorAll('[data-cell-key]'));
  if (cells.length === 0) return;

  // find currently focused or last active
  const currentKey = document.querySelector('[data-cell-key].cell-editing')?.dataset?.cellKey;
  const currentIdx = currentKey ? cells.findIndex(c => c.dataset.cellKey === currentKey) : -1;

  let nextIdx = direction === 'down' ? currentIdx + 1 : currentIdx - 1;
  if (nextIdx < 0) nextIdx = cells.length - 1;
  if (nextIdx >= cells.length) nextIdx = 0;

  const nextCell = cells[nextIdx];
  if (nextCell) {
    nextCell.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    nextCell.click();
  }
}

/**
 * Global keyboard shortcut handler.
 */
function handleGlobalKeydown(e) {
  // Escape: close any open modal
  if (e.key === 'Escape') {
    const overlay = document.getElementById('modal-overlay');
    if (overlay && overlay.style.display !== 'none') {
      closeModal();
      return;
    }
  }

  // Ctrl+Z: undo
  if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
    if (!e.target.matches('textarea, input')) {
      e.preventDefault();
      undoLastChange();
    }
  }

  // Ctrl+S: manual save
  if ((e.ctrlKey || e.metaKey) && e.key === 's') {
    e.preventDefault();
    if (state.draft) {
      clearTimeout(autoSaveTimer);
      saveDraft(state.draft);
      state.lastSavedAt = new Date().toISOString();
      updateSaveStatus('saved');
      showToast('Manually saved to browser', 'success');
    }
  }
}
