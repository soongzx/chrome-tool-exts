const MAX_VISIBLE_ITEMS = 8;
let bookmarksData = [];
let draggedItem = null;

document.addEventListener('DOMContentLoaded', init);

async function init() {
  showLoading(true);
  
  try {
    const result = await chrome.storage.local.get(['bookmarksData', 'lastUpdate']);
    
    if (result.bookmarksData && result.bookmarksData.length > 0) {
      bookmarksData = result.bookmarksData;
      renderBookmarks(bookmarksData);
      updateLastUpdateTime(result.lastUpdate);
      showLoading(false);
    } else {
      loadBookmarksFromBackground();
    }
  } catch (error) {
    console.error('Init error:', error);
    loadBookmarksFromBackground();
  }
  
  setupEventListeners();
}

function loadBookmarksFromBackground() {
  const timeoutId = setTimeout(() => {
    showLoading(false);
    showEmpty(true);
  }, 10000);
  
  chrome.runtime.sendMessage({ action: 'getBookmarks' }, (response) => {
    clearTimeout(timeoutId);
    showLoading(false);
    
    if (response && response.bookmarks && response.bookmarks.length > 0) {
      bookmarksData = response.bookmarks;
      chrome.storage.local.set({ bookmarksData: bookmarksData, lastUpdate: Date.now() });
      renderBookmarks(bookmarksData);
    } else {
      showEmpty(true);
    }
  });
}

function setupEventListeners() {
  document.getElementById('searchInput').addEventListener('input', debounce(handleSearch, 300));
  document.getElementById('sortSelect').addEventListener('change', handleSort);
  document.getElementById('reloadBtn').addEventListener('click', handleReload);
}

function handleSearch(e) {
  const query = e.target.value.toLowerCase().trim();
  
  if (!query) {
    renderBookmarks(bookmarksData);
    return;
  }
  
  const filtered = filterBookmarks(bookmarksData, query);
  renderBookmarks(filtered);
}

function filterBookmarks(data, query) {
  const result = [];
  
  function traverse(nodes) {
    nodes.forEach(node => {
      if (node.url) {
        if (node.title.toLowerCase().includes(query) || node.url.toLowerCase().includes(query)) {
          result.push(node);
        }
      }
      if (node.children) {
        const filteredChildren = filterBookmarks(node.children, query);
        if (filteredChildren.length > 0) {
          result.push({
            ...node,
            children: filteredChildren
          });
        }
      }
    });
  }
  
  traverse(data);
  return result;
}

function handleSort(e) {
  const sortType = e.target.value;
  
  if (sortType === 'default') {
    renderBookmarks(bookmarksData);
    return;
  }
  
  const sorted = JSON.parse(JSON.stringify(bookmarksData));
  
  function sortNodes(nodes) {
    nodes.sort((a, b) => {
      if (sortType === 'name') {
        return (a.title || '').localeCompare(b.title || '');
      }
      if (sortType === 'date') {
        return (b.dateAdded || 0) - (a.dateAdded || 0);
      }
      return 0;
    });
    
    nodes.forEach(node => {
      if (node.children) {
        sortNodes(node.children);
      }
    });
  }
  
  sortNodes(sorted);
  renderBookmarks(sorted);
}

async function handleReload() {
  showLoading(true);
  
  chrome.runtime.sendMessage({ action: 'reloadBookmarks' }, (response) => {
    if (response && response.bookmarks) {
      bookmarksData = response.bookmarks;
      renderBookmarks(bookmarksData);
      updateLastUpdateTime(response.lastUpdate);
    }
    showLoading(false);
  });
}

function updateLastUpdateTime(timestamp) {
  if (timestamp) {
    const date = new Date(timestamp);
    console.log('Last update:', date.toLocaleString('zh-CN'));
  }
}

function renderBookmarks(data) {
  const container = document.getElementById('bookmarksContainer');
  const emptyEl = document.getElementById('empty');
  
  if (!data || data.length === 0) {
    container.innerHTML = '';
    showEmpty(true);
    return;
  }
  
  showEmpty(false);
  
  container.innerHTML = data.map(folder => createFolderCard(folder)).join('');
  
  attachDragListeners();
}

function createFolderCard(folder) {
  const items = folder.children || [];
  const visibleItems = items.slice(0, MAX_VISIBLE_ITEMS);
  const hiddenItems = items.slice(MAX_VISIBLE_ITEMS);
  const hasMore = hiddenItems.length > 0;
  
  return `
    <div class="bookmark-card" data-folder-id="${folder.id}" draggable="true">
      <div class="category-header">
        <h3 class="text-lg font-semibold text-primary-300 truncate">${escapeHtml(folder.title)}</h3>
        <span class="text-xs text-slate-500">${items.length}</span>
      </div>
      <div class="bookmark-list space-y-1">
        ${visibleItems.map(item => createBookmarkItem(item)).join('')}
      </div>
      ${hasMore ? `
        <button class="expand-btn mt-3 w-full" data-folder="${folder.id}" data-expanded="false">
          展开更多 (+${hiddenItems.length})
        </button>
        <div class="hidden bookmark-list space-y-1 mt-2" id="expanded-${folder.id}">
          ${hiddenItems.map(item => createBookmarkItem(item)).join('')}
        </div>
      ` : ''}
    </div>
  `;
}

function createBookmarkItem(item) {
  const favicon = getFaviconUrl(item.url);
  const domain = extractDomain(item.url);
  
  return `
    <a href="${escapeHtml(item.url)}" class="bookmark-item" target="_blank" title="${escapeHtml(item.url)}">
      <img src="${favicon}" class="w-5 h-5 rounded" alt="" onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 24 24%22 fill=%22%2394a3b8%22><path d=%22M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z%22/></svg>'">
      <span class="truncate flex-1">${escapeHtml(item.title || domain)}</span>
      <span class="text-xs text-slate-500 hidden sm:inline">${domain}</span>
    </a>
  `;
}

function getFaviconUrl(url) {
  try {
    const domain = new URL(url).hostname;
    return `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
  } catch {
    return 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%2394a3b8"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z"/></svg>';
  }
}

function extractDomain(url) {
  try {
    return new URL(url).hostname.replace('www.', '');
  } catch {
    return url;
  }
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function attachDragListeners() {
  document.querySelectorAll('.expand-btn').forEach(btn => {
    btn.addEventListener('click', handleExpand);
  });
  
  const cards = document.querySelectorAll('.bookmark-card');
  const container = document.getElementById('bookmarksContainer');
  
  cards.forEach(card => {
    card.addEventListener('dragstart', handleDragStart);
    card.addEventListener('dragend', handleDragEnd);
    card.addEventListener('dragover', handleDragOver);
    card.addEventListener('drop', handleDrop);
  });
  
  container.addEventListener('dragover', handleContainerDragOver);
  container.addEventListener('drop', handleContainerDrop);
}

function handleExpand(e) {
  const btn = e.target;
  const folderId = btn.dataset.folder;
  const expanded = btn.dataset.expanded === 'true';
  const expandedDiv = document.getElementById(`expanded-${folderId}`);
  
  if (expanded) {
    expandedDiv.classList.add('hidden');
    btn.textContent = `展开更多 (+${btn.dataset.hiddenCount})`;
    btn.dataset.expanded = 'false';
  } else {
    expandedDiv.classList.remove('hidden');
    btn.textContent = '收起';
    btn.dataset.expanded = 'true';
  }
}

function handleDragStart(e) {
  draggedItem = e.target;
  e.target.classList.add('dragging');
  e.dataTransfer.effectAllowed = 'move';
}

function handleDragEnd(e) {
  e.target.classList.remove('dragging');
  draggedItem = null;
}

function handleDragOver(e) {
  e.preventDefault();
  e.dataTransfer.dropEffect = 'move';
}

function handleDrop(e) {
  e.preventDefault();
  e.stopPropagation();
}

function handleContainerDragOver(e) {
  e.preventDefault();
  e.dataTransfer.dropEffect = 'move';
}

function handleContainerDrop(e) {
  e.preventDefault();
}

function showLoading(show) {
  document.getElementById('loading').classList.toggle('hidden', !show);
}

function showEmpty(show) {
  document.getElementById('empty').classList.toggle('hidden', !show);
}

function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}