/* global cloneInto */
'use strict';

let port;
try {
  port = document.getElementById('h09iiye');
  port.remove();
}
catch (e) {
  port = document.createElement('span');
  port.id = 'h09iiye';
  document.documentElement.append(port);
}
port.addEventListener('run', ({detail}) => chrome.runtime.sendMessage({
  cmd: 'open-in',
  ...detail
}));

const config = {
  'user-script': '',
  'button': 0,
  'altKey': true,
  'ctrlKey': false,
  'shiftKey': true,
  'metaKey': false,
  'enabled': false,
  'hosts': [],
  'urls': [],
  'keywords': [],
  'reverse': false,
  'topRedict': false
};

const validate = (a, callback, isTop = false) => {
  if (config.hosts.length) {
    const host = a.hostname;
    if (host) {
      if (config.hosts.some(h => h.endsWith(host) || host.endsWith(h))) {
        return config.reverse ? '' : callback(a.href);
      }
    }
  }
  // URL matching
  if (config.urls.length) {
    const href = a.href;
    try {
      for (const h of config.urls) {
        const m = new window.URLPattern(h);
        if (m.test(href)) {
          return config.reverse ? '' : callback(a.href);
        }
      }
    }
    catch (e) {
      if (href && config.urls.some(h => href.startsWith(h))) {
        return config.reverse ? '' : callback(a.href);
      }
    }
  }
  // keyword matching
  if (config.keywords.length) {
    const href = a.href;
    if (href && config.keywords.some(w => href.indexOf(w) !== -1)) {
      return config.reverse ? '' : callback(a.href);
    }
  }
  // reverse mode
  if (config.reverse) {
    if (a.href && (a.href.startsWith('http') || a.href.startsWith('file'))) {
      if ((a.getAttribute('href') || '').startsWith('#') === false || isTop) {
        return callback(a.href);
      }
    }
  }
};
chrome.storage.local.get(config, prefs => {
  Object.assign(config, prefs);

  let detail = {script: config['user-script']};
  if (typeof cloneInto !== 'undefined') {
    detail = cloneInto(detail, document.defaultView);
  }
  port.dispatchEvent(new CustomEvent('register', {detail}));
  // managed
  chrome.storage.managed.get({
    hosts: [],
    urls: [],
    reverse: false
  }, prefs => {
    if (!chrome.runtime.lastError) {
      config.hosts.push(...prefs.hosts);
      config.urls.push(...prefs.urls);
      config.reverse = config.reverse || prefs.reverse;
    }
    // top level redirect
    if (window.top === window && config.topRedict) {
      validate(location, url => {
        if (history.length) {
          history.back();
        }
        else {
          window.stop();
        }
        chrome.runtime.sendMessage({
          cmd: 'open-in',
          url
        });
      }, true);
    }
  });
});

chrome.storage.onChanged.addListener(e => {
  Object.keys(e).forEach(n => {
    config[n] = e[n].newValue;
  });
  if (e['user-script']) {
    let detail = {script: config['user-script']};
    if (typeof cloneInto !== 'undefined') {
      detail = cloneInto(detail, document.defaultView);
    }
    port.dispatchEvent(new CustomEvent('register', {detail}));
  }
});

document.addEventListener('click', e => {
  const redirect = url => {
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
    chrome.runtime.sendMessage({
      cmd: 'open-in',
      url
    });
    return false;
  };
  // hostname on left-click
  if (e.button === 0 && !e.altKey && !e.ctrlKey && !e.metaKey && !e.shiftKey) {
    if (config.hosts.length || config.urls.length || config.reverse) {
      let a = e.target.closest('a');
      if (a) {
        if (a.href.startsWith('https://www.google') && a.href.indexOf('&url=') !== -1) {
          const link = decodeURIComponent(a.href.split('&url=')[1].split('&')[0]);
          a = new URL(link);
        }
        validate(a, redirect);
      }
    }
  }
  // click + modifier
  if (
    config.enabled &&
    e.button === config.button &&
    e.altKey === config.altKey &&
    e.ctrlKey === config.ctrlKey &&
    e.metaKey === config.metaKey &&
    e.shiftKey === config.shiftKey
  ) {
    const a = e.target.closest('a');
    if (a && a.href) {
      return redirect(a.href);
    }
  }
}, true);
