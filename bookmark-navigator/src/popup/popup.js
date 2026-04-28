const DEFAULT_SETTINGS = {
  theme: 'dark',
  openMode: 'newTab',
  expandDepth: 2,
  compact: false
};

let bookmarkTree = [];
let flatBookmarks = [];
let folderOptions = [];
let settings = { ...DEFAULT_SETTINGS };
let selectedIds = new Set();
let lastSelectedId = null;
let contextNodeId = null;

document.addEventListener('DOMContentLoaded', init);

async function init() {
  await loadSettings();
  applySettings();
  bindEvents();
  await loadBookmarks();
}

async function loadSettings() {
  const result = await chrome.storage.local.get(['bookmarkNavigatorSettings']);
  settings = { ...DEFAULT_SETTINGS, ...(result.bookmarkNavigatorSettings || {}) };
}

async function saveSettings(nextSettings) {
  settings = { ...settings, ...nextSettings };
  await chrome.storage.local.set({ bookmarkNavigatorSettings: settings });
  applySettings();
}

function applySettings() {
  document.body.className = `theme-${settings.theme}`;
  document.getElementById('content').classList.toggle('compact', settings.compact);
  document.getElementById('themeSelect').value = settings.theme;
  document.getElementById('openModeSelect').value = settings.openMode;
  document.getElementById('expandDepthSelect').value = String(settings.expandDepth);
  document.getElementById('compactToggle').checked = settings.compact;
}

function bindEvents() {
  document.getElementById('reloadBtn').addEventListener('click', loadBookmarks);
  document.getElementById('settingsBtn').addEventListener('click', () => toggleSettings(true));
  document.getElementById('closeSettingsBtn').addEventListener('click', () => toggleSettings(false));
  document.getElementById('themeBtn').addEventListener('click', cycleTheme);
  document.getElementById('searchInput').addEventListener('input', debounce(render, 120));
  document.getElementById('sortSelect').addEventListener('change', render);
  document.getElementById('openModeSelect').addEventListener('change', (event) => saveSettings({ openMode: event.target.value }));
  document.getElementById('expandDepthSelect').addEventListener('change', (event) => saveSettings({ expandDepth: Number(event.target.value) }).then(render));
  document.getElementById('themeSelect').addEventListener('change', (event) => saveSettings({ theme: event.target.value }));
  document.getElementById('compactToggle').addEventListener('change', (event) => saveSettings({ compact: event.target.checked }));
  document.getElementById('cleanupBtn').addEventListener('click', cleanupBase64Icons);
  document.getElementById('addFolderBtn').addEventListener('click', () => showFolderDialog());
  document.getElementById('addBookmarkBtn').addEventListener('click', () => showBookmarkDialog());
  document.getElementById('contextMenu').addEventListener('click', handleContextAction);
  document.addEventListener('click', hideContextMenu);
  document.addEventListener('keydown', handleKeyboard);
}

async function loadBookmarks() {
  setState('loading');
  const tree = await chrome.bookmarks.getTree();
  bookmarkTree = tree[0]?.children || [];
  flatBookmarks = [];
  folderOptions = [];
  collectIndex(bookmarkTree, []);
  render();
}

function collectIndex(nodes, path) {
  nodes.forEach((node) => {
    const nextPath = [...path, node.title || '未命名'];
    if (node.children) {
      folderOptions.push({ id: node.id, title: node.title || '未命名文件夹', path: nextPath.join(' > ') });
      collectIndex(node.children, nextPath);
      return;
    }
    flatBookmarks.push({ ...node, path: path.join(' > ') || '根目录' });
  });
}

function render() {
  const query = document.getElementById('searchInput').value.trim().toLowerCase();
  const treeRoot = document.getElementById('treeRoot');
  const searchResults = document.getElementById('searchResults');

  updateSummary();
  updateSelectionText();

  if (query) {
    treeRoot.classList.add('hidden');
    searchResults.classList.remove('hidden');
    renderSearchResults(query);
    return;
  }

  searchResults.classList.add('hidden');
  treeRoot.classList.remove('hidden');
  const sortedTree = sortNodes(bookmarkTree);
  treeRoot.innerHTML = sortedTree.map((node) => renderNode(node, 0)).join('');
  bindNodeEvents(treeRoot);
  setState(flatBookmarks.length ? 'ready' : 'empty');
}

function renderSearchResults(query) {
  const searchResults = document.getElementById('searchResults');
  const results = flatBookmarks.filter((bookmark) => {
    return matches(bookmark.title, query) || matches(bookmark.url, query) || matches(bookmark.path, query);
  });

  if (!results.length) {
    searchResults.innerHTML = '';
    setState('empty');
    return;
  }

  setState('ready');
  searchResults.innerHTML = results.map((bookmark) => `
    <div class="result-item" data-id="${bookmark.id}" data-url="${escapeAttr(bookmark.url)}">
      <span></span>
      <img class="favicon" src="${faviconUrl(bookmark.url)}" alt="" loading="lazy">
      <div class="node-main">
        <div class="result-title">${highlight(bookmark.title || bookmark.url, query)}</div>
        <div class="result-path">${escapeHtml(bookmark.path)} · ${highlight(bookmark.url, query)}</div>
      </div>
      <span class="node-count">打开</span>
    </div>
  `).join('');
  bindNodeEvents(searchResults);
}

function renderNode(node, depth) {
  const isFolder = Boolean(node.children);
  const count = isFolder ? countBookmarks(node) : '';
  const expanded = depth < settings.expandDepth;
  const selected = selectedIds.has(node.id) ? ' selected' : '';
  const indent = depth * 16;

  if (!isFolder) {
    return `
      <div class="node-row${selected}" data-id="${node.id}" data-url="${escapeAttr(node.url)}" draggable="true" style="padding-left:${indent + 8}px">
        <button class="twisty" tabindex="-1"></button>
        <img class="favicon" src="${faviconUrl(node.url)}" alt="" loading="lazy">
        <div class="node-main">
          <div class="node-title" title="${escapeAttr(node.title || node.url)}">${escapeHtml(node.title || node.url)}</div>
          <div class="node-url" title="${escapeAttr(node.url)}">${escapeHtml(node.url)}</div>
        </div>
        <span class="node-count"></span>
      </div>
    `;
  }

  return `
    <div class="folder-node" data-folder-id="${node.id}">
      <div class="node-row${selected}" data-id="${node.id}" data-folder="true" draggable="true" style="padding-left:${indent + 8}px">
        <button class="twisty" data-toggle="${node.id}" title="展开或折叠">${expanded ? '▾' : '▸'}</button>
        <span class="node-icon">□</span>
        <div class="node-main">
          <div class="node-title" title="${escapeAttr(node.title || '未命名文件夹')}">${escapeHtml(node.title || '未命名文件夹')}</div>
          <div class="node-url">文件夹</div>
        </div>
        <span class="node-count">${count}</span>
      </div>
      <div class="children${expanded ? '' : ' collapsed'}" data-children="${node.id}">
        ${(node.children || []).map((child) => renderNode(child, depth + 1)).join('')}
      </div>
    </div>
  `;
}

function bindNodeEvents(root) {
  root.querySelectorAll('.node-row, .result-item').forEach((row) => {
    row.addEventListener('click', handleNodeClick);
    row.addEventListener('dblclick', handleNodeOpen);
    row.addEventListener('contextmenu', handleContextMenu);
    row.addEventListener('dragstart', handleDragStart);
    row.addEventListener('dragover', handleDragOver);
    row.addEventListener('drop', handleDrop);
  });
  root.querySelectorAll('.twisty[data-toggle]').forEach((button) => button.addEventListener('click', toggleFolder));
}

function handleNodeClick(event) {
  if (event.target.matches('.twisty')) return;
  const row = event.currentTarget;
  const id = row.dataset.id;
  const allIds = Array.from(document.querySelectorAll('[data-id]')).map((element) => element.dataset.id);

  if (event.shiftKey && lastSelectedId) {
    const start = allIds.indexOf(lastSelectedId);
    const end = allIds.indexOf(id);
    selectedIds = new Set(allIds.slice(Math.min(start, end), Math.max(start, end) + 1));
  } else if (event.ctrlKey || event.metaKey) {
    selectedIds.has(id) ? selectedIds.delete(id) : selectedIds.add(id);
  } else {
    selectedIds = new Set([id]);
  }

  lastSelectedId = id;
  render();
}

function handleNodeOpen(event) {
  const url = event.currentTarget.dataset.url;
  if (url) openBookmark(url);
}

function toggleFolder(event) {
  event.stopPropagation();
  const id = event.currentTarget.dataset.toggle;
  const children = document.querySelector(`[data-children="${id}"]`);
  const collapsed = children.classList.toggle('collapsed');
  event.currentTarget.textContent = collapsed ? '▸' : '▾';
}

function handleContextMenu(event) {
  event.preventDefault();
  contextNodeId = event.currentTarget.dataset.id;
  const menu = document.getElementById('contextMenu');
  menu.style.left = `${Math.min(event.clientX, window.innerWidth - 155)}px`;
  menu.style.top = `${Math.min(event.clientY, window.innerHeight - 150)}px`;
  menu.classList.remove('hidden');
}

function hideContextMenu() {
  document.getElementById('contextMenu').classList.add('hidden');
}

async function handleContextAction(event) {
  const action = event.target.dataset.action;
  if (!action || !contextNodeId) return;
  const node = await getNode(contextNodeId);
  hideContextMenu();

  if (action === 'open-new-window' && node.url) chrome.windows.create({ url: node.url });
  if (action === 'open-incognito' && node.url) chrome.windows.create({ url: node.url, incognito: true });
  if (action === 'edit') node.children ? showFolderDialog(node) : showBookmarkDialog(node);
  if (action === 'delete') deleteSelectedOrNode(node);
}

function handleKeyboard(event) {
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'f') {
    event.preventDefault();
    document.getElementById('searchInput').focus();
  }

  if (event.key === 'Enter' && selectedIds.size === 1) {
    getNode(Array.from(selectedIds)[0]).then((node) => node.url && openBookmark(node.url));
  }

  if (event.key === 'Delete' && selectedIds.size) {
    deleteSelectedOrNode();
  }
}

function handleDragStart(event) {
  const id = event.currentTarget.dataset.id;
  event.dataTransfer.setData('text/plain', id);
  event.dataTransfer.effectAllowed = 'move';
}

function handleDragOver(event) {
  if (event.currentTarget.dataset.folder) {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }
}

async function handleDrop(event) {
  const parentId = event.currentTarget.dataset.id;
  const draggedId = event.dataTransfer.getData('text/plain');
  if (!event.currentTarget.dataset.folder || !draggedId || draggedId === parentId) return;
  event.preventDefault();
  await chrome.bookmarks.move(draggedId, { parentId });
  await loadBookmarks();
}

async function openBookmark(url) {
  if (settings.openMode === 'currentTab') {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.id) {
      await chrome.tabs.update(tab.id, { url });
      window.close();
      return;
    }
  }
  await chrome.tabs.create({ url });
}

async function showBookmarkDialog(node) {
  const body = `
    <label>标题<input name="title" required value="${escapeAttr(node?.title || '')}"></label>
    <label>URL<input name="url" required value="${escapeAttr(node?.url || '')}" placeholder="https://example.com"></label>
    <label>父文件夹<select name="parentId">${folderSelectOptions(node?.parentId)}</select></label>
  `;
  const values = await showDialog(node ? '编辑书签' : '添加书签', body);
  if (!values) return;

  if (node) {
    await chrome.bookmarks.update(node.id, { title: values.title, url: values.url });
    if (values.parentId !== node.parentId) await chrome.bookmarks.move(node.id, { parentId: values.parentId });
  } else {
    await chrome.bookmarks.create({ parentId: values.parentId, title: values.title, url: values.url });
  }
  await loadBookmarks();
}

async function showFolderDialog(node) {
  const body = `
    <label>文件夹名称<input name="title" required value="${escapeAttr(node?.title || '')}"></label>
    <label>父文件夹<select name="parentId">${folderSelectOptions(node?.parentId, node?.id)}</select></label>
  `;
  const values = await showDialog(node ? '编辑文件夹' : '新建文件夹', body);
  if (!values) return;

  if (node) {
    await chrome.bookmarks.update(node.id, { title: values.title });
    if (values.parentId !== node.parentId) await chrome.bookmarks.move(node.id, { parentId: values.parentId });
  } else {
    await chrome.bookmarks.create({ parentId: values.parentId, title: values.title });
  }
  await loadBookmarks();
}

function showDialog(title, bodyHtml) {
  return new Promise((resolve) => {
    const template = document.getElementById('dialogTemplate');
    const dialog = template.content.firstElementChild.cloneNode(true);
    const form = dialog.querySelector('form');
    dialog.querySelector('h2').textContent = title;
    dialog.querySelector('.dialog-body').innerHTML = bodyHtml;
    dialog.querySelector('.cancel-btn').addEventListener('click', () => close(null));
    dialog.addEventListener('click', (event) => {
      if (event.target === dialog) close(null);
    });
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      close(Object.fromEntries(new FormData(form).entries()));
    });
    function close(value) {
      dialog.remove();
      resolve(value);
    }
    document.body.appendChild(dialog);
    form.querySelector('input,select')?.focus();
  });
}

async function deleteSelectedOrNode(node) {
  const ids = node ? [node.id] : Array.from(selectedIds);
  if (!ids.length) return;
  if (!confirm(`确认删除 ${ids.length} 个项目？文件夹会连同子项一起删除。`)) return;

  for (const id of ids) {
    try {
      const current = await getNode(id);
      if (current.children) await chrome.bookmarks.removeTree(id);
      else await chrome.bookmarks.remove(id);
    } catch {
      // A selected child may already be removed when its parent folder is deleted.
    }
  }
  selectedIds.clear();
  await loadBookmarks();
}

async function cleanupBase64Icons() {
  const dataUrlBookmarks = flatBookmarks.filter((bookmark) => /^data:image\//i.test(bookmark.url || ''));
  if (!dataUrlBookmarks.length) {
    alert('未发现 URL 可见的 data:image Base64 书签。Chrome 不开放 favicon 字段，因此无法直接清理内部 favicon 缓存。');
    return;
  }

  const list = dataUrlBookmarks.slice(0, 8).map((bookmark) => `- ${bookmark.title || bookmark.url}`).join('\n');
  const ok = confirm(`发现 ${dataUrlBookmarks.length} 个 URL 为 Base64 图片数据的书签。\n\n${list}\n\n为避免破坏书签目标，本工具不会自动改写这些 URL。请确认后手动编辑或删除。`);
  if (ok) selectedIds = new Set(dataUrlBookmarks.map((bookmark) => bookmark.id));
  render();
}

function cycleTheme() {
  const themes = ['dark', 'light', 'contrast'];
  const next = themes[(themes.indexOf(settings.theme) + 1) % themes.length];
  saveSettings({ theme: next });
}

function toggleSettings(show) {
  const panel = document.getElementById('settingsPanel');
  panel.classList.toggle('hidden', !show);
  panel.setAttribute('aria-hidden', String(!show));
}

function sortNodes(nodes) {
  const sortType = document.getElementById('sortSelect').value;
  const cloned = structuredClone(nodes);
  if (sortType === 'manual') return cloned;

  function sortChildren(children) {
    children.sort((a, b) => {
      if (sortType === 'date') return (b.dateAdded || 0) - (a.dateAdded || 0);
      return (a.title || '').localeCompare(b.title || '', 'zh-CN');
    });
    children.forEach((child) => child.children && sortChildren(child.children));
  }

  sortChildren(cloned);
  return cloned;
}

function folderSelectOptions(selectedId, excludedId) {
  return folderOptions
    .filter((folder) => folder.id !== excludedId)
    .map((folder) => `<option value="${folder.id}"${folder.id === selectedId ? ' selected' : ''}>${escapeHtml(folder.path)}</option>`)
    .join('');
}

function updateSummary() {
  document.getElementById('summaryText').textContent = `${folderOptions.length} 个文件夹，${flatBookmarks.length} 个书签`;
}

function updateSelectionText() {
  document.getElementById('selectionText').textContent = selectedIds.size ? `已选择 ${selectedIds.size} 项` : '未选择';
}

function setState(state) {
  document.getElementById('loading').classList.toggle('hidden', state !== 'loading');
  document.getElementById('empty').classList.toggle('hidden', state !== 'empty');
}

function matches(value, query) {
  return String(value || '').toLowerCase().includes(query);
}

function countBookmarks(node) {
  if (!node.children) return node.url ? 1 : 0;
  return node.children.reduce((total, child) => total + countBookmarks(child), 0);
}

async function getNode(id) {
  const nodes = await chrome.bookmarks.get(id);
  return nodes[0];
}

function faviconUrl(url) {
  try {
    return `chrome-extension://${chrome.runtime.id}/_favicon/?pageUrl=${encodeURIComponent(url)}&size=32`;
  } catch {
    return '';
  }
}

function highlight(text, query) {
  const escaped = escapeHtml(text || '');
  if (!query) return escaped;
  const safeQuery = escapeRegExp(query);
  return escaped.replace(new RegExp(`(${safeQuery})`, 'ig'), '<mark>$1</mark>');
}

function escapeHtml(value) {
  const div = document.createElement('div');
  div.textContent = value || '';
  return div.innerHTML;
}

function escapeAttr(value) {
  return escapeHtml(value).replace(/"/g, '&quot;');
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function debounce(fn, wait) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), wait);
  };
}
