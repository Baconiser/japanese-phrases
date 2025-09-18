(function(){
  function getStoredTheme(){
    try { return localStorage.getItem('theme'); } catch(_) { return null; }
  }

  function prefersDark(){
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  }

  function applyTheme(mode){
    if (mode === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }

  function setTheme(mode){
    applyTheme(mode);
    try { localStorage.setItem('theme', mode); } catch(_) {}
    updateSwitches();
  }

  function currentIsDark(){
    return document.documentElement.classList.contains('dark');
  }

  function updateSwitchEl(el, checked){
    if (el.tagName === 'INPUT' && el.type === 'checkbox') {
      el.checked = checked;
      el.setAttribute('aria-checked', checked ? 'true' : 'false');
    } else {
      el.setAttribute('aria-pressed', checked ? 'true' : 'false');
      el.setAttribute('data-checked', checked ? '1' : '0');
      el.textContent = checked ? '🌙 Dark' : '☀️ Light';
    }
  }

  function updateSwitches(){
    var checked = currentIsDark();
    document.querySelectorAll('[data-theme-switch]').forEach(function(el){
      updateSwitchEl(el, checked);
    });
  }

  // Initialize based on stored preference or system
  (function init(){
    var stored = getStoredTheme();
    applyTheme(stored ? stored : (prefersDark() ? 'dark' : 'light'));
  })();

  // Expose setter
  window.__setTheme = setTheme;

  // Wire up after DOM is ready
  document.addEventListener('DOMContentLoaded', function(){
    updateSwitches();
    document.querySelectorAll('[data-theme-switch]').forEach(function(el){
      el.addEventListener('click', function(){
        var next = currentIsDark() ? 'light' : 'dark';
        setTheme(next);
      });
      if (el.tagName === 'INPUT' && el.type === 'checkbox') {
        el.addEventListener('change', function(e){
          setTheme(e.target.checked ? 'dark' : 'light');
        });
      }
    });

    // React to system changes only if user hasn't explicitly chosen
    try {
      if (!getStoredTheme()) {
        var mq = window.matchMedia('(prefers-color-scheme: dark)');
        if (mq && mq.addEventListener) {
          mq.addEventListener('change', function(ev){ setTheme(ev.matches ? 'dark' : 'light'); });
        } else if (mq && mq.addListener) {
          mq.addListener(function(ev){ setTheme(ev.matches ? 'dark' : 'light'); });
        }
      }
    } catch(_) {}
  });
})();

