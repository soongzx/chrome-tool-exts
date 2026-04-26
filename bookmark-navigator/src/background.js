// Background service worker for Bookmark Navigator

function processBookmarksTree(nodes) {
  if (!nodes || !nodes.length) return [];
  
  const root = nodes[0];
  if (!root.children) return [];
  
  const result = [];
  
  root.children.forEach(child => {
    if (child.id === '1' || child.id === '0') {
      child.children.forEach(subChild => {
        const processed = processNode(subChild);
        if (processed) {
          result.push(processed);
        }
      });
    } else {
      const processed = processNode(child);
      if (processed) {
        result.push(processed);
      }
    }
  });
  
  return result;
}

function processNode(node) {
  if (node.url) {
    return null;
  }
  
  const folder = {
    id: node.id,
    title: node.title || '未命名文件夹',
    children: [],
    expanded: true
  };
  
  if (node.children) {
    node.children.forEach(child => {
      if (child.url) {
        folder.children.push({
          id: child.id,
          title: child.title,
          url: child.url,
          dateAdded: child.dateAdded
        });
      } else if (child.children) {
        const subFolder = processNode(child);
        if (subFolder && subFolder.children.length > 0) {
          folder.children.push(subFolder);
        }
      }
    });
  }
  
  return folder;
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getBookmarks') {
    chrome.bookmarks.getTree((tree) => {
      const bookmarks = processBookmarksTree(tree);
      sendResponse({ bookmarks });
    });
    return true;
  }
  
  if (request.action === 'reloadBookmarks') {
    chrome.bookmarks.getTree((tree) => {
      const bookmarks = processBookmarksTree(tree);
      chrome.storage.local.set({ bookmarksData: bookmarks, lastUpdate: Date.now() });
      sendResponse({ bookmarks, lastUpdate: Date.now() });
    });
    return true;
  }
});

chrome.runtime.onInstalled.addListener(() => {
  chrome.bookmarks.getTree((tree) => {
    const bookmarks = processBookmarksTree(tree);
    chrome.storage.local.set({ bookmarksData: bookmarks, lastUpdate: Date.now() });
  });
});

chrome.bookmarks.getTree((tree) => {
  const bookmarks = processBookmarksTree(tree);
  chrome.storage.local.set({ bookmarksData: bookmarks, lastUpdate: Date.now() });
});