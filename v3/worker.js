/* globals importScripts, app */

importScripts('./config.js');
importScripts('./context.js');

const ct = () => chrome.tabs.query({
  currentWindow: true,
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
  const once = () => chrome.storage.local.get({
    'badge-color': '#c2175b'
  }, prefs => chrome.action.setBadgeBackgroundColor({
    color: prefs['badge-color']
  }));
  chrome.runtime.onInstalled.addListener(once);
  chrome.runtime.onStartup.addListener(once);
}

function error(response) {
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
      url: chrome.runtime.getURL('data/helper/index.html')
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
          url: 'data/helper/index.html'
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
    closeme: false
  }, prefs => {
    const close = () => {
      if (prefs.closeme && closeIDs.length) {
        chrome.tabs.remove(closeIDs);
      }
    };
    if (navigator.userAgent.indexOf('Mac') !== -1) {
      if (prefs.path) {
        const length = app.runtime.mac.args.length;
        app.runtime.mac.args[length - 1] = prefs.path;
      }
      exec('open', [...app.runtime.mac.args, ...urls], r => response(r, close));
    }
    else if (navigator.userAgent.indexOf('Linux') !== -1) {
      exec(prefs.path || app.runtime.linux.name, urls, r => response(r, close));
    }
    else {
      if (prefs.path) {
        exec(prefs.path, [...(app.runtime.windows.args2 || []), ...urls], r => response(r, close));
      }
      else {
        const args = [...app.runtime.windows.args];
        // Firefox is not detaching the process on Windows
        args[1] = args[1].replace('start', navigator.userAgent.includes('Firefox') ? 'start /WAIT' : 'start');
        args[2] = args[2].replace('%url;', urls.join(' '));

        exec(app.runtime.windows.name, args, res => {
          // use old method
          if (res && res.code !== 0) {
            find(() => open(urls, closeIDs));
          }
          else {
            response(res, close);
          }
        }, {windowsVerbatimArguments: true});
      }
    }
  });
};

chrome.action.onClicked.addListener(() => {
  ct().then(tabs => open(tabs.map(t => t.url), tabs.map(t => t.id)));
});

chrome.runtime.onMessage.addListener((request, sender) => {
  if (request.cmd === 'open-in') {
    open([request.url], [sender.tab.id]);
  }
});

/* FAQs & Feedback */
{
  const {management, runtime: {onInstalled, setUninstallURL, getManifest}, storage, tabs} = chrome;
  if (navigator.webdriver !== true) {
    const page = getManifest().homepage_url;
    const {name, version} = getManifest();
    onInstalled.addListener(({reason, previousVersion}) => {
      management.getSelf(({installType}) => installType === 'normal' && storage.local.get({
        'faqs': true,
        'last-update': 0
      }, prefs => {
        if (reason === 'install' || (prefs.faqs && reason === 'update')) {
          const doUpdate = (Date.now() - prefs['last-update']) / 1000 / 60 / 60 / 24 > 45;
          if (doUpdate && previousVersion !== version) {
            tabs.query({active: true, currentWindow: true}, tbs => tabs.create({
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
