(function(){
  if (!('serviceWorker' in navigator)) return;
  window.addEventListener('load', function(){
    navigator.serviceWorker.register('/sw.js', { scope: '/' }).then(function(reg){
      if (reg.waiting) reg.waiting.postMessage({ type: 'SKIP_WAITING' });
      reg.addEventListener('updatefound', function(){
        var sw = reg.installing;
        if (!sw) return;
        sw.addEventListener('statechange', function(){
          if (sw.state === 'installed' && navigator.serviceWorker.controller) {
            // New version installed and waiting to activate
          }
        });
      });
    }).catch(function(){});
  });
})();

