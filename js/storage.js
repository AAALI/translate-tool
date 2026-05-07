/**
 * localStorage key for the translation draft.
 */
const DRAFT_KEY = 'tae_draft';
const STORAGE_WARN_MB = 5;
const DRAFT_MAX_AGE_DAYS = 30;

/**
 * Save the draft object to localStorage.
 * Returns true on success, false on quota error.
 * @param {Object} draft
 * @returns {boolean}
 */
function saveDraft(draft) {
  try {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    return true;
  } catch (e) {
    if (e.name === 'QuotaExceededError' || e.name === 'NS_ERROR_DOM_QUOTA_REACHED') {
      window.dispatchEvent(new CustomEvent('tae:storage-full'));
      return false;
    }
    console.error('[storage] saveDraft failed:', e);
    return false;
  }
}

/**
 * Load the draft from localStorage.
 * Returns null if none exists or if corrupted.
 * @returns {Object|null}
 */
function loadDraft() {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const draft = JSON.parse(raw);
    // Validate minimal structure
    if (!draft || !draft.metadata || !draft.files) return null;
    return draft;
  } catch (e) {
    console.warn('[storage] Draft corrupted, discarding:', e);
    clearDraft();
    return null;
  }
}

/**
 * Remove the draft from localStorage.
 */
function clearDraft() {
  localStorage.removeItem(DRAFT_KEY);
}

/**
 * Check if a draft exists in localStorage.
 * @returns {boolean}
 */
function hasDraft() {
  return localStorage.getItem(DRAFT_KEY) !== null;
}

/**
 * Get approximate storage usage of the current draft.
 * @returns {{ bytes: number, kb: string, mb: string }}
 */
function getStorageUsage() {
  const raw = localStorage.getItem(DRAFT_KEY) || '';
  const bytes = new Blob([raw]).size;
  return {
    bytes,
    kb: (bytes / 1024).toFixed(1),
    mb: (bytes / 1024 / 1024).toFixed(2),
  };
}

/**
 * Auto-delete drafts older than DRAFT_MAX_AGE_DAYS days.
 * Should be called on app load.
 */
function cleanupOldDrafts() {
  const draft = loadDraft();
  if (!draft) return;
  const createdAt = new Date(draft.metadata.createdAt).getTime();
  const ageMs = Date.now() - createdAt;
  const ageDays = ageMs / (1000 * 60 * 60 * 24);
  if (ageDays > DRAFT_MAX_AGE_DAYS) {
    clearDraft();
    console.info('[storage] Old draft auto-deleted (age: ' + Math.floor(ageDays) + ' days)');
  }
}

/**
 * Create a fresh draft object from an array of { name, data } file objects.
 * `data` should be the parsed JSON object (not flattened).
 * @param {Array<{name: string, data: Object}>} files
 * @returns {Object} draft
 */
function createDraft(files) {
  const fileMap = {};
  for (const { name, data } of files) {
    fileMap[name] = {
      original: JSON.parse(JSON.stringify(data)),
      current: JSON.parse(JSON.stringify(data)),
      hasChanges: false,
      changeLog: [],
    };
  }
  return {
    metadata: {
      sessionId: generateSessionId(),
      createdAt: new Date().toISOString(),
      lastModifiedAt: new Date().toISOString(),
      fileNames: files.map(f => f.name),
    },
    files: fileMap,
  };
}

/**
 * Check if draft size exceeds the warning threshold.
 * Dispatches 'tae:storage-warning' if so.
 */
function checkStorageSize() {
  const usage = getStorageUsage();
  if (parseFloat(usage.mb) > STORAGE_WARN_MB) {
    window.dispatchEvent(new CustomEvent('tae:storage-warning', { detail: usage }));
  }
}
