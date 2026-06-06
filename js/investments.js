// === investments.js ===

// ── Account type registry ─────────────────────────────────────────────────────
// Each entry: { value, label, group, defaultReturn }
// "other" triggers a free-text custom label input in the modal.
const INV_TYPES = [
  // Canada
  {value:'tfsa',      label:'TFSA — Tax-Free Savings Account',       group:'Canada',       defaultReturn:5},
  {value:'rrsp',      label:'RRSP — Registered Retirement Savings',  group:'Canada',       defaultReturn:6},
  {value:'resp',      label:'RESP — Education Savings',              group:'Canada',       defaultReturn:5},
  {value:'fhsa',      label:'FHSA — First Home Savings Account',     group:'Canada',       defaultReturn:4},
  {value:'lira',      label:'LIRA — Locked-In Retirement Account',   group:'Canada',       defaultReturn:6},
  {value:'rrif',      label:'RRIF — Retirement Income Fund',         group:'Canada',       defaultReturn:5},
  {value:'gic',       label:'GIC — Guaranteed Investment Cert.',     group:'Canada',       defaultReturn:4},
  {value:'ca-non',    label:'Non-Registered (CA)',                   group:'Canada',       defaultReturn:7},
  // US Retirement
  {value:'401k',      label:'401(k)',                                group:'US Retirement',defaultReturn:7},
  {value:'403b',      label:'403(b)',                                group:'US Retirement',defaultReturn:7},
  {value:'trad-ira',  label:'Traditional IRA',                       group:'US Retirement',defaultReturn:7},
  {value:'roth-ira',  label:'Roth IRA',                              group:'US Retirement',defaultReturn:7},
  {value:'sep-ira',   label:'SEP-IRA',                               group:'US Retirement',defaultReturn:7},
  {value:'hsa',       label:'HSA — Health Savings Account',          group:'US Retirement',defaultReturn:5},
  // US Taxable
  {value:'brokerage', label:'Brokerage (Taxable)',                   group:'US Taxable',   defaultReturn:8},
  {value:'529',       label:'529 Education Savings',                 group:'US Taxable',   defaultReturn:5},
  {value:'pension',   label:'Pension / Defined Benefit',             group:'US Taxable',   defaultReturn:5},
  // UK / Australia
  {value:'isa',       label:'ISA — Individual Savings Account',      group:'UK / AU',      defaultReturn:5},
  {value:'sipp',      label:'SIPP — Self-Invested Personal Pension', group:'UK / AU',      defaultReturn:6},
  {value:'lisa',      label:'Lifetime ISA',                          group:'UK / AU',      defaultReturn:5},
  {value:'super',     label:'Superannuation',                        group:'UK / AU',      defaultReturn:7},
  // Asset classes
  {value:'crypto',    label:'Cryptocurrency',                        group:'Assets',       defaultReturn:0},
  {value:'realestate',label:'Real Estate / REITs',                   group:'Assets',       defaultReturn:6},
  {value:'bonds',     label:'Bonds / Fixed Income',                  group:'Assets',       defaultReturn:3},
  {value:'etf',       label:'ETFs / Index Funds',                    group:'Assets',       defaultReturn:8},
  // Other — triggers free-text input
  {value:'other',     label:'Other (specify below)',                  group:'Other',        defaultReturn:5},
];

// Short display labels for cards and charts
const INV_SHORT = {
  tfsa:'TFSA', rrsp:'RRSP', resp:'RESP', fhsa:'FHSA', lira:'LIRA', rrif:'RRIF',
  gic:'GIC', 'ca-non':'Non-Reg',
  '401k':'401(k)', '403b':'403(b)', 'trad-ira':'Trad. IRA', 'roth-ira':'Roth IRA',
  'sep-ira':'SEP-IRA', hsa:'HSA',
  brokerage:'Brokerage', '529':'529', pension:'Pension',
  isa:'ISA', sipp:'SIPP', lisa:'Lifetime ISA', super:'Super',
  crypto:'Crypto', realestate:'Real Estate', bonds:'Bonds', etf:'ETF',
  other:'Custom',
};

// Colors for each group used in alloc chart
const INV_GROUP_COLORS = {
  'Canada':       ['#2B6CB0','#3182CE','#4299E1','#63B3ED','#90CDF4','#BEE3F8','#EBF8FF','#2C5282'],
  'US Retirement':['#276749','#38A169','#48BB78','#68D391','#9AE6B4'],
  'US Taxable':   ['#744210','#B7791F','#D69E2E','#ECC94B'],
  'UK / AU':      ['#6B46C1','#805AD5','#9F7AEA','#B794F4'],
  'Assets':       ['#C53030','#E53E3E','#FC8181','#FEB2B2'],
  'Other':        ['#718096'],
};

let _invEditIdx = -1;

// ── Helpers ───────────────────────────────────────────────────────────────────
function getInvTypeEntry(value) {
  return INV_TYPES.find(t => t.value === value) || INV_TYPES[INV_TYPES.length - 1];
}
function getInvShortLabel(acc) {
  if (acc.type === 'other') return esc(acc.customLabel || 'Custom');
  return INV_SHORT[acc.type] || esc(acc.type);
}
function getInvFullLabel(acc) {
  if (acc.type === 'other') return esc(acc.customLabel || 'Custom Account');
  return esc(getInvTypeEntry(acc.type).label);
}
function totalInvValue() {
  return (S.investments || []).reduce((s, a) => s + _cvt(a.currentValue, a.currency), 0);
}
function totalInvBasis() {
  return (S.investments || []).reduce((s, a) => s + _cvt(a.costBasis, a.currency), 0);
}

// ── Render: investment cards grid + KPIs + charts ────────────────────────────
function renderInvestments() {
  const accounts = S.investments || [];
  const totalVal = Math.round(totalInvValue() * 100) / 100;
  const totalBasis = Math.round(totalInvBasis() * 100) / 100;
  const gain = Math.round((totalVal - totalBasis) * 100) / 100;
  const gainPct = totalBasis > 0 ? ((gain / totalBasis) * 100).toFixed(1) : '0.0';
  const weightedReturn = accounts.length
    ? accounts.reduce((s, a) => s + _cvt(a.currentValue, a.currency) * (a.annualReturn || 0), 0) / (totalVal || 1)
    : 0;

  // KPI tiles
  const metricsEl = document.getElementById('inv-metrics-row');
  if (metricsEl) {
    const gainColor = gain >= 0 ? 'var(--success)' : 'var(--danger)';
    metricsEl.innerHTML = `
      <div class="mc al-blue"><div class="ml">Portfolio Value</div><div class="mv">${fmt(totalVal)}</div><div class="ms">All accounts</div></div>
      <div class="mc al-sage"><div class="ml">Total Invested</div><div class="mv">${fmt(totalBasis)}</div><div class="ms">Cost basis</div></div>
      <div class="mc" style="border-top:3px solid ${gainColor};"><div class="ml">Unrealised G/L</div><div class="mv" style="color:${gainColor};">${gain >= 0 ? '+' : ''}${fmt(Math.abs(gain))}</div><div class="ms">${gain >= 0 ? '+' : ''}${gainPct}%</div></div>
      <div class="mc al-gold"><div class="ml">Avg Annual Return</div><div class="mv">${weightedReturn.toFixed(1)}%</div><div class="ms">Weighted by value</div></div>`;
  }

  // Account cards
  const grid = document.getElementById('investmentsGrid');
  if (!grid) return;
  if (!accounts.length) {
    grid.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:32px;color:var(--text-muted);font-size:13px;border:2px dashed var(--border);border-radius:var(--radius);">No investment accounts yet.<br><button class="nm-btn" style="margin-top:10px;" data-action="openInvModal" data-arg="-1">+ Add your first account</button></div>`;
    dc('invAllocChart'); dc('invGrowthChart'); return;
  }

  grid.innerHTML = accounts.map((a, i) => {
    const val     = _cvt(a.currentValue, a.currency);
    const basis   = _cvt(a.costBasis,    a.currency);
    const gl = Math.round((val - basis) * 100) / 100;
    const glPct = basis > 0 ? ((gl / basis) * 100).toFixed(1) : '0.0';
    const glColor = gl >= 0 ? 'var(--success)' : 'var(--danger)';
    const typeShort = getInvShortLabel(a);
    const lastUpd = a.lastUpdated ? `<span style="font-size:10px;color:var(--text-muted);">Updated ${esc(a.lastUpdated)}</span>` : '';
    const valDisplay = typeof fmtItemAmount === 'function' ? fmtItemAmount(amt(a.currentValue), a.currency) : fmt(val);
    const basisDisplay = typeof fmtItemAmount === 'function' ? fmtItemAmount(amt(a.costBasis), a.currency) : fmt(basis);
    return `<div class="sav-card">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:6px;">
        <div>
          <div style="font-weight:700;font-size:13px;">${esc(a.name)}</div>
          <div style="margin-top:3px;display:flex;gap:5px;flex-wrap:wrap;">
            <span style="font-size:10px;font-weight:700;padding:1px 7px;border-radius:8px;background:var(--blue-light);color:var(--blue);">${typeShort}</span>
            <span style="font-size:10px;padding:1px 7px;border-radius:8px;background:var(--slate-mid);color:var(--text-secondary);">${a.annualReturn || 0}% p.a.</span>
          </div>
        </div>
        <button class="del-btn" style="opacity:1;" data-action="deleteInvestment" data-arg="${i}" title="Delete account" aria-label="Delete investment account">✕</button>
      </div>
      <div style="display:flex;justify-content:space-between;align-items:baseline;margin:8px 0 2px;">
        <span style="font-family:'Instrument Serif',serif;font-size:20px;font-weight:400;color:var(--blue);">${valDisplay}</span>
        <span style="font-size:12px;font-weight:600;color:${glColor};">${gl >= 0 ? '+' : ''}${glPct}%</span>
      </div>
      <div style="font-size:11px;color:var(--text-muted);margin-bottom:4px;">Invested: ${basisDisplay} &nbsp;·&nbsp; G/L: <span style="color:${glColor};font-weight:600;">${gl >= 0 ? '+' : ''}${fmt(Math.abs(gl))}</span></div>
      ${lastUpd}
      ${a.notes ? `<div style="font-size:11px;color:var(--text-secondary);margin-top:4px;font-style:italic;">${esc(a.notes)}</div>` : ''}
      <div class="sav-actions" style="margin-top:8px;">
        <button class="tbtn" style="font-size:11px;padding:4px 9px;" data-action="openInvModal" data-arg="${i}">Edit</button>
      </div>
    </div>`;
  }).join('');

  renderInvAllocChart(accounts);
  renderInvGrowthChart(accounts);
}

// ── Charts ────────────────────────────────────────────────────────────────────
function renderInvAllocChart(accounts) {
  const canvas = document.getElementById('invAllocChart');
  if (!canvas) return;
  if (!accounts.length) { dc('invAllocChart'); return; }

  const labels = accounts.map(a => esc(a.name) + ' (' + getInvShortLabel(a) + ')');
  const data = accounts.map(a => Math.round(_cvt(a.currentValue, a.currency) * 100) / 100);

  // All accounts have $0 value — show empty-state message instead of blank chart
  if (data.every(v => v === 0)) {
    dc('invAllocChart');
    canvas.style.display = 'none';
    let emptyEl = canvas.parentElement.querySelector('.inv-alloc-empty');
    if (!emptyEl) {
      emptyEl = document.createElement('div');
      emptyEl.className = 'inv-alloc-empty';
      emptyEl.style.cssText = 'text-align:center;padding:24px 0;font-size:12px;color:var(--text-muted);';
      emptyEl.textContent = 'Add market values to your accounts to see allocation.';
      canvas.parentElement.appendChild(emptyEl);
    }
    return;
  }
  // Remove empty state if data is now present
  canvas.style.display = '';
  const existingEmpty = canvas.parentElement.querySelector('.inv-alloc-empty');
  if (existingEmpty) existingEmpty.remove();

  // Generate colors: cycle through group palettes
  const usedGroupCount = {};
  const colors = accounts.map(a => {
    const grp = getInvTypeEntry(a.type).group;
    const palette = INV_GROUP_COLORS[grp] || INV_GROUP_COLORS['Other'];
    const idx = (usedGroupCount[grp] = (usedGroupCount[grp] || 0));
    usedGroupCount[grp]++;
    return palette[idx % palette.length];
  });

  if (CH['invAllocChart']) { dc('invAllocChart'); }
  CH['invAllocChart'] = new Chart(canvas, {
    type: 'doughnut',
    data: { labels, datasets: [{ data, backgroundColor: colors, borderWidth: 2, borderColor: 'var(--bg)' }] },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: {
        legend: { position: 'bottom', labels: { font: { size: 10 }, padding: 8, boxWidth: 12 } },
        tooltip: { callbacks: { label: ctx => ' ' + ctx.label + ': ' + fmt(ctx.raw) } }
      },
      cutout: '60%'
    }
  });
}

function renderInvGrowthChart(accounts) {
  const canvas = document.getElementById('invGrowthChart');
  if (!canvas) return;
  if (!accounts.length) { dc('invGrowthChart'); return; }

  const monthLabels = [];
  const now = new Date();
  for (let i = 0; i <= 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    monthLabels.push(MS[d.getMonth()] + ' ' + d.getFullYear().toString().slice(2));
  }

  const PALETTE = ['#2B6CB0','#276749','#744210','#6B46C1','#C53030','#B7791F','#2C7A7B','#553C9A','#2D3748'];
  const datasets = accounts.map((a, idx) => {
    const r = (a.annualReturn || 0) / 100 / 12;
    const v = _cvt(a.currentValue, a.currency);
    return {
      label: esc(a.name),
      data: Array.from({ length: 13 }, (_, n) => Math.round(v * Math.pow(1 + r, n) * 100) / 100),
      borderColor: PALETTE[idx % PALETTE.length],
      backgroundColor: 'transparent',
      tension: 0.3, pointRadius: 2, borderWidth: 2
    };
  });

  // Total line
  if (accounts.length > 1) {
    const totalData = Array.from({ length: 13 }, (_, n) =>
      Math.round(accounts.reduce((s, a) => {
        const r = (a.annualReturn || 0) / 100 / 12;
        return s + _cvt(a.currentValue, a.currency) * Math.pow(1 + r, n);
      }, 0) * 100) / 100
    );
    datasets.push({
      label: 'Total Portfolio',
      data: totalData,
      borderColor: '#1A202C',
      backgroundColor: 'rgba(26,32,44,0.06)',
      fill: true, tension: 0.3, pointRadius: 0, borderWidth: 2.5, borderDash: [5, 3]
    });
  }

  if (CH['invGrowthChart']) dc('invGrowthChart');
  CH['invGrowthChart'] = new Chart(canvas, {
    type: 'line',
    data: { labels: monthLabels, datasets },
    options: {
      responsive: true, maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: { legend: { position: 'bottom', labels: { font: { size: 10 }, padding: 8, boxWidth: 12 } } },
      scales: {
        x: { grid: { display: false }, ticks: { font: { size: 9 } } },
        y: { ticks: { callback: v => fmtK(v), font: { size: 9 } }, grid: { color: 'rgba(0,0,0,0.03)' } }
      }
    }
  });
}

// ── Modal: open / close / save ────────────────────────────────────────────────
function openInvModal(idx) {
  _invEditIdx = idx;
  const isEdit = idx >= 0;
  const a = isEdit ? (S.investments || [])[idx] : null;

  document.getElementById('invModalTitle').textContent = isEdit ? 'Edit Investment Account' : 'Add Investment Account';

  // Populate type dropdown with optgroups
  const sel = document.getElementById('invType');
  if (sel) {
    const groups = [...new Set(INV_TYPES.map(t => t.group))];
    sel.innerHTML = groups.map(g =>
      `<optgroup label="${esc(g)}">${INV_TYPES.filter(t => t.group === g).map(t =>
        `<option value="${t.value}">${esc(t.label)}</option>`
      ).join('')}</optgroup>`
    ).join('');
    sel.value = isEdit ? (a.type || 'brokerage') : 'brokerage';
  }

  document.getElementById('invName').value = isEdit ? a.name : '';
  document.getElementById('invValue').value = isEdit ? amt(a.currentValue) : '';
  document.getElementById('invBasis').value = isEdit ? amt(a.costBasis) : '';
  document.getElementById('invReturn').value = isEdit ? (a.annualReturn || '') : '';
  document.getElementById('invNotes').value = isEdit ? (a.notes || '') : '';

  const customRow = document.getElementById('invCustomLabelRow');
  const customInput = document.getElementById('invCustomLabel');
  if (customInput) customInput.value = isEdit && a.type === 'other' ? (a.customLabel || '') : '';
  if (customRow) customRow.style.display = (isEdit && a.type === 'other') ? 'block' : 'none';

  document.getElementById('invLastUpdated').value = isEdit ? (a.lastUpdated || '') : new Date().toISOString().slice(0, 10);
  _populateCurrencySelect('invCurrency', isEdit ? (a.currency || getCurrency().code) : getCurrency().code);

  const modal = document.getElementById('invModal');
  modal.classList.add('open');
  trapFocus(modal);
  setTimeout(() => { const f = document.getElementById('invName'); if (f) f.focus(); }, 120);
}

function closeInvModal() {
  const modal = document.getElementById('invModal');
  releaseTrap(modal);
  modal.classList.remove('open');
}

function invTypeChange() {
  const sel = document.getElementById('invType');
  if (!sel) return;
  const customRow = document.getElementById('invCustomLabelRow');
  if (customRow) customRow.style.display = sel.value === 'other' ? 'block' : 'none';
  // Auto-fill default return when user changes type and return field is empty
  const retEl = document.getElementById('invReturn');
  if (retEl && retEl.value === '') {
    const entry = getInvTypeEntry(sel.value);
    if (entry && entry.defaultReturn > 0) retEl.value = entry.defaultReturn;
  }
}

function saveInvModal() {
  const name = document.getElementById('invName').value.trim();
  if (!name) { showToast('Enter an account name', 'warn-t'); document.getElementById('invName').focus(); return; }

  const type = document.getElementById('invType').value;
  const customLabel = type === 'other' ? document.getElementById('invCustomLabel').value.trim() : '';
  const currentValue = Math.round((parseFloat(document.getElementById('invValue').value) || 0) * 100) / 100;
  const costBasis = Math.round((parseFloat(document.getElementById('invBasis').value) || 0) * 100) / 100;
  const annualReturn = Math.min(100, Math.max(0, parseFloat(document.getElementById('invReturn').value) || 0));
  const notes = document.getElementById('invNotes').value.trim();
  const lastUpdated = document.getElementById('invLastUpdated').value || new Date().toISOString().slice(0, 10);

  const existingId = (_invEditIdx >= 0 && (S.investments || [])[_invEditIdx])
    ? S.investments[_invEditIdx]._id : null;

  const currency = (document.getElementById('invCurrency') || {}).value || getCurrency().code;

  const account = {
    _id: existingId || (Date.now().toString(36) + Math.random().toString(36).slice(2, 7)),
    name, type, customLabel, currentValue, costBasis, annualReturn, notes, lastUpdated, currency
  };

  const wasNewInv = _invEditIdx < 0;
  dispatch('INVESTMENTS_UPSERT', { idx: _invEditIdx, account });
  closeInvModal();
  renderInvestments();
  showToast(_invEditIdx >= 0 ? '✓ Account updated' : '✓ Account added');
  if (wasNewInv) {
    if (typeof awardXP === 'function') awardXP('investment_logged');
    if (typeof checkAchievements === 'function') checkAchievements('portfolio_pro', 'consistent_investor', 'wealth_builder');
  }
}

function deleteInvestment(i) {
  const accounts = S.investments || [];
  if (!accounts[i]) return;
  if (!window.confirm('Delete "' + accounts[i].name + '"? This cannot be undone.')) return;
  dispatch('INVESTMENTS_REMOVE', { idx: i });
  renderInvestments();
  showToast('✓ Account deleted');
}

window.resetInvestments = function() {
  if (!(S.investments || []).length) { showToast('No investment accounts to clear.'); return; }
  if (!window.confirm('Delete all investment accounts? This cannot be undone.')) return;
  S.investments = [];
  persist();
  renderInvestments();
  if (typeof renderDash === 'function') renderDash();
  showToast('Investment accounts cleared.');
};

// ── Dashboard mini-summary (called by renderDashSavings) ─────────────────────
function renderDashInvestments() {
  const el = document.getElementById('dashInvestmentsList');
  if (!el) return;
  const accounts = S.investments || [];
  if (!accounts.length) {
    el.innerHTML = '<div style="font-size:12px;color:var(--text-muted);padding:4px 0;">No investment accounts yet.</div>';
    return;
  }
  const total = totalInvValue();
  const gain = total - totalInvBasis();
  const gainColor = gain >= 0 ? 'var(--success)' : 'var(--danger)';
  el.innerHTML = `<div style="display:flex;justify-content:space-between;align-items:center;padding:6px 0;">
    <span style="font-size:12px;font-weight:600;">${accounts.length} account${accounts.length > 1 ? 's' : ''}</span>
    <span style="font-size:13px;font-weight:700;color:var(--blue);">${fmt(total)}</span>
  </div>
  <div style="font-size:11px;color:${gainColor};">Unrealised G/L: ${gain >= 0 ? '+' : ''}${fmt(Math.abs(gain))}</div>`;
}
