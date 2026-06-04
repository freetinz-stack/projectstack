// === bulk-add.js ===
// Bulk-add modal: stage multiple expenses/savings/loans in one session, commit with a single persist().

'use strict';

// ── Module state ──────────────────────────────────────────────────────────────
var _baExpenses = [];
var _baSavings  = [];
var _baLoans    = [];
var _baActiveTab = 'expenses';
var _baRouteOverride = null;
var _baListenersAttached = false; // guard: attach input listeners only once per modal lifetime

// ── Month routing helper ──────────────────────────────────────────────────────
function _baRouteMonth(dateStr) {
  if (!dateStr) return (typeof CMK !== 'undefined' ? CMK : '');
  var m = dateStr.match(/(\d+)[\/\-](\d+)[\/\-](\d+)/);
  if (!m) return (typeof CMK !== 'undefined' ? CMK : '');
  var p = [parseInt(m[1]), parseInt(m[2]), parseInt(m[3])];
  var yr, mo;
  if (p[0] > 31)      { yr = p[0]; mo = p[1] - 1; }
  else if (p[2] > 31) { mo = p[0] - 1; yr = p[2]; }
  else                 { mo = p[0] - 1; yr = p[2]; }
  if (isNaN(yr) || isNaN(mo) || mo < 0 || mo > 11) return (typeof CMK !== 'undefined' ? CMK : '');
  var names = (typeof MS !== 'undefined') ? MS : ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return names[mo] + ' ' + yr;
}

// ── Derive week index (0-based) from a YYYY-MM-DD date string ─────────────────
function _baDeriveWeek(dateStr) {
  if (!dateStr) return -1;
  var parts = dateStr.split('-');
  if (parts.length < 3) return -1;
  var day = parseInt(parts[2], 10);
  if (isNaN(day)) return -1;
  if (typeof getWeekForDay === 'function') {
    return getWeekForDay(day, typeof CMK !== 'undefined' ? CMK : '');
  }
  // Fallback: simple quarter split
  return Math.min(3, Math.floor((day - 1) / 7));
}

// ── Today's date as YYYY-MM-DD ────────────────────────────────────────────────
function _baTodayISO() {
  var d = new Date();
  var mm = String(d.getMonth() + 1).padStart(2, '0');
  var dd = String(d.getDate()).padStart(2, '0');
  return d.getFullYear() + '-' + mm + '-' + dd;
}

// ── Modal open / close ────────────────────────────────────────────────────────
function openBulkAdd() {
  _baExpenses = []; _baSavings = []; _baLoans = [];
  _baActiveTab = 'expenses';
  _baRouteOverride = null;

  // Clear form fields
  ['baExpName','baExpAmt','baExpErr','baSavName','baSavTarget','baSavBal','baSavErr','baLoanName','baLoanBal','baLoanRate','baLoanMin','baLoanErr'].forEach(function(id) {
    var el = document.getElementById(id);
    if (!el) return;
    if (id.indexOf('Err') !== -1) el.textContent = '';
    else el.value = '';
  });

  // Default date to today and derive the correct week
  var dateEl = document.getElementById('baExpDate');
  var today = _baTodayISO();
  if (dateEl) dateEl.value = today;

  // Populate category dropdown
  var catSel = document.getElementById('baExpCat');
  if (catSel && typeof CAT_ALL !== 'undefined') {
    catSel.innerHTML = CAT_ALL.map(function(c) {
      return '<option value="' + c.cls + '">' + c.icon + ' ' + c.lbl + '</option>';
    }).join('');
    // Auto-select category for today's date if getCat recognises it (rare, but consistent)
  }

  // Attach listeners once per modal DOM lifetime
  if (!_baListenersAttached) {
    _baListenersAttached = true;

    // Category auto-detection as user types expense name
    var nameEl = document.getElementById('baExpName');
    if (nameEl && typeof getCat === 'function') {
      nameEl.addEventListener('input', function() {
        var drop = document.getElementById('baExpCat');
        if (drop) drop.value = getCat(this.value.trim());
      });
    }

    // Date change → auto-update week label (visual confirmation)
    if (dateEl) {
      dateEl.addEventListener('change', function() {
        _baUpdateWeekHint(this.value);
      });
    }

    // Enter key in expense fields → add expense
    ['baExpName', 'baExpAmt'].forEach(function(id) {
      var el = document.getElementById(id);
      if (el) el.addEventListener('keydown', function(e) { if (e.key === 'Enter') { e.preventDefault(); bulkAddAddExpense(); } });
    });
    // Enter key in savings fields → add saving
    ['baSavName', 'baSavTarget', 'baSavBal'].forEach(function(id) {
      var el = document.getElementById(id);
      if (el) el.addEventListener('keydown', function(e) { if (e.key === 'Enter') { e.preventDefault(); bulkAddAddSaving(); } });
    });
    // Enter key in loan fields → add loan
    ['baLoanName', 'baLoanBal', 'baLoanRate', 'baLoanMin'].forEach(function(id) {
      var el = document.getElementById(id);
      if (el) el.addEventListener('keydown', function(e) { if (e.key === 'Enter') { e.preventDefault(); bulkAddAddLoan(); } });
    });
  }

  _baUpdateWeekHint(today);
  bulkAddRenderExpenses();
  bulkAddRenderSavings();
  bulkAddRenderLoans();
  bulkAddTab('expenses');

  var modal = document.getElementById('bulkAddModal');
  if (!modal) return;
  modal.classList.add('open');
  if (typeof pushTrap === 'function') pushTrap(modal);
  setTimeout(function() { var n = document.getElementById('baExpName'); if (n) n.focus(); }, 50);
}

function closeBulkAdd() {
  var modal = document.getElementById('bulkAddModal');
  if (!modal) return;
  if (typeof releaseTrap === 'function') releaseTrap(modal);
  modal.classList.remove('open');
}

// Show a small "Week N" hint next to the date label
function _baUpdateWeekHint(dateStr) {
  var hint = document.getElementById('baExpDateHint');
  if (!hint) return;
  var wk = _baDeriveWeek(dateStr);
  hint.textContent = wk >= 0 ? '→ Week ' + (wk + 1) : '';
}

// ── Tab switching ─────────────────────────────────────────────────────────────
function bulkAddTab(tab) {
  _baActiveTab = tab;
  document.querySelectorAll('.ba-tab-btn').forEach(function(b) {
    b.classList.toggle('active', b.dataset.arg === tab);
  });
  document.querySelectorAll('.ba-panel').forEach(function(p) {
    var isActive = p.id === 'baPanel-' + tab;
    p.style.display = isActive ? '' : 'none';
  });
  // Focus first input of the active panel
  var panel = document.getElementById('baPanel-' + tab);
  if (panel) {
    var first = panel.querySelector('input, select');
    if (first) setTimeout(function() { first.focus(); }, 30);
  }
}

// Update the count badge on a tab button
function _baUpdateTabCount(tab, count) {
  var badge = document.getElementById('baTabCount-' + tab);
  if (!badge) return;
  badge.textContent = count > 0 ? count : '';
  badge.style.display = count > 0 ? '' : 'none';
}

// ── Expenses triad ────────────────────────────────────────────────────────────
function bulkAddAddExpense() {
  var nameEl = document.getElementById('baExpName');
  var amtEl  = document.getElementById('baExpAmt');
  var catEl  = document.getElementById('baExpCat');
  var dateEl = document.getElementById('baExpDate');
  var errEl  = document.getElementById('baExpErr');
  if (errEl) errEl.textContent = '';

  var name = (nameEl ? nameEl.value : '').trim();
  var amt  = parseFloat(amtEl ? amtEl.value : '');
  if (!name) { if (errEl) errEl.textContent = 'Expense name is required.'; if (nameEl) nameEl.focus(); return; }
  if (!amt || amt <= 0) { if (errEl) errEl.textContent = 'Enter a valid amount greater than $0.'; if (amtEl) amtEl.focus(); return; }

  var cat  = catEl ? (catEl.value || 'cat-other') : 'cat-other';
  var date = dateEl ? (dateEl.value || _baTodayISO()) : _baTodayISO();

  // Derive week from date
  var wk = _baDeriveWeek(date);
  if (wk < 0) wk = 0;

  // Auto-detect category from name if it wasn't manually changed
  if (cat === 'cat-other' && typeof getCat === 'function') {
    cat = getCat(name);
  }

  _baExpenses.push({
    name: name.substring(0, 60),
    amount: Math.round(amt * 100) / 100,
    category: cat,
    week: wk,
    date: date
  });

  if (nameEl) nameEl.value = '';
  if (amtEl)  amtEl.value  = '';
  // Keep date as-is for rapid batch entry of same-date items
  // Re-detect category will reset on next name type
  bulkAddRenderExpenses();
  if (nameEl) nameEl.focus();
}

function bulkAddRemoveExpense(i) {
  _baExpenses.splice(parseInt(i), 1);
  bulkAddRenderExpenses();
}

function bulkAddRenderExpenses() {
  var list = document.getElementById('baExpList');
  if (!list) return;
  list.classList.toggle('ob-list-empty', !_baExpenses.length);
  if (!_baExpenses.length) {
    list.innerHTML = '';
  } else {
    list.innerHTML = _baExpenses.map(function(e, i) {
      var catIcon = '';
      if (typeof CAT_ALL !== 'undefined') {
        var found = CAT_ALL.filter(function(c) { return c.cls === e.category; })[0];
        if (found) catIcon = found.icon + ' ';
      }
      return '<div class="ob-item-row">' +
        '<span class="ob-item-name">' + catIcon + e.name.replace(/</g, '&lt;') + '</span>' +
        '<span class="ob-item-amt">$' + e.amount.toFixed(2) + ' &middot; Wk' + (e.week + 1) + '</span>' +
        '<button class="ob-item-del" data-action="bulkAddRemoveExpense" data-arg="' + i + '" aria-label="Remove">&times;</button>' +
        '</div>';
    }).join('');
  }
  _baUpdateTabCount('expenses', _baExpenses.length);

  // Route banner
  var bannerEl = document.getElementById('baRouteBanner');
  if (bannerEl) {
    if (_baExpenses.length) {
      var targetMonth = _baRouteOverride || (_baExpenses[0].date ? _baRouteMonth(_baExpenses[0].date) : (typeof CMK !== 'undefined' ? CMK : ''));
      var moKeys = (typeof S !== 'undefined' && S && S.months) ? Object.keys(S.months) : [];
      bannerEl.innerHTML = '<span>' + _baExpenses.length + ' expense' + (_baExpenses.length !== 1 ? 's' : '') + ' → <strong>' + (targetMonth || 'current month') + '</strong>. Override: </span>' +
        '<select id="baRouteOverrideSelect" class="fi" style="width:auto;padding:3px 6px;font-size:11px;display:inline-block;height:auto;">' +
        '<option value="">Auto (by date)</option>' +
        moKeys.map(function(k) { return '<option value="' + k.replace(/"/g, '&quot;') + '"' + (_baRouteOverride === k ? ' selected' : '') + '>' + k.replace(/</g, '&lt;') + '</option>'; }).join('') +
        '</select>';
      var sel = document.getElementById('baRouteOverrideSelect');
      if (sel) sel.addEventListener('change', function() { _baRouteOverride = sel.value || null; bulkAddRenderExpenses(); });
    } else {
      bannerEl.innerHTML = '';
    }
  }
}

// ── Savings triad ─────────────────────────────────────────────────────────────
function bulkAddAddSaving() {
  var nameEl   = document.getElementById('baSavName');
  var targetEl = document.getElementById('baSavTarget');
  var balEl    = document.getElementById('baSavBal');
  var errEl    = document.getElementById('baSavErr');
  if (errEl) errEl.textContent = '';

  var name   = (nameEl ? nameEl.value : '').trim();
  var target = parseFloat(targetEl ? targetEl.value : '');
  var bal    = parseFloat(balEl ? balEl.value : '') || 0;
  if (!name)            { if (errEl) errEl.textContent = 'Goal name is required.'; if (nameEl) nameEl.focus(); return; }
  if (!target || target <= 0) { if (errEl) errEl.textContent = 'Enter a target amount greater than $0.'; if (targetEl) targetEl.focus(); return; }
  if (bal > target)     { if (errEl) errEl.textContent = 'Amount saved cannot exceed the target.'; if (balEl) balEl.focus(); return; }

  _baSavings.push({ name: name.substring(0, 60), target: Math.round(target * 100) / 100, balance: Math.round(bal * 100) / 100 });
  if (nameEl)   nameEl.value   = '';
  if (targetEl) targetEl.value = '';
  if (balEl)    balEl.value    = '';
  bulkAddRenderSavings();
  if (nameEl) nameEl.focus();
}

function bulkAddRemoveSaving(i) {
  _baSavings.splice(parseInt(i), 1);
  bulkAddRenderSavings();
}

function bulkAddRenderSavings() {
  var list = document.getElementById('baSavList');
  if (!list) return;
  list.classList.toggle('ob-list-empty', !_baSavings.length);
  if (!_baSavings.length) {
    list.innerHTML = '';
  } else {
    list.innerHTML = _baSavings.map(function(g, i) {
      var pct = Math.min(100, g.target > 0 ? Math.round((g.balance / g.target) * 100) : 0);
      return '<div class="ob-item-row">' +
        '<span class="ob-item-name">&#127777; ' + g.name.replace(/</g, '&lt;') + '</span>' +
        '<span class="ob-item-amt">$' + g.balance.toFixed(2) + ' / $' + g.target.toFixed(2) + ' (' + pct + '%)</span>' +
        '<button class="ob-item-del" data-action="bulkAddRemoveSaving" data-arg="' + i + '" aria-label="Remove">&times;</button>' +
        '</div>';
    }).join('');
  }
  _baUpdateTabCount('savings', _baSavings.length);
}

// ── Loans triad ───────────────────────────────────────────────────────────────
function bulkAddAddLoan() {
  var nameEl = document.getElementById('baLoanName');
  var balEl  = document.getElementById('baLoanBal');
  var rateEl = document.getElementById('baLoanRate');
  var minEl  = document.getElementById('baLoanMin');
  var errEl  = document.getElementById('baLoanErr');
  if (errEl) errEl.textContent = '';

  var name = (nameEl ? nameEl.value : '').trim();
  var bal  = parseFloat(balEl ? balEl.value : '');
  var rate = parseFloat(rateEl ? rateEl.value : '') || 0;
  var min  = parseFloat(minEl ? minEl.value : '') || 0;
  if (!name)         { if (errEl) errEl.textContent = 'Loan name is required.'; if (nameEl) nameEl.focus(); return; }
  if (!bal || bal <= 0) { if (errEl) errEl.textContent = 'Enter a balance greater than $0.'; if (balEl) balEl.focus(); return; }

  _baLoans.push({ name: name.substring(0, 60), balance: Math.round(bal * 100) / 100, rate: rate, min: Math.round(min * 100) / 100 });
  if (nameEl) nameEl.value = '';
  if (balEl)  balEl.value  = '';
  if (rateEl) rateEl.value = '';
  if (minEl)  minEl.value  = '';
  bulkAddRenderLoans();
  if (nameEl) nameEl.focus();
}

function bulkAddRemoveLoan(i) {
  _baLoans.splice(parseInt(i), 1);
  bulkAddRenderLoans();
}

function bulkAddRenderLoans() {
  var list = document.getElementById('baLoanList');
  if (!list) return;
  list.classList.toggle('ob-list-empty', !_baLoans.length);
  if (!_baLoans.length) {
    list.innerHTML = '';
  } else {
    list.innerHTML = _baLoans.map(function(l, i) {
      return '<div class="ob-item-row">' +
        '<span class="ob-item-name">&#128179; ' + l.name.replace(/</g, '&lt;') + '</span>' +
        '<span class="ob-item-amt">$' + l.balance.toFixed(2) + (l.rate ? ' &bull; ' + l.rate + '%' : '') + (l.min ? ' &bull; $' + l.min.toFixed(2) + '/mo' : '') + '</span>' +
        '<button class="ob-item-del" data-action="bulkAddRemoveLoan" data-arg="' + i + '" aria-label="Remove">&times;</button>' +
        '</div>';
    }).join('');
  }
  _baUpdateTabCount('loans', _baLoans.length);
}

// ── Submit ────────────────────────────────────────────────────────────────────
function bulkAddSubmit() {
  if (!_baExpenses.length && !_baSavings.length && !_baLoans.length) {
    if (typeof showToast === 'function') showToast('Add at least one item before saving.', 'warn-t');
    return;
  }

  // Expenses
  _baExpenses.forEach(function(e) {
    var targetKey = _baRouteOverride || (e.date ? _baRouteMonth(e.date) : (typeof CMK !== 'undefined' ? CMK : ''));
    if (!targetKey) targetKey = typeof CMK !== 'undefined' ? CMK : '';
    if (!S.months[targetKey]) {
      S.months[targetKey] = { weeks: [{items:[]},{items:[]},{items:[]},{items:[]}], revenue: [] };
    }
    var wk = Math.min(3, Math.max(0, e.week || 0));
    S.months[targetKey].weeks[wk].items.push({
      name: (e.name || '').substring(0, 60),
      amount: Math.round(e.amount * 100) / 100,
      paid: false,
      dueDay: null,
      note: '',
      receipt: null,
      category: e.category || 'cat-other'
    });
  });

  // Savings
  if (!S.savings) S.savings = [];
  _baSavings.forEach(function(g) {
    S.savings.push({
      name: (g.name || '').substring(0, 60),
      target: g.target,
      balance: g.balance,
      contribution: 0,
      rate: 0,
      payments: []
    });
  });

  // Loans
  if (!S.loans) S.loans = [];
  _baLoans.forEach(function(l) {
    S.loans.push({
      name: (l.name || '').substring(0, 60),
      amount: l.balance,
      originalAmount: l.balance,
      rate: l.rate,
      minPayment: l.min,
      payments: []
    });
  });

  if (typeof persist === 'function') persist();

  window.closeBulkAdd();
  if (typeof renderDash === 'function') renderDash();
  if (typeof updateHealth === 'function') updateHealth();

  var count = _baExpenses.length + _baSavings.length + _baLoans.length;
  if (typeof showToast === 'function') showToast('Saved ' + count + ' item' + (count !== 1 ? 's' : '') + ' ✓');
}

// ── Window exposure ───────────────────────────────────────────────────────────
window.openBulkAdd           = openBulkAdd;
window.closeBulkAdd          = closeBulkAdd;
window.bulkAddTab            = bulkAddTab;
window.bulkAddAddExpense     = bulkAddAddExpense;
window.bulkAddRemoveExpense  = bulkAddRemoveExpense;
window.bulkAddAddSaving      = bulkAddAddSaving;
window.bulkAddRemoveSaving   = bulkAddRemoveSaving;
window.bulkAddAddLoan        = bulkAddAddLoan;
window.bulkAddRemoveLoan     = bulkAddRemoveLoan;
window.bulkAddSubmit         = bulkAddSubmit;
