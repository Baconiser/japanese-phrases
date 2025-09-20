// Simple spaced-repetition style trainer for "Meine Wörter"
// Data model in localStorage under key 'myWordsV1': [{ jp, de, addedAt }]
// We also store per-item review state under 'myWordsSRSv1': {
//   [jp]: { ease: number, interval: number, due: number }
// }

(function(){
  var WORDS_KEY = 'myWordsV1';
  var SRS_KEY = 'myWordsSRSv1';
  var PREFS_KEY = 'flashcardsPrefsV1';

  function loadJSON(key, fallback){
    try { var v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; } catch(_) { return fallback; }
  }
  function saveJSON(key, val){
    try { localStorage.setItem(key, JSON.stringify(val)); } catch(_) {}
  }

  function loadWords(){ return loadJSON(WORDS_KEY, []); }
  function loadSRS(){ return loadJSON(SRS_KEY, {}); }
  function saveSRS(state){ saveJSON(SRS_KEY, state); }
  function loadPrefs(){ return loadJSON(PREFS_KEY, { direction: 'jp2de', random: false }); }
  function savePrefs(p){ saveJSON(PREFS_KEY, p); }

  function now(){ return Date.now(); }

  function getDueList(words, srs){
    var current = now();
    return words.filter(function(w){
      var st = srs[w.jp];
      if (!st) return true; // new items due immediately
      return (st.due || 0) <= current;
    });
  }

  function schedule(srsEntry, grade){
    // grade: 1 Wieder, 2 Schwer, 3 Gut, 4 Einfach
    var ease = srsEntry.ease || 2.5; // SM-2 style base
    var interval = srsEntry.interval || 0; // days
    if (grade === 1) {
      ease = Math.max(1.3, ease - 0.3);
      interval = 0; // relearn today
    } else if (grade === 2) {
      ease = Math.max(1.3, ease - 0.15);
      interval = Math.max(1, Math.round(interval * 0.5));
    } else if (grade === 3) {
      interval = interval === 0 ? 1 : Math.round(interval * ease);
    } else if (grade === 4) {
      ease = ease + 0.05;
      interval = interval === 0 ? 2 : Math.round(interval * ease * 1.2);
    }
    var dueMs = now() + interval * 24 * 60 * 60 * 1000;
    return { ease: ease, interval: interval, due: dueMs };
  }

  var state = {
    words: [],
    srs: {},
    queue: [],
    idx: 0,
    flipped: false,
    direction: 'jp2de', // 'jp2de' or 'de2jp'
    randomMode: false,
    currentItem: null
  };

  function $(id){ return document.getElementById(id); }

  function setHidden(el, hidden){
    if (!el) return;
    if (hidden) el.classList.add('hidden'); else el.classList.remove('hidden');
  }

  function updateProgress(){
    var progressEl = $('progress');
    if (progressEl) {
      if (state.randomMode) progressEl.textContent = '∞';
      else progressEl.textContent = (state.idx + 1) + ' / ' + state.queue.length;
    }
    var dueEl = $('dueCount');
    if (dueEl) dueEl.textContent = state.randomMode ? '—' : (state.queue.length - state.idx);
  }

  function updateLabels(){
    var frontLabel = $('frontLabel');
    var backLabel = $('backLabel');
    if (state.direction === 'jp2de'){
      if (frontLabel) frontLabel.textContent = 'Japanisch';
      if (backLabel) backLabel.textContent = 'Deutsch';
    } else {
      if (frontLabel) frontLabel.textContent = 'Deutsch';
      if (backLabel) backLabel.textContent = 'Japanisch';
    }
  }

  function renderCard(){
    var card = $('card');
    var front = $('frontJP');
    var back = $('backDE');
    if (state.randomMode){
      if (!state.words.length) return;
      var rndIdx = Math.floor(Math.random() * state.words.length);
      state.currentItem = state.words[rndIdx];
    } else {
      if (!state.queue.length || state.idx >= state.queue.length){ return; }
      state.currentItem = state.queue[state.idx];
    }
    var item = state.currentItem;
    if (state.direction === 'jp2de'){
      front.textContent = item.jp;
      back.textContent = item.de;
    } else {
      front.textContent = item.de;
      back.textContent = item.jp;
    }
    state.flipped = false;
    card.classList.remove('flipped');
    setHidden($('gradeBtns'), true);
    setHidden($('flipBtn'), false);
    updateLabels();
    updateProgress();
  }

  function flip(){
    var card = $('card');
    if (!card) return;
    state.flipped = !state.flipped;
    if (state.flipped){
      card.classList.add('flipped');
      setHidden($('flipBtn'), true);
      setHidden($('gradeBtns'), false);
    } else {
      card.classList.remove('flipped');
      setHidden($('gradeBtns'), true);
      setHidden($('flipBtn'), false);
    }
  }

  function grade(g){
    if (state.randomMode){
      if (!state.currentItem) return;
      var itemR = state.currentItem;
      var entryR = state.srs[itemR.jp] || {};
      state.srs[itemR.jp] = schedule(entryR, g);
      saveSRS(state.srs);
      renderCard();
      return;
    }
    if (state.idx >= state.queue.length) return;
    var item = state.queue[state.idx];
    var entry = state.srs[item.jp] || {};
    state.srs[item.jp] = schedule(entry, g);
    saveSRS(state.srs);

    state.idx++;
    if (state.idx >= state.queue.length){
      // finished
      updateProgress();
      alert('Fertig für jetzt!');
      window.location.href = '/';
      return;
    }
    renderCard();
  }

  function init(){
    state.words = loadWords();
    state.srs = loadSRS();
    var prefs = loadPrefs();
    state.direction = prefs.direction === 'de2jp' ? 'de2jp' : 'jp2de';
    state.randomMode = !!prefs.random;
    var trainer = $('trainer');
    var empty = $('empty');
    if (!state.words.length){
      setHidden(empty, false);
      setHidden(trainer, true);
      return;
    }
    // Build study queue if not in random mode: due items first, then the rest, cap to 50 for session
    if (!state.randomMode){
      var due = getDueList(state.words, state.srs);
      var rest = state.words.filter(function(w){ return due.indexOf(w) === -1; });
      state.queue = due.concat(rest).slice(0, 50);
    }
    setHidden(trainer, false);
    setHidden(empty, true);
    renderCard();

    // Wire buttons
    var flipBtn = $('flipBtn');
    if (flipBtn) flipBtn.addEventListener('click', flip);
    var gradeBtns = document.querySelectorAll('[data-grade]');
    gradeBtns.forEach(function(b){ b.addEventListener('click', function(){ grade(parseInt(b.getAttribute('data-grade'), 10)); }); });

    // Wire controls
    var dirSel = $('direction');
    if (dirSel){
      dirSel.value = state.direction;
      dirSel.addEventListener('change', function(){
        state.direction = dirSel.value === 'de2jp' ? 'de2jp' : 'jp2de';
        savePrefs({ direction: state.direction, random: state.randomMode });
        updateLabels();
        // Re-render current card with new direction
        if (state.currentItem || (!state.randomMode && state.queue.length)) renderCard();
      });
    }
    var rndChk = $('randomMode');
    if (rndChk){
      rndChk.checked = state.randomMode;
      rndChk.addEventListener('change', function(){
        state.randomMode = !!rndChk.checked;
        savePrefs({ direction: state.direction, random: state.randomMode });
        // Reset indices and (re)build queue if needed
        state.idx = 0;
        if (!state.randomMode){
          var due2 = getDueList(state.words, state.srs);
          var rest2 = state.words.filter(function(w){ return due2.indexOf(w) === -1; });
          state.queue = due2.concat(rest2).slice(0, 50);
        }
        renderCard();
      });
    }

    // Keyboard shortcuts
    document.addEventListener('keydown', function(ev){
      if (ev.code === 'Space'){ ev.preventDefault(); flip(); }
      else if (ev.key === '1') grade(1);
      else if (ev.key === '2') grade(2);
      else if (ev.key === '3') grade(3);
      else if (ev.key === '4') grade(4);
    });
  }

  document.addEventListener('DOMContentLoaded', init);
})();

