// === tour.js ===
// 5-step onboarding spotlight tour. Fires once after wizard completion.
// Gated by localStorage flag 'finflow_tour_done'.
// Replayable via replayTour() called from Settings.

(function(){

var TOUR_FLAG = 'finflow_tour_done';

var TOUR_STEPS = [
  {
    tab: 'dashboard',
    target: '.dash-kpi-row',
    fallback: '#section-dashboard',
    title: 'Your money at a glance',
    body: 'These live tiles show your income, spending, net cash flow, and debt ratio for the month. They update every time you add data.',
    position: 'bottom'
  },
  {
    tab: 'expenses',
    target: '.envelope-row, .env-grid, #section-expenses .card',
    fallback: '#section-expenses',
    title: 'Track your spending',
    body: 'Add expenses here and they automatically sort into category buckets — Food, Transport, Bills, and more. Tap any bucket to set a spend limit.',
    position: 'bottom'
  },
  {
    tab: 'loans',
    target: '#paydownChart, .loan-strat-row, #section-loans .card',
    fallback: '#section-loans',
    title: 'Pay off debt faster',
    body: 'Add your loans and compare payoff plans. Avalanche (highest interest first) saves the most money. Snowball (smallest balance first) builds momentum.',
    position: 'top'
  },
  {
    tab: 'analytics',
    target: '#coachSection',
    fallback: '#section-analytics',
    title: 'AI Financial Coach',
    body: 'Add an AI key in Settings and ask questions like "Am I saving enough?" or "Which debt should I pay first?" — it reads your actual numbers.',
    position: 'bottom'
  },
  {
    tab: 'settings',
    target: '#section-settings',
    fallback: '#section-settings',
    title: 'You\'re all set!',
    body: 'Change your theme, set a PIN lock, connect cloud sync, and tap Install App to save FincWin to your home screen for offline access.',
    position: 'bottom',
    isLast: true
  }
];

var _tourStep = 0;
var _tourActive = false;

function startTour() {
  if (localStorage.getItem(TOUR_FLAG) === '1') return;
  _tourStep = 0;
  _tourActive = true;
  _renderStep();
}

function replayTour() {
  localStorage.removeItem(TOUR_FLAG);
  _tourStep = 0;
  _tourActive = true;
  _renderStep();
}

function skipTour() {
  localStorage.setItem(TOUR_FLAG, '1');
  _tourActive = false;
  _clearOverlay();
}

function _advanceTour() {
  _tourStep++;
  if (_tourStep >= TOUR_STEPS.length) {
    skipTour();
    return;
  }
  _renderStep();
}

function _renderStep() {
  _clearOverlay();
  var step = TOUR_STEPS[_tourStep];

  // Switch to the right tab first
  if (typeof switchTab === 'function') {
    switchTab(step.tab, document.getElementById('tab-' + step.tab));
  }

  // Give the render a tick to complete before spotlighting
  setTimeout(function() {
    var targetEl = _resolveTarget(step);
    if (!targetEl) {
      // Target not found — skip to next step silently
      _tourStep++;
      if (_tourStep < TOUR_STEPS.length) { _renderStep(); }
      else { skipTour(); }
      return;
    }

    _buildOverlay(step, targetEl);
  }, 260);
}

function _resolveTarget(step) {
  var selectors = step.target.split(',');
  for (var i = 0; i < selectors.length; i++) {
    var el = document.querySelector(selectors[i].trim());
    if (el) return el;
  }
  if (step.fallback) return document.querySelector(step.fallback);
  return null;
}

function _buildOverlay(step, targetEl) {
  targetEl.scrollIntoView({ behavior: 'instant', block: 'nearest' });

  var overlay = document.createElement('div');
  overlay.id = 'tourOverlay';

  // Semi-transparent backdrop
  var backdrop = document.createElement('div');
  backdrop.id = 'tourBackdrop';
  backdrop.setAttribute('aria-hidden', 'true');
  overlay.appendChild(backdrop);

  // Spotlight ring — positioned around the target
  var ring = document.createElement('div');
  ring.id = 'tourRing';
  ring.setAttribute('aria-hidden', 'true');
  overlay.appendChild(ring);

  // Tooltip card
  var card = document.createElement('div');
  card.id = 'tourCard';
  card.setAttribute('role', 'dialog');
  card.setAttribute('aria-modal', 'false');
  card.setAttribute('aria-labelledby', 'tourCardTitle');
  card.setAttribute('aria-describedby', 'tourCardBody');

  var progress = (_tourStep + 1) + ' / ' + TOUR_STEPS.length;
  card.innerHTML =
    '<div class="tour-progress" aria-label="Step ' + (_tourStep+1) + ' of ' + TOUR_STEPS.length + '">' + progress + '</div>' +
    '<div class="tour-title" id="tourCardTitle">' + _esc(step.title) + '</div>' +
    '<div class="tour-body" id="tourCardBody">' + _esc(step.body) + '</div>' +
    '<div class="tour-actions">' +
      '<button class="tour-skip-btn" id="tourSkipBtn" onclick="window._tourSkip()">Skip tour</button>' +
      '<button class="tour-next-btn" id="tourNextBtn" onclick="window._tourNext()">' +
        (step.isLast ? 'Done' : 'Next &rarr;') +
      '</button>' +
    '</div>';

  overlay.appendChild(card);
  document.body.appendChild(overlay);

  // Position ring and card after DOM paint
  requestAnimationFrame(function() {
    _positionRingAndCard(targetEl, card, ring, step.position);
    var focusEl = document.getElementById('tourNextBtn');
    if (focusEl) focusEl.focus();
  });

  // Keyboard: Escape = skip, Enter = advance
  overlay._keyHandler = function(e) {
    if (e.key === 'Escape') { e.preventDefault(); skipTour(); }
    else if (e.key === 'Enter' && document.activeElement && document.activeElement.id === 'tourNextBtn') {
      e.preventDefault(); _advanceTour();
    }
  };
  document.addEventListener('keydown', overlay._keyHandler);
}

function _positionRingAndCard(targetEl, card, ring, position) {
  var rect = targetEl.getBoundingClientRect();
  var pad = 8;
  var vw = window.innerWidth, vh = window.innerHeight;

  // Ring: position:fixed so coordinates are always viewport-relative (no scrollY needed)
  ring.style.top    = (rect.top  - pad) + 'px';
  ring.style.left   = (rect.left - pad) + 'px';
  ring.style.width  = (rect.width  + pad * 2) + 'px';
  ring.style.height = (rect.height + pad * 2) + 'px';

  // Card: position:fixed, viewport-relative
  var cardW = Math.min(300, vw - 24);
  card.style.width = cardW + 'px';
  card.style.maxWidth = (vw - 24) + 'px';

  var leftPos = Math.max(12, Math.min(rect.left, vw - cardW - 12));
  card.style.left = leftPos + 'px';

  var estCardH = 180;
  if (position === 'bottom') {
    var topPos = rect.bottom + pad + 10;
    if (topPos + estCardH > vh) topPos = Math.max(12, rect.top - estCardH - pad);
    card.style.top = topPos + 'px';
  } else {
    var topPos2 = Math.max(12, rect.top - estCardH - pad);
    card.style.top = topPos2 + 'px';
  }
}

function _clearOverlay() {
  var old = document.getElementById('tourOverlay');
  if (old) {
    if (old._keyHandler) document.removeEventListener('keydown', old._keyHandler);
    old.remove();
  }
}

function _esc(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// Window-exposed callbacks (used by inline onclick in the card)
window.startTour   = startTour;
window.replayTour  = replayTour;
window.skipTour    = skipTour;
window._tourNext   = _advanceTour;
window._tourSkip   = skipTour;

})();
