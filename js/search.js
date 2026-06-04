// === search.js — Global search across all months, loans, and savings ===

let _searchOpen = false;
let _searchTimeout = null;
let _taxFilterActive = false;

function toggleTaxFilter() {
  _taxFilterActive = !_taxFilterActive;
  var btn = document.getElementById('filterTax');
  if (btn) {
    btn.setAttribute('aria-pressed', _taxFilterActive ? 'true' : 'false');
    btn.classList.toggle('filter-chip-active', _taxFilterActive);
  }
  // Re-run current search with new filter
  var input = document.getElementById('searchInput');
  var q = input ? input.value.trim() : '';
  if (q.length >= 2 || _taxFilterActive) doSearch(q);
  else if (!_taxFilterActive) {
    document.getElementById('searchResults').innerHTML = '<div class="sr-hint">Type to search expenses, income, loans, and savings&hellip;</div>';
  }
}

function doSearch(q) {
  _doSearch((q || '').toLowerCase());
}

function openSearch() {
  const overlay = document.getElementById('searchOverlay');
  if (!overlay) return;
  _searchOpen = true;
  overlay.style.display = 'flex';
  if(typeof trapFocus==='function') trapFocus(overlay);
  const input = document.getElementById('searchInput');
  if (input) { input.value = ''; setTimeout(() => input.focus(), 100); }
  document.getElementById('searchResults').innerHTML = '<div class="sr-hint">Type to search expenses, income, loans, and savings&hellip;</div>';
}

function closeSearch() {
  const overlay = document.getElementById('searchOverlay');
  if(typeof releaseTrap==='function') releaseTrap(overlay);
  if (overlay) overlay.style.display = 'none';
  _searchOpen = false;
  // Reset tax filter on close
  _taxFilterActive = false;
  var btn = document.getElementById('filterTax');
  if (btn) { btn.setAttribute('aria-pressed','false'); btn.classList.remove('filter-chip-active'); }
}

function performSearch(query) {
  clearTimeout(_searchTimeout);
  const q = (query || '').trim();
  if (q.length < 2 && !_taxFilterActive) {
    document.getElementById('searchResults').innerHTML = '<div class="sr-hint">Type at least 2 characters</div>';
    return;
  }
  _searchTimeout = setTimeout(() => _doSearch(q.toLowerCase()), 200);
}

function _doSearch(q) {
  const results = [];
  const allMonths = Object.assign({}, S.months, S.archivedMonths || {});
  const isArchived = key => !!(S.archivedMonths && S.archivedMonths[key]);

  Object.entries(allMonths).forEach(([monthKey, monthData]) => {
    (monthData.weeks || []).forEach((w, wi) => {
      (w.items || []).forEach((item, ii) => {
        const nameMatch = !q || item.name.toLowerCase().includes(q);
        const taxMatch = !_taxFilterActive || item.taxDeductible;
        if (nameMatch && taxMatch) {
          results.push({ type: 'expense', monthKey, wi, ii, name: item.name, amount: item.amount, paid: item.paid, archived: isArchived(monthKey), taxDeductible: item.taxDeductible });
        }
      });
    });
    (monthData.revenue || []).forEach((rev, ri) => {
      // Tax filter only applies to expenses; always show revenue when matching text
      if (!q || rev.name.toLowerCase().includes(q)) {
        if (!_taxFilterActive) {
          results.push({ type: 'income', monthKey, ri, name: rev.name, amount: rev.amount, received: rev.received, archived: isArchived(monthKey) });
        }
      }
    });
  });

  (S.loans || []).forEach((loan, i) => {
    if (loan.name.toLowerCase().includes(q)) {
      results.push({ type: 'loan', i, name: loan.name, amount: loan.amount, rate: loan.rate });
    }
  });

  (S.savings || []).forEach((goal, i) => {
    if (goal.name.toLowerCase().includes(q)) {
      results.push({ type: 'saving', i, name: goal.name, balance: goal.balance, target: goal.target });
    }
  });

  renderSearchResults(results, q);
}

function _highlight(text, q) {
  const idx = text.toLowerCase().indexOf(q);
  if (idx < 0) return esc(text);
  return esc(text.slice(0, idx)) + '<mark class="sr-mark">' + esc(text.slice(idx, idx + q.length)) + '</mark>' + esc(text.slice(idx + q.length));
}

function renderSearchResults(results, q) {
  const el = document.getElementById('searchResults');
  if (!el) return;
  if (!results.length) {
    el.innerHTML = '<div class="sr-hint">No results for &ldquo;' + esc(q) + '&rdquo;</div>';
    return;
  }
  const grouped = { expense: [], income: [], loan: [], saving: [] };
  results.slice(0, 60).forEach(r => { if (grouped[r.type]) grouped[r.type].push(r); });
  let html = '';

  if (grouped.expense.length) {
    html += '<div class="sr-group-hdr">Expenses</div>';
    html += grouped.expense.map(r =>
      `<div class="sr-row" data-action="searchNavToExpenseFromEl" data-arg-self data-mkey="${esc(r.monthKey)}" data-wi="${r.wi}" data-ii="${r.ii}" role="button" tabindex="0">
        <span class="sr-name">${_highlight(r.name, q)}</span>
        <span class="sr-meta">${esc(r.monthKey)} · Wk${r.wi + 1}${r.archived ? ' · archived' : ''}</span>
        <span class="sr-amt">${fmt(r.amount)}</span>
        <span class="sr-status">${r.paid ? '<span style="color:var(--success)">✓</span>' : '<span style="color:var(--amber)">○</span>'}</span>
      </div>`
    ).join('');
  }

  if (grouped.income.length) {
    html += '<div class="sr-group-hdr">Income</div>';
    html += grouped.income.map(r =>
      `<div class="sr-row" data-action="searchNavToIncomeFromEl" data-arg-self data-mkey="${esc(r.monthKey)}" data-ri="${r.ri}" role="button" tabindex="0">
        <span class="sr-name">${_highlight(r.name, q)}</span>
        <span class="sr-meta">${esc(r.monthKey)}${r.archived ? ' · archived' : ''}</span>
        <span class="sr-amt" style="color:var(--success)">${fmt(r.amount)}</span>
        <span class="sr-status">${r.received ? '<span style="color:var(--success)">✓</span>' : ''}</span>
      </div>`
    ).join('');
  }

  if (grouped.loan.length) {
    html += '<div class="sr-group-hdr">Loans</div>';
    html += grouped.loan.map(r =>
      `<div class="sr-row" data-action="searchGoToTab" data-arg="loans" role="button" tabindex="0">
        <span class="sr-name">${_highlight(r.name, q)}</span>
        <span class="sr-meta">${r.rate}% APR</span>
        <span class="sr-amt" style="color:var(--danger)">${fmt(r.amount)}</span>
      </div>`
    ).join('');
  }

  if (grouped.saving.length) {
    html += '<div class="sr-group-hdr">Savings Goals</div>';
    html += grouped.saving.map(r =>
      `<div class="sr-row" data-action="searchGoToTab" data-arg="savings" role="button" tabindex="0">
        <span class="sr-name">${_highlight(r.name, q)}</span>
        <span class="sr-meta">Goal: ${fmt(r.target)}</span>
        <span class="sr-amt" style="color:var(--blue)">${fmt(r.balance)}</span>
      </div>`
    ).join('');
  }

  if (results.length > 60) html += `<div class="sr-hint">${results.length - 60} more — type more to narrow</div>`;
  el.innerHTML = html;
}

function searchNavToExpense(monthKey, wi, ii) {
  closeSearch();
  if (S.archivedMonths && S.archivedMonths[monthKey]) {
    switchTab('archive', document.getElementById('tab-archive'));
    showToast(monthKey + ' is archived — view in Archive tab');
    return;
  }
  CMK = monthKey; S.currentMonthKey = CMK;
  updateMonthLabel();
  switchTab('expenses', document.getElementById('tab-expenses'));
  setTimeout(() => {
    const rows = document.querySelectorAll(`tr[data-wi="${wi}"][data-ii="${ii}"]`);
    rows.forEach(r => {
      r.classList.add('search-highlight');
      r.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setTimeout(() => r.classList.remove('search-highlight'), 2200);
    });
  }, 300);
}

function searchNavToIncome(monthKey, ri) {
  closeSearch();
  if (S.archivedMonths && S.archivedMonths[monthKey]) {
    switchTab('archive', document.getElementById('tab-archive'));
    showToast(monthKey + ' is archived');
    return;
  }
  CMK = monthKey; S.currentMonthKey = CMK;
  updateMonthLabel();
  switchTab('revenue', document.getElementById('tab-revenue'));
}

// Delegation-safe wrappers for search result navigation
function searchNavToExpenseFromEl(el) {
  searchNavToExpense(el.dataset.mkey, parseInt(el.dataset.wi), parseInt(el.dataset.ii));
}
function searchNavToIncomeFromEl(el) {
  searchNavToIncome(el.dataset.mkey, parseInt(el.dataset.ri));
}
function searchGoToTab(tab) {
  switchTab(tab, document.getElementById('tab-' + tab));
  closeSearch();
}

// Close on Escape
document.addEventListener('keydown', function (e) {
  if (e.key === 'Escape' && _searchOpen) closeSearch();
});
