// === archive.js — IIFE namespace (Stage 1 ES Module migration)
// Public API exposed via window.*; _restoreTarget is file-private.

(function() {

  var _restoreTarget = '';

  // Parse a month key like "May 2026" → Date object (1st of that month)
  function monthKeyToDate(k) {
    var p = k.split(' ');
    return new Date(parseInt(p[1]), MS.indexOf(p[0]), 1);
  }

  // Returns true if a month key is old enough to auto-archive
  function shouldAutoArchive(k) {
    if (!S.archiveThreshold || S.archiveThreshold === 0) return false;
    var d = monthKeyToDate(k);
    var cutoff = new Date();
    cutoff.setMonth(cutoff.getMonth() - S.archiveThreshold);
    cutoff.setDate(1);
    cutoff.setHours(0,0,0,0);
    return d < cutoff;
  }

  // Run at app boot — moves qualifying months into archivedMonths
  function runAutoArchive() {
    if (!S.archivedMonths) S.archivedMonths = {};
    var activeKeys = Object.keys(S.months);
    var moved = 0;
    activeKeys.forEach(function(k) {
      if (shouldAutoArchive(k)) {
        S.archivedMonths[k] = S.months[k];
        delete S.months[k];
        moved++;
      }
    });
    // If CMK was archived, point to the most recent active month
    if (!S.months[CMK]) {
      var remaining = Object.keys(S.months);
      CMK = remaining.length ? remaining[remaining.length - 1] : '';
      S.currentMonthKey = CMK;
    }
    if (moved > 0) persist(false);
    updateArchiveBadge();
  }

  function updateArchiveBadge() {
    var count = Object.keys(S.archivedMonths || {}).length;
    var el = document.getElementById('archiveBadge');
    if (el) el.textContent = count;
  }

  function updateArchiveThreshold(val) {
    dispatch('SET_ARCHIVE_THRESHOLD', {val: parseInt(val)}, false);
    runAutoArchive();
    renderArchive();
    updateMonthLabel();
  }

  // ── Manual archive of a specific month ──
  function archiveMonth(k) {
    if (!S.months[k]) return;
    dispatch('MONTH_ARCHIVE', {k: k}, false);
    if (CMK === k) {
      var remaining = Object.keys(S.months);
      CMK = remaining.length ? remaining[remaining.length - 1] : '';
      S.currentMonthKey = CMK;
    }
    persist(false);
    updateArchiveBadge();
    renderMonthTags();
    renderExpenses();
    updateMonthLabel();
    showToast('✓ ' + k + ' archived');
  }

  // ── Restore ──
  function openRestoreModal(k) {
    _restoreTarget = k;
    document.getElementById('restoreModalDesc').textContent =
      '"' + k + '" will return to the active months list and become fully editable again.';
    var _rmBtn = document.querySelector('#restoreModal .btn-p');
    if (_rmBtn) _rmBtn.textContent = 'Restore';
    document.getElementById('restoreModal').classList.add('open');
    trapFocus(document.getElementById('restoreModal'));
    setTimeout(function(){ var _f = document.querySelector('#restoreModal button'); if (_f) _f.focus(); }, 120);
  }

  function closeRestoreModal() {
    releaseTrap(document.getElementById('restoreModal'));
    document.getElementById('restoreModal').classList.remove('open');
    _restoreTarget = '';
  }

  function executeRestore() {
    var k = _restoreTarget;
    if (!k) return;
    if (k.startsWith('__archive__')) {
      var key = k.replace('__archive__', '');
      closeRestoreModal();
      archiveMonth(key);
      var _mb = document.getElementById('monthCompleteBanner');
      if (_mb) _mb.remove();
      if (typeof _lastMonthComplete !== 'undefined') _lastMonthComplete = '';
      return;
    }
    if (!S.archivedMonths[k]) return;
    dispatch('MONTH_RESTORE', {k: k}, false);
    CMK = k;
    S.currentMonthKey = k;
    persist(false);
    updateArchiveBadge();
    closeRestoreModal();
    updateMonthLabel();
    renderMonthTags();
    renderExpenses();
    updateHealth();
    showToast('✓ ' + k + ' restored');
  }

  // ── Render the Archive tab ──
  function renderArchive() {
    updateArchiveBadge();
    var archived = S.archivedMonths || {};
    var keys = Object.keys(archived).sort(function(a,b){ return monthKeyToDate(b)-monthKeyToDate(a); });
    var list = document.getElementById('archiveList');

    var sel = document.getElementById('archiveThreshold');
    if (sel) sel.value = S.archiveThreshold || 6;

    var banner = document.getElementById('archiveBanner');
    var restoreBtn = document.getElementById('archiveBannerRestoreBtn');
    if (banner) {
      if (keys.length) {
        document.getElementById('archiveBannerMsg').textContent =
          keys.length + ' archived month' + (keys.length > 1 ? 's' : '') + ' — read-only. Restore to edit.';
        restoreBtn.style.display = 'none';
        banner.style.display = 'flex';
      } else {
        banner.style.display = 'none';
      }
    }

    if (!keys.length) {
      list.innerHTML = '<div class="archive-empty">' +
        '<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="color:var(--text-muted);"><path d="M20 7H4a2 2 0 00-2 2v10a2 2 0 002 2h16a2 2 0 002-2V9a2 2 0 00-2-2z"/><path d="M16 3H8L4 7h16l-4-4z"/></svg>' +
        'No archived months yet.<br>' +
        '<span style="font-size:12px;margin-top:6px;display:block;">Months older than ' + (S.archiveThreshold || 6) + ' months will be automatically archived.</span>' +
        '</div>';
      return;
    }

    var byYear = {};
    keys.forEach(function(k) {
      var yr = k.split(' ')[1];
      if (!byYear[yr]) byYear[yr] = [];
      byYear[yr].push(k);
    });

    list.innerHTML = Object.entries(byYear)
      .sort(function(a,b){ return parseInt(b[0])-parseInt(a[0]); })
      .map(function(entry) {
        var yr = entry[0], monthKeys = entry[1];
        var monthBlocks = monthKeys.map(function(k) {
          var m = archived[k];
          var totalExp = m.weeks.reduce(function(s,w){ return s+w.items.reduce(function(a,i){ return a+i.amount; },0); },0);
          var paidExp = m.weeks.reduce(function(s,w){ return s+w.items.filter(function(i){ return i.paid; }).reduce(function(a,i){ return a+i.amount; },0); },0);
          var totalRev = m.revenue.reduce(function(s,r){ return s+r.amount; },0);
          var net = totalRev - totalExp;
          var allItems = m.weeks.reduce(function(s,w){ return s.concat(w.items); },[]);

          var expRows = allItems.slice(0,6).map(function(item) {
            return '<div class="archive-item-row">' +
              '<span>' + esc(item.name) + '</span>' +
              '<div style="display:flex;align-items:center;gap:8px;">' +
              '<span style="font-family:\'Instrument Serif\',serif;font-size:12px;">' + fmt(amt(item.amount)) + '</span>' +
              '<span class="archive-paid-badge ' + (item.paid?'archive-paid':'archive-pending') + '">' + (item.paid?'Paid':'Pending') + '</span>' +
              '</div></div>';
          }).join('');
          var moreExp = allItems.length > 6
            ? '<div style="font-size:11px;color:var(--text-muted);padding:5px 0;">+' + (allItems.length-6) + ' more items</div>'
            : '';

          var revRows = m.revenue.map(function(r) {
            return '<div class="archive-item-row">' +
              '<span>' + esc(r.name) + '</span>' +
              '<div style="display:flex;align-items:center;gap:8px;">' +
              '<span style="font-family:\'Instrument Serif\',serif;font-size:12px;">' + fmt(r.amount) + '</span>' +
              '<span class="archive-paid-badge ' + (r.received?'archive-paid':'archive-pending') + '">' + (r.received?'Received':'Pending') + '</span>' +
              '</div></div>';
          }).join('');

          var groupId = k.replace(' ', '-');
          return '<div class="archive-month-group">' +
            '<div class="archive-month-group-hdr" data-action="toggleArchiveGroup" data-arg="' + groupId + '" data-arg-self id="hdr-' + groupId + '">' +
            '<div class="amg-title">' +
            '<span>&#128197;</span> ' + k +
            '<span style="font-size:11px;font-weight:400;color:var(--text-muted);">Exp: ' + fmt(totalExp) + ' &nbsp;\xb7&nbsp; Rev: ' + fmt(totalRev) + ' &nbsp;\xb7&nbsp; Net: <span style="color:' + (net>=0?'var(--success)':'var(--danger)') + ';">' + (net<0?'-':'') + fmt(Math.abs(net)) + '</span></span>' +
            '</div>' +
            '<div style="display:flex;align-items:center;gap:8px;">' +
            '<button class="restore-btn" data-action="openRestoreModal" data-arg="' + k + '" data-stop-prop>&#128260; Restore</button>' +
            '<span class="amg-chevron">&#9654;</span>' +
            '</div></div>' +
            '<div class="archive-month-body" id="body-' + groupId + '">' +
            '<div class="archive-section-block">' +
            '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">' +
            '<div class="archive-section-title">Expenses</div>' +
            '<span style="font-size:11px;color:var(--text-muted);">' + allItems.length + ' items \xb7 Paid ' + fmt(paidExp) + ' \xb7 Pending ' + fmt(totalExp-paidExp) + '</span>' +
            '</div>' + expRows + moreExp + '</div>' +
            '<div class="archive-section-block">' +
            '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">' +
            '<div class="archive-section-title">Revenue</div>' +
            '<span style="font-size:11px;color:var(--text-muted);">Total ' + fmt(totalRev) + '</span>' +
            '</div>' + (revRows || '<div style="font-size:12px;color:var(--text-muted);">No revenue recorded</div>') +
            '</div></div></div>';
        }).join('');
        return '<div style="margin-bottom:6px;">' +
          '<div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.8px;color:var(--text-muted);padding:6px 2px;margin-bottom:4px;">' + yr + '</div>' +
          monthBlocks + '</div>';
      }).join('');
  }

  function toggleArchiveGroup(id, hdr) {
    var body = document.getElementById('body-' + id);
    var isOpen = body.classList.toggle('open');
    hdr.classList.toggle('open', isOpen);
  }

  function confirmArchiveMonth(k) {
    if (Object.keys(S.months).length <= 1) {
      showToast('Cannot archive — keep at least one active month', 'warn-t');
      return;
    }
    _restoreTarget = '__archive__' + k;
    document.getElementById('restoreModalDesc').textContent =
      'Archive "' + k + '"? It will become read-only and move to the Archive tab. You can restore it any time.';
    var _amBtn = document.querySelector('#restoreModal .btn-p');
    if (_amBtn) _amBtn.textContent = 'Archive';
    document.getElementById('restoreModal').classList.add('open');
    trapFocus(document.getElementById('restoreModal'));
    setTimeout(function(){ var _f = document.querySelector('#restoreModal button'); if (_f) _f.focus(); }, 120);
  }

  // ── Public API ──
  window.runAutoArchive       = runAutoArchive;
  window.updateArchiveBadge   = updateArchiveBadge;
  window.updateArchiveThreshold = updateArchiveThreshold;
  window.archiveMonth         = archiveMonth;
  window.openRestoreModal     = openRestoreModal;
  window.closeRestoreModal    = closeRestoreModal;
  window.executeRestore       = executeRestore;
  window.renderArchive        = renderArchive;
  window.toggleArchiveGroup   = toggleArchiveGroup;
  window.confirmArchiveMonth  = confirmArchiveMonth;

})();
