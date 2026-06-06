// js/account.js — account.html dynamic data loader (Phase 3)
// Runs on DOMContentLoaded. Requires Firebase Auth (Phase 1) and session
// cookie (Phase 2) to already be in place.

import { getFirebase, requireAuth } from './firebase-init.js';

// ── Boot ──────────────────────────────────────────────────────────────────────
const { auth, db, helpers } = await getFirebase();
const user = await requireAuth('/signin');
if (!user) throw new Error('unauthenticated'); // requireAuth already redirected

// ── Helpers ───────────────────────────────────────────────────────────────────
function qs(sel) { return document.querySelector(sel); }
function setText(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val ?? '—';
}
function showToast(msg, isError = false) {
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent = msg;
  t.style.background = isError ? '#dc2626' : '';
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2800);
}

// ── Greeting ──────────────────────────────────────────────────────────────────
function setGreeting(displayName) {
  const hour  = new Date().getHours();
  const greet = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  setText('page-greeting', `${greet}, ${displayName || 'there'}`);
}

// ── Section nav ───────────────────────────────────────────────────────────────
window.showSection = function(name, btn) {
  document.querySelectorAll('.section-panel').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.sidebar-item').forEach(b => b.classList.remove('active'));
  document.getElementById('section-' + name).classList.add('active');
  btn.classList.add('active');
};

// ── Plan badge helper ─────────────────────────────────────────────────────────
function renderPlanBadge(planName) {
  const badge = document.getElementById('plan-badge');
  if (!badge) return;
  const normalized = (planName || '').toLowerCase();
  badge.className = 'plan-badge ' +
    (normalized.includes('lifetime') ? 'lifetime' :
     normalized.includes('pro')      ? 'pro' :
     normalized.includes('starter')  ? 'starter' : 'free');
  badge.innerHTML = `<span class="plan-dot"></span> ${planName || 'Free'}`;
}

// ── Feature chips ─────────────────────────────────────────────────────────────
const PLAN_FEATURES = {
  starter:  ['Budget Envelopes', 'Loan Calculator', 'CSV Import', 'Analytics'],
  pro:      ['Budget Envelopes', 'AI Coach', 'Google Drive Sync', 'Loan Calculator', 'CSV Import', 'Analytics'],
  lifetime: ['Budget Envelopes', 'AI Coach', 'Google Drive Sync', 'Loan Calculator', 'CSV Import', 'Analytics', 'Custom Categories', '5 Devices', 'Desktop App'],
};
const ALL_FEATURES = ['Budget Envelopes', 'AI Coach', 'Google Drive Sync', 'Loan Calculator', 'CSV Import', 'Analytics', 'Custom Categories', '5 Devices', 'Desktop App'];

function renderFeatureChips(planName) {
  const el = document.getElementById('plan-features-mini');
  if (!el) return;
  const key = (planName || '').toLowerCase().includes('lifetime') ? 'lifetime'
            : (planName || '').toLowerCase().includes('pro')      ? 'pro'
            : 'starter';
  const active = new Set(PLAN_FEATURES[key] || []);
  el.innerHTML = ALL_FEATURES
    .map(f => `<span class="feature-chip${active.has(f) ? ' on' : ''}">${f}</span>`)
    .join('');
}

// ── Upgrade box visibility ────────────────────────────────────────────────────
function setUpgradeBoxVisibility(planName) {
  const box = document.getElementById('upgrade-box');
  if (!box) return;
  const isLifetime = (planName || '').toLowerCase().includes('lifetime');
  box.style.display = isLifetime ? 'none' : '';
}

// ── Load licence + plan data ──────────────────────────────────────────────────
let _licenseKey    = localStorage.getItem('fw_license_key') || '';
let _instanceId    = localStorage.getItem('fw_instance_id') || '';
let _planName      = localStorage.getItem('fw_plan') || '';
let _activationLimit = 1;
let _activationUsed  = 1;
let _customerEmail   = user.email || '';

async function loadLicenseData() {
  if (!_licenseKey) {
    renderNoPlan();
    return;
  }

  // Show key immediately from localStorage while we fetch
  renderKeySection(_licenseKey, null);

  let validateData = null;
  try {
    const res = await fetch('/api/validate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ license_key: _licenseKey, instance_id: _instanceId }),
    });
    validateData = await res.json();
  } catch {
    // Offline — use localStorage values, show cached state
  }

  if (validateData?.valid === false) {
    // Key revoked or invalid
    renderNoPlan();
    return;
  }

  if (validateData) {
    _planName        = validateData.meta?.variant_name || _planName;
    _activationUsed  = validateData.meta?.license_key?.activation_usage  ?? 1;
    _activationLimit = validateData.meta?.license_key?.activation_limit  ?? 1;
    _customerEmail   = validateData.meta?.customer_email || _customerEmail;
    localStorage.setItem('fw_plan', _planName);
  }

  // Plan card
  setText('plan-name', `FincWin ${_planName}`);
  setText('plan-detail', `One-time purchase · ${_activationLimit}-device activation`);
  renderPlanBadge(_planName);
  renderFeatureChips(_planName);
  setUpgradeBoxVisibility(_planName);

  // Key section
  renderKeySection(_licenseKey, { used: _activationUsed, limit: _activationLimit, plan: _planName });

  // Devices subtitle
  setText('devices-subtitle', `${_activationUsed} of ${_activationLimit} activation${_activationLimit > 1 ? 's' : ''} used.`);
  renderDeviceList(_activationUsed, _activationLimit);
}

function renderNoPlan() {
  setText('plan-name', 'No active plan');
  setText('plan-detail', 'Activate a licence key to unlock FincWin.');
  renderPlanBadge('');
  const chips = document.getElementById('plan-features-mini');
  if (chips) chips.innerHTML = '<span class="feature-chip">No plan active</span>';
  setText('key-status-text', 'No key found');
  setText('key-activations-text', '—');
}

// ── Key section render ────────────────────────────────────────────────────────
let _keyVisible = false;
window._licenseKeyValue = '';

function renderKeySection(key, meta) {
  window._licenseKeyValue = key;
  const display = document.getElementById('key-display');
  const copyBlock = document.getElementById('key-copy-block');
  if (display) {
    display.textContent = _keyVisible ? key : '•••• - •••• - •••• - ••••';
    display.classList.toggle('masked', !_keyVisible);
  }
  if (copyBlock) copyBlock.textContent = key;
  if (meta) {
    setText('key-status-text', 'Active');
    setText('key-activations-text', `Activations: ${meta.used} / ${meta.limit} used`);
    setText('key-expires-text', 'Expires: Never');
    setText('key-plan-text', `Plan: ${meta.plan}`);
  }
}

window.toggleKeyVisibility = function() {
  _keyVisible = !_keyVisible;
  const display = document.getElementById('key-display');
  if (display) {
    display.textContent = _keyVisible ? window._licenseKeyValue : '•••• - •••• - •••• - ••••';
    display.classList.toggle('masked', !_keyVisible);
  }
};

window.copyKey = function() {
  navigator.clipboard.writeText(window._licenseKeyValue || '').then(() => showToast('Licence key copied'));
};

window.copyKeyFull = function() {
  navigator.clipboard.writeText(window._licenseKeyValue || '').then(() => showToast('Licence key copied to clipboard'));
};

// ── Devices ───────────────────────────────────────────────────────────────────
function renderDeviceList(used, limit) {
  const list = document.getElementById('device-list');
  if (!list) return;

  const currentName = (navigator.userAgent.match(/\(([^)]+)\)/) || [])[1]
    || navigator.platform || 'This device';
  const browser = navigator.userAgent.match(/Chrome|Firefox|Safari|Edge/) || ['Browser'];

  let html = `
    <div class="device-item">
      <div class="device-icon">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--sage)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="14" x="2" y="3" rx="2"/><line x1="8" x2="16" y1="21" y2="21"/><line x1="12" x2="12" y1="17" y2="21"/></svg>
      </div>
      <div class="device-info">
        <div class="device-name">${currentName} — ${browser[0]}</div>
        <div class="device-meta">Current session</div>
      </div>
      <span class="device-current">This device</span>
    </div>`;

  // Render remaining slots
  for (let i = 1; i < limit; i++) {
    const isUsed = i < used;
    html += `
      <div class="device-item" style="opacity:${isUsed ? 1 : 0.5};">
        <div class="device-icon">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="${isUsed ? 'var(--sage)' : 'var(--muted)'}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect width="14" height="20" x="5" y="2" rx="2"/><path d="M12 18h.01"/></svg>
        </div>
        <div class="device-info">
          <div class="device-name">Slot ${i + 1} — ${isUsed ? 'Active' : 'Available'}</div>
          <div class="device-meta">${isUsed ? 'Another device' : 'Not yet activated'}</div>
        </div>
        ${isUsed ? `<button class="btn-deactivate" onclick="deactivateSlot(${i})">Deactivate</button>` : ''}
      </div>`;
  }
  list.innerHTML = html;
}

// ── Billing history ───────────────────────────────────────────────────────────
async function loadBillingHistory() {
  const tbody = document.getElementById('billing-tbody');
  if (!tbody) return;

  try {
    const idToken = await user.getIdToken();
    const res = await fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken }),
    });
    if (!res.ok) throw new Error('orders fetch failed');
    const { orders } = await res.json();
    if (!orders || orders.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" style="color:var(--muted);font-size:13px;">No orders found.</td></tr>';
      return;
    }
    tbody.innerHTML = orders.map(o => `
      <tr>
        <td style="color:var(--muted);">${formatDate(o.date)}</td>
        <td>${o.description}</td>
        <td class="amount">$${(o.amount / 100).toFixed(2)}</td>
        <td><span class="billing-badge ${o.status === 'paid' ? 'paid' : ''}">${cap(o.status)}</span></td>
        <td>${o.receiptUrl ? `<a href="${o.receiptUrl}" target="_blank" rel="noopener" style="font-size:12px;color:var(--muted);text-decoration:none;">Receipt ↗</a>` : ''}</td>
      </tr>`).join('');
  } catch {
    tbody.innerHTML = '<tr><td colspan="5" style="color:var(--muted);font-size:13px;">Billing history unavailable. <a href="https://app.lemonsqueezy.com" target="_blank" style="color:var(--sage);">View in Lemon Squeezy ↗</a></td></tr>';
  }
}

function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}
function cap(s) { return s ? s[0].toUpperCase() + s.slice(1) : ''; }

// ── Profile ───────────────────────────────────────────────────────────────────
async function loadProfile() {
  const snap = await helpers.getDoc(helpers.doc(db, 'users', user.uid)).catch(() => null);
  const data = snap?.exists() ? snap.data() : {};
  const firstName   = data.firstName   || '';
  const lastName    = data.lastName    || '';
  const displayName = data.displayName || data.firstName || '';
  const email       = data.email || user.email || '';

  const fn = document.getElementById('p-fname');
  const ln = document.getElementById('p-lname');
  const em = document.getElementById('p-email');
  const dn = document.getElementById('p-display');
  if (fn) fn.value = firstName;
  if (ln) ln.value = lastName;
  if (em) em.value = email;
  if (dn) dn.value = displayName;

  setGreeting(displayName || firstName);
}

window.saveProfile = async function(e) {
  e.preventDefault();
  const btn = e.target.querySelector('.btn-save');
  const origText = btn.textContent;
  btn.disabled = true; btn.textContent = 'Saving…';

  const firstName   = document.getElementById('p-fname').value.trim();
  const lastName    = document.getElementById('p-lname').value.trim();
  const displayName = document.getElementById('p-display').value.trim();
  const newEmail    = document.getElementById('p-email').value.trim();

  try {
    // Update Firestore profile fields
    await helpers.setDoc(helpers.doc(db, 'users', user.uid),
      { firstName, lastName, displayName, email: newEmail },
      { merge: true }
    );

    // Update Firebase Auth email if changed
    if (newEmail && newEmail !== user.email) {
      await helpers.updateEmail(auth.currentUser, newEmail);
    }

    setGreeting(displayName || firstName);
    showToast('Profile updated');
  } catch (err) {
    const msg = err.code === 'auth/requires-recent-login'
      ? 'Please sign out and sign back in before changing your email.'
      : 'Could not save profile. Please try again.';
    showToast(msg, true);
  } finally {
    btn.disabled = false; btn.textContent = origText;
  }
};

window.changePassword = async function(e) {
  e.preventDefault();
  const inputs = e.target.querySelectorAll('input[type="password"]');
  const newPass = inputs[1]?.value;
  if (!newPass || newPass.length < 8) {
    showToast('New password must be at least 8 characters.', true);
    return;
  }
  const btn = e.target.querySelector('.btn-save');
  btn.disabled = true; btn.textContent = 'Updating…';
  try {
    await helpers.updatePassword(auth.currentUser, newPass);
    showToast('Password updated');
    e.target.reset();
  } catch (err) {
    const msg = err.code === 'auth/requires-recent-login'
      ? 'Please sign out and sign back in before changing your password.'
      : 'Could not update password. Please try again.';
    showToast(msg, true);
  } finally {
    btn.disabled = false; btn.textContent = 'Update password';
  }
};

// ── Danger zone ───────────────────────────────────────────────────────────────
window.deactivateAll = async function() {
  if (!confirm('Deactivate all devices? You can re-activate with your key.')) return;
  if (!_licenseKey || !_instanceId) { showToast('No active device found.', true); return; }
  try {
    await fetch('/api/deactivate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ license_key: _licenseKey, instance_id: _instanceId }),
    });
    localStorage.removeItem('fw_instance_id');
    _instanceId = '';
    showToast('All devices deactivated. Re-activate with your licence key.');
    renderDeviceList(0, _activationLimit);
  } catch {
    showToast('Could not deactivate — try again.', true);
  }
};

window.deactivateSlot = async function(slot) {
  showToast('To deactivate another device, open FincWin on that device and go to Account → Deactivate.');
};

window.deleteAccount = async function() {
  const confirmed = prompt('Type DELETE to permanently delete your account:');
  if (confirmed !== 'DELETE') return;
  try {
    // Deactivate licence
    if (_licenseKey && _instanceId) {
      await fetch('/api/deactivate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ license_key: _licenseKey, instance_id: _instanceId }),
      }).catch(() => {});
    }
    // Delete Firestore user record
    await helpers.deleteDoc(helpers.doc(db, 'users', user.uid)).catch(() => {});
    // Clear session cookie
    await fetch('/api/session', { method: 'DELETE' }).catch(() => {});
    // Clear localStorage
    ['fw_license_key', 'fw_instance_id', 'fw_plan', 'fw_last_validated'].forEach(k => localStorage.removeItem(k));
    // Delete Firebase Auth account
    await helpers.deleteUser(auth.currentUser);
    window.location.replace('/signin');
  } catch (err) {
    if (err.code === 'auth/requires-recent-login') {
      showToast('Please sign out and sign back in before deleting your account.', true);
    } else {
      showToast('Could not delete account. Contact support@fincwin.app.', true);
    }
  }
};

// ── Sign out ──────────────────────────────────────────────────────────────────
window.signOut = async function() {
  await fetch('/api/session', { method: 'DELETE' }).catch(() => {});
  await helpers.signOut(auth).catch(() => {});
  ['fw_license_key', 'fw_instance_id', 'fw_plan', 'fw_last_validated'].forEach(k => localStorage.removeItem(k));
  window.location.replace('/signin');
};

// ── Toast (for inline onclick= calls that predate this script) ───────────────
window.showToast = showToast;

// ── Run all loaders in parallel ───────────────────────────────────────────────
await Promise.all([
  loadLicenseData(),
  loadProfile(),
  loadBillingHistory(),
]);
