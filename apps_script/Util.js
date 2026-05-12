/**
 * Util.js — мелкие хелперы общего назначения.
 */

function nowIso_() {
  return new Date().toISOString();
}

function uid_() {
  const t = Date.now();
  const r = Math.floor(Math.random() * 0xfffff);
  return Number(String(t).slice(-9) + String(r).padStart(5, '0').slice(-5));
}

function shortToken_(len) {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let s = '';
  for (let i = 0; i < (len || 10); i++) {
    s += alphabet.charAt(Math.floor(Math.random() * alphabet.length));
  }
  return s;
}

function apiKey_() {
  return 'omni_' + Utilities.getUuid().replace(/-/g, '');
}

function hash_(str) {
  const raw = Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    str || '',
    Utilities.Charset.UTF_8
  );
  return raw.map(b => ((b + 256) % 256).toString(16).padStart(2, '0')).join('');
}

function hmacSha256_(key, msg) {
  const sig = Utilities.computeHmacSha256Signature(msg, key);
  return sig.map(b => ((b + 256) % 256).toString(16).padStart(2, '0')).join('');
}

function hmacSha256Bytes_(keyBytes, msg) {
  return Utilities.computeHmacSha256Signature(
    Utilities.newBlob(msg).getBytes(),
    keyBytes
  );
}

function tz_() {
  return getProp_(PROP.TIMEZONE) || TZ_DEFAULT;
}

function fmtDate_(d, pattern) {
  if (!d) return '';
  const date = (d instanceof Date) ? d : new Date(d);
  if (isNaN(date.getTime())) return '';
  return Utilities.formatDate(date, tz_(), pattern || "yyyy-MM-dd'T'HH:mm:ssXXX");
}

function todayKey_() {
  return Utilities.formatDate(new Date(), tz_(), 'yyyy-MM-dd');
}

function getProp_(key) {
  return PropertiesService.getScriptProperties().getProperty(key) || '';
}

function setProp_(key, value) {
  PropertiesService.getScriptProperties().setProperty(key, String(value || ''));
}

function logErr_(scope, err) {
  console.error('[' + scope + ']', err && err.stack ? err.stack : err);
}

function safeJsonParse_(s, fallback) {
  if (s === '' || s === null || s === undefined) return fallback;
  if (typeof s !== 'string') return s;
  try { return JSON.parse(s); } catch (_) { return fallback; }
}

function json_(obj, status) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function ok_(payload) {
  return json_({ ok: true, ...((payload && typeof payload === 'object') ? payload : { data: payload }) });
}

function err_(message, code) {
  return json_({ ok: false, error: message || 'error', code: code || 'unknown' });
}

function pickFields_(obj, schema) {
  const out = {};
  for (const col of schema) {
    if (col.key in (obj || {})) out[col.key] = obj[col.key];
  }
  return out;
}

function withLock_(fn) {
  const lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try { return fn(); }
  finally { try { lock.releaseLock(); } catch (_) {} }
}

function chunk_(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

function escHtml_(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
