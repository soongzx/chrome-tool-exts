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

function handleReload() {
  showLoading(true);
  
  chrome.runtime.sendMessage({ action: 'reloadBookmarks' }, (response) => {
    showLoading(false);
    
    if (response && response.bookmarks) {
      bookmarksData = response.bookmarks;
      renderBookmarks(bookmarksData);
      updateLastUpdateTime(response.lastUpdate);
    }
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
  attachExpandListeners();
}

function createFolderCard(folder) {
  const items = folder.children || [];
  const visibleItems = items.slice(0, MAX_VISIBLE_ITEMS);
  const hiddenItems = items.slice(MAX_VISIBLE_ITEMS);
  const hasMore = hiddenItems.length > 0;
  
  return `
    <div class="bookmark-card" data-folder-id="${folder.id}">
      <div class="category-header">
        <h3 class="category-title" title="${escapeHtml(folder.title)}">${escapeHtml(folder.title)}</h3>
        <span class="category-count">${items.length}</span>
      </div>
      <div class="bookmark-list">
        ${visibleItems.map(item => createBookmarkItem(item)).join('')}
      </div>
      ${hasMore ? `
        <button class="expand-btn" data-folder="${folder.id}" data-expanded="false">
          展开更多 (+${hiddenItems.length})
        </button>
        <div class="bookmark-list hidden" id="expanded-${folder.id}">
          ${hiddenItems.map(item => createBookmarkItem(item)).join('')}
        </div>
      ` : ''}
    </div>
  `;
}

function createBookmarkItem(item) {
  const domain = extractDomain(item.url);
  
  return `
    <a href="${escapeHtml(item.url)}" class="bookmark-item" target="_blank" title="${escapeHtml(item.title || item.url)}">
      <img class="favicon" src="https://www.google.com/s2/favicons?domain=${domain}&sz=32" alt="" onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 24 24%22 fill=%22%236b7280%22><rect width=%2224%22 height=%2224%22 rx=%224%22/></svg>'">
      <span class="title">${escapeHtml(item.title || domain)}</span>
      <span class="domain">${domain}</span>
    </a>
  `;
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

function attachExpandListeners() {
  document.querySelectorAll('.expand-btn').forEach(btn => {
    btn.addEventListener('click', handleExpand);
  });
}

function attachDragListeners() {
  const cards = document.querySelectorAll('.bookmark-card');
  const container = document.getElementById('bookmarksContainer');
  
  cards.forEach(card => {
    card.setAttribute('draggable', 'true');
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
    btn.textContent = `展开更多 (+${btn.dataset.extra || '0'})`.replace('展开更多 (+undefined)', '展开更多');
    btn.dataset.expanded = 'false';
  } else {
    expandedDiv.classList.remove('hidden');
    btn.textContent = '收起';
    btn.dataset.expanded = 'true';
  }
}

function handleDragStart(e) {
  draggedItem = e.target.closest('.bookmark-card');
  draggedItem.classList.add('dragging');
  e.dataTransfer.effectAllowed = 'move';
}

function handleDragEnd(e) {
  if (draggedItem) {
    draggedItem.classList.remove('dragging');
    draggedItem = null;
  }
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
  const el = document.getElementById('loading');
  if (show) {
    el.classList.remove('hidden');
    el.classList.add('show');
  } else {
    el.classList.add('hidden');
    el.classList.remove('show');
  }
}

function showEmpty(show) {
  const el = document.getElementById('empty');
  if (show) {
    el.classList.remove('hidden');
    el.classList.add('show');
  } else {
    el.classList.add('hidden');
    el.classList.remove('show');
  }
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