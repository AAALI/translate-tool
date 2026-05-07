/**
 * Flatten a nested JSON object to dot-notation keys.
 * Arrays are preserved as-is (not flattened into [0], [1], etc.)
 * @param {Object} obj
 * @param {string} [prefix='']
 * @returns {Object} flat key→value map
 */
function flattenJSON(obj, prefix = '') {
  const result = {};
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      Object.assign(result, flattenJSON(value, fullKey));
    } else {
      result[fullKey] = value;
    }
  }
  return result;
}

/**
 * Reconstruct a nested JSON object from a flat dot-notation key map.
 * @param {Object} flat
 * @returns {Object}
 */
function unflattenJSON(flat) {
  const result = {};
  for (const [key, value] of Object.entries(flat)) {
    const parts = key.split('.');
    let cur = result;
    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      if (cur[part] === undefined || typeof cur[part] !== 'object' || Array.isArray(cur[part])) {
        cur[part] = {};
      }
      cur = cur[part];
    }
    cur[parts[parts.length - 1]] = value;
  }
  return result;
}

/**
 * Trigger a file download in the browser.
 * @param {string} filename
 * @param {string} content
 * @param {string} [mimeType='application/json']
 */
function downloadFile(filename, content, mimeType = 'application/json') {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Download multiple files as a zip archive using JSZip.
 * @param {Object} filesMap - { 'arabic.json': 'content...', ... }
 * @param {string} [zipName='translations.zip']
 */
async function downloadZip(filesMap, zipName = 'translations.zip') {
  if (typeof JSZip === 'undefined') {
    // Fallback: download files individually
    for (const [filename, content] of Object.entries(filesMap)) {
      downloadFile(filename, content);
    }
    return;
  }
  const zip = new JSZip();
  for (const [filename, content] of Object.entries(filesMap)) {
    zip.file(filename, content);
  }
  const blob = await zip.generateAsync({ type: 'blob' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = zipName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Generate a UUID-like session ID.
 * @returns {string}
 */
function generateSessionId() {
  return 'tae-' + Date.now() + '-' + Math.random().toString(36).slice(2, 9);
}

/**
 * Format a timestamp as a relative "time ago" string.
 * @param {string|number|Date} timestamp
 * @returns {string}
 */
function timeAgo(timestamp) {
  const now = Date.now();
  const then = new Date(timestamp).getTime();
  const diffMs = now - then;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  if (diffSec < 10) return 'just now';
  if (diffSec < 60) return `${diffSec} seconds ago`;
  if (diffMin < 60) return diffMin === 1 ? '1 minute ago' : `${diffMin} minutes ago`;
  if (diffHr < 24) return diffHr === 1 ? '1 hour ago' : `${diffHr} hours ago`;
  return diffDay === 1 ? '1 day ago' : `${diffDay} days ago`;
}

/**
 * Format a Date for display in draft banners (e.g. "May 7, 10:35 PM").
 * @param {string|Date} timestamp
 * @returns {string}
 */
function formatTimestamp(timestamp) {
  return new Date(timestamp).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

/**
 * Safely parse JSON, returning null on failure.
 * @param {string} str
 * @returns {Object|null}
 */
function safeParseJSON(str) {
  try {
    return JSON.parse(str);
  } catch {
    return null;
  }
}

/**
 * Get a nested value from an object using a dot-notation key.
 * @param {Object} obj
 * @param {string} key  e.g. "feedback.title"
 * @returns {*}
 */
function getNestedValue(obj, key) {
  return key.split('.').reduce((cur, part) => (cur && cur[part] !== undefined ? cur[part] : undefined), obj);
}

/**
 * Set a nested value on an object using a dot-notation key.
 * @param {Object} obj
 * @param {string} key
 * @param {*} value
 */
function setNestedValue(obj, key, value) {
  const parts = key.split('.');
  let cur = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    if (cur[parts[i]] === undefined || typeof cur[parts[i]] !== 'object') {
      cur[parts[i]] = {};
    }
    cur = cur[parts[i]];
  }
  cur[parts[parts.length - 1]] = value;
}

/**
 * Escape HTML special characters.
 * @param {string} str
 * @returns {string}
 */
function escapeHTML(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Detect if a string appears to be RTL (Arabic, Hebrew, etc.).
 * @param {string} str
 * @returns {boolean}
 */
function isRTL(str) {
  if (!str) return false;
  return /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/.test(str);
}
