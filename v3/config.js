'use strict';

const app = {
  id: 'com.add0n.node',
  tag: 'chrome',
  multiple: true
};

app.locale = {
  name: 'Google Chrome',
  example: 'example D:\\Google\\Application\\chrome.exe'
};

app.runtime = {
  mac: {
    args: ['-a', 'Google Chrome']
  },
  linux: {
    name: 'google-chrome'
  },
  windows: {
    name: 'cmd',
    args: ['/s/c', 'start', 'chrome "%url;"'],
    prgfiles: '%ProgramFiles%\\Google\\Chrome\\Application\\chrome.exe'
  }
};
