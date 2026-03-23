// ============================================================
// TX-Dom-Dev — popup-config.js
// Popup Config IIFE extracted from game.js v13.5.0
// ============================================================

// ============================================================
// SECTION 3: Popup Config
// ============================================================

(function(){
  // Friendly names for the dropdown
  var POPUP_NAMES = {
    bidBackdrop:           'Bid Panel',
    trumpBackdrop:         'Trump Selection',
    nelloBackdrop:         'Nel-O Selection',
    nelloDoublesBackdrop:  'Nello Doubles',
    dfmChoiceBackdrop:     'DFM Choice',
    gameSettingsBackdrop:  'Game Settings',
    notesBackdrop:         'Notes',
    gameLogBackdrop:       'Game Log',
    advLogBackdrop:        'Advanced AI Log',
    mcBackdrop:            'Monte Carlo',
    tn51SettingsBackdrop:  'TN51 Layout',
    t42SettingsBackdrop:   'T42 Layout',
    by2SettingsBackdrop:   'BY2 Settings',
    aboutBackdrop:         'About',
    ppBackdrop:            'Pass & Play',
    mpBackdrop:            'Multiplayer',
    mpWaiting:             'MP Waiting',
    ppHandoff:             'P&P Handoff'
  };

  // Default popup constraints (% of gameWrapper)
  // ar: aspect ratio as w:h (e.g. 110 means 1.1:1). null = auto (no lock)
  var POPUP_DEFAULTS = {
    bidBackdrop:           { maxW:95, maxH:40, top:8,    ar:110 },
    trumpBackdrop:         { maxW:95, maxH:40, top:8,    ar:110 },
    nelloBackdrop:         { maxW:95, maxH:31, top:null, ar:140 },
    nelloDoublesBackdrop:  { maxW:72, maxH:25, top:null, ar:136 },
    dfmChoiceBackdrop:     { maxW:72, maxH:25, top:null, ar:136 },
    gameSettingsBackdrop:  { maxW:77, maxH:90, top:null, ar:60 },
    notesBackdrop:         { maxW:95, maxH:39, top:null, ar:113 },
    gameLogBackdrop:       { maxW:95, maxH:80, top:null, ar:70 },
    advLogBackdrop:        { maxW:95, maxH:85, top:null, ar:70 },
    mcBackdrop:            { maxW:95, maxH:90, top:null, ar:75 },
    tn51SettingsBackdrop:  { maxW:87, maxH:85, top:null, ar:65 },
    t42SettingsBackdrop:   { maxW:87, maxH:85, top:null, ar:65 },
    by2SettingsBackdrop:   { maxW:82, maxH:80, top:null, ar:70 },
    aboutBackdrop:         { maxW:90, maxH:60, top:null, ar:80 },
    ppBackdrop:            { maxW:90, maxH:42, top:null, ar:100 },
    mpBackdrop:            { maxW:90, maxH:90, top:null, ar:65 },
    mpWaiting:             { maxW:100, maxH:100, top:null, ar:null },
    ppHandoff:             { maxW:100, maxH:100, top:null, ar:null }
  };

  // Load saved config from localStorage
  var STORAGE_KEY = 'tn51_popup_config';
  var savedCfg = {};
  try { savedCfg = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); } catch(e){}

  var POPUP_CONFIG = {};
  for(var id in POPUP_DEFAULTS){
    POPUP_CONFIG[id] = Object.assign({}, POPUP_DEFAULTS[id], savedCfg[id] || {});
  }

  function savePopupConfig(){
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(POPUP_CONFIG)); } catch(e){}
  }

  // Apply config to a specific popup
  function applyPopupConfig(popupId){
    var cfg = POPUP_CONFIG[popupId];
    if(!cfg) return;
    var backdrop = document.getElementById(popupId);
    if(!backdrop) return;

    var panel = backdrop.querySelector('.modalPanel') || backdrop.querySelector('.modal') || backdrop.querySelector(':scope > div');

    if(panel){
      panel.style.width = cfg.maxW + '%';
      panel.style.maxWidth = cfg.maxW + '%';
      panel.style.maxHeight = cfg.maxH + '%';
      panel.style.minWidth = 'auto';
      panel.style.boxSizing = 'border-box';
      // Aspect ratio lock
      if(cfg.ar !== null && cfg.ar !== undefined){
        panel.style.aspectRatio = (cfg.ar / 100).toFixed(2) + ' / 1';
      } else {
        panel.style.aspectRatio = 'auto';
      }
      // Overflow managed by fitPopupContent — default to hidden
      panel.style.overflow = 'hidden';
    }

    // Top offset vs centered
    if(cfg.top !== null && cfg.top !== undefined){
      backdrop.style.alignItems = 'flex-start';
      backdrop.style.paddingTop = cfg.top + '%';
      // Also set panel.top for absolute-positioned panels (e.g. Moon mode bid)
      if(panel && getComputedStyle(panel).position === 'absolute'){
        panel.style.top = cfg.top + '%';
      }
    } else {
      backdrop.style.alignItems = 'center';
      backdrop.style.paddingTop = '0';
      if(panel && getComputedStyle(panel).position === 'absolute'){
        panel.style.top = '50%';
        panel.style.transform = 'translate(-50%, -50%)';
      }
    }

    // Auto-scale content to fit
    fitPopupContent(popupId);
  }

  // ─── Auto-scale content to fit popup without scrolling ───
  var MIN_SCALE = 0.6;

  function fitPopupContent(popupId){
    var backdrop = document.getElementById(popupId);
    if(!backdrop) return;
    var panel = backdrop.querySelector('.modalPanel') || backdrop.querySelector('.modal') || backdrop.querySelector(':scope > div');
    if(!panel) return;

    // Find the scrollable content area — first child div inside the panel
    var content = panel.querySelector('.modalBody') || panel.children[0];
    if(!content || content === panel) content = panel;

    // Reset previous scaling to measure natural size
    content.style.transform = '';
    content.style.transformOrigin = '';
    content.style.height = '';

    // Double rAF to ensure layout has fully settled
    requestAnimationFrame(function(){
      requestAnimationFrame(function(){
        var panelH = panel.clientHeight;
        var naturalH = panel.scrollHeight;

        if(naturalH <= panelH || panelH <= 0){
          // Content fits — no scaling needed
          panel.style.overflow = 'hidden';
          return;
        }

        var scale = panelH / naturalH;
        if(scale >= 1) return;

        if(scale >= MIN_SCALE){
          // Scale down to fit
          content.style.transform = 'scale(' + scale.toFixed(3) + ')';
          content.style.transformOrigin = 'top center';
          content.style.height = (naturalH) + 'px';
          panel.style.overflow = 'hidden';
        } else {
          // Below floor — don't scale, just allow scrolling at full size
          content.style.transform = '';
          content.style.transformOrigin = '';
          content.style.height = '';
          panel.style.overflow = 'auto';
        }
      });
    });
  }

  // Refit all currently-visible popups (for resize/orientation)
  function refitAllVisiblePopups(){
    for(var id in POPUP_CONFIG){
      var el = document.getElementById(id);
      if(el){
        var d = getComputedStyle(el).display;
        if(d === 'flex' || d === 'block'){
          fitPopupContent(id);
        }
      }
    }
  }

  // Debounced resize listener
  var _resizeTimer = null;
  window.addEventListener('resize', function(){
    clearTimeout(_resizeTimer);
    _resizeTimer = setTimeout(refitAllVisiblePopups, 250);
  });

  // Scale any overlay's inner content to fit (for dynamically created overlays)
  function fitOverlayContent(overlayId){
    var overlay = document.getElementById(overlayId);
    if(!overlay) return;
    var inner = overlay.querySelector(':scope > div');
    if(!inner) return;

    // Reset previous scaling
    inner.style.transform = '';
    inner.style.transformOrigin = '';

    requestAnimationFrame(function(){
      requestAnimationFrame(function(){
        var availH = overlay.clientHeight * 0.7; // account for padding-top:25%
        var naturalH = inner.scrollHeight;
        if(naturalH <= availH || availH <= 0) return;

        var scale = availH / naturalH;
        if(scale >= 1) return;
        scale = Math.max(scale, MIN_SCALE);
        inner.style.transform = 'scale(' + scale.toFixed(3) + ')';
        inner.style.transformOrigin = 'top center';
      });
    });
  }

  // Expose globally
  window.POPUP_CONFIG = POPUP_CONFIG;
  window.POPUP_DEFAULTS = POPUP_DEFAULTS;
  window.POPUP_NAMES = POPUP_NAMES;
  window.applyPopupConfig = applyPopupConfig;
  window.fitPopupContent = fitPopupContent;
  window.fitOverlayContent = fitOverlayContent;
  window.savePopupConfig = savePopupConfig;

  // MutationObserver — auto-apply config when popups show
  var observer = new MutationObserver(function(mutations){
    mutations.forEach(function(m){
      if(m.type === 'attributes' && m.attributeName === 'style'){
        var el = m.target;
        if(el.id && POPUP_CONFIG[el.id]){
          var d = getComputedStyle(el).display;
          if(d === 'flex' || d === 'block'){
            applyPopupConfig(el.id);
          }
        }
      }
    });
  });

  function initPopupObserver(){
    for(var id in POPUP_CONFIG){
      var el = document.getElementById(id);
      if(el){
        observer.observe(el, { attributes: true, attributeFilter:['style'] });
        var d = getComputedStyle(el).display;
        if(d === 'flex' || d === 'block'){
          applyPopupConfig(id);
        }
      }
    }
  }

  // ─── Settings UI wiring ───
  function initPopupSettingsUI(){
    var toggle = document.getElementById('popupSettingsToggle');
    var panel = document.getElementById('popupSettingsPanel');
    var arrow = document.getElementById('popupSettingsArrow');
    var sel = document.getElementById('popupSelect');
    if(!toggle || !panel || !sel) return;

    // Toggle panel
    toggle.addEventListener('click', function(){
      var open = panel.style.display !== 'none';
      panel.style.display = open ? 'none' : 'block';
      arrow.style.transform = open ? '' : 'rotate(90deg)';
    });

    // Populate dropdown
    for(var id in POPUP_NAMES){
      var opt = document.createElement('option');
      opt.value = id;
      opt.textContent = POPUP_NAMES[id];
      sel.appendChild(opt);
    }

    var slW = document.getElementById('popupMaxW');
    var slH = document.getElementById('popupMaxH');
    var slT = document.getElementById('popupTop');
    var slAR = document.getElementById('popupAR');
    var chkT = document.getElementById('popupTopCheck');
    var chkAR = document.getElementById('popupARCheck');
    var valW = document.getElementById('popupMaxWVal');
    var valH = document.getElementById('popupMaxHVal');
    var valT = document.getElementById('popupTopVal');
    var valAR = document.getElementById('popupARVal');

    function loadPopup(id){
      var cfg = POPUP_CONFIG[id];
      if(!cfg) return;
      slW.value = cfg.maxW;
      slH.value = cfg.maxH;
      valW.textContent = cfg.maxW + '%';
      valH.textContent = cfg.maxH + '%';

      // Top
      if(cfg.top !== null && cfg.top !== undefined){
        chkT.checked = true;
        slT.disabled = false;
        slT.style.opacity = '1';
        slT.style.cursor = 'pointer';
        slT.value = cfg.top;
        valT.textContent = cfg.top + '%';
      } else {
        chkT.checked = false;
        slT.disabled = true;
        slT.style.opacity = '0.3';
        slT.style.cursor = 'not-allowed';
        slT.value = 0;
        valT.textContent = 'center';
      }

      // AR
      if(cfg.ar !== null && cfg.ar !== undefined){
        chkAR.checked = true;
        slAR.disabled = false;
        slAR.style.opacity = '1';
        slAR.style.cursor = 'pointer';
        slAR.value = cfg.ar;
        var r = cfg.ar / 100;
        valAR.textContent = r >= 1 ? r.toFixed(1) + ':1' : '1:' + (1/r).toFixed(1);
      } else {
        chkAR.checked = false;
        slAR.disabled = true;
        slAR.style.opacity = '0.3';
        slAR.style.cursor = 'not-allowed';
        slAR.value = 100;
        valAR.textContent = 'auto';
      }
    }

    function saveAndApply(){
      var id = sel.value;
      var cfg = POPUP_CONFIG[id];
      cfg.maxW = parseInt(slW.value);
      cfg.maxH = parseInt(slH.value);
      cfg.top = chkT.checked ? parseInt(slT.value) : null;
      cfg.ar = chkAR.checked ? parseInt(slAR.value) : null;
      savePopupConfig();
      applyPopupConfig(id);
    }

    // Dropdown change
    sel.addEventListener('change', function(){ loadPopup(sel.value); });

    // Slider inputs
    slW.addEventListener('input', function(){
      valW.textContent = slW.value + '%';
      saveAndApply();
    });
    slH.addEventListener('input', function(){
      valH.textContent = slH.value + '%';
      saveAndApply();
    });
    slT.addEventListener('input', function(){
      valT.textContent = slT.value + '%';
      saveAndApply();
    });
    slAR.addEventListener('input', function(){
      var r = parseInt(slAR.value) / 100;
      valAR.textContent = r >= 1 ? r.toFixed(1) + ':1' : '1:' + (1/r).toFixed(1);
      saveAndApply();
    });

    // Checkboxes
    chkT.addEventListener('change', function(){
      slT.disabled = !chkT.checked;
      slT.style.opacity = chkT.checked ? '1' : '0.3';
      slT.style.cursor = chkT.checked ? 'pointer' : 'not-allowed';
      if(!chkT.checked) valT.textContent = 'center';
      else valT.textContent = slT.value + '%';
      saveAndApply();
    });
    chkAR.addEventListener('change', function(){
      slAR.disabled = !chkAR.checked;
      slAR.style.opacity = chkAR.checked ? '1' : '0.3';
      slAR.style.cursor = chkAR.checked ? 'pointer' : 'not-allowed';
      if(!chkAR.checked) valAR.textContent = 'auto';
      else {
        var r = parseInt(slAR.value) / 100;
        valAR.textContent = r >= 1 ? r.toFixed(1) + ':1' : '1:' + (1/r).toFixed(1);
      }
      saveAndApply();
    });

    // Reset buttons
    document.getElementById('popupResetOne').addEventListener('click', function(){
      var id = sel.value;
      POPUP_CONFIG[id] = Object.assign({}, POPUP_DEFAULTS[id]);
      savePopupConfig();
      applyPopupConfig(id);
      loadPopup(id);
    });
    document.getElementById('popupResetAll').addEventListener('click', function(){
      for(var id in POPUP_DEFAULTS){
        POPUP_CONFIG[id] = Object.assign({}, POPUP_DEFAULTS[id]);
      }
      savePopupConfig();
      for(var id2 in POPUP_CONFIG) applyPopupConfig(id2);
      loadPopup(sel.value);
    });

    // Preview button — briefly shows the selected popup
    document.getElementById('popupPreview').addEventListener('click', function(){
      var id = sel.value;
      var el = document.getElementById(id);
      if(!el) return;
      el.style.display = 'flex';
      applyPopupConfig(id);
      setTimeout(function(){ el.style.display = 'none'; }, 2000);
    });

    // Load first popup
    loadPopup(sel.value);
  }

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', function(){
      initPopupObserver();
      initPopupSettingsUI();
    });
  } else {
    initPopupObserver();
    initPopupSettingsUI();
  }
})();
