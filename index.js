var iframe = document.getElementById('theFrame');
var message = {
  command: 'run',
  context: {
    localStorage: chrome.storage.local
  }
};

iframe.contentWindow.postMessage(message, '*');
