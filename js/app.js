/**
 * Central app state and event orchestration.
 * Depends on: utils.js, storage.js, editor.js, ui.js
 */

const state = {
  screen: 'landing',       // 'landing' | 'editor'
  draft: null,             // the full draft object
  currentFile: null,       // currently selected file name
  searchQuery: '',         // search input value
  activeFilter: 'all',     // 'all' | 'empty' | 'changed' | 'unchanged'
  undoStack: [],           // [{filename, key, oldValue, newValue}]
  lastSavedAt: null,       // ISO timestamp of last localStorage save
  flatCache: {},           // { filename: {key: value} } flattened current
};

/* ─── Bootstrap ───────────────────────────────────────────────────── */

document.addEventListener('DOMContentLoaded', () => {
  cleanupOldDrafts();

  const draft = loadDraft();
  if (draft) {
    state.draft = draft;
    renderLanding(true);
  } else {
    renderLanding(false);
  }

  document.addEventListener('keydown', handleGlobalKeydown);

  window.addEventListener('tae:storage-full', () => {
    showToast('Storage full! Download your files now or clear the draft.', 'error', 8000);
  });

  window.addEventListener('tae:storage-warning', (e) => {
    showToast(`Draft is large (${e.detail.mb}MB). Consider downloading soon.`, 'warning', 5000);
  });

  // Update relative timestamps every 5 seconds
  setInterval(tickTimestamps, 5000);
});

/* ─── Screen transitions ───────────────────────────────────────────── */

/**
 * Load files into state and transition to editor screen.
 * @param {Array<{name, data}>} files  parsed file objects
 */
function loadFiles(files) {
  const draft = createDraft(files);
  state.draft = draft;
  state.currentFile = files[0].name;
  state.undoStack = [];
  state.searchQuery = '';
  state.activeFilter = 'all';
  state.flatCache = {};

  // Build flat cache for all files
  for (const f of files) {
    state.flatCache[f.name] = flattenJSON(f.data);
  }

  const ok = saveDraft(draft);
  if (!ok) return; // storage-full event fires automatically

  state.lastSavedAt = new Date().toISOString();
  transitionToEditor();
}

/**
 * Restore a draft from localStorage and go to editor.
 */
function restoreDraft() {
  if (!state.draft) return;
  state.currentFile = state.draft.metadata.fileNames[0];
  state.undoStack = [];
  state.flatCache = {};

  for (const fname of state.draft.metadata.fileNames) {
    state.flatCache[fname] = flattenJSON(state.draft.files[fname].current);
  }

  state.lastSavedAt = state.draft.metadata.lastModifiedAt;
  transitionToEditor();
}

function transitionToEditor() {
  state.screen = 'editor';
  renderEditor();
  initPeriodicSave();
  checkStorageSize();
}

function transitionToLanding(keepDraft = false) {
  state.screen = 'landing';
  stopPeriodicSave();
  if (!keepDraft) {
    state.draft = null;
    state.currentFile = null;
    state.undoStack = [];
    state.flatCache = {};
  }
  const hasDraftNow = keepDraft && state.draft !== null;
  renderLanding(hasDraftNow);
}

/* ─── Flat cache helpers ───────────────────────────────────────────── */

/**
 * Get the flat key→value map for the current file's *current* state.
 */
function getCurrentFlat() {
  if (!state.draft || !state.currentFile) return {};
  const fileData = state.draft.files[state.currentFile];
  if (!fileData) return {};
  // Always re-derive from current (cache may be stale after edits)
  return flattenJSON(fileData.current);
}

/**
 * Get the flat key→value map for the current file's *original* state.
 */
function getOriginalFlat() {
  if (!state.draft || !state.currentFile) return {};
  const fileData = state.draft.files[state.currentFile];
  if (!fileData) return {};
  return flattenJSON(fileData.original);
}

/* ─── Filtered row list ────────────────────────────────────────────── */

/**
 * Return the list of visible rows after applying search + filter.
 * Each row: { key, originalValue, currentValue, changed, empty }
 */
function getFilteredRows() {
  const currentFlat = getCurrentFlat();
  const originalFlat = getOriginalFlat();
  const allKeys = Object.keys(originalFlat);

  const q = state.searchQuery.toLowerCase().trim();

  return allKeys.filter(key => {
    const current = currentFlat[key];
    const original = originalFlat[key];
    const changed = String(current) !== String(original);
    const empty = !current && current !== 0;

    // Filter
    if (state.activeFilter === 'empty' && !empty) return false;
    if (state.activeFilter === 'changed' && !changed) return false;
    if (state.activeFilter === 'unchanged' && changed) return false;

    // Search
    if (q) {
      const keyMatch = key.toLowerCase().includes(q);
      const valMatch = String(current || '').toLowerCase().includes(q) ||
                       String(original || '').toLowerCase().includes(q);
      if (!keyMatch && !valMatch) return false;
    }

    return true;
  }).map(key => ({
    key,
    originalValue: originalFlat[key],
    currentValue: currentFlat[key],
    changed: String(currentFlat[key]) !== String(originalFlat[key]),
    empty: !currentFlat[key] && currentFlat[key] !== 0,
  }));
}

/* ─── Event delegation ─────────────────────────────────────────────── */

document.addEventListener('click', (e) => {
  const t = e.target;

  // Landing: upload button
  if (t.matches('#btn-upload-trigger') || t.closest('#btn-upload-trigger')) {
    document.getElementById('file-input')?.click();
    return;
  }

  // Landing: restore draft
  if (t.matches('#btn-restore') || t.closest('#btn-restore')) {
    restoreDraft();
    return;
  }

  // Landing: discard draft
  if (t.matches('#btn-discard') || t.closest('#btn-discard')) {
    clearDraft();
    state.draft = null;
    renderLanding(false);
    return;
  }

  // Editor: file tab
  if (t.matches('[data-tab-file]') || t.closest('[data-tab-file]')) {
    const el = t.matches('[data-tab-file]') ? t : t.closest('[data-tab-file]');
    const fname = el.dataset.tabFile;
    if (fname && fname !== state.currentFile) {
      if (activeCell) closeCellEditor(true);
      state.currentFile = fname;
      state.searchQuery = '';
      state.activeFilter = 'all';
      renderEditorBody();
      renderFileTabs();
      renderProgressBar();
      renderChangeCount();
      updateColumnHeaders();
    }
    return;
  }

  // Editor: editable cell
  if (t.matches('[data-cell-key]') || t.closest('[data-cell-key]')) {
    const cell = t.matches('[data-cell-key]') ? t : t.closest('[data-cell-key]');
    const key = cell.dataset.cellKey;
    const filename = cell.dataset.cellFile;
    if (key && filename) {
      openCellEditor(cell, filename, key);
    }
    return;
  }

  // Editor: filter pill
  if (t.matches('[data-filter]') || t.closest('[data-filter]')) {
    const el = t.matches('[data-filter]') ? t : t.closest('[data-filter]');
    state.activeFilter = el.dataset.filter;
    if (activeCell) closeCellEditor(true);
    renderFilterPills();
    renderEditorBody();
    return;
  }

  // Editor: download button
  if (t.matches('#btn-download') || t.closest('#btn-download')) {
    showDownloadModal();
    return;
  }

  // Editor: view diff
  if (t.matches('#btn-diff') || t.closest('#btn-diff')) {
    renderDiffModal();
    return;
  }

  // Editor: clear draft
  if (t.matches('#btn-clear-draft') || t.closest('#btn-clear-draft')) {
    showConfirmDialog(
      'Clear draft?',
      'All unsaved changes will be permanently lost.',
      () => {
        clearDraft();
        transitionToLanding(false);
        showToast('Draft cleared', 'success');
      }
    );
    return;
  }

  // Editor: upload new
  if (t.matches('#btn-upload-new') || t.closest('#btn-upload-new')) {
    if (activeCell) closeCellEditor(true);
    showConfirmDialog(
      'Upload new files?',
      'Your current draft will be kept in case you want to restore it.',
      () => transitionToLanding(true)
    );
    return;
  }

  // Modal: close
  if (t.matches('#modal-overlay') || t.matches('[data-modal-close]') || t.closest('[data-modal-close]')) {
    closeModal();
    return;
  }

  // Download modal actions
  if (t.matches('[data-download-action]') || t.closest('[data-download-action]')) {
    const el = t.matches('[data-download-action]') ? t : t.closest('[data-download-action]');
    handleDownloadAction(el.dataset.downloadAction);
    return;
  }

  // Copy to clipboard button
  if (t.matches('#btn-copy-clipboard') || t.closest('#btn-copy-clipboard')) {
    handleCopyToClipboard();
    return;
  }

  // Diff: copy as markdown
  if (t.matches('#btn-copy-diff') || t.closest('#btn-copy-diff')) {
    copyDiffAsMarkdown();
    return;
  }

  // Confirm dialog
  if (t.matches('#confirm-ok') || t.closest('#confirm-ok')) {
    document.dispatchEvent(new CustomEvent('tae:confirm-ok'));
    return;
  }
  if (t.matches('#confirm-cancel') || t.closest('#confirm-cancel')) {
    document.dispatchEvent(new CustomEvent('tae:confirm-cancel'));
    return;
  }
});

/* ─── File input / drag-drop ───────────────────────────────────────── */

document.addEventListener('change', (e) => {
  if (e.target.matches('#file-input')) {
    handleFileInputChange(e.target.files);
  }
});

document.addEventListener('input', (e) => {
  if (e.target.matches('#search-input')) {
    state.searchQuery = e.target.value;
    renderEditorBody();
  }
});

/**
 * Handle files selected via file input or drop.
 * @param {FileList|File[]} files
 */
async function handleFileInputChange(files) {
  const parsed = [];
  const errors = [];

  for (const file of files) {
    if (!file.name.endsWith('.json')) {
      errors.push(`${file.name}: not a JSON file`);
      continue;
    }
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      if (typeof data !== 'object' || Array.isArray(data)) {
        errors.push(`${file.name}: must be a JSON object`);
        continue;
      }
      parsed.push({ name: file.name, data });
    } catch {
      errors.push(`${file.name}: invalid JSON`);
    }
  }

  if (errors.length > 0) {
    showToast(`Error: ${errors.join(' | ')}`, 'error', 6000);
  }

  if (parsed.length > 0) {
    loadFiles(parsed);
  }
}

/* ─── Download handling ────────────────────────────────────────────── */

function handleDownloadAction(action) {
  if (!state.draft) return;
  closeModal();

  const filenames = state.draft.metadata.fileNames;

  if (action === 'current') {
    const fname = state.currentFile;
    const data = state.draft.files[fname]?.current;
    if (data) {
      downloadFile(fname, JSON.stringify(data, null, 2));
      showToast(`Downloaded: ${fname}`, 'success');
    }
    return;
  }

  if (action === 'all') {
    if (filenames.length === 1) {
      const fname = filenames[0];
      const data = state.draft.files[fname]?.current;
      downloadFile(fname, JSON.stringify(data, null, 2));
      showToast(`Downloaded: ${fname}`, 'success');
    } else {
      const filesMap = {};
      for (const fname of filenames) {
        const data = state.draft.files[fname]?.current;
        if (data) filesMap[fname] = JSON.stringify(data, null, 2);
      }
      downloadZip(filesMap, 'translations.zip').then(() => {
        showToast('Downloaded: translations.zip', 'success');
      });
    }
    return;
  }
}

async function handleCopyToClipboard() {
  if (!state.draft || !state.currentFile) return;
  const data = state.draft.files[state.currentFile]?.current;
  if (!data) return;
  try {
    await navigator.clipboard.writeText(JSON.stringify(data, null, 2));
    showToast('Copied to clipboard!', 'success');
  } catch {
    showToast('Failed to copy to clipboard', 'error');
  }
  closeModal();
}

/* ─── Diff helpers ─────────────────────────────────────────────────── */

function copyDiffAsMarkdown() {
  const changes = getDiffChanges();
  if (changes.length === 0) {
    showToast('No changes to copy', 'info');
    return;
  }
  const lines = ['# Translation Diff\n'];
  lines.push(`**File:** ${state.currentFile}`);
  lines.push(`**Changes:** ${changes.length} keys\n`);
  lines.push('| Key | Before | After |');
  lines.push('|-----|--------|-------|');
  for (const { key, oldVal, newVal } of changes) {
    lines.push(`| \`${key}\` | ${oldVal || '_(empty)_'} | ${newVal || '_(empty)_'} |`);
  }
  navigator.clipboard.writeText(lines.join('\n')).then(() => {
    showToast('Diff copied as Markdown', 'success');
  });
}

function getDiffChanges() {
  if (!state.draft || !state.currentFile) return [];
  const fileData = state.draft.files[state.currentFile];
  if (!fileData) return [];
  return fileData.changeLog.map(entry => ({
    key: entry.key,
    oldVal: entry.oldValue,
    newVal: entry.newValue,
    timestamp: entry.timestamp,
  }));
}

/* ─── Periodic UI ticks ────────────────────────────────────────────── */

function tickTimestamps() {
  updateSaveStatus(null); // just refresh the display
}

/* ─── Confirm dialog helper ────────────────────────────────────────── */

function showConfirmDialog(title, message, onOk) {
  renderConfirmDialog(title, message);
  const onOkHandler = () => {
    cleanup();
    onOk();
    closeModal();
  };
  const onCancelHandler = () => {
    cleanup();
    closeModal();
  };
  function cleanup() {
    document.removeEventListener('tae:confirm-ok', onOkHandler);
    document.removeEventListener('tae:confirm-cancel', onCancelHandler);
  }
  document.addEventListener('tae:confirm-ok', onOkHandler, { once: true });
  document.addEventListener('tae:confirm-cancel', onCancelHandler, { once: true });
}
