'use strict';
// crypto-core.js — Shared cryptographic primitives for FincWin.
// Loaded before constants.js, state.js, and sync.js.
// Exposes window.CRYPTO — do not call functions here directly.
//
// Responsibilities:
//   - PBKDF2 key derivation (PIN → AES-GCM session key for at-rest encryption)
//   - AES-GCM 256-bit encrypt / decrypt
//   - Encrypted-payload detection helper
//
// Design contract:
//   at-rest  : salt stored in IDB meta store (ENC_SALT_IDB_KEY); only IV in payload
//   cloud sync: salt embedded in payload (sync.js owns that format; reuses deriveKey here)
//
// FUTURE (Tier 5): when converting to ES6 modules, change this to
//   export const CRYPTO = { ... }; and import it in each consumer.

(function () {
  var PBKDF2_ITERS    = 210000; // v1 — kept for legacy key derivation compatibility
  var PBKDF2_ITERS_V2 = 600000; // v2 — OWASP 2023 guidance for PBKDF2-HMAC-SHA256
  var IV_BYTES     = 12;
  var ENC_VERSION  = 1; // bumped when envelope format changes

  // ── Base64 helpers ──────────────────────────────────────────────────────────
  function _toBase64(buf) {
    return btoa(
      Array.from(new Uint8Array(buf), function (b) { return String.fromCharCode(b); }).join('')
    );
  }

  function _fromBase64(str) {
    return Uint8Array.from(atob(str), function (c) { return c.charCodeAt(0); });
  }

  // ── Key derivation ─────────────────────────────────────────────────────────
  // passphrase : string (PIN digits or sync passphrase)
  // saltBytes  : Uint8Array (16 bytes, caller manages storage)
  // Returns    : CryptoKey (AES-GCM-256, non-extractable, encrypt+decrypt)
  async function deriveKey(passphrase, saltBytes) {
    var enc = new TextEncoder();
    var keyMaterial = await crypto.subtle.importKey(
      'raw',
      enc.encode(passphrase),
      'PBKDF2',
      false,
      ['deriveKey']
    );
    return crypto.subtle.deriveKey(
      { name: 'PBKDF2', salt: saltBytes, iterations: PBKDF2_ITERS, hash: 'SHA-256' },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
  }

  // v2 key derivation — 600k iterations, used for PIN-KEK and recovery-KEK wrapping
  async function deriveKeyV2(passphrase, saltBytes) {
    var enc = new TextEncoder();
    var keyMaterial = await crypto.subtle.importKey(
      'raw',
      enc.encode(passphrase),
      'PBKDF2',
      false,
      ['deriveKey']
    );
    return crypto.subtle.deriveKey(
      { name: 'PBKDF2', salt: saltBytes, iterations: PBKDF2_ITERS_V2, hash: 'SHA-256' },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
  }

  // ── DEK (Data Encryption Key) helpers — v2 key-wrapping architecture ─────
  // The DEK is a random AES-GCM-256 key. It is wrapped (encrypted) under a
  // KEK (Key Encryption Key) derived from the PIN or recovery passphrase.
  // This allows two independent unlock paths without re-encrypting all data.

  // Generate a fresh extractable DEK
  async function generateDEK() {
    return crypto.subtle.generateKey(
      { name: 'AES-GCM', length: 256 },
      true, // extractable so we can wrap it
      ['encrypt', 'decrypt']
    );
  }

  // Wrap a DEK under a KEK: export DEK as raw bytes, encrypt with KEK
  async function wrapDEK(kek, dek) {
    var rawBuf = await crypto.subtle.exportKey('raw', dek);
    var dekB64 = _toBase64(rawBuf);
    return encrypt(dekB64, kek); // { ciphertext, iv, v: 1 }
  }

  // Unwrap a DEK: decrypt wrapped payload with KEK, re-import as extractable key.
  // Must be extractable so _storeSessionKey() can export it as JWK to sessionStorage,
  // allowing refresh within the inactivity window to skip the PIN prompt.
  // The key never leaves the browser — sessionStorage is tab-only and origin-scoped.
  async function unwrapDEK(kek, wrappedPayload) {
    var dekB64 = await decrypt(wrappedPayload, kek);
    var dekBytes = _fromBase64(dekB64);
    return crypto.subtle.importKey(
      'raw',
      dekBytes,
      { name: 'AES-GCM', length: 256 },
      true, // extractable so verifyPin() can save it to sessionStorage via exportKey('jwk')
      ['encrypt', 'decrypt']
    );
  }

  // ── Encrypt ────────────────────────────────────────────────────────────────
  // plaintext : string
  // key       : CryptoKey from deriveKey()
  // Returns   : { ciphertext: base64, iv: base64, v: 1 }
  async function encrypt(plaintext, key) {
    var iv = crypto.getRandomValues(new Uint8Array(IV_BYTES));
    var enc = new TextEncoder();
    var cipherBuf = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv: iv },
      key,
      enc.encode(plaintext)
    );
    return {
      ciphertext: _toBase64(cipherBuf),
      iv: _toBase64(iv.buffer),
      v: ENC_VERSION
    };
  }

  // ── Decrypt ────────────────────────────────────────────────────────────────
  // payload : object from encrypt() — { ciphertext, iv, v }
  // key     : CryptoKey from deriveKey()
  // Returns : plaintext string — throws DOMException on wrong key (AES-GCM auth tag)
  async function decrypt(payload, key) {
    var plainBuf = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: _fromBase64(payload.iv) },
      key,
      _fromBase64(payload.ciphertext)
    );
    return new TextDecoder().decode(plainBuf);
  }

  // ── Payload shape detector ─────────────────────────────────────────────────
  // Returns true if val looks like an encrypted envelope rather than plaintext state JSON.
  // Distinguishes our format from a regular JSON object (which never has 'ciphertext').
  function isEncryptedPayload(val) {
    return (
      val !== null &&
      typeof val === 'object' &&
      !Array.isArray(val) &&
      val.v === ENC_VERSION &&
      typeof val.ciphertext === 'string' &&
      typeof val.iv === 'string'
    );
  }

  // ── Public surface ─────────────────────────────────────────────────────────
  window.CRYPTO = {
    deriveKey          : deriveKey,
    deriveKeyV2        : deriveKeyV2,
    generateDEK        : generateDEK,
    wrapDEK            : wrapDEK,
    unwrapDEK          : unwrapDEK,
    encrypt            : encrypt,
    decrypt            : decrypt,
    isEncryptedPayload : isEncryptedPayload,
    _toBase64          : _toBase64,
    _fromBase64        : _fromBase64,
    PBKDF2_ITERS       : PBKDF2_ITERS,
    PBKDF2_ITERS_V2    : PBKDF2_ITERS_V2
  };
}());
