/* global app, builder */

if (typeof importScripts !== 'undefined') {
  self.importScripts('builder.js');
  self.importScripts('config.js');
  self.importScripts('context.js');
  self.importScripts('redirect/convert.js', 'redirect/core.js');
}

const ct = () => chrome.tabs.query({
  lastFocusedWindow: true,
  active: true
});

const notify = async (msg, b = 'E') => {
  const [{id}] = await ct();
  chrome.action.setBadgeText({
    tabId: id,
    text: b
  });
  chrome.action.setTitle({
    tabId: id,
    title: msg
  });
};

// Badge Color
{
  const once = () => {
    if (once.true) {
      return;
    }
    once.true = true;

    chrome.storage.local.get({
      'badge-color': '#c2175b'
    }, prefs => chrome.action.setBadgeBackgroundColor({
      color: prefs['badge-color']
    }));
  };
  chrome.runtime.onInstalled.addListener(once);
  chrome.runtime.onStartup.addListener(once);
}

function error(response) {
  console.error(response);

  notify(`An error occurred:

Exit Code: ${response.code}
Output: ${response.stdout}
Error: ${response.stderr}`);
}

function response(res, success = () => {}) {
  // windows batch file returns 1
  if (res && (res.code !== 0 && (res.code !== 1 || res.stderr !== ''))) {
    error(res);
  }
  else if (!res) {
    chrome.tabs.query({
      url: chrome.runtime.getURL('/data/helper/index.html')
    }, tabs => {
      if (tabs && tabs.length) {
        chrome.tabs.update(tabs[0].id, {
          active: true
        }, () => {
          chrome.windows.update(tabs[0].windowId, {
            focused: true
          });
        });
      }
      else {
        chrome.tabs.create({
          url: '/data/helper/index.html'
        });
      }
    });
  }
  else {
    success();
  }
}

function exec(command, args, callback, properties = {}) {
  if (command) {
    chrome.runtime.sendNativeMessage(app.id, {
      cmd: 'exec',
      command,
      arguments: args,
      properties
    }, res => (callback || response)(res));
  }
  else {
    notify(`Please set the "${app.locale.name}" executable path in the options page`, '!');
    chrome.runtime.openOptionsPage();
  }
}

function find(callback) {
  chrome.runtime.sendNativeMessage(app.id, {
    cmd: 'env'
  }, res => {
    if (res && res.env && res.env.ProgramFiles) {
      chrome.storage.local.set({
        path: app.runtime.windows.prgfiles
          .replace('%LOCALAPPDATA%', res.env.LOCALAPPDATA)
          .replace('%ProgramFiles(x86)%', res.env['ProgramFiles(x86)'])
          .replace('%ProgramFiles%', res.env.ProgramFiles)
      }, callback);
    }
    else {
      response(res);
    }
  });
}

const open = (urls, closeIDs = []) => {
  chrome.storage.local.get({
    path: null,
    args: '',
    closeme: false
  }, prefs => {
    const close = () => {
      if (prefs.closeme && closeIDs.length) {
        chrome.tabs.remove(closeIDs);
      }
    };

    const os = {
      linux: navigator.userAgent.indexOf('Linux') !== -1,
      mac: navigator.userAgent.indexOf('Mac') !== -1
    };
    const {command, args, options = {}} = builder.generate(os, prefs, prefs.args);
    args.forEach((arg, n) => {
      if (arg === '&Expanded-URLs;') {
        args[n] = options.shell ? urls.map(s => `"${s}"`) : urls;
      }
      else if (arg.includes('&Separated-URLs;')) {
        args[n] = arg.replace('&Separated-URLs;', urls.map(s => `"${s}"`).join(' '));
      }
    });

    console.info('[command]', command);
    console.info('[arguments]', args.flat());
    console.info('[options]', options);

    exec(command, args.flat(), r => {
      if (prefs.path) {
        if (os.linux === false && os.mac === false) {
          if (r && r.code !== 0) {
            find(() => open(urls, closeIDs));
            return;
          }
        }
      }
      response(r, close);
    }, options);
  });
};

chrome.action.onClicked.addListener(async () => {
  const tabs = await chrome.tabs.query({
    currentWindow: true,
    highlighted: true
  });

  open(tabs.map(t => t.url), tabs.map(t => t.id));
});

chrome.runtime.onMessage.addListener((request, sender) => {
  if (request.cmd === 'open-in') {
    open([request.url], [sender.tab.id]);
    if (request.close) {
      chrome.tabs.remove(sender.tab.id);
    }
  }
});

/* FAQs & Feedback */
{
  const {management, runtime: {onInstalled, setUninstallURL, getManifest}, storage, tabs} = chrome;
  if (navigator.webdriver !== true) {
    const {homepage_url: page, name, version} = getManifest();
    onInstalled.addListener(({reason, previousVersion}) => {
      management.getSelf(({installType}) => installType === 'normal' && storage.local.get({
        'faqs': true,
        'last-update': 0
      }, prefs => {
        if (reason === 'install' || (prefs.faqs && reason === 'update')) {
          const doUpdate = (Date.now() - prefs['last-update']) / 1000 / 60 / 60 / 24 > 45;
          if (doUpdate && previousVersion !== version) {
            tabs.query({active: true, lastFocusedWindow: true}, tbs => tabs.create({
              url: page + '&version=' + version + (previousVersion ? '&p=' + previousVersion : '') + '&type=' + reason,
              active: reason === 'install',
              ...(tbs && tbs.length && {index: tbs[0].index + 1})
            }));
            storage.local.set({'last-update': Date.now()});
          }
        }
      }));
    });
    setUninstallURL(page + '&rd=feedback&name=' + encodeURIComponent(name) + '&version=' + version);
  }
}
