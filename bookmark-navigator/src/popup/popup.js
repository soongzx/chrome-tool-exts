document.getElementById('reloadBtn').addEventListener('click', () => {
  const statusEl = document.getElementById('status');
  statusEl.textContent = '正在重载...';
  statusEl.className = 'status';
  
  chrome.runtime.sendMessage({ action: 'reloadBookmarks' }, (response) => {
    if (response && response.bookmarks) {
      statusEl.textContent = `重载成功，共 ${countBookmarks(response.bookmarks)} 个书签`;
      statusEl.className = 'status success';
    } else {
      statusEl.textContent = '重载失败';
      statusEl.className = 'status error';
    }
  });
});

function countBookmarks(bookmarks) {
  let count = 0;
  function traverse(nodes) {
    nodes.forEach(node => {
      if (node.url) {
        count++;
      }
      if (node.children) {
        traverse(node.children);
      }
    });
  }
  traverse(bookmarks);
  return count;
}