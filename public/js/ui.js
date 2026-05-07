/**
 * UI rendering module.
 * All DOM manipulation lives here.
 * Depends on: utils.js, storage.js, app.js
 */

const ROOT = () => document.getElementById('app');

const MAX_LANGUAGES = 3;

const COMMON_LANGUAGES = [
  { code: 'en', name: 'English', native: 'English' },
  { code: 'ar', name: 'Arabic', native: 'العربية' },
  { code: 'es', name: 'Spanish', native: 'Español' },
  { code: 'fr', name: 'French', native: 'Français' },
  { code: 'de', name: 'German', native: 'Deutsch' },
  { code: 'zh', name: 'Chinese', native: '中文' },
  { code: 'ja', name: 'Japanese', native: '日本語' },
  { code: 'ko', name: 'Korean', native: '한국어' },
  { code: 'pt', name: 'Portuguese', native: 'Português' },
  { code: 'ru', name: 'Russian', native: 'Русский' },
  { code: 'it', name: 'Italian', native: 'Italiano' },
  { code: 'tr', name: 'Turkish', native: 'Türkçe' },
  { code: 'hi', name: 'Hindi', native: 'हिन्दी' },
  { code: 'nl', name: 'Dutch', native: 'Nederlands' },
  { code: 'pl', name: 'Polish', native: 'Polski' },
  { code: 'sv', name: 'Swedish', native: 'Svenska' },
  { code: 'no', name: 'Norwegian', native: 'Norsk' },
  { code: 'da', name: 'Danish', native: 'Dansk' },
  { code: 'fi', name: 'Finnish', native: 'Suomi' },
  { code: 'cs', name: 'Czech', native: 'Čeština' },
  { code: 'el', name: 'Greek', native: 'Ελληνικά' },
  { code: 'he', name: 'Hebrew', native: 'עברית' },
  { code: 'hu', name: 'Hungarian', native: 'Magyar' },
  { code: 'id', name: 'Indonesian', native: 'Bahasa Indonesia' },
  { code: 'ms', name: 'Malay', native: 'Bahasa Melayu' },
  { code: 'ro', name: 'Romanian', native: 'Română' },
  { code: 'th', name: 'Thai', native: 'ไทย' },
  { code: 'uk', name: 'Ukrainian', native: 'Українська' },
  { code: 'vi', name: 'Vietnamese', native: 'Tiếng Việt' },
  { code: 'bn', name: 'Bengali', native: 'বাংলা' },
  { code: 'ur', name: 'Urdu', native: 'اردو' },
  { code: 'fa', name: 'Persian', native: 'فارسی' },
  { code: 'sw', name: 'Swahili', native: 'Kiswahili' },
  { code: 'so', name: 'Somali', native: 'Soomaali' },
  { code: 'am', name: 'Amharic', native: 'አማርኛ' },
  { code: 'ha', name: 'Hausa', native: 'Hausa' },
  { code: 'yo', name: 'Yoruba', native: 'Yorùbá' },
  { code: 'ig', name: 'Igbo', native: 'Igbo' },
  { code: 'zu', name: 'Zulu', native: 'isiZulu' },
  { code: 'af', name: 'Afrikaans', native: 'Afrikaans' },
  { code: 'tl', name: 'Filipino', native: 'Filipino' },
  { code: 'bg', name: 'Bulgarian', native: 'Български' },
  { code: 'hr', name: 'Croatian', native: 'Hrvatski' },
  { code: 'sr', name: 'Serbian', native: 'Српски' },
  { code: 'sk', name: 'Slovak', native: 'Slovenčina' },
  { code: 'sl', name: 'Slovenian', native: 'Slovenščina' },
  { code: 'lt', name: 'Lithuanian', native: 'Lietuvių' },
  { code: 'lv', name: 'Latvian', native: 'Latviešu' },
  { code: 'et', name: 'Estonian', native: 'Eesti' },
  { code: 'is', name: 'Icelandic', native: 'Íslenska' },
  { code: 'ga', name: 'Irish', native: 'Gaeilge' },
  { code: 'cy', name: 'Welsh', native: 'Cymraeg' },
  { code: 'ca', name: 'Catalan', native: 'Català' },
  { code: 'eu', name: 'Basque', native: 'Euskara' },
  { code: 'gl', name: 'Galician', native: 'Galego' },
  { code: 'ta', name: 'Tamil', native: 'தமிழ்' },
  { code: 'te', name: 'Telugu', native: 'తెలుగు' },
  { code: 'mr', name: 'Marathi', native: 'मराठी' },
  { code: 'gu', name: 'Gujarati', native: 'ગુજરાતી' },
  { code: 'pa', name: 'Punjabi', native: 'ਪੰਜਾਬੀ' },
  { code: 'kn', name: 'Kannada', native: 'ಕನ್ನಡ' },
  { code: 'ml', name: 'Malayalam', native: 'മലയാളം' },
  { code: 'si', name: 'Sinhala', native: 'සිංහල' },
  { code: 'ne', name: 'Nepali', native: 'नेपाली' },
  { code: 'my', name: 'Burmese', native: 'မြန်မာ' },
  { code: 'km', name: 'Khmer', native: 'ខ្មែរ' },
  { code: 'lo', name: 'Lao', native: 'ລາວ' },
  { code: 'mn', name: 'Mongolian', native: 'Монгол' },
  { code: 'ka', name: 'Georgian', native: 'ქართული' },
  { code: 'hy', name: 'Armenian', native: 'Հայերեն' },
  { code: 'az', name: 'Azerbaijani', native: 'Azərbaycanca' },
  { code: 'kk', name: 'Kazakh', native: 'Қазақша' },
  { code: 'uz', name: 'Uzbek', native: 'Oʻzbekcha' },
];

/* ═══════════════════════════════════════════════════════════════
   LANDING SCREEN
═══════════════════════════════════════════════════════════════ */

/**
 * Render the landing / upload screen.
 * @param {boolean} hasDraft  whether a draft exists in state
 */
function renderLanding(hasDraft) {
  const draftMeta = hasDraft && state.draft ? state.draft.metadata : null;
  const changeCount = draftMeta ? getTotalChanges() : 0;
  const timeLabel = draftMeta ? formatTimestamp(draftMeta.lastModifiedAt) : '';
  const fileNames = draftMeta ? draftMeta.fileNames.join(', ') : '';

  ROOT().innerHTML = `
    <div class="landing-root">
      <!-- Header -->
      <header class="landing-header">
        <div class="brand">
          <span class="brand-icon">{<span class="brand-key">A</span>:<span class="brand-val">文</span>}</span>
          <span class="brand-name">Translate Tool</span>
        </div>
      </header>

      <!-- Draft restore banner -->
      ${hasDraft ? `
      <div class="draft-banner" id="draft-banner">
        <div class="draft-banner-left">
          <span class="draft-banner-icon">◈</span>
          <div class="draft-banner-text">
            <strong>Unsaved draft found</strong>
            <span>${changeCount} change${changeCount !== 1 ? 's' : ''} · ${fileNames} · Last edited ${timeLabel}</span>
          </div>
        </div>
        <div class="draft-banner-actions">
          <button id="btn-restore" class="btn-restore">Restore Draft</button>
          <button id="btn-discard" class="btn-discard">Discard</button>
        </div>
      </div>
      ` : ''}

      <!-- Upload card -->
      <main class="landing-main">
        <div class="upload-card" id="drop-zone">
          <div class="upload-card-inner">
            <div class="upload-glyph">
              <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="4" y="4" width="40" height="40" rx="4" stroke="currentColor" stroke-width="1.5" stroke-dasharray="4 3"/>
                <path d="M24 31V17M24 17L18 23M24 17L30 23" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </div>
            <h2 class="upload-title">Upload Translation Files</h2>
            <p class="upload-desc">Drop one or more <code>.json</code> files here, or click to browse</p>
            <button id="btn-upload-trigger" class="btn-primary">
              Choose Files
            </button>
            <p class="upload-hint">Start with 1–${MAX_LANGUAGES} files · Add more languages later · Auto-saved locally</p>
          </div>
          <div class="drop-overlay" id="drop-overlay">
            <span>Release to upload</span>
          </div>
        </div>

        <div class="landing-features">
          <div class="feature-item">
            <span class="feature-icon">◎</span>
            <span>Auto-save every keystroke</span>
          </div>
          <div class="feature-item">
            <span class="feature-icon">◈</span>
            <span>Draft recovery after close</span>
          </div>
          <div class="feature-item">
            <span class="feature-icon">◇</span>
            <span>Search + filter translations</span>
          </div>
          <div class="feature-item">
            <span class="feature-icon">◻</span>
            <span>Diff view before download</span>
          </div>
        </div>
      </main>

      <input type="file" id="file-input" accept=".json" multiple style="display:none">
    </div>
  `;

  initDropZone();
}

/**
 * Set up drag-and-drop on the drop zone.
 */
function initDropZone() {
  const zone = document.getElementById('drop-zone');
  const overlay = document.getElementById('drop-overlay');
  if (!zone) return;

  let dragCounter = 0;

  zone.addEventListener('dragenter', (e) => {
    e.preventDefault();
    dragCounter++;
    zone.classList.add('drag-over');
  });

  zone.addEventListener('dragleave', () => {
    dragCounter--;
    if (dragCounter <= 0) {
      dragCounter = 0;
      zone.classList.remove('drag-over');
    }
  });

  zone.addEventListener('dragover', (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  });

  zone.addEventListener('drop', (e) => {
    e.preventDefault();
    dragCounter = 0;
    zone.classList.remove('drag-over');
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) handleFileInputChange(files);
  });
}

/* ═══════════════════════════════════════════════════════════════
   EDITOR SCREEN
═══════════════════════════════════════════════════════════════ */

/**
 * Render the full editor screen (shell + body).
 */
function renderEditor() {
  const fileNames = state.draft?.metadata?.fileNames || [];

  ROOT().innerHTML = `
    <div class="editor-root">
      <!-- Top bar -->
      <div class="editor-topbar">
        <div class="topbar-left">
          <span class="brand-icon-sm">{<span class="brand-key">A</span>:<span class="brand-val">文</span>}</span>
          <div class="file-badges">
            ${fileNames.map(f => `<span class="file-badge">${escapeHTML(f)}</span>`).join('')}
          </div>
        </div>
        <div class="topbar-right">
          <div id="save-status" class="save-status"></div>
          ${fileNames.length < MAX_LANGUAGES ? `<button id="btn-add-language" class="btn-ghost btn-ghost-amber" title="Add another language">+ Add Language</button>` : ''}
          <button id="btn-upload-new" class="btn-ghost" title="Upload new files">↑ Upload New</button>
        </div>
      </div>

      <!-- Progress & meta bar -->
      <div class="editor-metabar">
        <div class="metabar-left">
          <div id="progress-bar-wrap" class="progress-bar-wrap">
            <div id="progress-bar" class="progress-bar-fill"></div>
          </div>
          <span id="progress-label" class="progress-label"></span>
        </div>
        <div class="metabar-right">
          <span id="change-count" class="change-count"></span>
          <span id="save-time" class="save-time"></span>
        </div>
      </div>

      <!-- Filter bar -->
      <div class="editor-filterbar">
        <div class="search-wrap">
          <span class="search-icon">⌕</span>
          <input
            id="search-input"
            type="text"
            class="search-input"
            placeholder="Search keys or values…"
            autocomplete="off"
            spellcheck="false"
            value="${escapeHTML(state.searchQuery)}"
          >
          ${state.searchQuery ? `<button class="search-clear" onclick="clearSearch()">×</button>` : ''}
        </div>
        <div id="filter-pills" class="filter-pills"></div>
        <div class="filterbar-right">
          <span id="row-count" class="row-count"></span>
        </div>
      </div>

      <!-- Table area -->
      <div class="editor-table-wrap" id="table-wrap">
        <table class="editor-table" id="editor-table">
          ${buildColgroup(fileNames)}
          <thead class="table-head">
            <tr>${buildHeaderRow(fileNames)}</tr>
          </thead>
          <tbody id="table-body"></tbody>
        </table>
        <div id="empty-state" class="empty-state" style="display:none">
          <span>No keys match your search or filter.</span>
          <button onclick="clearSearch()" class="btn-ghost" style="margin-top:8px">Clear filters</button>
        </div>
      </div>

      <!-- Bottom toolbar -->
      <div class="editor-toolbar">
        <div class="toolbar-left">
          <button id="btn-diff" class="btn-ghost" title="View changes">◈ View Diff</button>
          <button id="btn-clear-draft" class="btn-ghost btn-ghost-danger" title="Clear all draft data">✕ Clear Draft</button>
        </div>
        <div class="toolbar-right">
          <button id="btn-download" class="btn-primary">↓ Download JSON</button>
        </div>
      </div>
    </div>

    <!-- Toast container -->
    <div id="toast-container" class="toast-container"></div>

    <!-- Modal overlay -->
    <div id="modal-overlay" class="modal-overlay" style="display:none">
      <div id="modal-box" class="modal-box"></div>
    </div>
  `;

  renderFilterPills();
  renderProgressBar();
  renderChangeCount();
  updateSaveStatus('saved');
  renderEditorBody();
}

/* ─── Dynamic column layout helpers ─────────────────────────────── */

/**
 * Calculate column widths based on number of files.
 * Returns array of widths in %: [keyWidth, file1Width, file2Width, ...]
 */
function getColumnWidths(fileNames) {
  const n = fileNames.length;
  if (n === 0) return [30, 70];
  // Key column: 22–28%, remaining split equally among file columns
  const keyPct = n >= 3 ? 20 : n === 2 ? 24 : 28;
  const remaining = 100 - keyPct;
  const perFile = Math.floor(remaining / n);
  const widths = [keyPct];
  for (let i = 0; i < n; i++) {
    // Give last column any rounding remainder
    widths.push(i === n - 1 ? remaining - perFile * (n - 1) : perFile);
  }
  return widths;
}

function buildColgroup(fileNames) {
  const widths = getColumnWidths(fileNames);
  const cols = widths.map(w => `<col style="width:${w}%">`).join('');
  return `<colgroup>${cols}</colgroup>`;
}

function buildHeaderRow(fileNames) {
  const keyTh = `<th class="th-key">Key Path</th>`;
  const fileThs = fileNames.map((fname, i) => {
    const hint = i === fileNames.length - 1
      ? ` <span class="th-edit-hint">← click to edit</span>`
      : '';
    return `<th class="th-file">${escapeHTML(fname)}${hint}</th>`;
  }).join('');
  return keyTh + fileThs;
}


/* ─── Filter pills ───────────────────────────────────────────── */

function renderFilterPills() {
  const container = document.getElementById('filter-pills');
  if (!container) return;

  const filters = [
    { id: 'all', label: 'All' },
    { id: 'empty', label: 'Empty' },
    { id: 'changed', label: 'Changed' },
    { id: 'unchanged', label: 'Unchanged' },
  ];

  container.innerHTML = filters.map(f => `
    <button class="filter-pill ${state.activeFilter === f.id ? 'filter-pill-active' : ''}" data-filter="${f.id}">
      ${f.label}
    </button>
  `).join('');
}

/* ─── Table body (virtualized for performance) ───────────────── */

const VIRTUAL_BATCH = 80;
const VIRTUAL_OVERSCAN = 20;

let _allRows = [];
let _renderOffset = 0;

function renderEditorBody() {
  const tbody = document.getElementById('table-body');
  const emptyState = document.getElementById('empty-state');
  const rowCountEl = document.getElementById('row-count');
  if (!tbody) return;

  _allRows = getFilteredRows();
  _renderOffset = 0;

  if (_allRows.length === 0) {
    tbody.innerHTML = '';
    if (emptyState) emptyState.style.display = 'flex';
    if (rowCountEl) rowCountEl.textContent = '0 keys';
    return;
  }

  if (emptyState) emptyState.style.display = 'none';
  if (rowCountEl) rowCountEl.textContent = `${_allRows.length} key${_allRows.length !== 1 ? 's' : ''}`;

  const initialBatch = Math.min(VIRTUAL_BATCH + VIRTUAL_OVERSCAN, _allRows.length);
  tbody.innerHTML = _allRows.slice(0, initialBatch).map(renderRow).join('');
  _renderOffset = initialBatch;

  const wrap = document.getElementById('table-wrap');
  if (wrap) wrap.onscroll = () => lazyRenderRows(tbody);
}

function lazyRenderRows(tbody) {
  if (_renderOffset >= _allRows.length) return;
  const wrap = document.getElementById('table-wrap');
  if (!wrap) return;
  const { scrollTop, clientHeight, scrollHeight } = wrap;
  if (scrollTop + clientHeight >= scrollHeight - 200) {
    const nextBatch = Math.min(_renderOffset + VIRTUAL_BATCH, _allRows.length);
    const fragment = document.createDocumentFragment();
    for (let i = _renderOffset; i < nextBatch; i++) {
      const tr = document.createElement('tr');
      tr.className = 'table-row';
      tr.innerHTML = renderRowCells(_allRows[i]);
      fragment.appendChild(tr);
    }
    tbody.appendChild(fragment);
    _renderOffset = nextBatch;
  }
}

function renderRow(row) {
  return `<tr class="table-row">${renderRowCells(row)}</tr>`;
}

/**
 * Render cells for one row. Each file gets its own <td>.
 * Row shape: { key, values: { fname: { original, current, changed, empty } } }
 */
function renderRowCells(row) {
  const { key, values } = row;
  const fileNames = state.draft?.metadata?.fileNames || [];

  // Key path with visual hierarchy
  const keyParts = key.split('.');
  const keyDisplay = keyParts.length > 1
    ? `<span class="key-prefix">${escapeHTML(keyParts.slice(0, -1).join('.'))}.</span><span class="key-leaf">${escapeHTML(keyParts[keyParts.length - 1])}</span>`
    : `<span class="key-leaf">${escapeHTML(key)}</span>`;
  const keyCell = `<td class="cell-key" title="${escapeHTML(key)}">${keyDisplay}</td>`;

  const fileCells = fileNames.map((fname, idx) => {
    const v = values[fname] || {};
    const { current, original, changed, empty } = v;
    const displayVal = current !== undefined && current !== null ? String(current) : '';
    const rtl = isRTL(displayVal) || isRTL(String(original || ''));

    const classes = [
      'cell-target',
      changed ? 'cell-changed' : '',
      empty    ? 'cell-empty'   : '',
    ].filter(Boolean).join(' ');

    const badge = changed ? `<span class="cell-badge-changed" title="Modified">●</span>` : '';
    const content = empty
      ? `<span class="cell-placeholder">Click to translate…</span>`
      : `${badge}${escapeHTML(displayVal)}`;

    return `<td
      class="${classes}"
      data-cell-key="${escapeHTML(key)}"
      data-cell-file="${escapeHTML(fname)}"
      dir="${rtl ? 'rtl' : 'ltr'}"
    >${content}</td>`;
  }).join('');

  return keyCell + fileCells;
}

/* ─── Progress bar ───────────────────────────────────────────── */

function renderProgressBar() {
  const bar = document.getElementById('progress-bar');
  const label = document.getElementById('progress-label');
  if (!bar || !state.draft) return;

  const fileNames = state.draft.metadata.fileNames;
  let total = 0, filled = 0;
  for (const fname of fileNames) {
    const originalFlat = flattenJSON(state.draft.files[fname]?.original || {});
    const currentFlat  = flattenJSON(state.draft.files[fname]?.current  || {});
    total  += Object.keys(originalFlat).length;
    filled += Object.values(currentFlat).filter(v => v !== '' && v !== null && v !== undefined).length;
  }
  const pct = total > 0 ? Math.round((filled / total) * 100) : 0;

  bar.style.width = `${pct}%`;
  if (label) label.textContent = `${filled}/${total} cells (${pct}%)`;
}

function updateProgressBar() { renderProgressBar(); }

/* ─── Change count ───────────────────────────────────────────── */

function renderChangeCount() {
  const el = document.getElementById('change-count');
  if (!el || !state.draft) return;
  const count = getTotalChanges();
  el.textContent = count > 0 ? `${count} edit${count !== 1 ? 's' : ''} made` : 'No changes yet';
}

function updateChangeCount() { renderChangeCount(); }

function getTotalChanges() {
  if (!state.draft) return 0;
  return Object.values(state.draft.files).reduce((sum, f) => sum + (f.changeLog?.length || 0), 0);
}

/* ─── Save status ────────────────────────────────────────────── */

let _lastSaveStatus = 'saved';

/**
 * Update the auto-save status indicator.
 * @param {'saved'|'pending'|'error'|null} status  null = just refresh display
 */
function updateSaveStatus(status) {
  if (status !== null) _lastSaveStatus = status;
  const el = document.getElementById('save-status');
  const timeEl = document.getElementById('save-time');
  if (!el) return;

  const dot = {
    saved: '<span class="dot dot-green"></span>',
    pending: '<span class="dot dot-amber anim-pulse"></span>',
    error: '<span class="dot dot-red"></span>',
  }[_lastSaveStatus] || '<span class="dot dot-green"></span>';

  const label = {
    saved: 'Auto-save on',
    pending: 'Saving…',
    error: 'Save failed',
  }[_lastSaveStatus] || 'Auto-save on';

  el.innerHTML = `${dot}<span class="save-label">${label}</span>`;

  if (timeEl && state.lastSavedAt) {
    timeEl.textContent = `Saved ${timeAgo(state.lastSavedAt)}`;
  } else if (timeEl) {
    timeEl.textContent = '';
  }
}

/* ─── Search helpers ─────────────────────────────────────────── */

function clearSearch() {
  state.searchQuery = '';
  const input = document.getElementById('search-input');
  if (input) {
    input.value = '';
    input.focus();
  }
  renderEditorBody();
  // Re-render filter bar to remove the × button
  const filterbar = document.querySelector('.editor-filterbar');
  if (filterbar) {
    const clearBtn = filterbar.querySelector('.search-clear');
    if (clearBtn) clearBtn.remove();
  }
}

/* ─── Toast notifications ────────────────────────────────────── */

const TOAST_DURATION = 3000;
let _toastIdCounter = 0;

/**
 * Show a toast notification.
 * @param {string} message
 * @param {'success'|'error'|'warning'|'info'} type
 * @param {number} [duration]
 */
function showToast(message, type = 'info', duration = TOAST_DURATION) {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  const id = ++_toastIdCounter;
  const icons = { success: '✓', error: '✕', warning: '⚠', info: '◎' };
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.id = `toast-${id}`;
  toast.innerHTML = `<span class="toast-icon">${icons[type] || '◎'}</span><span class="toast-msg">${escapeHTML(message)}</span>`;

  container.appendChild(toast);

  requestAnimationFrame(() => toast.classList.add('toast-visible'));

  setTimeout(() => {
    toast.classList.remove('toast-visible');
    toast.classList.add('toast-hiding');
    setTimeout(() => toast.remove(), 350);
  }, duration);
}

/* ─── Download modal ─────────────────────────────────────────── */

function showDownloadModal() {
  const files = state.draft?.metadata?.fileNames || [];
  const multiFile = files.length > 1;

  const indivOptions = files.map(fname => `
    <button class="download-option" data-download-action="${escapeHTML(fname)}">
      <span class="download-option-icon">↓</span>
      <div>
        <strong>${escapeHTML(fname)}</strong>
        <span>Download as JSON</span>
      </div>
    </button>
  `).join('');

  const clipOptions = files.map(fname => `
    <button class="download-option" data-copy-file="${escapeHTML(fname)}">
      <span class="download-option-icon">⎘</span>
      <div>
        <strong>Copy ${escapeHTML(fname)}</strong>
        <span>Paste into GitHub editor or any text editor</span>
      </div>
    </button>
  `).join('');

  setModalContent(`
    <div class="modal-header">
      <h3 class="modal-title">Download Files</h3>
      <button data-modal-close class="modal-close">×</button>
    </div>
    <div class="modal-body">
      <div class="download-options">
        ${multiFile ? `
        <button class="download-option download-option-primary" data-download-action="all">
          <span class="download-option-icon">⬡</span>
          <div>
            <strong>Download all as ZIP</strong>
            <span>${files.map(escapeHTML).join(' + ')}</span>
          </div>
        </button>
        <div class="download-section-label">Or download individually</div>
        ${indivOptions}
        ` : indivOptions}
        ${clipOptions}
      </div>
      <div class="modal-storage-info">
        ${getStorageInfoHTML()}
      </div>
    </div>
  `);
  openModal();
}

function getStorageInfoHTML() {
  const usage = getStorageUsage();
  return `<span class="storage-label">Draft size: ${usage.kb} KB</span>`;
}

/* ─── Diff modal ─────────────────────────────────────────────── */

function renderDiffModal() {
  const allChanges = getDiffChanges();
  const total = getTotalDiffCount();

  if (total === 0) {
    showToast('No changes to diff yet', 'info');
    return;
  }

  const sections = allChanges.map(({ filename, changes }) => {
    if (changes.length === 0) return '';
    const rows = changes.map(({ key, oldVal, newVal, timestamp }) => {
      const timeStr = timestamp ? formatTimestamp(timestamp) : '';
      const rtlOld = isRTL(String(oldVal || ''));
      const rtlNew = isRTL(String(newVal || ''));
      return `
        <tr class="diff-row">
          <td class="diff-key" title="${escapeHTML(key)}">${escapeHTML(key)}</td>
          <td class="diff-old" dir="${rtlOld ? 'rtl' : 'ltr'}">${escapeHTML(String(oldVal ?? '_(empty)_'))}</td>
          <td class="diff-new" dir="${rtlNew ? 'rtl' : 'ltr'}">${escapeHTML(String(newVal ?? '_(empty)_'))}</td>
          <td class="diff-time">${escapeHTML(timeStr)}</td>
        </tr>`;
    }).join('');

    return `
      <div class="diff-section">
        <div class="diff-section-header">
          <span class="diff-section-file">${escapeHTML(filename)}</span>
          <span class="diff-count">${changes.length}</span>
        </div>
        <table class="diff-table">
          <thead><tr>
            <th>Key</th><th>Before</th><th>After</th><th>Time</th>
          </tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>`;
  }).join('');

  setModalContent(`
    <div class="modal-header">
      <h3 class="modal-title">All Changes <span class="diff-count">${total}</span></h3>
      <div class="modal-header-actions">
        <button id="btn-copy-diff" class="btn-ghost">⎘ Copy as Markdown</button>
        <button data-modal-close class="modal-close">×</button>
      </div>
    </div>
    <div class="modal-body modal-body-diff">
      ${sections}
    </div>
  `, 'modal-box modal-box-wide');
  openModal();
}

/* ─── Confirm dialog ─────────────────────────────────────────── */

function renderConfirmDialog(title, message) {
  setModalContent(`
    <div class="modal-header">
      <h3 class="modal-title">${escapeHTML(title)}</h3>
    </div>
    <div class="modal-body">
      <p class="confirm-message">${escapeHTML(message)}</p>
      <div class="confirm-actions">
        <button id="confirm-cancel" class="btn-ghost">Cancel</button>
        <button id="confirm-ok" class="btn-danger">Confirm</button>
      </div>
    </div>
  `);
  openModal();
}

/* ─── Modal helpers ──────────────────────────────────────────── */

function openModal() {
  const overlay = document.getElementById('modal-overlay');
  if (overlay) {
    overlay.style.display = 'flex';
    requestAnimationFrame(() => overlay.classList.add('modal-visible'));
  }
}

function closeModal() {
  const overlay = document.getElementById('modal-overlay');
  if (overlay) {
    overlay.classList.remove('modal-visible');
    setTimeout(() => {
      overlay.style.display = 'none';
      const box = document.getElementById('modal-box');
      if (box) box.className = 'modal-box';
    }, 200);
  }
}

function setModalContent(html, boxClass = 'modal-box') {
  const box = document.getElementById('modal-box');
  if (box) {
    box.className = boxClass;
    box.innerHTML = html;
  }
}

/* ─── Add language modal ─────────────────────────────────────── */

function showAddLanguageModal() {
  const fileNames = state.draft?.metadata?.fileNames || [];
  if (fileNames.length >= MAX_LANGUAGES) {
    showToast(`Maximum ${MAX_LANGUAGES} languages reached`, 'warning');
    return;
  }

  setModalContent(`
    <div class="modal-header">
      <h3 class="modal-title">Add Language</h3>
      <button data-modal-close class="modal-close">×</button>
    </div>
    <div class="modal-body modal-body-lang">
      <p class="confirm-message lang-intro">A new blank JSON will be created with the same key structure, ready to translate and download.</p>

      <div class="lang-search-wrap">
        <span class="search-icon">⌕</span>
        <input
          id="lang-search-input"
          type="text"
          class="lang-search-input"
          placeholder="Search language (e.g. som → Somali) or type a filename like fr-CA.json"
          autocomplete="off"
          spellcheck="false"
        >
        <button id="btn-add-custom-lang" class="btn-primary lang-add-custom-btn" style="display:none">Add</button>
      </div>

      <div id="lang-grid" class="lang-grid"></div>
      <div id="lang-empty" class="lang-empty" style="display:none">
        No language matches. Press <strong>Enter</strong> to add it as a custom filename.
      </div>
    </div>
  `, 'modal-box modal-box-wide');
  openModal();

  // Initial render and wire up live search
  renderLangGrid('');

  setTimeout(() => {
    const input = document.getElementById('lang-search-input');
    if (!input) return;
    input.focus();

    input.addEventListener('input', () => {
      renderLangGrid(input.value);
    });

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleLangSearchEnter(input.value);
      }
    });
  }, 0);
}

/**
 * Render the filtered grid of language options.
 * @param {string} query
 */
function renderLangGrid(query) {
  const grid = document.getElementById('lang-grid');
  const emptyEl = document.getElementById('lang-empty');
  const customBtn = document.getElementById('btn-add-custom-lang');
  if (!grid) return;

  const fileNames = state.draft?.metadata?.fileNames || [];
  const used = new Set(fileNames.map(n => n.toLowerCase()));
  const q = query.trim().toLowerCase();

  const filtered = q
    ? COMMON_LANGUAGES.filter(l =>
        l.code.toLowerCase().startsWith(q) ||
        l.name.toLowerCase().includes(q) ||
        l.native.toLowerCase().includes(q)
      )
    : COMMON_LANGUAGES;

  // Show "Add custom" button when input doesn't match an exact code
  if (customBtn) {
    const exactCodeMatch = COMMON_LANGUAGES.some(l => l.code === q);
    customBtn.style.display = q && !exactCodeMatch ? '' : 'none';
    customBtn.textContent = q.endsWith('.json') ? `Add ${q}` : `Add ${q}.json`;
  }

  if (filtered.length === 0) {
    grid.innerHTML = '';
    if (emptyEl) emptyEl.style.display = 'block';
    return;
  }
  if (emptyEl) emptyEl.style.display = 'none';

  grid.innerHTML = filtered.map(l => {
    const fname = `${l.code}.json`;
    const isUsed = used.has(fname);
    return `
      <button class="lang-option ${isUsed ? 'lang-option-disabled' : ''}" ${isUsed ? 'disabled' : ''} data-add-lang="${escapeHTML(fname)}">
        <span class="lang-code">${escapeHTML(l.code)}</span>
        <div class="lang-meta">
          <strong>${escapeHTML(l.name)}</strong>
          <span>${escapeHTML(l.native)} · ${escapeHTML(fname)}${isUsed ? ' · added' : ''}</span>
        </div>
      </button>
    `;
  }).join('');
}

/**
 * Handle Enter key in language search input.
 * If query matches one available (non-disabled) language, add it.
 * Otherwise, treat the query as a custom filename.
 */
function handleLangSearchEnter(rawQuery) {
  const q = rawQuery.trim();
  if (!q) return;

  const fileNames = state.draft?.metadata?.fileNames || [];
  const used = new Set(fileNames.map(n => n.toLowerCase()));
  const lower = q.toLowerCase();

  const matches = COMMON_LANGUAGES.filter(l =>
    l.code.toLowerCase().startsWith(lower) ||
    l.name.toLowerCase().includes(lower) ||
    l.native.toLowerCase().includes(lower)
  ).filter(l => !used.has(`${l.code}.json`));

  // Single match — auto-pick it
  if (matches.length === 1) {
    addLanguageFile(`${matches[0].code}.json`);
    return;
  }

  // Otherwise, treat as a custom filename
  addLanguageFile(q);
}
