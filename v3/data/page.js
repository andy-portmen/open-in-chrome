{
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

  let user;
  port.addEventListener('register', ({detail}) => {
    removeEventListener('click', user, true);
    if (detail.script) {
      user = e => {
        const s = document.createElement('script');
        s.textContent = detail.script;
        s.evt = e;
        try { // Firefox
          s.wrappedJSObject.evt = e;
        }
        catch (e) {}
        document.documentElement.append(s);
        s.remove();

        const {block, url, close} = s.dataset;
        if (block === 'true' && url) {
          port.dispatchEvent(new CustomEvent('run', {
            detail: {
              close: close === 'true',
              url
            }
          }));
        }
      };
      addEventListener('click', user, true);
    }
  });
}
