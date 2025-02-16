/* global app */

{
  const once = () => {
    if (once.true) {
      return;
    }
    once.true = true;

    chrome.contextMenus.create({
      id: 'open-current',
      title: 'Open Link in Chrome',
      contexts: ['link'],
      documentUrlPatterns: ['*://*/*']
    }, () => chrome.runtime.lastError);
    chrome.contextMenus.create({
      id: 'open-all',
      title: 'Open all Tabs in Chrome',
      contexts: ['action']
    }, () => chrome.runtime.lastError);
    chrome.contextMenus.create({
      id: 'open-call',
      title: 'Open all Tabs in Chrome (Current window)',
      contexts: ['action']
    }, () => chrome.runtime.lastError);
    if (/Firefox/.test(navigator.userAgent)) {
      chrome.contextMenus.create({
        id: 'open-options',
        title: 'Options',
        contexts: ['action']
      }, () => chrome.runtime.lastError);
    }
  };
  chrome.runtime.onInstalled.addListener(once);
  chrome.runtime.onStartup.addListener(once);
}

chrome.contextMenus.onClicked.addListener(info => {
  if (info.menuItemId === 'open-options') {
    chrome.runtime.openOptionsPage();
  }
  else if (info.menuItemId === 'open-current') {
    open([info.linkUrl || info.pageUrl], []);
  }
  else if (info.menuItemId === 'open-all' || info.menuItemId === 'open-call') {
    const opts = {
      url: ['*://*/*']
    };
    if (info.menuItemId === 'open-call') {
      opts.currentWindow = true;
    }

    const next = tabs => chrome.storage.local.get({
      multiple: app.multiple
    }, prefs => {
      if (prefs.multiple) {
        return open(tabs.map(t => t.url), tabs.map(t => t.id));
      }
      const tab = tabs.shift();
      if (tab) {
        open([tab.url], [tab.id]);
        setTimeout(next, 500, tabs);
      }
    });
    chrome.tabs.query(opts, next);
  }
});
