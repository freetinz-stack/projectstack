// === gamification.js ===

// ══════════════════════════════════════════════
// CONSTANTS
// ══════════════════════════════════════════════
const ACHIEVEMENTS = {
  first_paid:    { icon:'🏆', label:'First Bill Paid',  desc:'Marked your first expense as paid' },
  week_champ:    { icon:'⭐', label:'Week Champion',     desc:'Paid off an entire week of expenses' },
  debt_slayer:   { icon:'⚔️', label:'Debt Slayer',       desc:'Paid off your first loan' },
  debt_free:     { icon:'🏅', label:'Debt Free',         desc:'All loans cleared to zero' },
  sav_starter:   { icon:'🌱', label:'Savings Starter',   desc:'Made your first savings deposit' },
  goal_crusher:  { icon:'🎯', label:'Goal Crusher',      desc:'Reached 100% on a savings goal' },
  budget_boss:   { icon:'📊', label:'Budget Boss',       desc:'All categories under cap for a month' },
  perfect_score: { icon:'🌟', label:'Perfect Score',     desc:'Health score hit 100' },
  streak_3:      { icon:'🔥', label:'3-Month Streak',    desc:'3 consecutive months of positive cash flow' },
  streak_6:      { icon:'💎', label:'6-Month Streak',    desc:'6 consecutive positive months' },
  app_installed: { icon:'📲', label:'Installed!',         desc:'Added FincWin to your home screen' },
};

const HEALTH_TIERS = [
  { min:0,   max:24,  label:'Beginner', color:'var(--danger)',  bg:'var(--danger-light)'  },
  { min:25,  max:49,  label:'Building', color:'var(--amber)',   bg:'var(--amber-light)'   },
  { min:50,  max:74,  label:'Stable',   color:'var(--blue)',    bg:'var(--blue-light)'    },
  { min:75,  max:89,  label:'Strong',   color:'var(--success)', bg:'var(--success-light)' },
  { min:90,  max:99,  label:'Elite',    color:'var(--sage)',    bg:'var(--sage-light)'    },
  { min:100, max:100, label:'Perfect',  color:'var(--purple)',  bg:'var(--purple-light)'  },
];

const XP_PER_LEVEL = 200;
const XP_REWARDS = {
  bill_paid:5, week_complete:20, sav_deposit:10,
  loan_payment:15, positive_month:50, health_milestone:25, challenge_complete:30
};

// ══════════════════════════════════════════════
// FEATURE 3 — HEALTH TIER PILL
// ══════════════════════════════════════════════
function getHealthTier(score) {
  return HEALTH_TIERS.find(t => score >= t.min && score <= t.max) || HEALTH_TIERS[0];
}

let _lastTierLabel = '';
function renderHealthTierPill(score) {
  const tier = getHealthTier(score);
  const pill = document.getElementById('d-tier-pill');
  if (!pill) return;
  pill.textContent = tier.label;
  pill.style.background = tier.bg;
  pill.style.color = tier.color;
  pill.style.borderColor = tier.color;
  if (_lastTierLabel && _lastTierLabel !== tier.label) {
    showToast('🎖️ Level up — you\'re now ' + tier.label + '!');
    launchConfetti(score >= 90 ? 120 : 70);
    pill.classList.add('tier-pop');
    setTimeout(function(){ pill.classList.remove('tier-pop'); }, 600);
  }
  _lastTierLabel = tier.label;
}

// ══════════════════════════════════════════════
// FEATURE 1 — STREAK SYSTEM
// ══════════════════════════════════════════════
function calcStreak() {
  var keys = Object.keys(S.months).sort(function(a,b){return keyToYM(a)-keyToYM(b);});
  var historical = keys.filter(function(k){ return k !== CMK; });
  var streak = 0;
  for (var i = historical.length - 1; i >= 0; i--) {
    var net = totalRev(historical[i]) - totalExp(historical[i]);
    if (net > 0) streak++;
    else break;
  }
  return streak;
}

var _lastStreak = -1;
var _streakBrokenToasted = false;
function renderStreakBadge() {
  var el = document.getElementById('d-streak');
  if (!el) return;
  var streak = calcStreak();
  if (streak >= 1) {
    el.textContent = '🔥 ' + streak;
    el.classList.remove('grey');
    el.style.display = '';
    _streakBrokenToasted = false;
  } else if (_lastStreak > 0 && streak === 0) {
    el.textContent = '🩶 Streak lost';
    el.classList.add('grey');
    el.style.display = '';
    if (!_streakBrokenToasted) {
      showToast('Streak broken — keep going 💪', 'warn-t');
      _streakBrokenToasted = true;
    }
  } else {
    el.style.display = 'none';
  }
  _lastStreak = streak;
}

// ══════════════════════════════════════════════
// FEATURE 5 — XP BAR
// ══════════════════════════════════════════════
function renderXPBar() {
  var bar = document.getElementById('d-xp-bar');
  var lbl = document.getElementById('d-xp-label');
  if (!bar) return;
  var xp = S.xp || 0;
  var level = S.xpLevel || 0;
  var xpInLevel = xp % XP_PER_LEVEL;
  var pct = (xpInLevel / XP_PER_LEVEL * 100).toFixed(1);
  bar.style.width = pct + '%';
  bar.setAttribute('aria-valuenow', Math.round(pct));
  if (lbl) lbl.textContent = 'Lvl ' + (level + 1) + '  ·  ' + xpInLevel + '/' + XP_PER_LEVEL + ' XP';
}

function awardXP(reason) {
  var pts = XP_REWARDS[reason] || 0;
  if (!pts) return;
  var prev = S.xp || 0;
  S.xp = prev + pts;
  var prevLevel = S.xpLevel || 0;
  var newLevel = Math.floor(S.xp / XP_PER_LEVEL);
  if (newLevel > prevLevel) {
    S.xpLevel = newLevel;
    showToast('⚡ Level ' + newLevel + '! Keep going!');
    launchConfetti(50);
  }
  persist(false);
  renderXPBar();
}

// ══════════════════════════════════════════════
// FEATURE 2 — ACHIEVEMENT BADGES
// ══════════════════════════════════════════════
function unlockAchievement(id) {
  if (!ACHIEVEMENTS[id] || (S.achievements || []).includes(id)) return;
  S.achievements.push(id);
  persist(false);
  var b = ACHIEVEMENTS[id];
  showToast(b.icon + ' Achievement unlocked: ' + b.label + '!');
  launchConfetti(60);
  renderAchievementShelf();
  var tile = document.querySelector('[data-ach-id="' + id + '"]');
  if (tile) {
    tile.classList.add('ach-earned');
    tile.classList.remove('ach-locked');
    tile.classList.add('ach-pop');
    setTimeout(function(){ tile.classList.remove('ach-pop'); }, 600);
  }
}

function checkAchievements() {
  var ids = Array.from(arguments);
  var earned = S.achievements || [];
  ids.forEach(function(id) {
    if (earned.includes(id)) return;
    var ok = false;
    if (id === 'first_paid') {
      ok = Object.values(S.months).some(function(m){
        return m.weeks.some(function(w){
          return w.items.some(function(i){ return i.paid; });
        });
      });
    } else if (id === 'week_champ') {
      ok = cw().some(function(w){
        return w.items.length > 0 && w.items.every(function(i){ return i.paid; });
      });
    } else if (id === 'debt_slayer') {
      ok = S.loans.some(function(l){ return amt(l.amount) <= 0; });
    } else if (id === 'debt_free') {
      ok = S.loans.length > 0 && S.loans.every(function(l){ return amt(l.amount) <= 0; });
    } else if (id === 'sav_starter') {
      ok = (S.savings || []).some(function(g){
        return g.transactions && g.transactions.length > 0;
      });
    } else if (id === 'goal_crusher') {
      ok = (S.savings || []).some(function(g){
        return amt(g.target) > 0 && amt(g.balance) >= amt(g.target);
      });
    } else if (id === 'budget_boss') {
      var cats = Object.keys(S.budgets || BDFT);
      var totals = {};
      cw().forEach(function(w){ w.items.forEach(function(i){
        var c = CAT_LABELS[getCat(i.name)];
        totals[c] = (totals[c]||0) + i.amount;
      }); });
      ok = cats.length > 0 && cats.every(function(cat){
        var spent = totals[cat] || 0;
        var cap = (S.budgets&&S.budgets[cat])||BDFT[cat]||500;
        return spent <= cap;
      });
    } else if (id === 'perfect_score') {
      ok = calcHealth().total === 100;
    } else if (id === 'streak_3') {
      ok = calcStreak() >= 3;
    } else if (id === 'streak_6') {
      ok = calcStreak() >= 6;
    }
    if (ok) unlockAchievement(id);
  });
}

function renderAchievementShelf() {
  var el = document.getElementById('d-achievement-shelf');
  if (!el) return;
  var earned = S.achievements || [];
  var countEl = document.getElementById('d-ach-count');
  if (countEl) countEl.textContent = earned.length + '/' + Object.keys(ACHIEVEMENTS).length;
  el.innerHTML = Object.entries(ACHIEVEMENTS).map(function(pair){
    var id = pair[0], b = pair[1];
    var isEarned = earned.includes(id);
    return '<div class="ach-tile ' + (isEarned ? 'ach-earned' : 'ach-locked') + '" data-ach-id="' + id + '" title="' + b.label + ': ' + b.desc + '">'
      + '<span class="ach-icon">' + b.icon + '</span>'
      + '<span class="ach-label">' + b.label + '</span>'
      + '</div>';
  }).join('');
}

// ══════════════════════════════════════════════
// FEATURE 4 — MONTHLY CHALLENGE CARD
// ══════════════════════════════════════════════
function generateMonthChallenge(monthKey) {
  if (!S.monthChallenge) S.monthChallenge = {};
  if (S.monthChallenge[monthKey]) return;
  var details = calcHealth().details;
  var ranked = details.slice().sort(function(a,b){ return (a.score/a.max) - (b.score/b.max); });
  var weakest = ranked[0];
  var challenge;
  if (weakest.label === 'Savings Buffer') {
    challenge = { type:'sav_deposit', desc:'Make one savings deposit this month', met:false };
  } else if (weakest.label === 'Payment Rate') {
    challenge = { type:'week1_early', desc:'Pay all Week 1 bills by the 10th', met:false };
  } else if (weakest.label === 'Cash Flow' || weakest.label === 'Debt-to-Income') {
    challenge = { type:'positive_flow', desc:'End the month with positive cash flow', met:false };
  } else {
    var catTotals = {};
    cw().forEach(function(w){ w.items.forEach(function(i){
      var c = CAT_LABELS[getCat(i.name)];
      catTotals[c] = (catTotals[c]||0) + i.amount;
    }); });
    var cats = Object.keys(S.budgets || BDFT);
    var worst = cats.slice().sort(function(a,b){
      var capA = (S.budgets&&S.budgets[a])||BDFT[a]||500;
      var capB = (S.budgets&&S.budgets[b])||BDFT[b]||500;
      return (catTotals[b]||0)/capB - (catTotals[a]||0)/capA;
    })[0] || 'Dining';
    challenge = { type:'cat_cap', desc:'Keep ' + worst + ' spending under budget', catName:worst, met:false };
  }
  S.monthChallenge[monthKey] = challenge;
  persist(false);
}

function evaluateChallenge(challenge) {
  if (!challenge) return { met:false, pct:0 };
  var met = false, pct = 0;
  if (challenge.type === 'positive_flow') {
    var net = totalRev(CMK) - totalExp(CMK);
    met = net > 0;
    var totalInc = totalRev(CMK) || 1;
    pct = Math.min(100, Math.max(0, (net / totalInc) * 100));
  } else if (challenge.type === 'week1_early') {
    var wk1 = cw()[0];
    var allPaid = wk1 && wk1.items.length > 0 && wk1.items.every(function(i){ return i.paid; });
    var today = new Date().getDate();
    var paidCount = wk1 ? wk1.items.filter(function(i){ return i.paid; }).length : 0;
    var total = wk1 ? wk1.items.length : 0;
    met = allPaid && today <= 10;
    pct = total > 0 ? (paidCount / total * 100) : 0;
  } else if (challenge.type === 'sav_deposit') {
    var cmkMo = CMK.split(' ')[0];
    var cmkYr = CMK.split(' ')[1];
    var hasDeposit = (S.savings || []).some(function(g){
      return (g.transactions || []).some(function(t){
        if (!t.date) return false;
        var parts = t.date.split('-');
        var tMo = MS[parseInt(parts[1])-1];
        var tYr = parts[0];
        return tMo === cmkMo && tYr === cmkYr;
      });
    });
    met = hasDeposit;
    pct = hasDeposit ? 100 : 0;
  } else if (challenge.type === 'cat_cap') {
    var cat = challenge.catName;
    var spent = cw().reduce(function(s,w){
      return s + w.items.filter(function(i){ return CAT_LABELS[getCat(i.name)] === cat; })
        .reduce(function(a,i){ return a + i.amount; }, 0);
    }, 0);
    var cap = (S.budgets&&S.budgets[cat])||BDFT[cat]||500;
    met = cap > 0 && spent <= cap;
    pct = cap > 0 ? Math.min(100, spent / cap * 100) : 0;
  }
  return { met:met, pct:pct };
}

var _challengeWasMet = false;
function renderChallengeCard() {
  var el = document.getElementById('d-challenge-card');
  if (!el) return;
  generateMonthChallenge(CMK);
  var ch = S.monthChallenge && S.monthChallenge[CMK];
  if (!ch) { el.style.display = 'none'; return; }
  var ev = evaluateChallenge(ch);
  var isMet = ev.met;

  // On first completion
  if (isMet && !ch.met) {
    ch.met = true;
    S.monthChallenge[CMK] = ch;
    persist(false);
    showToast('🎉 Challenge complete: ' + ch.desc);
    launchConfetti(80);
    if (typeof awardXP === 'function') awardXP('challenge_complete');
  }

  var pct = isMet ? 100 : ev.pct;
  var barColor = isMet ? 'var(--success)' : 'var(--sage)';
  el.className = 'challenge-card' + (isMet ? ' ch-met' : '');
  el.style.display = '';
  var safeDesc = typeof esc === 'function' ? esc(ch.desc) : ch.desc;
  el.innerHTML = '<div class="ch-strip">'
    + '<span style="font-size:13px;flex-shrink:0;">🎯</span>'
    + '<span class="ch-desc" title="' + safeDesc + '">' + safeDesc + '</span>'
    + '<div class="ch-bar-inline" role="progressbar" aria-valuenow="' + Math.round(pct) + '" aria-valuemin="0" aria-valuemax="100" aria-label="Challenge progress"><div class="ch-bar-fill" style="width:' + pct.toFixed(1) + '%;background:' + barColor + ';"></div></div>'
    + (isMet ? '<span class="ch-done">✓ Done</span>' : '<span class="ch-pct">' + Math.round(pct) + '%</span>')
    + '</div>';
}

// ══════════════════════════════════════════════
// FEATURE 7 — SPENDING HEATMAP
// ══════════════════════════════════════════════
function fmtHmAmt(n) {
  if(typeof fmtK==='function') return fmtK(n);
  var sym=(typeof getCurrency==='function'?getCurrency().symbol:'$');
  if (n >= 1000) return sym + (n / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
  return sym + Math.round(n);
}

var _hmPopEl = null;
var _hmPopOpen = false;
function _getHmPop() {
  if (!_hmPopEl) {
    _hmPopEl = document.createElement('div');
    _hmPopEl.id = 'hm-pop';
    document.body.appendChild(_hmPopEl);
    // Close popover when clicking outside a heatmap cell (capture so it runs first)
    document.addEventListener('click', function(e) {
      if (_hmPopOpen && !e.target.closest('[data-action="showHmPop"]')) {
        _hmPopEl.style.display = 'none';
        _hmPopOpen = false;
      }
    }, true);
  }
  return _hmPopEl;
}

function showHmPop(label, el) {
  var pop = _getHmPop();
  pop.textContent = label;
  pop.style.visibility = 'hidden';
  pop.style.display = 'block';
  var pw = pop.offsetWidth, ph = pop.offsetHeight;
  var r = el.getBoundingClientRect();
  var left = r.left + r.width / 2 - pw / 2;
  var top = r.top - ph - 6;
  if (top < 8) top = r.bottom + 6;
  pop.style.left = Math.max(8, Math.min(left, window.innerWidth - pw - 8)) + 'px';
  pop.style.top = top + 'px';
  pop.style.visibility = '';
  _hmPopOpen = true;
}

function renderSpendingHeatmap() {
  var el = document.getElementById('d-heatmap');
  if (!el) return;
  var parts = CMK.split(' ');
  var mo = MS.indexOf(parts[0]), yr = parseInt(parts[1]);
  var daysInMonth = new Date(yr, mo + 1, 0).getDate();
  var firstDow = new Date(yr, mo, 1).getDay();
  var byDay = {};
  cw().forEach(function(w){ w.items.forEach(function(i){
    if (i.dueDay) byDay[i.dueDay] = (byDay[i.dueDay]||0) + i.amount;
  }); });
  var vals = Object.values(byDay);
  var maxSpend = vals.length > 0 ? Math.max.apply(null, vals) : 1;
  if (maxSpend === 0) maxSpend = 1;
  var today = new Date();
  var isCurMo = today.getMonth() === mo && today.getFullYear() === yr;
  var todayDay = isCurMo ? today.getDate() : -1;
  var hmMo = document.getElementById('d-heatmap-month');
  if (hmMo) hmMo.textContent = CMK;
  var cells = [];
  for (var b = 0; b < firstDow; b++) cells.push('<div class="hm-cell hm-blank"></div>');

  if (vals.length === 0) {
    for (var d = 1; d <= daysInMonth; d++) {
      var cls = 'hm-cell hm-cell-ghost' + (d === todayDay ? ' hm-today hm-pulse' : '');
      cells.push('<div class="' + cls + '"><span class="hm-day">' + d + '</span></div>');
    }
    var emptyMsg = todayDay > 0
      ? '🔥 Start your spending map — today is day ' + todayDay + '. Add due dates to expenses to fill it in.'
      : '📅 Add due dates to expenses to light up this grid.';
    el.innerHTML = '<div class="hm-header"><span>S</span><span>M</span><span>T</span><span>W</span><span>T</span><span>F</span><span>S</span></div>'
      + '<div class="hm-grid">' + cells.join('') + '</div>'
      + '<div class="hm-empty-msg">' + emptyMsg + '</div>';
    return;
  }

  for (var d = 1; d <= daysInMonth; d++) {
    var spend = byDay[d] || 0;
    var p = spend / maxSpend;
    var bgColor = spend === 0 ? 'var(--slate-mid)' : p > 0.7 ? 'var(--danger)' : p > 0.35 ? 'var(--amber)' : 'var(--success)';
    var bgOpacity = spend === 0 ? 0.2 : (0.25 + p * 0.75).toFixed(2);
    var cls = 'hm-cell' + (d === todayDay ? ' hm-today' : '');
    var popLabel = 'Day ' + d + (spend > 0 ? ' · ' + fmt(spend) : ' · nothing due');
    var inner = '<div class="hm-bg" style="background:' + bgColor + ';opacity:' + bgOpacity + ';"></div>'
      + '<span class="hm-day">' + d + '</span>'
      + (spend > 0 ? '<span class="hm-amt">' + fmtHmAmt(spend) + '</span>' : '');
    cells.push('<div class="' + cls + '" style="--hm-glow:' + bgColor + ';" data-action="showHmPop" data-arg="' + popLabel + '" data-arg-self>' + inner + '</div>');
  }
  el.innerHTML = '<div class="hm-header"><span>S</span><span>M</span><span>T</span><span>W</span><span>T</span><span>F</span><span>S</span></div>'
    + '<div class="hm-grid">' + cells.join('') + '</div>'
    + '<div class="hm-legend"><span style="color:var(--success);">● Low</span><span style="color:var(--amber);">● Mid</span><span style="color:var(--danger);">● High</span></div>';
}

// ══════════════════════════════════════════════
// FEATURE 8 — END-OF-MONTH SCORECARD
// ══════════════════════════════════════════════
function openScorecardModal(closingKey) {
  if (!closingKey || !S.months[closingKey]) return;
  var rev = totalRev(closingKey), exp = totalExp(closingKey);
  var net = rev - exp;
  // Use score saved at close time; for older months without it, derive grade from net flow
  var score = (S.months[closingKey].closedScore != null) ? S.months[closingKey].closedScore : null;
  var tier = score !== null ? getHealthTier(score) : { label: '—' };
  var grade, gradeColor;
  if (score !== null) {
    grade = score >= 95 ? 'A+' : score >= 85 ? 'A' : score >= 75 ? 'B' : score >= 60 ? 'C' : score >= 40 ? 'D' : 'F';
  } else {
    var ratio = rev > 0 ? net / rev : (net >= 0 ? 1 : -1);
    grade = ratio > 0.25 ? 'A' : ratio > 0.1 ? 'B' : ratio > 0 ? 'C' : ratio > -0.1 ? 'D' : 'F';
  }
  gradeColor = (grade === 'A+' || grade === 'A') ? 'var(--success)' : grade === 'B' ? 'var(--blue)' : grade === 'C' ? 'var(--amber)' : 'var(--danger)';
  var msg = (grade === 'A+' || grade === 'A') ? 'Outstanding month! Keep it up 🎉' : grade === 'B' ? 'Solid month — you\'re building momentum.' : 'Room to improve — let\'s make next month stronger 💪';

  // MoM comparison
  var keys = Object.keys(S.months).sort(function(a,b){return keyToYM(a)-keyToYM(b);});
  var prevIdx = keys.indexOf(closingKey) - 1;
  var momText = '';
  if (prevIdx >= 0) {
    var prevKey = keys[prevIdx];
    var prevNet = totalRev(prevKey) - totalExp(prevKey);
    var diff = net - prevNet;
    momText = (diff >= 0 ? '▲ ' : '▼ ') + fmt(Math.abs(diff)) + ' vs ' + prevKey;
  }

  var streak = calcStreak();
  var recentBadges = (S.achievements || []).slice(-5).map(function(id){
    return ACHIEVEMENTS[id] ? ACHIEVEMENTS[id].icon : '';
  }).join(' ');

  var gradeEl = document.getElementById('sc-grade');
  if (gradeEl) { gradeEl.textContent = grade; gradeEl.style.color = gradeColor; }
  var moEl = document.getElementById('sc-month'); if (moEl) moEl.textContent = closingKey;
  var scoreEl = document.getElementById('sc-score'); if (scoreEl) scoreEl.textContent = score !== null ? score + '/100 · ' + tier.label : 'Based on cash flow';
  var msgEl = document.getElementById('sc-msg'); if (msgEl) msgEl.textContent = msg;
  var cfEl = document.getElementById('sc-cashflow');
  if (cfEl) { cfEl.textContent = (net >= 0 ? '+' : '') + fmt(net); cfEl.style.color = net >= 0 ? 'var(--success)' : 'var(--danger)'; }
  var momEl = document.getElementById('sc-mom'); if (momEl) momEl.textContent = momText;
  var strEl = document.getElementById('sc-streak'); if (strEl) strEl.textContent = streak > 0 ? '🔥 ' + streak + '-month streak' : 'Start a streak next month!';
  var badgeEl = document.getElementById('sc-badges'); if (badgeEl) badgeEl.textContent = recentBadges || '—';

  var modal = document.getElementById('scorecardModal');
  if (!modal) return;
  modal.classList.add('open');
  trapFocus(modal);
  if (grade === 'A+' || grade === 'A') setTimeout(function(){ launchConfetti(150); }, 200);
}

function closeScorecardModal() {
  var modal = document.getElementById('scorecardModal');
  if (!modal) return;
  releaseTrap(modal);
  modal.classList.remove('open');
}

// ══════════════════════════════════════════════
// MAIN RENDER ENTRY — called from renderDash()
// ══════════════════════════════════════════════
function renderGamification() {
  renderStreakBadge();
  renderChallengeCard();
  renderAchievementShelf();
  renderXPBar();
  renderSpendingHeatmap();
  checkAchievements('budget_boss', 'streak_3', 'streak_6');
}
