// === sync.js ===
// Classic script (not type="module"). Uses dynamic import() inside async functions
// to lazy-load Firebase SDK only when cloud sync is enabled.
// Exposes window.fileWrite and window.cloudSyncPush for _doPersist() hooks.
// Exposes window.cloudPullOnLoad for initState() hook.

'use strict';

// ── Constants ─────────────────────────────────────────────────────────────────
const SYNC_FS_HANDLE_KEY = 'fincwin_fs_handle';
let _pendingCloudState = null;
// PBKDF2_ITERATIONS / SALT_BYTES / IV_BYTES moved to crypto-core.js (window.CRYPTO).
// Use CRYPTO.PBKDF2_ITERS here; 16-byte salt and 12-byte IV are hardcoded below.

// ── Module-scoped state ───────────────────────────────────────────────────────
let _cachedKey = null;       // Passphrase string — in memory only; NEVER written to storage
let _syncStatus = 'idle';
let _syncIdb = null;         // Cached IDB connection for meta store raw operations (V-06)

// ── Provider plugin registry (D-06) ──────────────────────────────────────────
// Providers self-register by calling window.registerProvider after sync.js loads.
// Security: _providers is module-scoped; only window.registerProvider is public.
const _providers = {};
window.registerProvider = function(name, plugin) {
  _providers[name] = plugin;
};
// stopProvider() replaces window._providers exposure (audit H-02): settings.js / gdrive.js
// only ever call stopLive — they don't need the full registry reference.
window.stopProvider = function(name) {
  var p = _providers[name];
  if (p && typeof p.stopLive === 'function') p.stopLive();
};

// ── IDB helpers for meta store (FileSystemFileHandle storage) ─────────────────
// Uses the 'meta' object store (IDB_PIN_STORE in state.js) for file handle persistence.

async function _ensureMetaDb() {
  // Reuse the shared IDB connection from state.js when available
  if (typeof getSharedIdb === 'function' && getSharedIdb()) return getSharedIdb();
  if (typeof openIDB !== 'function') return null;
  if (!_syncIdb) _syncIdb = await openIDB().catch(() => null);
  return _syncIdb;
}

async function _idbGetRaw(key) {
  if (location.protocol === 'file:') return null;
  const db = await _ensureMetaDb();
  if (!db) return null;
  return new Promise((res) => {
    try {
      const tx = db.transaction('meta', 'readonly');
      const req = tx.objectStore('meta').get(key);
      req.onsuccess = e => res(e.target.result !== undefined ? e.target.result : null);
      req.onerror = () => res(null);
    } catch (e) { res(null); }
  });
}

async function _idbSetRaw(key, val) {
  if (location.protocol === 'file:') return;
  const db = await _ensureMetaDb();
  if (!db) return;
  return new Promise((res, rej) => {
    try {
      const tx = db.transaction('meta', 'readwrite');
      const req = tx.objectStore('meta').put(val, key);
      req.onsuccess = () => res();
      req.onerror = e => rej(e.target.error);
    } catch (e) { res(); }
  });
}

// ── Crypto: PBKDF2 key derivation + AES-GCM encrypt/decrypt ──────────────────

// ── Cloud sync encryption ─────────────────────────────────────────────────────
// These functions use the CRYPTO namespace from crypto-core.js.
// The cloud envelope embeds the PBKDF2 salt so the recipient can re-derive the key
// from the passphrase alone. This is different from at-rest encryption (state.js)
// where the salt lives in IDB and only the IV is in the ciphertext envelope.

async function encryptState(jsonString, passphrase) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key  = await CRYPTO.deriveKey(passphrase, salt);
  const iv   = crypto.getRandomValues(new Uint8Array(12));
  const enc  = new TextEncoder();
  const cipherBuf = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    enc.encode(jsonString)
  );
  return {
    ciphertext: CRYPTO._toBase64(cipherBuf),
    salt: CRYPTO._toBase64(salt.buffer),
    iv: CRYPTO._toBase64(iv.buffer),
    lastModified: (typeof S !== 'undefined' && S && S.lastModified) ? S.lastModified : Date.now(),
    version: 1
  };
}

async function decryptState(payload, passphrase) {
  const salt     = CRYPTO._fromBase64(payload.salt);
  const iv       = CRYPTO._fromBase64(payload.iv);
  const key      = await CRYPTO.deriveKey(passphrase, salt);
  const plainBuf = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    CRYPTO._fromBase64(payload.ciphertext)
  );
  return new TextDecoder().decode(plainBuf);
}

function clearCachedKey() {
  _cachedKey = null;
}

// ── File System Access API ────────────────────────────────────────────────────
// D-09: User picks file once; handle persisted in IDB meta store.
// D-10: Auto-save on every _doPersist() call via window.fileWrite hook.
// Local file sync: Chrome/Edge use showDirectoryPicker for seamless auto-save to a chosen
// folder (e.g. Documents). All other browsers fall back to an instant JSON download —
// the button is never disabled, just does something slightly different.

function hasFileSystemAccess() {
  return 'showDirectoryPicker' in window;
}

// Trigger an immediate JSON download — universal fallback, works in every browser.
function _downloadJsonBackup() {
  if (typeof S === 'undefined' || !S) return;
  var json = typeof exportStateJSON === 'function' ? exportStateJSON() : JSON.stringify(S);
  var blob = new Blob([json], { type: 'application/json' });
  var url = URL.createObjectURL(blob);
  var a = document.createElement('a');
  a.href = url; a.download = 'fincwin-data.json';
  document.body.appendChild(a); a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  if (typeof showToast === 'function') showToast('📥 Saved fincwin-data.json — keep it somewhere safe');
}

// Helper: resolve the data FileHandle from a stored directory handle.
// Returns null if the directory handle is missing or permission is not granted.
async function _getDataFileHandle(dirHandle, mode) {
  if (!dirHandle || dirHandle.kind !== 'directory') return null;
  const perm = await dirHandle.queryPermission({ mode: mode || 'readwrite' });
  if (perm !== 'granted') return null;
  return dirHandle.getFileHandle('fincwin-data.json', { create: mode !== 'read' });
}

// NOTE: requestPermission requires a user gesture — never call from the auto-save path.
// linkLocalFile() is always triggered by a button click, so it may call requestPermission.

async function linkLocalFile() {
  if (!hasFileSystemAccess()) {
    // Fallback for Firefox / Safari: download the file directly.
    _downloadJsonBackup();
    return;
  }
  try {
    const dirHandle = await window.showDirectoryPicker({ mode: 'readwrite', startIn: 'documents' });
    // Request write permission upfront (user gesture context — allowed here).
    const perm = await dirHandle.requestPermission({ mode: 'readwrite' });
    if (perm !== 'granted') {
      if (typeof showToast === 'function') showToast('Permission denied — folder not linked', 'warn-t');
      return;
    }
    // Create the data file inside the chosen folder.
    await dirHandle.getFileHandle('fincwin-data.json', { create: true });
    await _idbSetRaw(SYNC_FS_HANDLE_KEY, dirHandle);
    if (typeof S !== 'undefined' && S && S.syncConfig) S.syncConfig.fileEnabled = true;
    if (typeof showToast === 'function') showToast('📁 Folder linked — auto-saving to ' + dirHandle.name);
    setSyncStatus('idle');
    renderSyncStatus();
    renderFileSyncStatus();
  } catch (err) {
    if (err && err.name === 'AbortError') return;
    if (typeof showToast === 'function') showToast('Could not link folder', 'warn-t');
  }
}

async function unlinkLocalFile() {
  await _idbSetRaw(SYNC_FS_HANDLE_KEY, null);
  if (typeof S !== 'undefined' && S && S.syncConfig) S.syncConfig.fileEnabled = false;
  if (typeof showToast === 'function') showToast('Folder unlinked');
  renderFileSyncStatus();
}

function renderFileSyncStatus() {
  const btn = document.getElementById('fileSyncLinkBtn');
  const statusEl = document.getElementById('fileSyncStatus');
  if (!hasFileSystemAccess()) {
    // Fallback mode: button downloads a backup instead of linking a folder.
    if (btn) {
      btn.textContent = 'Download backup';
      btn.dataset.action = 'linkLocalFileFromSettings';
      btn.disabled = false;
      btn.style.opacity = '';
    }
    if (statusEl) { statusEl.textContent = 'manual save (download)'; statusEl.dataset.linked = 'false'; }
    return;
  }
  _idbGetRaw(SYNC_FS_HANDLE_KEY).then(handle => {
    const linked = !!(handle && handle.kind === 'directory');
    if (btn) {
      btn.textContent = linked ? 'Unlink' : 'Choose folder';
      btn.dataset.action = linked ? 'unlinkLocalFileFromSettings' : 'linkLocalFileFromSettings';
      btn.disabled = false;
      btn.style.opacity = '';
    }
    if (statusEl) {
      statusEl.textContent = linked ? 'auto-saving to ' + handle.name : 'no folder linked';
      statusEl.dataset.linked = linked ? 'true' : 'false';
    }
  });
}

// Real window.fileWrite — replaces skeleton stub.
// Called from _doPersist() after IDB write. No user gesture available here — queryPermission only.
window.fileWrite = async function fileWrite(jsonString) {
  const dirHandle = await _idbGetRaw(SYNC_FS_HANDLE_KEY);
  if (!dirHandle) return;
  try {
    // Support legacy file handles stored before the directory-picker migration.
    let fileHandle;
    if (dirHandle.kind === 'directory') {
      fileHandle = await _getDataFileHandle(dirHandle, 'readwrite');
    } else if (dirHandle.kind === 'file') {
      const perm = await dirHandle.queryPermission({ mode: 'readwrite' });
      fileHandle = perm === 'granted' ? dirHandle : null;
    }
    if (!fileHandle) { setSyncStatus('permission-needed'); return; }
    const writable = await fileHandle.createWritable();
    await writable.write(jsonString);
    await writable.close();
    if (typeof S !== 'undefined' && S) S.lastFileWritten = Date.now();
  } catch (err) {
    console.error('[sync] fileWrite failed:', err);
    setSyncStatus('permission-needed');
  }
};

async function checkFileNewerThanIDB() {
  if (!hasFileSystemAccess()) return { newer: false };
  const dirHandle = await _idbGetRaw(SYNC_FS_HANDLE_KEY);
  if (!dirHandle) return { newer: false };
  try {
    let fileHandle;
    if (dirHandle.kind === 'directory') {
      fileHandle = await _getDataFileHandle(dirHandle, 'read');
    } else if (dirHandle.kind === 'file') {
      const perm = await dirHandle.queryPermission({ mode: 'read' });
      fileHandle = perm === 'granted' ? dirHandle : null;
    }
    if (!fileHandle) return { newer: false };
    const file = await fileHandle.getFile();
    const fileLastModified = file.lastModified;
    const lastFileWritten = (typeof S !== 'undefined' && S && S.lastFileWritten) ? S.lastFileWritten : 0;
    if (fileLastModified > lastFileWritten + 1000) {
      const text = await file.text();
      return { newer: true, fileLastModified, fileContent: text };
    }
    return { newer: false, fileLastModified };
  } catch (err) {
    return { newer: false };
  }
}

window.linkLocalFile = linkLocalFile;
window.unlinkLocalFile = unlinkLocalFile;
window.renderFileSyncStatus = renderFileSyncStatus;
window.checkFileNewerThanIDB = checkFileNewerThanIDB;

// ── Status helpers ────────────────────────────────────────────────────────────
function setSyncStatus(status) {
  _syncStatus = status;
  window._syncStatus = status;  // expose on window so settings.js can read current status (SYNC-02)
  const el = document.getElementById('syncStatusText');
  if (!el) { renderSyncStatus(); return; }
  el.dataset.status = status;
  // SYNC-01: wire click affordance for cloud passphrase re-entry
  if (status === 'needs-passphrase') {
    el.classList.add('sync-status--actionable');
    el.onclick = function () {
      if (_syncStatus !== 'needs-passphrase') return;  // guard: only fire when status is current
      _collectPassphraseModal(null).then(function (passphrase) {
        if (passphrase) {
          _cachedKey = passphrase;
          if (typeof window.cloudPullOnLoad === 'function') window.cloudPullOnLoad();
        }
      });
    };
  } else {
    el.classList.remove('sync-status--actionable');
    el.onclick = null;
  }
  renderSyncStatus();
}

function renderSyncStatus() {
  const el = document.getElementById('syncStatusText');
  if (!el) return;

  // V-03: passphrase needed branch — returning users with cloud enabled but no session key
  if (typeof S !== 'undefined' && S && S.syncConfig && S.syncConfig.cloudEnabled && !_cachedKey) {
    el.textContent = 'Passphrase needed — tap to sync';
    el.dataset.status = 'needs-passphrase';
    return;
  }

  const now = typeof S !== 'undefined' && S && S.lastSyncedAt && S.lastSyncedAt > 0
    ? new Date(S.lastSyncedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : null;

  const status = el.dataset.status || _syncStatus || 'idle';
  const labels = {
    idle: 'Not set up',
    syncing: 'Syncing…',
    synced: now ? ('Synced ✓ ' + now) : 'Synced ✓',
    error: 'Sync error — tap to retry',
    'permission-needed': 'File permission needed — tap to restore',
    'needs-passphrase': 'Passphrase needed — tap to sync',
    'needs-reauth': 'Drive disconnected — tap to reconnect'  // CR-03: was missing, showed "Not set up"
  };
  el.textContent = labels[status] || 'Not set up';
}

window.renderSyncStatus = renderSyncStatus;
window.setSyncStatus = setSyncStatus;

// ── Conflict detection ────────────────────────────────────────────────────────

function detectConflict(localLastModified, cloudLastModified, lastSyncedAt) {
  const localChanged = localLastModified > lastSyncedAt;
  const cloudChanged = cloudLastModified > lastSyncedAt;
  if (localChanged && cloudChanged) return 'CONFLICT';
  if (cloudChanged) return 'CLOUD_NEWER';
  if (localChanged) return 'LOCAL_NEWER';
  return 'IN_SYNC';
}

function _buildStateSummary(stateObj) {
  try {
    const parsed = typeof stateObj === 'string' ? JSON.parse(stateObj) : stateObj;
    const currentKey = parsed.currentMonthKey;
    const months = parsed.months || {};
    const currentMonth = months[currentKey] || { weeks: [], revenue: [] };
    const expenseCount = currentMonth.weeks.reduce((s, w) => s + (w.items ? w.items.length : 0), 0);
    const income = (currentMonth.revenue || []).reduce((s, r) => s + (r.amount || 0), 0);
    const expenses = (currentMonth.weeks || []).reduce((s, w) => s + (w.items || []).reduce((a, i) => a + (i.amount || 0), 0), 0);
    const sym = (parsed.currency && parsed.currency.symbol) || '$';
    return expenseCount + ' expense' + (expenseCount !== 1 ? 's' : '') +
           ', ' + sym + income.toFixed(2) + ' income' +
           ', ' + sym + expenses.toFixed(2) + ' expenses';
  } catch (e) {
    return '(could not parse summary)';
  }
}

function showConflictPrompt(localStateJson, cloudPayload, passphrase) {
  return new Promise(async (resolve) => {
    let cloudStateJson = null;
    try {
      cloudStateJson = await decryptState(cloudPayload, passphrase);
    } catch (e) {
      resolve('local');
      return;
    }

    const localTime = new Date(S.lastModified || 0).toLocaleString();
    const cloudTime = new Date(cloudPayload.lastModified || 0).toLocaleString();
    const localSummary = _buildStateSummary(localStateJson);
    const cloudSummary = _buildStateSummary(cloudStateJson);

    const conflictModal = document.getElementById('syncConflictModal');
    if (conflictModal) {
      document.getElementById('conflictLocalTime').textContent = localTime;
      document.getElementById('conflictCloudTime').textContent = cloudTime;
      document.getElementById('conflictLocalSummary').textContent = localSummary;
      document.getElementById('conflictCloudSummary').textContent = cloudSummary;
      conflictModal.classList.add('open');
      conflictModal.dataset.resolveWith = '';

      // Declared before MutationObserver so the callback closure can safely reference them (audit L-01).
      const keepLocalBtn = document.getElementById('conflictKeepLocal');
      const useCloudBtn = document.getElementById('conflictUseCloud');

      const _sco = new MutationObserver(() => {
        if (!conflictModal.classList.contains('open')) {
          _sco.disconnect();
          if (keepLocalBtn) keepLocalBtn.textContent = 'Keep Local';
          if (useCloudBtn) useCloudBtn.textContent = 'Use Cloud';
          resolve('local');
          return;
        }
        const choice = conflictModal.dataset.resolveWith;
        if (choice === 'local' || choice === 'cloud') {
          _sco.disconnect();
          conflictModal.classList.remove('open');
          if (keepLocalBtn) keepLocalBtn.textContent = 'Keep Local';
          if (useCloudBtn) useCloudBtn.textContent = 'Use Cloud';
          resolve(choice);
        }
      });
      _sco.observe(conflictModal, { attributes: true, attributeFilter: ['class', 'data-resolve-with'] });

      _pendingCloudState = cloudStateJson;
    } else {
      const msg =
        'Sync conflict detected.\n\n' +
        'Local  (' + localTime + '): ' + localSummary + '\n' +
        'Cloud  (' + cloudTime + '): ' + cloudSummary + '\n\n' +
        'Use cloud version? (Cancel to keep local)';
      const useCloud = confirm(msg);
      _pendingCloudState = cloudStateJson;
      resolve(useCloud ? 'cloud' : 'local');
    }
  });
}

// ── Cloud sync enable / disable ───────────────────────────────────────────────

// Common weak passphrases to block (audit M-02).
var _WEAK_PASSPHRASES = new Set([
  'password','12345678','password1','qwerty123','letmein1','welcome1',
  'monkey123','dragon123','iloveyou','sunshine','princess','football',
  'baseball','abc12345','passw0rd','master123','hello123','shadow123',
  'superman','batman123','trustno1','adminadmin','changeme','qwertyui'
]);

function _checkPassphraseStrength(p) {
  if (!p || p.trim().length < 10) return 'Passphrase must be at least 10 characters';
  if (_WEAK_PASSPHRASES.has(p.trim().toLowerCase())) return 'Passphrase is too common — choose a more unique phrase';
  var hasUpper = /[A-Z]/.test(p);
  var hasLower = /[a-z]/.test(p);
  var hasDigit = /[0-9]/.test(p);
  var hasSpecial = /[^A-Za-z0-9]/.test(p);
  var varietyCount = (hasUpper?1:0)+(hasLower?1:0)+(hasDigit?1:0)+(hasSpecial?1:0);
  if (varietyCount < 2) return 'Passphrase must contain at least 2 of: uppercase, lowercase, digits, symbols';
  return null; // ok
}

async function enableCloudSync(passphrase) {
  var strengthErr = _checkPassphraseStrength(passphrase);
  if (strengthErr) {
    if (typeof showToast === 'function') showToast(strengthErr, 'warn-t');
    return false;
  }
  try {
    setSyncStatus('syncing');
    _cachedKey = passphrase;
    const activeKey = S.activeBackend || 'firebase';
    const provider = _providers[activeKey];
    if (!provider) { setSyncStatus('error'); return false; }
    const jsonString = JSON.stringify(S);
    const payload = await encryptState(jsonString, passphrase);
    const uid = await provider.push(payload);
    S.syncConfig.cloudEnabled = true;
    S.lastSyncedAt = Date.now();
    if (typeof idbSet === 'function') {
      idbSet(SK, JSON.stringify(S)).catch(() => {});
    }
    setSyncStatus('synced');
    renderSyncStatus();
    if (uid) await provider.startLive(uid);
    if (typeof showToast === 'function') showToast('Cloud sync enabled');
    if (typeof renderSyncSectionStatus === 'function') renderSyncSectionStatus();
    return true;
  } catch (err) {
    console.error('[sync] enableCloudSync failed:', err);
    _cachedKey = null;
    setSyncStatus('error');
    if (typeof showToast === 'function') showToast('Could not enable cloud sync — check connection', 'warn-t');
    return false;
  }
}

function disableCloudSync() {
  const _stopActiveProvider = _providers[S && S.activeBackend || 'firebase'];
  if (_stopActiveProvider && typeof _stopActiveProvider.stopLive === 'function') {
    _stopActiveProvider.stopLive();
  }
  _cachedKey = null;
  if (S && S.syncConfig) S.syncConfig.cloudEnabled = false;
  setSyncStatus('idle');
  // Uses SK (= 'finflow_v5') from constants.js — the canonical state storage key
  if (typeof idbSet === 'function') {
    idbSet(SK, JSON.stringify(S)).catch(() => {});
  }
  renderSyncStatus();
  if (typeof showToast === 'function') showToast('Cloud sync disabled');
  if (typeof renderSyncSectionStatus === 'function') renderSyncSectionStatus();
}

window.enableCloudSync = enableCloudSync;
window.disableCloudSync = disableCloudSync;

// D-18: disconnectDrive = remove Drive credentials from IDB meta.
// "Disable" (disableCloudSync) is separate — that only pauses pushes.
// D-03: the fincwin-state.enc file in appDataFolder is NOT deleted on unlink.
async function disconnectDrive() {
  // Clear IDB meta credentials — D-06 keys
  await _idbSetRaw('driveAccessToken', null).catch(function(){});
  await _idbSetRaw('driveTokenIssuedAt', null).catch(function(){});
  await _idbSetRaw('driveEmail', null).catch(function(){});
  await _idbSetRaw('driveFileId', null).catch(function(){});
  // Reset module-scoped vars in gdrive.js
  if (typeof window.gdriveResetCredentials === 'function') window.gdriveResetCredentials();
  // If Drive was the active backend, fall back to null so user must re-choose
  if (S && S.activeBackend === 'gdrive') {
    S.activeBackend = null;
    S.driveConnected = false;
    S.driveEmail = null;  // clear persisted email so Settings shows 'Not connected' after unlink
  }
  if (typeof idbSet === 'function') {
    idbSet(SK, JSON.stringify(S)).catch(function(){});
  }
  // If Firebase was previously set up (cloudEnabled still true), preserve its state —
  // show 'needs-passphrase' so the Firebase row stays actionable rather than "Not set up".
  // Only reset to idle when there was no other configured backend.
  var firebaseWasEnabled = S && S.syncConfig && S.syncConfig.cloudEnabled;
  setSyncStatus(firebaseWasEnabled ? 'needs-passphrase' : 'idle');
  renderSyncStatus();
  if (typeof showToast === 'function') showToast('Google Drive disconnected');
  if (typeof renderSyncSectionStatus === 'function') renderSyncSectionStatus();
}
window.disconnectDrive = disconnectDrive;

// ── Cloud sync push hook ──────────────────────────────────────────────────────
window.cloudSyncPush = async function cloudSyncPush(jsonString) {
  if (typeof S === 'undefined' || !S) return;
  if (!S.syncConfig || !S.syncConfig.cloudEnabled) return;
  if (!_cachedKey) return;
  const provider = _providers[S.activeBackend || 'firebase'];
  if (!provider) { setSyncStatus('error'); return; }
  try {
    setSyncStatus('syncing');
    const stateJson = (typeof jsonString === 'string') ? jsonString : JSON.stringify(S);
    const payload = await encryptState(stateJson, _cachedKey);
    const estimatedBytes = new Blob([payload.ciphertext]).size;
    if (estimatedBytes > 900000) {
      if (typeof showToast === 'function') showToast('⚠ Sync data is large (' + Math.round(estimatedBytes/1024) + 'KB) — remove receipts to stay under cloud limit', 'warn-t');
    }
    const uid = await provider.push(payload);
    S.lastSyncedAt = Date.now();
    if (typeof idbSet === 'function') {
      idbSet(SK, JSON.stringify(S)).catch(() => {});
    }
    setSyncStatus('synced');
    window.dispatchEvent(new CustomEvent('fincwin:sync-complete')); // notify connBar
    renderSyncStatus();
    if (uid) await provider.startLive(uid);
  } catch (err) {
    console.error('[sync] cloudSyncPush failed:', err);
    setSyncStatus('error');
    if (typeof showToast === 'function') showToast('Sync failed — check connection', 'warn-t');
  }
};

// ── Cloud pull on load (conflict-aware) ──────────────────────────────────────
window.cloudPullOnLoad = async function() {
  if (typeof S === 'undefined' || !S) return;
  if (!S.syncConfig || !S.syncConfig.cloudEnabled) return;
  if (!_cachedKey) {
    renderSyncStatus(); // V-03: show "Passphrase needed — tap to sync" for returning users
    return;
  }
  const activeKey = S.activeBackend || 'firebase';
  const provider = _providers[activeKey];
  if (!provider) { setSyncStatus('error'); return; }
  try {
    const cloudDoc = await provider.pull();
    if (!cloudDoc) {
      renderSyncStatus();
      return;
    }

    const resolution = detectConflict(
      S.lastModified || 0,
      cloudDoc.lastModified || 0,
      S.lastSyncedAt || 0
    );

    if (resolution === 'IN_SYNC') {
      renderSyncStatus();
      await provider.startLive(null);
      return;
    }

    if (resolution === 'CLOUD_NEWER') {
      const cloudJson = await decryptState(cloudDoc, _cachedKey);
      if (typeof _persistTimer !== 'undefined' && _persistTimer) {
        clearTimeout(_persistTimer);
        _persistTimer = null;
      }
      var _cloudParsed = JSON.parse(cloudJson);
      if (typeof window._validateStateShape === 'function' && !window._validateStateShape(_cloudParsed)) { setSyncStatus('error'); return; }
      S = _cloudParsed;
      if (typeof normaliseState === 'function') normaliseState();
      var _newCMK = S.currentMonthKey || Object.keys(S.months || {})[0];
      if (!_newCMK) { setSyncStatus && setSyncStatus('error'); return; }
      CMK = _newCMK;
      S.lastSyncedAt = Date.now();
      if (typeof idbSet === 'function') idbSet(SK, JSON.stringify(S)).catch(() => {});
      setSyncStatus('synced');
      window.dispatchEvent(new CustomEvent('fincwin:sync-complete')); // notify connBar
      renderSyncStatus();
      await provider.startLive(null);
      return;
    }

    if (resolution === 'LOCAL_NEWER') {
      await window.cloudSyncPush();
      renderSyncStatus();
      await provider.startLive(null);
      return;
    }

    if (resolution === 'CONFLICT') {
      _pendingCloudState = null;
      const choice = await showConflictPrompt(JSON.stringify(S), cloudDoc, _cachedKey);
      try {
        if (choice === 'cloud' && _pendingCloudState) {
          if (typeof _persistTimer !== 'undefined' && _persistTimer) {
            clearTimeout(_persistTimer);
            _persistTimer = null;
          }
          var _conflictParsed = JSON.parse(_pendingCloudState);
          if (typeof window._validateStateShape === 'function' && !window._validateStateShape(_conflictParsed)) { setSyncStatus('error'); return; }
          S = _conflictParsed;
          if (typeof normaliseState === 'function') normaliseState();
          var _conflictCMK = S.currentMonthKey || Object.keys(S.months || {})[0];
          if (!_conflictCMK) { setSyncStatus && setSyncStatus('error'); return; }
          CMK = _conflictCMK;
        }
        S.lastSyncedAt = Date.now();
        if (typeof idbSet === 'function') idbSet(SK, JSON.stringify(S)).catch(() => {});
        await window.cloudSyncPush();
        setSyncStatus('synced');
        renderSyncStatus();
        await provider.startLive(null);
      } finally {
        _pendingCloudState = null;
      }
    }
  } catch (err) {
    console.error('[sync] cloudPullOnLoad failed:', err);
    setSyncStatus('error');
    renderSyncStatus();
  }
};

// ── QR Sync Token (D-06, D-07) ────────────────────────────────────────────────

function _generateTokenId() {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function generateSyncQR() {
  if (!_cachedKey) {
    if (typeof showToast === 'function') showToast('Enable cloud sync first', 'warn-t');
    return;
  }
  try {
    const user = await window._fbEnsureSignedIn();
    const tokenId = _generateTokenId();
    const expiresAt = Date.now() + 600_000; // D-07: 10 minutes

    const { db, fsHelpers } = await window._fbGetInstances();
    const { doc, setDoc } = fsHelpers;
    await setDoc(doc(db, 'syncTokens', tokenId), {
      ownerUid: user.uid,
      expiresAt,
      used: false
    });

    const syncUrl = window.location.origin + window.location.pathname + '#sync=' + tokenId;

    const { default: QrCreator } = await import('./vendor/qr-creator.es6.min.js');
    const container = document.getElementById('syncQRContainer');
    if (!container) return;
    container.innerHTML = '';
    QrCreator.render({
      text: syncUrl,
      radius: 0.5,
      ecLevel: 'H',
      fill: getComputedStyle(document.documentElement).getPropertyValue('--text').trim() || '#1a1a2e',
      background: null,
      size: 200
    }, container);

    const expiryEl = document.getElementById('syncQRExpiry');
    if (expiryEl) {
      expiryEl.textContent = 'Valid for 10 minutes';
      const expiryTimer = setInterval(() => {
        const remaining = Math.max(0, Math.round((expiresAt - Date.now()) / 1000));
        if (remaining === 0) {
          clearInterval(expiryTimer);
          if (expiryEl) expiryEl.textContent = 'QR expired — regenerate';
          if (container) container.innerHTML = '<p style="color:var(--text-muted);font-size:12px;">Expired</p>';
        } else {
          const m = Math.floor(remaining / 60);
          const s = remaining % 60;
          if (expiryEl) expiryEl.textContent = 'Expires in ' + m + ':' + String(s).padStart(2, '0');
        }
      }, 1000);
    }

    if (typeof showToast === 'function') showToast('QR code ready — scan within 10 minutes');
  } catch (err) {
    console.error('[sync] generateSyncQR failed:', err);
    if (typeof showToast === 'function') showToast('Could not generate QR code', 'warn-t');
  }
}

async function consumeSyncToken(tokenId) {
  try {
    const { db, fsHelpers } = await window._fbGetInstances();
    const { doc, getDoc, setDoc } = fsHelpers;
    const snap = await getDoc(doc(db, 'syncTokens', tokenId));

    if (!snap.exists()) {
      if (typeof showToast === 'function') showToast('Sync link is invalid or already used', 'warn-t');
      return null;
    }

    const data = snap.data();

    if (data.used) {
      if (typeof showToast === 'function') showToast('This sync link has already been used', 'warn-t');
      return null;
    }

    if (data.expiresAt < Date.now()) {
      if (typeof showToast === 'function') showToast('Sync link has expired — generate a new QR code', 'warn-t');
      return null;
    }

    // Mark as used (single-use per D-07)
    await setDoc(doc(db, 'syncTokens', tokenId), { used: true }, { merge: true });

    return data.ownerUid;
  } catch (err) {
    console.error('[sync] consumeSyncToken failed:', err);
    return null;
  }
}

// Module-scoped resolve so the passphrase Promise cannot be intercepted via the DOM (audit M-08).
var _passphraseResolve = null;

// Modal-based passphrase collector — avoids prompt() (visible to observers, plaintext field)
function _collectPassphraseModal(tokenId){
  return new Promise(function(resolve){
    const m=document.getElementById('syncPassphraseModal');
    const inp=document.getElementById('syncPassphraseInput');
    const tog=document.getElementById('syncPassphraseToggle');
    if(!m||!inp){resolve(null);return;}
    inp.value='';
    inp.type='password';
    if(tog)tog.textContent='Show';
    m.classList.add('open');
    if(typeof trapFocus==='function')trapFocus(m);
    setTimeout(()=>inp.focus(),120);
    _passphraseResolve=resolve;
    if(m.dataset)m.dataset.tokenId=tokenId||'';
  });
}

window.confirmSyncPassphrase=async function(){
  const m=document.getElementById('syncPassphraseModal');
  const inp=document.getElementById('syncPassphraseInput');
  if(!m)return;
  const passphrase=(inp&&inp.value.trim())||'';
  if(typeof releaseTrap==='function')releaseTrap(m);
  m.classList.remove('open');
  if(typeof _passphraseResolve==='function'){_passphraseResolve(passphrase||null);_passphraseResolve=null;}
};

window.cancelSyncPassphrase=function(){
  const m=document.getElementById('syncPassphraseModal');
  if(!m)return;
  if(typeof releaseTrap==='function')releaseTrap(m);
  m.classList.remove('open');
  if(typeof _passphraseResolve==='function'){_passphraseResolve(null);_passphraseResolve=null;}
};

window.toggleSyncPassphraseVis=function(){
  const inp=document.getElementById('syncPassphraseInput');
  const tog=document.getElementById('syncPassphraseToggle');
  if(!inp)return;
  if(inp.type==='password'){inp.type='text';if(tog)tog.textContent='Hide';}
  else{inp.type='password';if(tog)tog.textContent='Show';}
};

async function checkSyncTokenOnLoad() {
  const hash = window.location.hash;
  if (!hash.startsWith('#sync=')) return;
  const tokenId = hash.slice('#sync='.length).trim();
  if (!tokenId) return;

  history.replaceState(null, '', window.location.pathname + window.location.search);

  const passphrase = await _collectPassphraseModal(tokenId);
  if (!passphrase) return;

  const ownerUid = await consumeSyncToken(tokenId);
  if (!ownerUid) return;

  try {
    _cachedKey = passphrase;
    const cloudDoc = await window._fbCloudPull(ownerUid);
    if (!cloudDoc) {
      if (typeof showToast === 'function') showToast('No cloud data found for this account', 'warn-t');
      _cachedKey = null;
      return;
    }
    const cloudJson = await decryptState(cloudDoc, passphrase);
    if (typeof _persistTimer !== 'undefined' && _persistTimer) {
      clearTimeout(_persistTimer);
      _persistTimer = null;
    }
    var _qrParsed = JSON.parse(cloudJson);
    if (typeof window._validateStateShape === 'function' && !window._validateStateShape(_qrParsed)) {
      if (typeof showToast === 'function') showToast('Sync data failed validation — aborting', 'warn-t');
      _cachedKey = null;
      return;
    }
    S = _qrParsed;
    if (typeof normaliseState === 'function') normaliseState();
    S.syncConfig = S.syncConfig || { cloudEnabled: true, fileEnabled: false };
    S.syncConfig.cloudEnabled = true;
    S.lastSyncedAt = Date.now();
    var _tokenCMK = S.currentMonthKey || Object.keys(S.months || {})[0];
    if (!_tokenCMK) { setSyncStatus && setSyncStatus('error'); return; }
    CMK = _tokenCMK;
    // Uses SK (= 'finflow_v5') from constants.js — the canonical state storage key
    if (typeof idbSet === 'function') idbSet(SK, JSON.stringify(S)).catch(() => {});
    setSyncStatus('synced');
    renderSyncStatus();
    if (typeof showToast === 'function') showToast('Device synced successfully');
    if (typeof renderSection === 'function') renderSection('dashboard');
  } catch (err) {
    console.error('[sync] QR link sync failed:', err);
    _cachedKey = null;
    if (typeof showToast === 'function') showToast('Wrong passphrase or corrupted data', 'warn-t');
  }
}

window.generateSyncQR = generateSyncQR;
window.consumeSyncToken = consumeSyncToken;
window.checkSyncTokenOnLoad = checkSyncTokenOnLoad;

// Expose crypto helpers to firebase.js via a sealed, non-writable property (audit H-03, H-04).
// getCachedKey is intentionally NOT exposed — the raw passphrase never leaves this module.
// firebase.js uses hasCachedKey() to check presence and decryptWithCachedKey() to decrypt
// without ever reading the passphrase value directly.
Object.defineProperty(window, '_syncHelpers', {
  value: Object.freeze({
    hasCachedKey: function() { return !!_cachedKey; },
    decryptWithCachedKey: function(payload) {
      if (!_cachedKey) return Promise.reject(new Error('No cached sync key'));
      return decryptState(payload, _cachedKey);
    },
    decryptState: decryptState
  }),
  writable: false,
  configurable: false
});
window._idbGetRaw = _idbGetRaw;
window._idbSetRaw = _idbSetRaw;
window.handleOAuthReturn = async function handleOAuthReturn() {
  // D-05: On boot, check for stored Drive token.
  // Option A: skip GIS popup entirely when stored token is still within its TTL.
  // Only fall through to silent re-issue (which opens a brief GIS popup) when expired.
  var storedToken = await _idbGetRaw('driveAccessToken');
  if (!storedToken) return;  // No Drive token stored — nothing to do
  if (!S || S.activeBackend !== 'gdrive') return;  // Drive not the active backend

  var issuedAt = await _idbGetRaw('driveTokenIssuedAt');
  var TOKEN_TTL = 50 * 60 * 1000;  // 50 min — GIS tokens last 60 min, conservative margin
  var tokenAge = Date.now() - (issuedAt || 0);

  if (tokenAge < TOKEN_TTL) {
    // Token still valid — apply directly, no GIS call, no popup
    if (typeof window._onDriveTokenGranted === 'function') {
      window._onDriveTokenGranted(storedToken);
    }
    return;
  }

  // Token expired — silent re-issue via GIS (brief popup may appear)
  var storedEmail = await _idbGetRaw('driveEmail');
  await new Promise(function(resolve) {
    if (typeof window.gdriveSilentReissue === 'function') {
      window.gdriveSilentReissue(storedEmail, function(tokenResponse) {
        if (tokenResponse && !tokenResponse.error) {
          if (typeof window._onDriveTokenGranted === 'function') {
            window._onDriveTokenGranted(tokenResponse.access_token);
          }
        } else {
          setSyncStatus('needs-reauth');
        }
        resolve();
      });
    } else {
      resolve();
    }
  });
};

// clearSyncPassphrase: called by closeSettings() in settings.js (PLAN-05)
window.clearSyncPassphrase = clearCachedKey;
