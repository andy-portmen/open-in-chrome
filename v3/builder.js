/* global Parser */
if (typeof importScripts !== 'undefined') {
  self.importScripts('termlib_parser.js');
}
const builder = {};

builder.generate = (os, path, sarg = '') => {
  if (os.mac) {
    if (path && path.startsWith('/')) {
      return {
        command: path,
        args: sarg ? builder.parse(sarg) : ['&Expanded-URLs;']
      };
    }
    const args = sarg ? builder.parse(sarg) : ['-a', path || 'Google Chrome', '&Expanded-URLs;'];
    return {
      command: 'open',
      args
    };
  }
  else if (os.linux) {
    const args = sarg ? builder.parse(sarg) : ['&Expanded-URLs;'];
    return {
      command: path || 'google-chrome',
      args
    };
  }
  else {
    if (path) {
      const args = sarg ? builder.parse(sarg) : ['&Expanded-URLs;'];
      return {
        command: path,
        args,
        options: {
          windowsVerbatimArguments: true,
          shell: true
        }
      };
    }
    else {
      // Firefox is not detaching the process on Windows
      const cmd = sarg ? `chrome ${sarg}` : `chrome &Separated-URLs;`;
      if (navigator.userAgent.includes('Firefox')) {
        return {
          command: 'cmd',
          args: ['/s/c', 'start /WAIT', cmd],
          options: {
            windowsVerbatimArguments: true,
            shell: true
          }
        };
      }
      return {
        command: 'cmd',
        args: ['/s/c', 'start', cmd],
        options: {
          windowsVerbatimArguments: true,
          shell: true
        }
      };
    }
  }
};

builder.parse = cmd => {
  const termref = {
    lineBuffer: cmd
  };
  const parser = new Parser();
  // fixes https://github.com/andy-portmen/external-application-button/issues/5
  parser.escapeExpressions = {};
  parser.optionChars = {};
  parser.parseLine(termref);

  return termref.argv;
};
