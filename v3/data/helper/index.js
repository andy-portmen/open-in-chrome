'use strict';

const args = new URLSearchParams(location.search);
const id = args.get('id') || 'com.add0n.node';

document.title = 'One Extra Step :: ' + chrome.runtime.getManifest().name;
document.getElementById('guid').textContent = chrome.runtime.id;


let os = 'windows';
if (navigator.userAgent.indexOf('Mac') !== -1) {
  os = 'mac';
}
else if (navigator.userAgent.indexOf('Linux') !== -1) {
  os = 'linux';
}
document.body.dataset.os = (os === 'mac' || os === 'linux') ? 'linux' : 'windows';

if (['Lin', 'Win', 'Mac'].indexOf(navigator.platform.substr(0, 3)) === -1) {
  window.alert(`Sorry! The "native client" only supports the following operating systems at the moment:

Windows, Mac, and Linux`);
}

const notify = (() => {
  const e = document.querySelector('notification-view');
  return {
    show(type, msg, delay) {
      e.notify(msg, type, delay);
    },
    destroy() {
      e.clean();
    }
  };
})();

document.addEventListener('click', ({target}) => {
  if (target.dataset.cmd === 'download') {
    const next = () => {
      notify.show('info', 'Looking for the latest version of the native-client', 60000);
      const req = new window.XMLHttpRequest();
      req.open('GET', 'https://api.github.com/repos/andy-portmen/native-client/releases/latest');
      req.responseType = 'json';
      req.onload = () => {
        chrome.downloads.download({
          filename: os + '.zip',
          url: req.response.assets.filter(a => a.name === os + '.zip')[0].browser_download_url
        }, () => {
          notify.show('success', 'Download is started. Extract and install when it is done');
          window.setTimeout(() => {
            notify.destroy();
            document.body.dataset.step = 1;
          }, 3000);
        });
      };
      req.onerror = () => {
        notify('error', 'Something went wrong! Please download the package manually');
        window.setTimeout(() => {
          window.open('https://github.com/andy-portmen/native-client/releases');
        }, 5000);
      };
      req.send();
    };
    if (chrome.downloads) {
      next();
    }
    else {
      chrome.permissions.request({
        permissions: ['downloads']
      }, granted => {
        if (granted) {
          next();
        }
        else {
          notify.show('error', 'Cannot initiate file downloading. Please download the file manually', 60000);
        }
      });
    }
  }
  else if (target.dataset.cmd === 'check') {
    chrome.runtime.sendNativeMessage(id, {
      cmd: 'version'
    }, response => {
      if (response) {
        notify.show('success', 'Native client version is ' + response.version);
      }
      else {
        notify.show('error', 'Cannot find the native client. Follow the 3 steps to install the native client');
      }
    });
  }
  else if (target.dataset.cmd === 'options') {
    chrome.runtime.openOptionsPage();
  }
});

chrome.runtime.sendNativeMessage(id, {
  cmd: 'version'
}, response => {
  if (response) {
    document.title = 'Native Client is installed!';
    document.body.dataset.installed = true;
  }
});
