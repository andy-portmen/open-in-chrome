/* global app */
'use strict';

function get(id) {
  return document.getElementById(id);
}

function restore() {
  // Use default value color = 'red' and likesColor = true.
  chrome.storage.local.get({
    path: '',
    enabled: false,
    altKey: true,
    shiftKey: true,
    ctrlKey: false,
    metaKey: false,
    button: 0,
    faqs: true,
    closeme: false,
    multiple: app.multiple,
    hosts: [],
    urls: [],
    reverse: false,
    topRedict: false
  }, prefs => {
    get('path').value = prefs.path;
    get('enabled').checked = prefs.enabled;
    get('altKey').checked = prefs.altKey;
    get('shiftKey').checked = prefs.shiftKey;
    get('ctrlKey').checked = prefs.ctrlKey;
    get('metaKey').checked = prefs.metaKey;
    get('button').selectedIndex = prefs.button;
    get('faqs').checked = prefs.faqs;
    get('closeme').checked = prefs.closeme;
    get('multiple').checked = prefs.multiple;
    get('hosts').value = prefs.hosts.join(', ');
    get('urls').value = prefs.urls.join(', ');
    get('reverse').checked = prefs.reverse;
    get('topRedict').checked = prefs.topRedict;
  });
}
document.addEventListener('DOMContentLoaded', restore);

function save() {
  const hosts = get('hosts').value;
  const urls = get('urls').value;

  chrome.storage.local.set({
    path: get('path').value,
    enabled: get('enabled').checked,
    altKey: get('altKey').checked,
    shiftKey: get('shiftKey').checked,
    ctrlKey: get('ctrlKey').checked,
    metaKey: get('metaKey').checked,
    button: get('button').selectedIndex,
    faqs: get('faqs').checked,
    closeme: get('closeme').checked,
    multiple: get('multiple').checked,
    hosts: hosts.split(/\s*,\s*/).map(s => s.replace('http://', '')
      .replace('https://', '')
      .split('/')[0].trim())
      .filter((h, i, l) => h && l.indexOf(h) === i),
    urls: urls.split(/\s*,\s*/).filter(s => s.startsWith('http') || s.startsWith('file'))
      .filter((h, i, l) => h && l.indexOf(h) === i),
    reverse: get('reverse').checked,
    topRedict: get('topRedict').checked
  }, () => {
    restore();
    const status = get('status');
    status.textContent = 'Options saved.';
    setTimeout(() => status.textContent = '', 750);
  });
}
get('save').addEventListener('click', save);

// Support
get('support').addEventListener('click', () => chrome.tabs.create({
  url: chrome.runtime.getManifest().homepage_url + '&rd=donate'
}));

// Factory Reset
get('reset').addEventListener('click', e => {
  if (e.detail === 1) {
    const status = get('status');
    window.setTimeout(() => status.textContent = '', 750);
    status.textContent = 'Double-click to reset!';
  }
  else {
    localStorage.clear();
    chrome.storage.local.clear(() => {
      chrome.runtime.reload();
      window.close();
    });
  }
});

// Links
for (const a of [...document.querySelectorAll('[data-href]')]) {
  if (a.hasAttribute('href') === false) {
    a.href = chrome.runtime.getManifest().homepage_url + '#' + a.dataset.href;
  }
}

// Localization
get('path').placeholder = app.locale.example;
get('l2').textContent = app.runtime.windows.prgfiles;
get('l3').textContent = app.runtime.linux.name;
get('l4').textContent = app.runtime.mac.args[1];
