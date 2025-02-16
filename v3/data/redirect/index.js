const args = new URLSearchParams(location.search);

const url = args.get('url');
chrome.runtime.sendMessage({
  cmd: 'open-in',
  close: true,
  url
}, () => {
  chrome.runtime.lastError;
  window.close();
});
