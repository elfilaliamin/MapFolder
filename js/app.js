/**
 * MapFolder — Application Logic
 * Interactive Mind Map Viewer powered by Markmap, D3, and Vanilla JavaScript.
 */

// ==========================================================================
// Application State
// ==========================================================================
const state = {
  manifest: [],          // Tree structure from maps/index.json
  flatFiles: [],         // Flat list of all files for quick lookup
  activeFilePath: null,  // Relative path of currently selected map
  activeMapTitle: '',    // Current map heading/title
  rawMarkdown: '',       // Cached raw markdown content of active map
  mmInstance: null,      // Markmap instance
  currentRoot: null,     // Current parsed mind map node tree
  transformer: null,     // Markmap Transformer instance
  isAllExpanded: false,  // Expansion state tracker
  theme: 'light',        // 'light' | 'dark'
  searchQuery: '',       // Current search query
};

// ==========================================================================
// DOM Element Selectors
// ==========================================================================
const DOM = {
  // Navigation & Tree
  sidebar: document.getElementById('sidebar'),
  sidebarBackdrop: document.getElementById('sidebarBackdrop'),
  btnOpenSidebar: document.getElementById('btnOpenSidebar'),
  btnCloseSidebar: document.getElementById('btnCloseSidebar'),
  treeRoot: document.getElementById('treeRoot'),
  treeNoResults: document.getElementById('treeNoResults'),
  mapSearchInput: document.getElementById('mapSearchInput'),
  btnClearSearch: document.getElementById('btnClearSearch'),
  mapsCountBadge: document.getElementById('mapsCountBadge'),
  btnToggleAllFolders: document.getElementById('btnToggleAllFolders'),

  // Header & Meta
  mapTitleHeading: document.getElementById('mapTitleHeading'),
  mapPathBreadcrumb: document.getElementById('mapPathBreadcrumb'),

  // Controls & Toolbar
  btnZoomIn: document.getElementById('btnZoomIn'),
  btnZoomOut: document.getElementById('btnZoomOut'),
  btnFit: document.getElementById('btnFit'),
  btnToggleExpand: document.getElementById('btnToggleExpand'),
  expandToggleText: document.getElementById('expandToggleText'),
  btnViewSource: document.getElementById('btnViewSource'),
  btnDownloadSvg: document.getElementById('btnDownloadSvg'),
  btnThemeToggle: document.getElementById('btnThemeToggle'),

  // Viewport & States
  mindmapContainer: document.getElementById('mindmapContainer'),
  mindmapSvg: document.getElementById('mindmap'),
  loadingOverlay: document.getElementById('loadingOverlay'),
  spinnerText: document.getElementById('spinnerText'),
  emptyState: document.getElementById('emptyState'),
  errorState: document.getElementById('errorState'),
  errorMessageText: document.getElementById('errorMessageText'),
  btnRetryLoad: document.getElementById('btnRetryLoad'),

  // Source Modal
  sourceModal: document.getElementById('sourceModal'),
  btnCloseModal: document.getElementById('btnCloseModal'),
  btnCopySource: document.getElementById('btnCopySource'),
  copyButtonText: document.getElementById('copyButtonText'),
  copyIconDefault: document.getElementById('copyIconDefault'),
  copyIconSuccess: document.getElementById('copyIconSuccess'),
  sourceCodeBlock: document.getElementById('sourceCodeBlock'),
};

// ==========================================================================
// Theme Management
// ==========================================================================
const THEME_STORAGE_KEY = 'mapfolder_theme';

function getInitialTheme() {
  try {
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    if (saved === 'dark' || saved === 'light') return saved;
  } catch (e) {
    // LocalStorage might be disabled in private/sandboxed mode
  }
  return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light';
}

function applyTheme(theme) {
  state.theme = theme;
  document.documentElement.setAttribute('data-theme', theme);
  
  if (theme === 'dark') {
    document.documentElement.classList.add('markmap-dark');
  } else {
    document.documentElement.classList.remove('markmap-dark');
  }

  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch (e) {}
}

function toggleTheme() {
  const nextTheme = state.theme === 'dark' ? 'light' : 'dark';
  applyTheme(nextTheme);
}

// Watch system preference changes
if (window.matchMedia) {
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
    try {
      if (!localStorage.getItem(THEME_STORAGE_KEY)) {
        applyTheme(e.matches ? 'dark' : 'light');
      }
    } catch (err) {}
  });
}

// ==========================================================================
// Right-to-Left (RTL) Language Detection
// ==========================================================================
/**
 * Detects if a text string contains Arabic, Hebrew, or other RTL characters.
 * @param {string} text
 * @returns {boolean}
 */
function isRTLText(text) {
  if (!text) return false;
  // Unicode ranges for Arabic, Hebrew, Persian/Farsi, Urdu, Syriac, Thaana
  const rtlRegex = /[\u0591-\u07FF\uFB1D-\uFDFD\uFE70-\uFEFC]/;
  return rtlRegex.test(text);
}

function updateDirectionForActiveMap(markdown, title) {
  const isRtl = isRTLText(markdown) || isRTLText(title);
  if (isRtl) {
    DOM.mindmapContainer.setAttribute('dir', 'rtl');
    DOM.mindmapContainer.classList.add('is-rtl');
    DOM.mapTitleHeading.classList.add('is-arabic');
  } else {
    DOM.mindmapContainer.setAttribute('dir', 'ltr');
    DOM.mindmapContainer.classList.remove('is-rtl');
    DOM.mapTitleHeading.classList.remove('is-arabic');
  }
}

// ==========================================================================
// Manifest & Tree Loading
// ==========================================================================
/**
 * Flatten tree to array of all files for rapid lookup
 */
function flattenTree(items) {
  const result = [];
  function recurse(list) {
    for (const item of list) {
      if (item.type === 'file') {
        result.push(item);
      } else if (item.type === 'folder' && Array.isArray(item.children)) {
        recurse(item.children);
      }
    }
  }
  recurse(items);
  return result;
}

/**
 * Safely resolve URLs relative to the application base folder,
 * preventing 404s when GitHub Pages is visited without a trailing slash (e.g. /MapFolder vs /MapFolder/).
 */
function resolveAppUrl(relPath) {
  const loc = window.location;
  let basePath = loc.pathname;
  if (!basePath.endsWith('/') && !basePath.endsWith('.html')) {
    basePath = basePath + '/';
  } else if (basePath.endsWith('.html')) {
    basePath = basePath.substring(0, basePath.lastIndexOf('/') + 1);
  }
  return new URL(relPath, `${loc.origin}${basePath}`).href;
}

/**
 * Fetch maps/index.json
 */
async function loadManifest() {
  showLoading('Loading maps folder...');
  hideError();
  hideEmptyState();

  try {
    const url = resolveAppUrl('maps/index.json');
    const response = await fetch(url, { cache: 'no-cache' });
    if (!response.ok) {
      throw new Error(`Failed to load maps manifest (${response.status} ${response.statusText})`);
    }

    const data = await response.json();
    if (!Array.isArray(data) || data.length === 0) {
      state.manifest = [];
      state.flatFiles = [];
      showEmptyState();
      DOM.mapsCountBadge.textContent = '0 maps';
      hideLoading();
      return;
    }

    state.manifest = data;
    state.flatFiles = flattenTree(data);
    DOM.mapsCountBadge.textContent = `${state.flatFiles.length} map${state.flatFiles.length === 1 ? '' : 's'}`;

    renderTree(state.manifest);
    handleInitialRoute();
  } catch (error) {
    console.error('Error fetching manifest:', error);
    showError(error.message || 'Could not load maps manifest.');
  } finally {
    hideLoading();
  }
}

// ==========================================================================
// Sidebar Tree Navigation Rendering
// ==========================================================================
/**
 * Render the collapsible tree in the sidebar
 */
function renderTree(treeData, query = '') {
  DOM.treeRoot.innerHTML = '';
  const normalizedQuery = query.trim().toLowerCase();

  let hasMatches = false;

  function buildNode(item, depth = 0) {
    if (item.type === 'folder') {
      const folderNode = document.createElement('div');
      folderNode.className = 'tree-node tree-folder is-expanded';
      folderNode.setAttribute('role', 'treeitem');
      folderNode.setAttribute('aria-expanded', 'true');
      folderNode.setAttribute('data-path', item.path);

      const row = document.createElement('div');
      row.className = 'tree-item-row folder-row';
      row.tabIndex = 0;

      // Chevron toggle
      const chevron = document.createElement('span');
      chevron.className = 'tree-chevron';
      chevron.innerHTML = `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="9 18 15 12 9 6"></polyline>
        </svg>
      `;

      // Folder icon
      const icon = document.createElement('span');
      icon.className = 'tree-icon';
      icon.innerHTML = `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
        </svg>
      `;

      // Folder label
      const label = document.createElement('span');
      label.className = 'tree-label';
      label.textContent = item.name;

      // Count badge
      const count = document.createElement('span');
      count.className = 'tree-badge';
      const childCount = (item.children || []).length;
      count.textContent = childCount;

      row.append(chevron, icon, label, count);
      folderNode.append(row);

      // Children container
      const childrenContainer = document.createElement('div');
      childrenContainer.className = 'tree-children';
      childrenContainer.setAttribute('role', 'group');

      let folderHasMatch = false;

      if (Array.isArray(item.children)) {
        for (const child of item.children) {
          const childEl = buildNode(child, depth + 1);
          if (childEl) {
            childrenContainer.append(childEl);
            folderHasMatch = true;
          }
        }
      }

      folderNode.append(childrenContainer);

      // Toggle folder on click
      row.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleFolder(folderNode);
      });

      // Keyboard accessible
      row.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          toggleFolder(folderNode);
        } else if (e.key === 'ArrowRight') {
          e.preventDefault();
          setFolderExpanded(folderNode, true);
        } else if (e.key === 'ArrowLeft') {
          e.preventDefault();
          setFolderExpanded(folderNode, false);
        }
      });

      // Search filtering
      if (normalizedQuery) {
        if (folderHasMatch || item.name.toLowerCase().includes(normalizedQuery)) {
          setFolderExpanded(folderNode, true);
          hasMatches = true;
          return folderNode;
        }
        return null;
      }

      hasMatches = true;
      return folderNode;
    }

    if (item.type === 'file') {
      const isMatch = !normalizedQuery ||
        item.title.toLowerCase().includes(normalizedQuery) ||
        item.name.toLowerCase().includes(normalizedQuery) ||
        item.path.toLowerCase().includes(normalizedQuery);

      if (!isMatch) return null;

      hasMatches = true;

      const fileNode = document.createElement('div');
      fileNode.className = 'tree-node tree-file';
      fileNode.setAttribute('role', 'treeitem');
      fileNode.setAttribute('data-path', item.path);

      const row = document.createElement('div');
      row.className = 'tree-item-row file-row';
      if (state.activeFilePath === item.path) {
        row.classList.add('active');
      }
      row.tabIndex = 0;

      // File icon
      const icon = document.createElement('span');
      icon.className = 'tree-icon';
      icon.innerHTML = `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="3"></circle>
          <path d="M12 2v3m0 14v3M2 12h3m14 0h3"></path>
        </svg>
      `;

      // Title
      const label = document.createElement('span');
      label.className = 'tree-label';
      label.textContent = item.title;
      if (isRTLText(item.title)) {
        label.setAttribute('dir', 'rtl');
      }

      row.append(icon, label);
      fileNode.append(row);

      row.addEventListener('click', (e) => {
        e.stopPropagation();
        navigateToMap(item.path);
        closeMobileSidebar();
      });

      row.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          navigateToMap(item.path);
          closeMobileSidebar();
        }
      });

      return fileNode;
    }

    return null;
  }

  for (const item of treeData) {
    const el = buildNode(item, 0);
    if (el) DOM.treeRoot.append(el);
  }

  if (!hasMatches && normalizedQuery) {
    DOM.treeNoResults.hidden = false;
  } else {
    DOM.treeNoResults.hidden = true;
  }
}

function toggleFolder(folderNode) {
  const isExpanded = folderNode.classList.contains('is-expanded');
  setFolderExpanded(folderNode, !isExpanded);
}

function setFolderExpanded(folderNode, expand) {
  if (expand) {
    folderNode.classList.add('is-expanded');
    folderNode.setAttribute('aria-expanded', 'true');
  } else {
    folderNode.classList.remove('is-expanded');
    folderNode.setAttribute('aria-expanded', 'false');
  }
}

function highlightActiveFileInTree(path) {
  const rows = DOM.treeRoot.querySelectorAll('.file-row');
  rows.forEach((r) => r.classList.remove('active'));

  const activeNode = DOM.treeRoot.querySelector(`[data-path="${CSS.escape(path)}"] > .file-row`);
  if (activeNode) {
    activeNode.classList.add('active');
    // Ensure parent folders are expanded
    let parentFolder = activeNode.closest('.tree-children');
    while (parentFolder) {
      const folderNode = parentFolder.closest('.tree-folder');
      if (folderNode) setFolderExpanded(folderNode, true);
      parentFolder = folderNode ? folderNode.parentElement?.closest('.tree-children') : null;
    }
  }
}

// Toggle all folders button in footer
let allFoldersExpanded = true;
DOM.btnToggleAllFolders.addEventListener('click', () => {
  allFoldersExpanded = !allFoldersExpanded;
  const folders = DOM.treeRoot.querySelectorAll('.tree-folder');
  folders.forEach((f) => setFolderExpanded(f, allFoldersExpanded));
});

// Search input handling
DOM.mapSearchInput.addEventListener('input', (e) => {
  const val = e.target.value;
  state.searchQuery = val;
  DOM.btnClearSearch.hidden = !val;
  renderTree(state.manifest, val);
  if (state.activeFilePath) {
    highlightActiveFileInTree(state.activeFilePath);
  }
});

DOM.btnClearSearch.addEventListener('click', () => {
  DOM.mapSearchInput.value = '';
  state.searchQuery = '';
  DOM.btnClearSearch.hidden = true;
  renderTree(state.manifest);
  if (state.activeFilePath) {
    highlightActiveFileInTree(state.activeFilePath);
  }
  DOM.mapSearchInput.focus();
});

// ==========================================================================
// Routing & URL Hash Management
// ==========================================================================
/**
 * Update URL hash to point to selected file
 */
function navigateToMap(filePath) {
  if (!filePath) return;
  const targetHash = '#' + encodeURI(filePath);
  if (window.location.hash !== targetHash) {
    window.location.hash = targetHash;
  } else {
    loadMapByPath(filePath);
  }
}

/**
 * Handle initial route based on hash or fallback to first file
 */
function handleInitialRoute() {
  const hash = window.location.hash.slice(1);
  if (hash) {
    const decodedPath = decodeURI(hash);
    const exists = state.flatFiles.some((f) => f.path === decodedPath);
    if (exists) {
      loadMapByPath(decodedPath);
      return;
    }
  }

  // Fallback to first available file in manifest
  if (state.flatFiles.length > 0) {
    navigateToMap(state.flatFiles[0].path);
  } else {
    showEmptyState();
  }
}

// Listen to browser back/forward buttons
window.addEventListener('hashchange', () => {
  const hash = window.location.hash.slice(1);
  if (hash) {
    const decodedPath = decodeURI(hash);
    if (decodedPath !== state.activeFilePath) {
      loadMapByPath(decodedPath);
    }
  }
});

// ==========================================================================
// Map Rendering with Markmap Engine
// ==========================================================================
/**
 * Load markdown content and render as interactive mind map
 */
async function loadMapByPath(filePath) {
  state.activeFilePath = filePath;
  highlightActiveFileInTree(filePath);

  const fileMeta = state.flatFiles.find((f) => f.path === filePath);
  const fileTitle = fileMeta ? fileMeta.title : filePath;
  state.activeMapTitle = fileTitle;

  DOM.mapTitleHeading.textContent = fileTitle;
  DOM.mapPathBreadcrumb.textContent = `maps / ${filePath}`;

  showLoading(`Loading "${fileTitle}"...`);
  hideError();

  try {
    const url = resolveAppUrl(`maps/${encodeURI(filePath)}`);
    const response = await fetch(url, { cache: 'no-cache' });
    if (!response.ok) {
      throw new Error(`Failed to load ${filePath} (${response.status} ${response.statusText})`);
    }

    const markdown = await response.text();
    state.rawMarkdown = markdown;

    // RTL detection and container direction setup
    updateDirectionForActiveMap(markdown, fileTitle);

    // Initialize markmap Transformer
    if (!state.transformer) {
      const { Transformer } = window.markmap;
      state.transformer = new Transformer();
    }

    // Transform Markdown -> Mindmap AST
    const { root, features, frontmatter } = state.transformer.transform(markdown);
    state.currentRoot = root;
    state.isAllExpanded = false;
    updateExpandButtonText(false);

    // Update active map title from frontmatter title if available
    const resolvedTitle = (frontmatter && frontmatter.title) || fileTitle;
    state.activeMapTitle = resolvedTitle;
    DOM.mapTitleHeading.textContent = resolvedTitle;

    // Load any required external assets (KaTeX, Prism, etc.)
    const { styles, scripts } = state.transformer.getUsedAssets(features);
    if (styles && window.markmap.loadCSS) {
      await window.markmap.loadCSS(styles);
    }
    if (scripts && window.markmap.loadJS) {
      await window.markmap.loadJS(scripts, { getMarkmap: () => window.markmap });
    }

    // Frontmatter options handled by markmap.deriveOptions
    let options = {};
    if (window.markmap.deriveOptions && frontmatter && frontmatter.markmap) {
      options = window.markmap.deriveOptions(frontmatter.markmap);
    }

    // Render or update Markmap instance
    if (!state.mmInstance) {
      state.mmInstance = window.markmap.Markmap.create('#mindmap', options, root);
      
      // Attach optional floating toolbar if available
      try {
        if (window.markmap.Toolbar) {
          const { el } = window.markmap.Toolbar.create(state.mmInstance);
          el.style.position = 'absolute';
          el.style.bottom = '16px';
          el.style.right = '16px';
          el.style.zIndex = '10';
          DOM.mindmapContainer.appendChild(el);
        }
      } catch (toolbarErr) {
        console.warn('Floating toolbar init warning:', toolbarErr);
      }
    } else {
      await state.mmInstance.setData(root, options);
      await state.mmInstance.fit();
    }

    // Fit mind map after layout calculation
    setTimeout(() => {
      if (state.mmInstance) {
        state.mmInstance.fit();
      }
    }, 100);

  } catch (error) {
    console.error('Error rendering mind map:', error);
    showError(error.message || `Could not render mind map for ${filePath}`);
  } finally {
    hideLoading();
  }
}

// ==========================================================================
// Toolbar Controls: Zoom, Fit, Expand/Collapse
// ==========================================================================
DOM.btnZoomIn.addEventListener('click', () => {
  if (state.mmInstance) state.mmInstance.rescale(1.25);
});

DOM.btnZoomOut.addEventListener('click', () => {
  if (state.mmInstance) state.mmInstance.rescale(0.8);
});

DOM.btnFit.addEventListener('click', () => {
  if (state.mmInstance) state.mmInstance.fit();
});

// Expand / Collapse All
function setTreeFold(node, foldState, isRoot = true) {
  if (!node) return;
  if (!isRoot && node.children && node.children.length > 0) {
    if (!node.payload) node.payload = {};
    node.payload.fold = foldState ? 1 : 0;
  } else if (!isRoot && foldState === false && node.payload) {
    node.payload.fold = 0;
  }

  if (Array.isArray(node.children)) {
    for (const child of node.children) {
      setTreeFold(child, foldState, false);
    }
  }
}

function updateExpandButtonText(isAllExpanded) {
  if (DOM.expandToggleText) {
    DOM.expandToggleText.textContent = isAllExpanded ? 'Collapse All' : 'Expand All';
  }
  DOM.btnToggleExpand.title = isAllExpanded ? 'Collapse all branches' : 'Expand all branches';
}

DOM.btnToggleExpand.addEventListener('click', async () => {
  if (!state.mmInstance || !state.currentRoot) return;

  state.isAllExpanded = !state.isAllExpanded;
  const shouldFold = !state.isAllExpanded;

  setTreeFold(state.currentRoot, shouldFold, true);
  await state.mmInstance.setData(state.currentRoot);
  await state.mmInstance.fit();

  updateExpandButtonText(state.isAllExpanded);
});

// ==========================================================================
// SVG Export
// ==========================================================================
DOM.btnDownloadSvg.addEventListener('click', () => {
  if (!DOM.mindmapSvg) return;

  try {
    const clone = DOM.mindmapSvg.cloneNode(true);

    // Ensure valid standalone SVG attributes
    clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    clone.setAttribute('xmlns:xlink', 'http://www.w3.org/1999/xlink');

    // Get current SVG dimensions
    const rect = DOM.mindmapSvg.getBoundingClientRect();
    clone.setAttribute('width', `${Math.max(rect.width, 800)}`);
    clone.setAttribute('height', `${Math.max(rect.height, 600)}`);

    // Inject standalone styles
    const styleEl = document.createElement('style');
    const isDark = state.theme === 'dark';
    styleEl.textContent = `
      .markmap {
        font-family: 'Outfit', 'Tajawal', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      }
      .markmap-foreign {
        display: inline-block;
        color: ${isDark ? '#f8fafc' : '#1e293b'};
      }
      .markmap-foreign p { margin: 0; }
      .markmap-foreign a { color: ${isDark ? '#38bdf8' : '#4f46e5'}; text-decoration: none; }
      .markmap-foreign code {
        font-family: monospace;
        padding: 2px 4px;
        background: ${isDark ? '#1e293b' : '#f1f5f9'};
        color: ${isDark ? '#e2e8f0' : '#334155'};
        border-radius: 3px;
      }
    `;
    clone.prepend(styleEl);

    // Background color rect
    const bgRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    bgRect.setAttribute('width', '100%');
    bgRect.setAttribute('height', '100%');
    bgRect.setAttribute('fill', isDark ? '#090d16' : '#ffffff');
    clone.prepend(bgRect);

    const serializer = new XMLSerializer();
    const svgString = '<?xml version="1.0" encoding="UTF-8"?>\n' + serializer.serializeToString(clone);
    const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
    const blobUrl = URL.createObjectURL(blob);

    const downloadLink = document.createElement('a');
    const filename = (state.activeMapTitle || 'mindmap')
      .replace(/[^a-zA-Z0-9_\u0600-\u06FF\s-]/g, '')
      .trim()
      .replace(/\s+/g, '-') || 'mindmap';

    downloadLink.href = blobUrl;
    downloadLink.download = `${filename}.svg`;
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
    URL.revokeObjectURL(blobUrl);
  } catch (err) {
    console.error('Failed to export SVG:', err);
    alert('Could not export SVG. Please check console for details.');
  }
});

// ==========================================================================
// View Source Modal
// ==========================================================================
function openSourceModal() {
  DOM.sourceCodeBlock.textContent = state.rawMarkdown || '/* No source loaded */';
  DOM.sourceModal.hidden = false;
  DOM.copyButtonText.textContent = 'Copy';
  DOM.copyIconDefault.hidden = false;
  DOM.copyIconSuccess.hidden = true;
}

function closeSourceModal() {
  DOM.sourceModal.hidden = true;
}

DOM.btnViewSource.addEventListener('click', openSourceModal);
DOM.btnCloseModal.addEventListener('click', closeSourceModal);

DOM.sourceModal.addEventListener('click', (e) => {
  if (e.target === DOM.sourceModal) {
    closeSourceModal();
  }
});

DOM.btnCopySource.addEventListener('click', async () => {
  if (!state.rawMarkdown) return;
  try {
    await navigator.clipboard.writeText(state.rawMarkdown);
    DOM.copyButtonText.textContent = 'Copied!';
    DOM.copyIconDefault.hidden = true;
    DOM.copyIconSuccess.hidden = false;
    setTimeout(() => {
      DOM.copyButtonText.textContent = 'Copy';
      DOM.copyIconDefault.hidden = false;
      DOM.copyIconSuccess.hidden = true;
    }, 2000);
  } catch (err) {
    console.warn('Clipboard copy failed:', err);
  }
});

// Escape key closes modals and drawer
window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    if (!DOM.sourceModal.hidden) {
      closeSourceModal();
    }
    closeMobileSidebar();
  }
});

// ==========================================================================
// Responsive Mobile Drawer
// ==========================================================================
function openMobileSidebar() {
  DOM.sidebar.classList.add('is-open');
  DOM.sidebarBackdrop.classList.add('is-active');
  DOM.btnOpenSidebar.setAttribute('aria-expanded', 'true');
}

function closeMobileSidebar() {
  DOM.sidebar.classList.remove('is-open');
  DOM.sidebarBackdrop.classList.remove('is-active');
  DOM.btnOpenSidebar.setAttribute('aria-expanded', 'false');
}

DOM.btnOpenSidebar.addEventListener('click', openMobileSidebar);
DOM.btnCloseSidebar.addEventListener('click', closeMobileSidebar);
DOM.sidebarBackdrop.addEventListener('click', closeMobileSidebar);

// Theme Toggle
DOM.btnThemeToggle.addEventListener('click', toggleTheme);

// ==========================================================================
// State Display Helpers
// ==========================================================================
function showLoading(msg = 'Loading...') {
  DOM.spinnerText.textContent = msg;
  DOM.loadingOverlay.hidden = false;
}

function hideLoading() {
  DOM.loadingOverlay.hidden = true;
}

function showEmptyState() {
  DOM.emptyState.hidden = false;
}

function hideEmptyState() {
  DOM.emptyState.hidden = true;
}

function showError(msg) {
  DOM.errorMessageText.textContent = msg;
  DOM.errorState.hidden = false;
}

function hideError() {
  DOM.errorState.hidden = true;
}

DOM.btnRetryLoad.addEventListener('click', () => {
  if (state.activeFilePath) {
    loadMapByPath(state.activeFilePath);
  } else {
    loadManifest();
  }
});

// ==========================================================================
// Initialization
// ==========================================================================
function init() {
  applyTheme(getInitialTheme());
  loadManifest();
}

// Start application when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
