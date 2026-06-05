// === demo-profiles.js ===
// Demo customer profiles for showcasing FincWin features.
// Loaded via Settings → Demo Profiles section.

// ── Helpers ──────────────────────────────────────────────────────────────────

function _demoKey(monthsAgo) {
  var d = new Date();
  var t = new Date(d.getFullYear(), d.getMonth() - monthsAgo, 1);
  return MS[t.getMonth()] + ' ' + t.getFullYear();
}

// Generate payment history: last `months` months all paid, current month pending.
function _demoPmts(months) {
  var pmts = [];
  for (var i = months; i >= 0; i--) {
    pmts.push({ month: _demoKey(i), paid: i > 0 });
  }
  return pmts;
}

// ── Profile data ──────────────────────────────────────────────────────────────

var DEMO_PROFILES = {

  // ─── Sarah Chen — Young Professional ─────────────────────────────────────
  sarah: {
    meta: {
      name: 'Sarah Chen',
      userName: 'Sarah',
      tagline: 'Young Professional · NYC',
      description: 'Tech worker on a $65k salary navigating student loans, a car payment, and building her emergency fund in an expensive city.',
      details: 'Income: ~$4,200/mo · Expenses: ~$3,600/mo · 2 loans · 2 savings goals'
    },
    currency: { symbol: '$', code: 'USD', locale: 'en-US' },
    strategy: 'avalanche',
    budgets: { Banking: 100, Telecom: 120, Auto: 500, Utilities: 180, Health: 250, 'Loan Pmt': 600, Savings: 350, Other: 400 },
    loans: [
      { name: 'Student Loan', amount: 18500, originalAmount: 22000, rate: 6.8, minPayment: 210 },
      { name: 'Car Loan', amount: 12400, originalAmount: 16000, rate: 5.2, minPayment: 285 }
    ],
    savings: [
      { name: 'Emergency Fund', target: 8000, balance: 3200, contribution: 250, rate: 2.5 },
      { name: 'Vacation Fund', target: 2500, balance: 640, contribution: 100, rate: 1.5 }
    ],
    investments: [],
    scheduledExpenses: [],
    xp: 420, xpLevel: 3,
    achievements: [
      { id: 'first-login', name: 'First Steps', earned: true, earnedAt: Date.now() - 86400000 * 45 },
      { id: 'budget-set', name: 'Budget Builder', earned: true, earnedAt: Date.now() - 86400000 * 30 }
    ],
    monthsData: [
      // 2 months ago
      {
        weeks: [
          { items: [{ name: 'Rent', amount: 1850, paid: true, dueDay: 1 }, { name: 'Student Loan', amount: 210, paid: true, dueDay: 5 }] },
          { items: [{ name: 'T-Mobile', amount: 65, paid: true, dueDay: 12 }, { name: 'Netflix', amount: 17, paid: true, dueDay: 13 }, { name: 'Spotify', amount: 10, paid: true, dueDay: 14 }] },
          { items: [{ name: 'Electric Bill', amount: 78, paid: true, dueDay: 20 }, { name: 'Car Insurance', amount: 142, paid: true, dueDay: 22 }, { name: 'Groceries', amount: 220, paid: true, dueDay: null }] },
          { items: [{ name: 'Gym', amount: 45, paid: true, dueDay: 28 }, { name: 'Health Insurance', amount: 180, paid: true, dueDay: 30 }, { name: 'Amazon Prime', amount: 15, paid: true, dueDay: 27 }] }
        ],
        revenue: [{ name: 'Salary — Direct Deposit', amount: 4200, received: true }, { name: 'Freelance Design', amount: 350, received: true }]
      },
      // 1 month ago
      {
        weeks: [
          { items: [{ name: 'Rent', amount: 1850, paid: true, dueDay: 1 }, { name: 'Student Loan', amount: 210, paid: true, dueDay: 5 }, { name: 'Car Loan', amount: 285, paid: true, dueDay: 5 }] },
          { items: [{ name: 'T-Mobile', amount: 65, paid: true, dueDay: 12 }, { name: 'Netflix', amount: 17, paid: true, dueDay: 13 }, { name: 'Spotify', amount: 10, paid: true, dueDay: 14 }] },
          { items: [{ name: 'Electric Bill', amount: 92, paid: true, dueDay: 20 }, { name: 'Car Insurance', amount: 142, paid: true, dueDay: 22 }, { name: 'Groceries', amount: 268, paid: true, dueDay: null }] },
          { items: [{ name: 'Gym', amount: 45, paid: true, dueDay: 28 }, { name: 'Health Insurance', amount: 180, paid: true, dueDay: 30 }, { name: 'Pharmacy', amount: 38, paid: true, dueDay: null }] }
        ],
        revenue: [{ name: 'Salary — Direct Deposit', amount: 4200, received: true }, { name: 'Freelance Design', amount: 500, received: true }]
      },
      // current month — mix of paid and pending
      {
        weeks: [
          { items: [{ name: 'Rent', amount: 1850, paid: true, dueDay: 1 }, { name: 'Student Loan', amount: 210, paid: true, dueDay: 5 }, { name: 'Car Loan', amount: 285, paid: true, dueDay: 5 }] },
          { items: [{ name: 'T-Mobile', amount: 65, paid: true, dueDay: 12 }, { name: 'Netflix', amount: 17, paid: true, dueDay: 13 }, { name: 'Spotify', amount: 10, paid: true, dueDay: 14 }] },
          { items: [{ name: 'Electric Bill', amount: 88, paid: false, dueDay: 20 }, { name: 'Car Insurance', amount: 142, paid: true, dueDay: 22 }, { name: 'Groceries', amount: 245, paid: true, dueDay: null }] },
          { items: [{ name: 'Gym', amount: 45, paid: false, dueDay: 28 }, { name: 'Health Insurance', amount: 180, paid: false, dueDay: 30 }, { name: 'Amazon Prime', amount: 15, paid: false, dueDay: 28 }] }
        ],
        revenue: [{ name: 'Salary — Direct Deposit', amount: 4200, received: true }, { name: 'Freelance Design', amount: 450, received: false, note: 'Invoice pending approval' }]
      }
    ]
  },

  // ─── Rodriguez Family — Suburban Dual Income ─────────────────────────────
  rodriguez: {
    meta: {
      name: 'Rodriguez Family',
      userName: 'Miguel',
      tagline: 'Dual Income · Suburban Family',
      description: 'Miguel and Ana manage two car payments, kids\' activities, and college savings on a combined $130k income with a full family lifestyle.',
      details: 'Income: ~$9,500/mo · Expenses: ~$7,800/mo · 2 car loans · 2 savings goals'
    },
    currency: { symbol: '$', code: 'USD', locale: 'en-US' },
    strategy: 'snowball',
    budgets: { Banking: 150, Telecom: 250, Auto: 1200, Utilities: 400, Health: 700, 'Loan Pmt': 1000, Savings: 700, Other: 1000 },
    loans: [
      { name: 'Car Loan — Honda Pilot', amount: 24800, originalAmount: 32000, rate: 6.4, minPayment: 495 },
      { name: 'Car Loan — Toyota Camry', amount: 18200, originalAmount: 24000, rate: 4.9, minPayment: 395 }
    ],
    savings: [
      { name: 'College Fund', target: 25000, balance: 8400, contribution: 400, rate: 4.2 },
      { name: 'Home Renovation', target: 15000, balance: 3200, contribution: 300, rate: 2.1 }
    ],
    investments: [
      { name: 'Vanguard Target 2040', type: 'etf', amount: 42000, symbol: 'VFORX', notes: 'Retirement — 401k rollover' }
    ],
    scheduledExpenses: [],
    xp: 820, xpLevel: 5,
    achievements: [
      { id: 'first-login', name: 'First Steps', earned: true, earnedAt: Date.now() - 86400000 * 90 },
      { id: 'budget-set', name: 'Budget Builder', earned: true, earnedAt: Date.now() - 86400000 * 75 },
      { id: 'loan-tracked', name: 'Debt Tracker', earned: true, earnedAt: Date.now() - 86400000 * 60 }
    ],
    monthsData: [
      // 2 months ago
      {
        weeks: [
          { items: [{ name: 'Mortgage Payment', amount: 2450, paid: true, dueDay: 1 }, { name: 'Car Loan — Honda Pilot', amount: 495, paid: true, dueDay: 3 }] },
          { items: [{ name: 'Verizon', amount: 180, paid: true, dueDay: 10 }, { name: 'Netflix', amount: 22, paid: true, dueDay: 11 }, { name: 'Disney+', amount: 14, paid: true, dueDay: 12 }, { name: 'Amazon Prime', amount: 15, paid: true, dueDay: 12 }] },
          { items: [{ name: 'Electric Bill', amount: 245, paid: true, dueDay: 20 }, { name: 'Natural Gas', amount: 95, paid: true, dueDay: 21 }, { name: 'Car Insurance', amount: 380, paid: true, dueDay: 18 }] },
          { items: [{ name: 'Health Insurance', amount: 520, paid: true, dueDay: 28 }, { name: 'Grocery', amount: 890, paid: true, dueDay: null }, { name: 'Dental', amount: 250, paid: true, dueDay: null }] }
        ],
        revenue: [{ name: 'Miguel — Salary', amount: 5500, received: true }, { name: 'Ana — Salary', amount: 3200, received: true }, { name: 'Rental Income', amount: 800, received: true }]
      },
      // 1 month ago
      {
        weeks: [
          { items: [{ name: 'Mortgage Payment', amount: 2450, paid: true, dueDay: 1 }, { name: 'Car Loan — Honda Pilot', amount: 495, paid: true, dueDay: 3 }, { name: 'Car Loan — Toyota Camry', amount: 395, paid: true, dueDay: 5 }] },
          { items: [{ name: 'Verizon', amount: 180, paid: true, dueDay: 10 }, { name: 'YouTube Premium', amount: 14, paid: true, dueDay: 11 }, { name: 'Disney+', amount: 14, paid: true, dueDay: 12 }] },
          { items: [{ name: 'Electric Bill', amount: 210, paid: true, dueDay: 20 }, { name: 'Natural Gas', amount: 88, paid: true, dueDay: 21 }, { name: 'Water Bill', amount: 65, paid: true, dueDay: 22 }, { name: 'Car Insurance', amount: 380, paid: true, dueDay: 18 }] },
          { items: [{ name: 'Health Insurance', amount: 520, paid: true, dueDay: 28 }, { name: 'Grocery', amount: 945, paid: true, dueDay: null }, { name: 'Doctor', amount: 45, paid: true, dueDay: null }] }
        ],
        revenue: [{ name: 'Miguel — Salary', amount: 5500, received: true }, { name: 'Ana — Salary', amount: 3200, received: true }, { name: 'Rental Income', amount: 800, received: true }]
      },
      // current month
      {
        weeks: [
          { items: [{ name: 'Mortgage Payment', amount: 2450, paid: true, dueDay: 1 }, { name: 'Car Loan — Honda Pilot', amount: 495, paid: true, dueDay: 3 }] },
          { items: [{ name: 'Verizon', amount: 180, paid: true, dueDay: 10 }, { name: 'Disney+', amount: 14, paid: true, dueDay: 11 }, { name: 'Amazon Prime', amount: 15, paid: true, dueDay: 12 }] },
          { items: [{ name: 'Electric Bill', amount: 198, paid: false, dueDay: 20 }, { name: 'Natural Gas', amount: 72, paid: false, dueDay: 22 }, { name: 'Car Insurance', amount: 380, paid: true, dueDay: 18 }] },
          { items: [{ name: 'Health Insurance', amount: 520, paid: false, dueDay: 28 }, { name: 'Grocery', amount: 880, paid: true, dueDay: null }] }
        ],
        revenue: [{ name: 'Miguel — Salary', amount: 5500, received: true }, { name: 'Ana — Salary', amount: 3200, received: true }, { name: 'Rental Income', amount: 800, received: true }]
      }
    ]
  },

  // ─── Marcus Thompson — Freelancer ─────────────────────────────────────────
  marcus: {
    meta: {
      name: 'Marcus Thompson',
      userName: 'Marcus',
      tagline: 'Freelancer · Variable Income',
      description: 'Independent brand designer with unpredictable revenue. High-interest credit card debt is the priority — tax reserve and business fund keep him covered between projects.',
      details: 'Income: $3k–$9k/mo · Expenses: ~$5,400/mo · 2 loans · 2 savings goals'
    },
    currency: { symbol: '$', code: 'USD', locale: 'en-US' },
    strategy: 'avalanche',
    budgets: { Banking: 80, Telecom: 200, Auto: 450, Utilities: 200, Health: 350, 'Loan Pmt': 400, Savings: 800, Other: 600 },
    loans: [
      { name: 'Credit Card Debt', amount: 8200, originalAmount: 9500, rate: 22.99, minPayment: 165 },
      { name: 'Equipment Loan', amount: 4500, originalAmount: 6000, rate: 8.5, minPayment: 145 }
    ],
    savings: [
      { name: 'Tax Reserve — Q2', target: 6000, balance: 4200, contribution: 600, rate: 4.5 },
      { name: 'Business Emergency Fund', target: 10000, balance: 1800, contribution: 200, rate: 3.0 }
    ],
    investments: [
      { name: 'Bitcoin', type: 'crypto', amount: 5800, symbol: 'BTC', notes: 'Long-term hold' }
    ],
    scheduledExpenses: [],
    xp: 610, xpLevel: 4,
    achievements: [
      { id: 'first-login', name: 'First Steps', earned: true, earnedAt: Date.now() - 86400000 * 60 },
      { id: 'loan-tracked', name: 'Debt Tracker', earned: true, earnedAt: Date.now() - 86400000 * 45 }
    ],
    monthsData: [
      // 2 months ago — strong month
      {
        weeks: [
          { items: [{ name: 'Personal Loan', amount: 145, paid: true, dueDay: 1 }, { name: 'Credit Card Payment', amount: 165, paid: true, dueDay: 5 }] },
          { items: [{ name: 'AT&T', amount: 90, paid: true, dueDay: 10 }, { name: 'Hosting', amount: 45, paid: true, dueDay: 12 }, { name: 'Spotify', amount: 10, paid: true, dueDay: 14 }] },
          { items: [{ name: 'Electric Bill', amount: 115, paid: true, dueDay: 20 }, { name: 'Car Insurance', amount: 195, paid: true, dueDay: 22 }, { name: 'Gas Station', amount: 180, paid: true, dueDay: null }] },
          { items: [{ name: 'Health Insurance', amount: 285, paid: true, dueDay: 28 }, { name: 'Gym', amount: 55, paid: true, dueDay: 29 }, { name: 'Grocery', amount: 385, paid: true, dueDay: null }] }
        ],
        revenue: [{ name: 'Branding Project — Nexus Co.', amount: 4500, received: true }, { name: 'Web Design — Carter Law', amount: 2800, received: true }, { name: 'Retainer — Studio Blue', amount: 1200, received: true }]
      },
      // 1 month ago — slow month
      {
        weeks: [
          { items: [{ name: 'Personal Loan', amount: 145, paid: true, dueDay: 1 }, { name: 'Credit Card Payment', amount: 165, paid: true, dueDay: 5 }] },
          { items: [{ name: 'AT&T', amount: 90, paid: true, dueDay: 10 }, { name: 'Adobe CC', amount: 55, paid: true, dueDay: 11 }, { name: 'Hosting', amount: 45, paid: true, dueDay: 12 }] },
          { items: [{ name: 'Electric Bill', amount: 98, paid: true, dueDay: 20 }, { name: 'Car Insurance', amount: 195, paid: true, dueDay: 22 }, { name: 'Gas Station', amount: 145, paid: true, dueDay: null }] },
          { items: [{ name: 'Health Insurance', amount: 285, paid: true, dueDay: 28 }, { name: 'Gym', amount: 55, paid: true, dueDay: 29 }, { name: 'Grocery', amount: 310, paid: true, dueDay: null }, { name: 'Pharmacy', amount: 42, paid: true, dueDay: null }] }
        ],
        revenue: [{ name: 'Logo Design — Fresh Roots', amount: 1800, received: true }, { name: 'Retainer — Studio Blue', amount: 1200, received: true }, { name: 'Brand Consultation', amount: 450, received: true }]
      },
      // current month
      {
        weeks: [
          { items: [{ name: 'Personal Loan', amount: 145, paid: true, dueDay: 1 }, { name: 'Credit Card Payment', amount: 165, paid: true, dueDay: 5 }] },
          { items: [{ name: 'AT&T', amount: 90, paid: true, dueDay: 10 }, { name: 'Adobe CC', amount: 55, paid: true, dueDay: 11 }, { name: 'Hosting', amount: 45, paid: true, dueDay: 12 }] },
          { items: [{ name: 'Electric Bill', amount: 102, paid: false, dueDay: 20 }, { name: 'Car Insurance', amount: 195, paid: false, dueDay: 22 }, { name: 'Gas Station', amount: 160, paid: true, dueDay: null }] },
          { items: [{ name: 'Health Insurance', amount: 285, paid: false, dueDay: 28 }, { name: 'Gym', amount: 55, paid: false, dueDay: 29 }] }
        ],
        revenue: [{ name: 'Brand Refresh — Meridian', amount: 3500, received: true }, { name: 'Retainer — Studio Blue', amount: 1200, received: true }, { name: 'UI Kit Project', amount: 2200, received: false, note: 'Awaiting client approval' }]
      }
    ]
  },

  // ─── Eleanor & David — Pre-Retirees ──────────────────────────────────────
  eleanor: {
    meta: {
      name: 'Eleanor & David',
      userName: 'Eleanor',
      tagline: 'Pre-Retirees · Nearly Debt-Free',
      description: 'Five years from retirement with a nearly paid-off mortgage, a substantial investment portfolio, and maxed savings contributions.',
      details: 'Income: ~$10,500/mo · Expenses: ~$5,600/mo · 1 loan remaining · Strong net worth'
    },
    currency: { symbol: '$', code: 'USD', locale: 'en-US' },
    strategy: 'avalanche',
    budgets: { Banking: 100, Telecom: 150, Auto: 400, Utilities: 350, Health: 900, 'Loan Pmt': 900, Savings: 2000, Other: 800 },
    loans: [
      { name: 'Mortgage — Final Years', amount: 42000, originalAmount: 280000, rate: 3.25, minPayment: 850 }
    ],
    savings: [
      { name: 'Retirement Supplement', target: 50000, balance: 45000, contribution: 1500, rate: 5.2 },
      { name: 'Travel Fund', target: 12000, balance: 8500, contribution: 400, rate: 3.8 }
    ],
    investments: [
      { name: 'S&P 500 ETF', type: 'stock', amount: 85000, symbol: 'SPY', shares: 280, purchasePrice: 320, currentPrice: 445, notes: 'Core holding — DCA monthly' },
      { name: 'Tech Growth ETF', type: 'etf', amount: 42000, symbol: 'QQQ', shares: 95, purchasePrice: 380, currentPrice: 485, notes: '' },
      { name: 'Bond Fund', type: 'etf', amount: 28000, symbol: 'BND', notes: 'Capital preservation allocation' }
    ],
    scheduledExpenses: [],
    xp: 1840, xpLevel: 9,
    achievements: [
      { id: 'first-login', name: 'First Steps', earned: true, earnedAt: Date.now() - 86400000 * 180 },
      { id: 'budget-set', name: 'Budget Builder', earned: true, earnedAt: Date.now() - 86400000 * 165 },
      { id: 'loan-tracked', name: 'Debt Tracker', earned: true, earnedAt: Date.now() - 86400000 * 150 },
      { id: 'savings-goal', name: 'Saver', earned: true, earnedAt: Date.now() - 86400000 * 120 }
    ],
    monthsData: [
      // 2 months ago
      {
        weeks: [
          { items: [{ name: 'Mortgage Payment', amount: 850, paid: true, dueDay: 1 }, { name: 'Bank Charges', amount: 12, paid: true, dueDay: 3 }] },
          { items: [{ name: 'Verizon', amount: 95, paid: true, dueDay: 10 }, { name: 'Netflix', amount: 22, paid: true, dueDay: 11 }, { name: 'Spotify', amount: 10, paid: true, dueDay: 12 }] },
          { items: [{ name: 'Electric Bill', amount: 145, paid: true, dueDay: 20 }, { name: 'Natural Gas', amount: 68, paid: true, dueDay: 21 }, { name: 'Water Bill', amount: 42, paid: true, dueDay: 22 }, { name: 'Car Insurance', amount: 245, paid: true, dueDay: 18 }] },
          { items: [{ name: 'Health Insurance', amount: 680, paid: true, dueDay: 28 }, { name: 'Grocery', amount: 620, paid: true, dueDay: null }, { name: 'Gym', amount: 85, paid: true, dueDay: 29 }] }
        ],
        revenue: [{ name: 'David — Salary', amount: 6500, received: true }, { name: 'Eleanor — Consulting', amount: 3800, received: true }, { name: 'Dividend Income', amount: 245, received: true, note: 'Quarterly payout' }]
      },
      // 1 month ago
      {
        weeks: [
          { items: [{ name: 'Mortgage Payment', amount: 850, paid: true, dueDay: 1 }, { name: 'Loan Payment', amount: 450, paid: true, dueDay: 3 }] },
          { items: [{ name: 'Verizon', amount: 95, paid: true, dueDay: 10 }, { name: 'Amazon Prime', amount: 15, paid: true, dueDay: 11 }, { name: 'Disney+', amount: 14, paid: true, dueDay: 12 }] },
          { items: [{ name: 'Electric Bill', amount: 162, paid: true, dueDay: 20 }, { name: 'Natural Gas', amount: 55, paid: true, dueDay: 21 }, { name: 'Car Insurance', amount: 245, paid: true, dueDay: 18 }] },
          { items: [{ name: 'Health Insurance', amount: 680, paid: true, dueDay: 28 }, { name: 'Doctor', amount: 120, paid: true, dueDay: null }, { name: 'Grocery', amount: 580, paid: true, dueDay: null }] }
        ],
        revenue: [{ name: 'David — Salary', amount: 6500, received: true }, { name: 'Eleanor — Consulting', amount: 3800, received: true }, { name: 'Dividend Income', amount: 210, received: true }]
      },
      // current month
      {
        weeks: [
          { items: [{ name: 'Mortgage Payment', amount: 850, paid: true, dueDay: 1 }, { name: 'Service Charge', amount: 12, paid: true, dueDay: 3 }] },
          { items: [{ name: 'Verizon', amount: 95, paid: true, dueDay: 10 }, { name: 'Amazon Prime', amount: 15, paid: true, dueDay: 11 }, { name: 'Netflix', amount: 22, paid: true, dueDay: 12 }] },
          { items: [{ name: 'Electric Bill', amount: 138, paid: false, dueDay: 20 }, { name: 'Natural Gas', amount: 48, paid: false, dueDay: 22 }, { name: 'Car Insurance', amount: 245, paid: true, dueDay: 18 }] },
          { items: [{ name: 'Health Insurance', amount: 680, paid: false, dueDay: 28 }, { name: 'Grocery', amount: 595, paid: true, dueDay: null }] }
        ],
        revenue: [{ name: 'David — Salary', amount: 6500, received: true }, { name: 'Eleanor — Consulting', amount: 3800, received: true }, { name: 'Dividend Income', amount: 220, received: false, note: 'Processing — 3–5 business days' }]
      }
    ]
  }
};

// ── UI helpers ────────────────────────────────────────────────────────────────

function previewDemoProfile(id) {
  var card = document.getElementById('demoProfileCard');
  var content = document.getElementById('demoProfileCardContent');
  if (!id) { if (card) card.style.display = 'none'; return; }
  var p = DEMO_PROFILES[id];
  if (!p || !card || !content) { if (card) card.style.display = 'none'; return; }
  content.innerHTML =
    '<div style="font-weight:600;margin-bottom:4px;">' + esc(p.meta.name) +
    ' &mdash; <span style="font-weight:400;color:var(--text-muted);">' + esc(p.meta.tagline) + '</span></div>' +
    '<div style="margin-bottom:6px;color:var(--text-secondary);font-size:11.5px;line-height:1.55;">' + esc(p.meta.description) + '</div>' +
    '<div style="font-size:10.5px;color:var(--text-muted);">' + esc(p.meta.details) + '</div>';
  card.style.display = '';
}

async function loadSelectedDemoProfile() {
  var sel = document.getElementById('demoProfileSelect');
  var id = sel ? sel.value : '';
  if (!id) { showToast('Select a profile first', 'warn-t'); return; }
  await loadDemoProfile(id);
}

async function clearDemoData() {
  if (!confirm('Clear all data and start fresh?\n\nThis cannot be undone.')) return;
  await resetAllData();
}

// Explicit window exposure — ensures functions are reachable from the
// data-change / data-action delegation layer regardless of script scope.
window.previewDemoProfile = previewDemoProfile;
window.loadSelectedDemoProfile = loadSelectedDemoProfile;
window.clearDemoData = clearDemoData;
window.loadDemoProfile = loadDemoProfile;

// Direct change listener — bypasses delegation as a bulletproof fallback.
(function() {
  var sel = document.getElementById('demoProfileSelect');
  if (sel) {
    sel.addEventListener('change', function() {
      previewDemoProfile(this.value);
    });
  }
})();

// ── Core loader ───────────────────────────────────────────────────────────────

async function loadDemoProfile(id) {
  var p = DEMO_PROFILES[id];
  if (!p) { showToast('Profile not found', 'warn-t'); return; }

  var numMonths = p.monthsData.length;
  var months = {};

  p.monthsData.forEach(function(md, i) {
    var monthsAgo = numMonths - 1 - i;
    var key = _demoKey(monthsAgo);
    months[key] = {
      weeks: md.weeks.map(function(w) {
        return {
          items: w.items.map(function(item) {
            return {
              name: item.name,
              amount: item.amount,
              paid: item.paid,
              dueDay: (item.dueDay != null) ? item.dueDay : null,
              note: item.note || '',
              receipt: null
            };
          })
        };
      }),
      revenue: md.revenue.map(function(r) {
        return { name: r.name, amount: r.amount, received: r.received, note: r.note || '' };
      })
    };
  });

  var currentMonthKey = _demoKey(0);

  S = {
    loans: p.loans.map(function(l) {
      return {
        name: l.name,
        amount: l.amount,
        originalAmount: l.originalAmount,
        rate: l.rate,
        minPayment: l.minPayment,
        payments: _demoPmts(4)
      };
    }),
    strategy: p.strategy || 'avalanche',
    savings: p.savings.map(function(sv) {
      return {
        name: sv.name,
        target: sv.target,
        balance: sv.balance,
        contribution: sv.contribution,
        rate: sv.rate,
        id: 'sv-' + Math.random().toString(36).slice(2, 9)
      };
    }),
    investments: (p.investments || []).map(function(inv) {
      return Object.assign({}, inv);
    }),
    budgets: Object.assign({}, BDFT, p.budgets || {}),
    budgetRollover: {},
    financialGoals: [],
    customCategories: [],
    scheduledExpenses: [],
    darkMode: (typeof S !== 'undefined' && S) ? !!S.darkMode : false,
    archiveThreshold: 6,
    archivedMonths: {},
    currency: p.currency || { symbol: '$', code: 'USD', locale: 'en-US' },
    fxRates: { rates: {}, fetchedAt: 0, base: (p.currency && p.currency.code) || 'USD' },
    months: months,
    currentMonthKey: currentMonthKey,
    xp: p.xp || 0,
    xpLevel: p.xpLevel || 1,
    achievements: (p.achievements || []).map(function(a) { return Object.assign({}, a); }),
    monthChallenge: {},
    userName: p.meta.userName || '',
    syncConfig: { cloudEnabled: false, fileEnabled: false },
    activeBackend: null,
    tier: 'free',
    budgetLimits: {},
    goalTargets: [],
    lastModified: Date.now(),
    lastSyncedAt: 0,
    autoLockMins: 15
  };

  CMK = currentMonthKey;

  await persist(false);

  // Update loan badge
  var loanBadge = document.getElementById('loanBadge');
  if (loanBadge) loanBadge.textContent = p.loans.length > 0 ? String(p.loans.length) : '0';

  // Close any open modals and dismiss demo banner
  document.querySelectorAll('.modal-overlay.open').forEach(function(m) { m.classList.remove('open'); });
  var banner = document.getElementById('demoBanner');
  if (banner) banner.style.display = 'none';

  // Re-render
  if (typeof renderDash === 'function') renderDash();
  if (typeof updateHealth === 'function') updateHealth();
  if (typeof updateArchiveBadge === 'function') updateArchiveBadge();
  if (typeof updateClaudeBtn === 'function') updateClaudeBtn();

  showToast('✓ ' + p.meta.name + ' profile loaded');

  // Navigate to dashboard
  var dashTab = document.getElementById('tab-dashboard');
  if (typeof switchTab === 'function' && dashTab) switchTab('dashboard', dashTab);
}
