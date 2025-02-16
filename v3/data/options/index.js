/* global app, convert */
'use strict';

function get(id) {
  return document.getElementById(id);
}

function restore() {
  // Use default value color = 'red' and likesColor = true.
  chrome.storage.local.get({
    'path': '',
    'args': '',
    'user-script': '',
    'enabled': false,
    'altKey': true,
    'shiftKey': true,
    'ctrlKey': false,
    'metaKey': false,
    'button': 0,
    'faqs': true,
    'closeme': false,
    'multiple': app.multiple,
    'hosts': [],
    'reverse': false,
    'topRedict': false,
    'urlFilters': []
  }, prefs => {
    get('path').value = prefs.path;
    get('args').value = prefs.args;
    get('user-script').value = prefs['user-script'];
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
    get('reverse').checked = prefs.reverse;
    get('topRedict').checked = prefs.topRedict;
    get('urlFilters').value = prefs.urlFilters.join(', ');
  });
}
document.addEventListener('DOMContentLoaded', restore);

async function save() {
  const hosts = get('hosts').value;
  const tmpUrlFilters = document.getElementById('urlFilters').value
    .split(/\s*,\s*/)
    .filter((h, i, l) => h && l.indexOf(h) === i);
  const urlFilters = [];
  for (const filter of tmpUrlFilters) {
    const regex = convert(filter);
    console.info('Filter', `"${filter}"`, 'Generated Regexp', `"${regex}"`);
    const b = await new Promise(resolve => chrome.declarativeNetRequest.isRegexSupported({
      regex
    }, resolve));
    if (b.isSupported) {
      urlFilters.push(filter);
    }
    else {
      alert('The following regular expression rule is not supported: ' + b.reason +
        '. This rule is removed from the list.\n\nGenerated Regexp: ' + regex + '\nOriginal Expression: ' + filter);
    }
  }
  const max = chrome.declarativeNetRequest.MAX_NUMBER_OF_REGEX_RULES;
  if (urlFilters.length > max) {
    urlFilters.length = max;
    alert('The regular expression rule list was larger than ' + max + '. The list got shorten.');
  }

  chrome.storage.local.set({
    'path': get('path').value,
    'args': get('args').value,
    'user-script': get('user-script').value,
    'enabled': get('enabled').checked,
    'altKey': get('altKey').checked,
    'shiftKey': get('shiftKey').checked,
    'ctrlKey': get('ctrlKey').checked,
    'metaKey': get('metaKey').checked,
    'button': get('button').selectedIndex,
    'faqs': get('faqs').checked,
    'closeme': get('closeme').checked,
    'multiple': get('multiple').checked,
    'hosts': hosts.split(/\s*,\s*/).map(s => s.replace('http://', '')
      .replace('https://', '')
      .split('/')[0].trim())
      .filter((h, i, l) => h && l.indexOf(h) === i),
    'reverse': get('reverse').checked,
    'topRedict': get('topRedict').checked,
    urlFilters
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

// permission
document.getElementById('urlFiltersPermission').onclick = e => chrome.permissions.request({
  origins: ['http://*/*', 'https://*/*']
}, granted => {
  if (granted) {
    e.target.remove();
    document.getElementById('urlFilters').disabled = false;
  }
});
chrome.permissions.contains({
  origins: ['http://*/*', 'https://*/*']
}, granted => {
  if (granted) {
    document.getElementById('urlFiltersPermission').remove();
    document.getElementById('urlFilters').disabled = false;
  }
});
