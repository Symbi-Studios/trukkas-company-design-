// In-memory account registry for the mock-gated auth flow. Passwords are kept
// only as salted SHA-256 hashes in memory (never in localStorage) and vanish on
// reload, like the rest of the mock store. A real backend replaces all of this.
import { account as seededAccount, MOCK_CREDENTIALS } from './fixtures/account.js';
import { hashSecret, randomToken } from '../domain/security.js';

const registry = new Map();
let seeded = null;

async function ensureSeeded() {
  if (!seeded) {
    seeded = (async () => {
      const salt = randomToken();
      registry.set(MOCK_CREDENTIALS.email, { account: seededAccount, salt, hash: await hashSecret(MOCK_CREDENTIALS.password, salt) });
    })();
  }
  return seeded;
}

export async function emailTaken(email) {
  await ensureSeeded();
  return registry.has(email.trim().toLowerCase());
}

export async function registerAccount(account, password) {
  await ensureSeeded();
  const key = account.email.trim().toLowerCase();
  if (registry.has(key)) throw new Error('An account with this email already exists. Sign in instead.');
  const salt = randomToken();
  registry.set(key, { account, salt, hash: await hashSecret(password, salt) });
  return account;
}

export async function checkPassword(email, password) {
  await ensureSeeded();
  const entry = registry.get(email.trim().toLowerCase());
  if (!entry) return null;
  return (await hashSecret(password, entry.salt)) === entry.hash ? entry.account : null;
}

export async function setPassword(email, password) {
  await ensureSeeded();
  const entry = registry.get(email.trim().toLowerCase());
  if (!entry) throw new Error('Account not found.');
  entry.salt = randomToken();
  entry.hash = await hashSecret(password, entry.salt);
}

export async function updateRegisteredAccount(email, changes) {
  await ensureSeeded();
  const key = email.trim().toLowerCase();
  const entry = registry.get(key);
  if (!entry) return;
  entry.account = { ...entry.account, ...changes };
  if (changes.email && changes.email.toLowerCase() !== key) {
    registry.delete(key);
    registry.set(changes.email.toLowerCase(), entry);
  }
}
