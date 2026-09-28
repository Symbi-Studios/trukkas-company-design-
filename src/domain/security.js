// Client-side security helpers for the prototype: password strength, PIN
// rules, hashing, and RFC 6238 TOTP (the codes authenticator apps show).
// In production, secrets, PIN hashes and TOTP verification live on the server;
// the browser only collects input. These helpers let the mock behave like it.

export const PIN_LENGTH = 6;
export const MAX_PIN_ATTEMPTS = 5;

export const PIN_PROTECTED_ACTIONS = [
  { key: 'payout', label: 'Requesting payouts', icon: 'hand-coins' },
  { key: 'withdraw', label: 'Withdrawing from your wallet', icon: 'banknote' },
  { key: 'bank', label: 'Changing payout bank details', icon: 'landmark' },
  { key: 'finance-role', label: 'Granting finance permissions to team members', icon: 'shield-check' },
];

/** Score 0–4 with human feedback; ≥3 is required for a new password. */
export function passwordStrength(password = '') {
  const checks = [
    { ok: password.length >= 10, label: 'At least 10 characters' },
    { ok: /[a-z]/.test(password) && /[A-Z]/.test(password), label: 'Upper and lower case letters' },
    { ok: /\d/.test(password), label: 'A number' },
    { ok: /[^A-Za-z0-9]/.test(password), label: 'A symbol' },
  ];
  const score = checks.filter((c) => c.ok).length;
  const label = ['Too weak', 'Weak', 'Fair', 'Good', 'Strong'][score];
  const tone = score >= 4 ? 'success' : score === 3 ? 'info' : score === 2 ? 'warning' : 'danger';
  return { score, label, tone, checks };
}

/** Returns an error message, or '' when the PIN is acceptable. */
export function pinProblem(pin = '') {
  if (!new RegExp(`^\\d{${PIN_LENGTH}}$`).test(pin)) return `PIN must be exactly ${PIN_LENGTH} digits.`;
  if (/^(\d)\1+$/.test(pin)) return 'Avoid repeating the same digit.';
  const asc = '0123456789012345';
  const desc = '9876543210987654';
  if (asc.includes(pin) || desc.includes(pin)) return 'Avoid sequences like 123456.';
  return '';
}

function toHex(buffer) {
  return [...new Uint8Array(buffer)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export function randomToken(bytes = 16) {
  const array = new Uint8Array(bytes);
  crypto.getRandomValues(array);
  return toHex(array.buffer);
}

export async function sha256(text) {
  return toHex(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text)));
}

export async function hashSecret(secret, salt) {
  return sha256(`${salt}:${secret}`);
}

// ---- TOTP (RFC 6238, SHA-1, 30 s, 6 digits) --------------------------------
const B32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

export function generateBase32Secret(bytes = 20) {
  const data = new Uint8Array(bytes);
  crypto.getRandomValues(data);
  let bits = '';
  data.forEach((b) => { bits += b.toString(2).padStart(8, '0'); });
  let out = '';
  for (let i = 0; i + 5 <= bits.length; i += 5) out += B32[parseInt(bits.slice(i, i + 5), 2)];
  return out;
}

function base32ToBytes(secret) {
  const clean = secret.replace(/=+$/, '').replace(/\s+/g, '').toUpperCase();
  let bits = '';
  for (const ch of clean) {
    const v = B32.indexOf(ch);
    if (v < 0) throw new Error('Invalid secret');
    bits += v.toString(2).padStart(5, '0');
  }
  const bytes = new Uint8Array(Math.floor(bits.length / 8));
  for (let i = 0; i < bytes.length; i++) bytes[i] = parseInt(bits.slice(i * 8, i * 8 + 8), 2);
  return bytes;
}

export async function totpCode(secret, timeMs = Date.now(), step = 30) {
  const counter = Math.floor(timeMs / 1000 / step);
  const msg = new ArrayBuffer(8);
  const view = new DataView(msg);
  view.setUint32(0, Math.floor(counter / 2 ** 32));
  view.setUint32(4, counter >>> 0);
  const key = await crypto.subtle.importKey('raw', base32ToBytes(secret), { name: 'HMAC', hash: 'SHA-1' }, false, ['sign']);
  const mac = new Uint8Array(await crypto.subtle.sign('HMAC', key, msg));
  const offset = mac[mac.length - 1] & 0x0f;
  const binary = ((mac[offset] & 0x7f) << 24) | (mac[offset + 1] << 16) | (mac[offset + 2] << 8) | mac[offset + 3];
  return String(binary % 1_000_000).padStart(6, '0');
}

/** Accepts the current code and one step either side for clock drift. */
export async function verifyTotp(secret, code) {
  const clean = String(code).replace(/\s+/g, '');
  if (!/^\d{6}$/.test(clean)) return false;
  const now = Date.now();
  for (const drift of [-1, 0, 1]) {
    if (await totpCode(secret, now + drift * 30_000) === clean) return true;
  }
  return false;
}

export function otpauthUri(secret, accountEmail, issuer = 'Trukkas') {
  return `otpauth://totp/${encodeURIComponent(`${issuer}:${accountEmail}`)}?secret=${secret}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=6&period=30`;
}

export function formatSecret(secret) {
  return secret.replace(/(.{4})/g, '$1 ').trim();
}

export function generateBackupCodes(count = 8) {
  return Array.from({ length: count }, () => {
    const t = randomToken(4).toUpperCase();
    return `${t.slice(0, 4)}-${t.slice(4, 8)}`;
  });
}

/** Six-digit one-time code for email/SMS verification (delivered by the backend in production). */
export function oneTimeCode() {
  const n = new Uint32Array(1);
  crypto.getRandomValues(n);
  return String(n[0] % 1_000_000).padStart(6, '0');
}

export function maskEmail(email = '') {
  const [user, domain] = email.split('@');
  if (!domain) return email;
  return `${user.slice(0, 2)}${'•'.repeat(Math.max(1, user.length - 2))}@${domain}`;
}

export function maskPhone(phone = '') {
  const digits = phone.replace(/\D/g, '');
  return digits.length > 4 ? `${phone.slice(0, 4)} ••• ••• ${digits.slice(-4)}` : phone;
}
