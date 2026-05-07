/**
 * Central app state and event orchestration.
 * Depends on: utils.js, storage.js, editor.js, ui.js
 */

const state = {
  screen: 'landing',       // 'landing' | 'editor'
  draft: null,             // the full draft object
  searchQuery: '',         // search input value
  activeFilter: 'all',     // 'all' | 'empty' | 'changed' | 'unchanged'
  undoStack: [],           // [{filename, key, oldValue, newValue}]
  lastSavedAt: null,       // ISO timestamp of last localStorage save
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
  state.undoStack = [];
  state.searchQuery = '';
  state.activeFilter = 'all';

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
  state.undoStack = [];
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
    state.undoStack = [];
  }
  const hasDraftNow = keepDraft && state.draft !== null;
  renderLanding(hasDraftNow);
}

/* ─── Add language ─────────────────────────────────────────────────── */

/**
 * Build an empty skeleton (same nested structure, all leaf values = "")
 * from the union of keys across all currently loaded files.
 */
function buildEmptySkeleton() {
  if (!state.draft) return {};
  const fileNames = state.draft.metadata.fileNames;
  const merged = {};
  for (const fname of fileNames) {
    const flat = flattenJSON(state.draft.files[fname]?.original || {});
    for (const k of Object.keys(flat)) {
      if (!(k in merged)) merged[k] = '';
    }
  }
  return unflattenJSON(merged);
}

/**
 * Add a new (blank) language file to the current draft.
 * Pre-populates the structure with empty strings so the downloaded JSON
 * matches the existing file's shape.
 * @param {string} filename  e.g. "fr.json"
 */
function addLanguageFile(filename) {
  if (!state.draft) return;
  if (!filename || typeof filename !== 'string') return;

  filename = filename.trim();
  if (!/\.json$/i.test(filename)) filename += '.json';
  if (!/^[a-zA-Z0-9._\-]+$/.test(filename.replace(/\.json$/i, ''))) {
    showToast('Filename must contain only letters, numbers, dots, dashes, or underscores', 'error');
    return;
  }

  if (state.draft.metadata.fileNames.length >= MAX_LANGUAGES) {
    showToast(`Maximum ${MAX_LANGUAGES} languages reached`, 'warning');
    return;
  }
  if (state.draft.files[filename]) {
    showToast(`${filename} already exists`, 'error');
    return;
  }

  const skeleton = buildEmptySkeleton();
  state.draft.files[filename] = {
    original: JSON.parse(JSON.stringify(skeleton)),
    current:  JSON.parse(JSON.stringify(skeleton)),
    hasChanges: false,
    changeLog: [],
  };
  state.draft.metadata.fileNames.push(filename);
  state.draft.metadata.lastModifiedAt = new Date().toISOString();

  const ok = saveDraft(state.draft);
  if (!ok) return;
  state.lastSavedAt = new Date().toISOString();

  closeModal();
  renderEditor();
  showToast(`Added ${filename} — fill in the empty cells`, 'success');
}

/* ─── Reorder language columns ─────────────────────────────────────── */

/**
 * Move a file/language column left or right in the display order.
 * @param {string} filename
 * @param {'left'|'right'} direction
 */
function moveFileColumn(filename, direction) {
  if (!state.draft) return;
  const names = state.draft.metadata.fileNames;
  const idx = names.indexOf(filename);
  if (idx === -1) return;

  const target = direction === 'left' ? idx - 1 : idx + 1;
  if (target < 0 || target >= names.length) return;

  [names[idx], names[target]] = [names[target], names[idx]];
  state.draft.metadata.lastModifiedAt = new Date().toISOString();

  const ok = saveDraft(state.draft);
  if (!ok) return;
  state.lastSavedAt = new Date().toISOString();

  if (activeCell) closeCellEditor(true);
  renderEditor();
}

/**
 * Remove a language/file from the draft after user confirmation.
 * @param {string} filename
 */
function removeFileColumn(filename) {
  if (!state.draft) return;
  const names = state.draft.metadata.fileNames;
  if (!names.includes(filename)) return;
  if (names.length <= 1) {
    showToast('Cannot remove the last remaining language', 'warning');
    return;
  }

  const fileData = state.draft.files[filename];
  const editCount = fileData?.changeLog?.length || 0;
  const detail = editCount > 0
    ? `${filename} contains ${editCount} edit${editCount !== 1 ? 's' : ''}. This action cannot be undone — download it first if you want to keep your work.`
    : `${filename} will be permanently removed from this draft. This action cannot be undone.`;

  showConfirmDialog(
    `Remove ${filename}?`,
    detail,
    () => {
      const idx = state.draft.metadata.fileNames.indexOf(filename);
      if (idx !== -1) state.draft.metadata.fileNames.splice(idx, 1);
      delete state.draft.files[filename];
      state.draft.metadata.lastModifiedAt = new Date().toISOString();

      const ok = saveDraft(state.draft);
      if (!ok) return;
      state.lastSavedAt = new Date().toISOString();

      if (activeCell) closeCellEditor(true);
      renderEditor();
      showToast(`Removed ${filename}`, 'success');
    }
  );
}

/* ─── Flat data helpers ────────────────────────────────────────────── */

/**
 * Build flat {key→value} maps for all files (current + original).
 * Returns { flatCurrents: {fname: {key: val}}, flatOriginals: {fname: {key: val}} }
 */
function buildFlatMaps() {
  const fileNames = state.draft?.metadata?.fileNames || [];
  const flatCurrents = {};
  const flatOriginals = {};
  for (const fname of fileNames) {
    const fileData = state.draft.files[fname];
    if (!fileData) continue;
    flatCurrents[fname]  = flattenJSON(fileData.current  || {});
    flatOriginals[fname] = flattenJSON(fileData.original || {});
  }
  return { flatCurrents, flatOriginals };
}

/**
 * Get the union of all keys across all loaded files.
 */
function getAllKeys() {
  const fileNames = state.draft?.metadata?.fileNames || [];
  const keySet = new Set();
  for (const fname of fileNames) {
    const original = state.draft?.files[fname]?.original || {};
    for (const k of Object.keys(flattenJSON(original))) keySet.add(k);
  }
  return [...keySet];
}

/* ─── Filtered row list ────────────────────────────────────────────── */

/**
 * Return the list of visible rows after applying search + filter.
 * Each row: { key, values: { fname: { original, current, changed, empty } } }
 */
function getFilteredRows() {
  if (!state.draft) return [];
  const fileNames = state.draft.metadata.fileNames;
  const { flatCurrents, flatOriginals } = buildFlatMaps();
  const allKeys = getAllKeys();
  const q = state.searchQuery.toLowerCase().trim();

  return allKeys.filter(key => {
    // Per-file predicates
    const anyEmpty   = fileNames.some(f => { const v = flatCurrents[f]?.[key]; return !v && v !== 0; });
    const anyChanged = fileNames.some(f => String(flatCurrents[f]?.[key]) !== String(flatOriginals[f]?.[key]));

    if (state.activeFilter === 'empty'     && !anyEmpty)   return false;
    if (state.activeFilter === 'changed'   && !anyChanged) return false;
    if (state.activeFilter === 'unchanged' && anyChanged)  return false;

    // Search: match key path or any value across all files
    if (q) {
      const keyMatch = key.toLowerCase().includes(q);
      const valMatch = fileNames.some(f =>
        String(flatCurrents[f]?.[key]  || '').toLowerCase().includes(q) ||
        String(flatOriginals[f]?.[key] || '').toLowerCase().includes(q)
      );
      if (!keyMatch && !valMatch) return false;
    }

    return true;
  }).map(key => {
    const values = {};
    for (const fname of fileNames) {
      const cur  = flatCurrents[fname]?.[key];
      const orig = flatOriginals[fname]?.[key];
      values[fname] = {
        original: orig,
        current:  cur,
        changed:  String(cur) !== String(orig),
        empty:    !cur && cur !== 0,
      };
    }
    return { key, values };
  });
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

  // Editor: reorder language column
  if (t.matches('[data-move-file]') || t.closest('[data-move-file]')) {
    e.stopPropagation();
    const el = t.matches('[data-move-file]') ? t : t.closest('[data-move-file]');
    if (el.disabled) return;
    moveFileColumn(el.dataset.moveFile, el.dataset.moveDir);
    return;
  }

  // Editor: remove language column
  if (t.matches('[data-remove-file]') || t.closest('[data-remove-file]')) {
    e.stopPropagation();
    const el = t.matches('[data-remove-file]') ? t : t.closest('[data-remove-file]');
    if (activeCell) closeCellEditor(true);
    removeFileColumn(el.dataset.removeFile);
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

  // Editor: add language
  if (t.matches('#btn-add-language') || t.closest('#btn-add-language')) {
    if (activeCell) closeCellEditor(true);
    showAddLanguageModal();
    return;
  }

  // Add language: pick from common list
  if (t.matches('[data-add-lang]') || t.closest('[data-add-lang]')) {
    const el = t.matches('[data-add-lang]') ? t : t.closest('[data-add-lang]');
    if (!el.disabled) addLanguageFile(el.dataset.addLang);
    return;
  }

  // Add language: custom filename from search input
  if (t.matches('#btn-add-custom-lang') || t.closest('#btn-add-custom-lang')) {
    const input = document.getElementById('lang-search-input');
    const raw = (input?.value || '').trim();
    if (!raw) {
      showToast('Type a filename or language name', 'warning');
      return;
    }
    addLanguageFile(raw);
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
  if (t.matches('[data-copy-file]') || t.closest('[data-copy-file]')) {
    const el = t.matches('[data-copy-file]') ? t : t.closest('[data-copy-file]');
    handleCopyToClipboard(el.dataset.copyFile || null);
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

  const fileArr = Array.from(files);
  if (fileArr.length > MAX_LANGUAGES) {
    showToast(`Only the first ${MAX_LANGUAGES} files were loaded (max ${MAX_LANGUAGES} languages).`, 'warning', 5000);
  }

  for (const file of fileArr.slice(0, MAX_LANGUAGES)) {
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

  // action is either 'all' or a specific filename
  if (action === 'all' || filenames.length === 1) {
    if (filenames.length === 1) {
      const fname = filenames[0];
      const data = state.draft.files[fname]?.current;
      if (data) {
        downloadFile(fname, JSON.stringify(data, null, 2));
        showToast(`Downloaded: ${fname}`, 'success');
      }
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
  } else {
    // Download individual named file
    const data = state.draft.files[action]?.current;
    if (data) {
      downloadFile(action, JSON.stringify(data, null, 2));
      showToast(`Downloaded: ${action}`, 'success');
    }
  }
}

async function handleCopyToClipboard(filename) {
  if (!state.draft) return;
  // If specific file given, use that; otherwise use first file
  const fname = filename || state.draft.metadata.fileNames[0];
  const data = state.draft.files[fname]?.current;
  if (!data) return;
  try {
    await navigator.clipboard.writeText(JSON.stringify(data, null, 2));
    showToast(`Copied ${fname} to clipboard!`, 'success');
  } catch {
    showToast('Failed to copy to clipboard', 'error');
  }
  closeModal();
}

/* ─── Diff helpers ─────────────────────────────────────────────────── */

function copyDiffAsMarkdown() {
  const allChanges = getDiffChanges();
  const total = allChanges.reduce((s, f) => s + f.changes.length, 0);
  if (total === 0) {
    showToast('No changes to copy', 'info');
    return;
  }
  const lines = ['# Translation Diff\n'];
  for (const { filename, changes } of allChanges) {
    if (changes.length === 0) continue;
    lines.push(`## ${filename} (${changes.length} changes)\n`);
    lines.push('| Key | Before | After |');
    lines.push('|-----|--------|-------|');
    for (const { key, oldVal, newVal } of changes) {
      lines.push(`| \`${key}\` | ${oldVal || '_(empty)_'} | ${newVal || '_(empty)_'} |`);
    }
    lines.push('');
  }
  navigator.clipboard.writeText(lines.join('\n')).then(() => {
    showToast('Diff copied as Markdown', 'success');
  });
}

/**
 * Returns [{filename, changes: [{key, oldVal, newVal, timestamp}]}] for all files.
 */
function getDiffChanges() {
  if (!state.draft) return [];
  return state.draft.metadata.fileNames.map(fname => {
    const fileData = state.draft.files[fname];
    return {
      filename: fname,
      changes: (fileData?.changeLog || []).map(entry => ({
        key: entry.key,
        oldVal: entry.oldValue,
        newVal: entry.newValue,
        timestamp: entry.timestamp,
      })),
    };
  });
}

function getTotalDiffCount() {
  return getDiffChanges().reduce((s, f) => s + f.changes.length, 0);
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
