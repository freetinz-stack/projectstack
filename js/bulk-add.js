// === bulk-add.js ===
// Bulk-add modal: stage multiple expenses/savings/loans in one session, commit with a single persist().

'use strict';

// ── Module state ──────────────────────────────────────────────────────────────
var _baExpenses = [];
var _baSavings  = [];
var _baLoans    = [];
var _baActiveTab = 'expenses';
var _baRouteOverride = null; // optional forced target month for expenses
var _baCatListenerAttached = false; // guard: attach name→category listener only once

// ── Month routing helper ──────────────────────────────────────────────────────
function _baRouteMonth(dateStr) {
  // Derive "Mon YYYY" key from dateStr; fallback to CMK if parse fails.
  // Does NOT create month entries — creation happens in bulkAddSubmit.
  if (!dateStr) return (typeof CMK !== 'undefined' ? CMK : '');
  var m = dateStr.match(/(\d+)[\/\-](\d+)[\/\-](\d+)/);
  if (!m) return (typeof CMK !== 'undefined' ? CMK : '');
  var p = [parseInt(m[1]), parseInt(m[2]), parseInt(m[3])];
  var yr, mo; // mo is 0-based
  if (p[0] > 31)      { yr = p[0]; mo = p[1] - 1; }   // YYYY-MM-DD
  else if (p[2] > 31) { mo = p[0] - 1; yr = p[2]; }   // MM/DD/YYYY
  else                 { mo = p[0] - 1; yr = p[2]; }   // assume MM/DD/YYYY
  if (isNaN(yr) || isNaN(mo) || mo < 0 || mo > 11) return (typeof CMK !== 'undefined' ? CMK : '');
  var names = (typeof MS !== 'undefined') ? MS : ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  var key = names[mo] + ' ' + yr;
  if (typeof CMK !== 'undefined' && key === CMK) return CMK;
  if (typeof S !== 'undefined' && S && S.months && S.months[key]) return key;
  return key; // new month; entry created in bulkAddSubmit
}

// ── Modal open / close ────────────────────────────────────────────────────────
function openBulkAdd() {
  _baExpenses = []; _baSavings = []; _baLoans = [];
  _baActiveTab = 'expenses';
  _baRouteOverride = null;

  // Clear form fields
  ['baExpName','baExpAmt','baExpDate','baExpErr','baSavName','baSavTarget','baSavBal','baSavErr','baLoanName','baLoanBal','baLoanRate','baLoanMin','baLoanErr'].forEach(function(id) {
    var el = document.getElementById(id);
    if (el) el.value = '';
    if (el && (id === 'baExpErr' || id === 'baSavErr' || id === 'baLoanErr')) el.textContent = '';
  });

  // Populate category dropdown from CAT_ALL
  var catSel = document.getElementById('baExpCat');
  if (catSel && typeof CAT_ALL !== 'undefined') {
    catSel.innerHTML = CAT_ALL.map(function(c) {
      return '<option value="' + c.cls + '">' + c.icon + ' ' + c.lbl + '</option>';
    }).join('');
  }

  // Auto-select category as user types the expense name (attached once for the modal's lifetime)
  if (!_baCatListenerAttached) {
    _baCatListenerAttached = true;
    var nameInput = document.getElementById('baExpName');
    if (nameInput && typeof getCat === 'function') {
      nameInput.addEventListener('input', function() {
        var drop = document.getElementById('baExpCat');
        if (drop) drop.value = getCat(this.value.trim());
      });
    }
  }

  bulkAddRenderExpenses();
  bulkAddRenderSavings();
  bulkAddRenderLoans();
  bulkAddTab('expenses');

  var modal = document.getElementById('bulkAddModal');
  if (!modal) return;
  modal.classList.add('open');
  if (typeof trapFocus === 'function') trapFocus(modal);
}

function closeBulkAdd() {
  var modal = document.getElementById('bulkAddModal');
  if (!modal) return;
  if (typeof releaseTrap === 'function') releaseTrap(modal);
  modal.classList.remove('open');
}

// ── Tab switching ─────────────────────────────────────────────────────────────
function bulkAddTab(tab) {
  _baActiveTab = tab;
  document.querySelectorAll('.ba-tab-btn').forEach(function(b) {
    b.classList.toggle('active', b.dataset.arg === tab);
    b.style.background = b.dataset.arg === tab ? 'var(--accent-light, var(--sage-light))' : '';
    b.style.color = b.dataset.arg === tab ? 'var(--accent)' : '';
    b.style.borderColor = b.dataset.arg === tab ? 'var(--accent)' : '';
  });
  document.querySelectorAll('.ba-panel').forEach(function(p) {
    var isActive = p.id === 'baPanel-' + tab;
    p.classList.toggle('active', isActive);
    p.style.display = isActive ? '' : 'none';
  });
}

// ── Expenses triad ────────────────────────────────────────────────────────────
function bulkAddAddExpense() {
  var nameEl  = document.getElementById('baExpName');
  var amtEl   = document.getElementById('baExpAmt');
  var catEl   = document.getElementById('baExpCat');
  var wkEl    = document.getElementById('baExpWeek');
  var dateEl  = document.getElementById('baExpDate');
  var errEl   = document.getElementById('baExpErr');
  if (errEl) errEl.textContent = '';

  var name = (nameEl ? nameEl.value : '').trim();
  var amt  = parseFloat(amtEl ? amtEl.value : '');
  if (!name) { if (errEl) errEl.textContent = 'Name is required.'; return; }
  if (!amt || amt <= 0) { if (errEl) errEl.textContent = 'Enter a valid amount greater than 0.'; return; }

  var cat  = catEl ? (catEl.value || 'cat-other') : 'cat-other';
  var date = dateEl ? (dateEl.value || '') : '';

  // Derive week: if date provided, use getWeekForDay; else use week select (1-based → 0-based)
  var wk = 0;
  if (date && typeof getWeekForDay === 'function') {
    var dayNum = parseInt((date.split('-')[2] || '1'), 10);
    wk = getWeekForDay(dayNum, typeof CMK !== 'undefined' ? CMK : '');
  } else {
    wk = Math.min(3, Math.max(0, (parseInt(wkEl ? wkEl.value : '1') || 1) - 1));
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
  if (dateEl) dateEl.value = '';
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
  if (!_baExpenses.length) {
    list.innerHTML = '<div class="ob-list-empty ob-empty-hint">No expenses added yet.</div>';
  } else {
    list.innerHTML = _baExpenses.map(function(e, i) {
      return '<div class="ob-item-row">' +
        '<span class="ob-item-name">' + e.name.replace(/</g, '&lt;') + '</span>' +
        '<span class="ob-item-amt">$' + e.amount.toFixed(2) + ' &middot; Wk' + (e.week + 1) + '</span>' +
        '<button class="ob-item-del" data-action="bulkAddRemoveExpense" data-arg="' + i + '" aria-label="Remove">&times;</button>' +
        '</div>';
    }).join('');
  }
  // Update routing banner
  var bannerEl = document.getElementById('baRouteBanner');
  if (bannerEl) {
    if (_baExpenses.length) {
      var targetMonth = _baRouteOverride || (_baExpenses[0].date ? _baRouteMonth(_baExpenses[0].date) : (typeof CMK !== 'undefined' ? CMK : ''));
      var moKeys = (typeof S !== 'undefined' && S && S.months) ? Object.keys(S.months) : [];
      bannerEl.innerHTML = '<span>' + _baExpenses.length + ' expense' + (_baExpenses.length !== 1 ? 's' : '') + ' to ' + (targetMonth || 'current month') + '. Override &rarr;</span>' +
        '<select id="baRouteOverrideSelect" class="fi" style="width:auto;padding:4px 8px;font-size:12px;">' +
        '<option value="">Auto (by date)</option>' +
        moKeys.map(function(k) { return '<option value="' + k.replace(/"/g, '&quot;') + '"' + (_baRouteOverride === k ? ' selected' : '') + '>' + k.replace(/</g, '&lt;') + '</option>'; }).join('') +
        '</select>';
      var sel = document.getElementById('baRouteOverrideSelect');
      if (sel) {
        sel.addEventListener('change', function() { _baRouteOverride = sel.value || null; bulkAddRenderExpenses(); });
      }
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
  if (!name) { if (errEl) errEl.textContent = 'Goal name is required.'; return; }
  if (!target || target <= 0) { if (errEl) errEl.textContent = 'Enter a target amount greater than 0.'; return; }

  _baSavings.push({ name: name.substring(0, 60), target: Math.round(target * 100) / 100, balance: Math.round(bal * 100) / 100 });
  if (nameEl) nameEl.value = '';
  if (targetEl) targetEl.value = '';
  if (balEl) balEl.value = '';
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
  if (!_baSavings.length) {
    list.innerHTML = '<div class="ob-list-empty ob-empty-hint">No savings goals added yet.</div>';
  } else {
    list.innerHTML = _baSavings.map(function(g, i) {
      return '<div class="ob-item-row">' +
        '<span class="ob-item-name">' + g.name.replace(/</g, '&lt;') + '</span>' +
        '<span class="ob-item-amt">$' + g.balance.toFixed(2) + ' / $' + g.target.toFixed(2) + '</span>' +
        '<button class="ob-item-del" data-action="bulkAddRemoveSaving" data-arg="' + i + '" aria-label="Remove">&times;</button>' +
        '</div>';
    }).join('');
  }
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
  if (!name) { if (errEl) errEl.textContent = 'Loan name is required.'; return; }
  if (!bal || bal <= 0) { if (errEl) errEl.textContent = 'Enter a balance greater than 0.'; return; }

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
  if (!_baLoans.length) {
    list.innerHTML = '<div class="ob-list-empty ob-empty-hint">No loans added yet.</div>';
  } else {
    list.innerHTML = _baLoans.map(function(l, i) {
      return '<div class="ob-item-row">' +
        '<span class="ob-item-name">' + l.name.replace(/</g, '&lt;') + '</span>' +
        '<span class="ob-item-amt">$' + l.balance.toFixed(2) + ' &bull; ' + l.rate + '% &bull; $' + l.min.toFixed(2) + '/mo</span>' +
        '<button class="ob-item-del" data-action="bulkAddRemoveLoan" data-arg="' + i + '" aria-label="Remove">&times;</button>' +
        '</div>';
    }).join('');
  }
}

// ── Submit: single persist after all pushes ───────────────────────────────────
function bulkAddSubmit() {
  if (!_baExpenses.length && !_baSavings.length && !_baLoans.length) {
    if (typeof showToast === 'function') showToast('No items to save', 'warn-t');
    return;
  }

  // Expenses → month routing (D-25)
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

  // Savings → S.savings (no month routing, D-26)
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

  // Loans → S.loans (no month routing, D-26)
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

  if (typeof persist === 'function') persist();  // SINGLE persist after all loops

  if (typeof window.closeBulkAdd === 'function') window.closeBulkAdd();
  if (typeof renderDash === 'function') renderDash();
  if (typeof updateHealth === 'function') updateHealth();

  var count = _baExpenses.length + _baSavings.length + _baLoans.length;
  if (typeof showToast === 'function') showToast('Saved ' + count + ' item' + (count !== 1 ? 's' : ''));
}

// ── Window exposure block (events.js dispatches via window[fn]) ───────────────
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
