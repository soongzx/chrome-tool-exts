// Background service worker for Bookmark Navigator
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

function processBookmarksTree(nodes) {
  const result = [];
  
  function traverse(node) {
    if (node.children) {
      if (node.id !== '1' && node.id !== '0') {
        const folder = {
          id: node.id,
          title: node.title || '未命名文件夹',
          children: [],
          expanded: true
        };
        
        node.children.forEach(child => {
          if (child.url) {
            folder.children.push({
              id: child.id,
              title: child.title,
              url: child.url,
              dateAdded: child.dateAdded
            });
          } else if (child.children) {
            const subFolder = traverse(child);
            if (subFolder.children.length > 0 || subFolder.id === 'toolbar_____') {
              folder.children.push(subFolder);
            }
          }
        });
        
        return folder;
      } else {
        node.children.forEach(child => {
          const processed = traverse(child);
          if (processed) {
            result.push(processed);
          }
        });
      }
    }
    return null;
  }
  
  traverse(nodes);
  return result;
}

chrome.runtime.onInstalled.addListener(() => {
  chrome.bookmarks.getTree((tree) => {
    const bookmarks = processBookmarksTree(tree);
    chrome.storage.local.set({ bookmarksData: bookmarks, lastUpdate: Date.now() });
  });
});