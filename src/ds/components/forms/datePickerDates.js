const DAY = 86400000;

/** Convert the existing English month filter labels to calendar month values. */
export function monthValue(label) {
  if (typeof label !== 'string') return '';
  const match = /^(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+(\d{4})$/i.exec(label.trim());
  if (!match || Number(match[2]) < 1) return '';
  const index = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'].indexOf(match[1].slice(0, 3).toLowerCase());
  return `${match[2]}-${String(index + 1).padStart(2, '0')}`;
}

// Date-only values stay in UTC arithmetic; local offsets must not move a day.
export function parseDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [year, month, day] = value.split('-').map(Number);
  if (year < 1 || year > 9999) return null;
  const date = new Date(0);
  date.setUTCFullYear(year, month - 1, day);
  date.setUTCHours(0, 0, 0, 0);
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day ? date : null;
}

export function dateValue(date) {
  const year = date.getUTCFullYear();
  return `${String(year).padStart(4, '0')}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;
}

export function todayValue() {
  const now = new Date();
  return `${String(now.getFullYear()).padStart(4, '0')}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

export function moveDays(date, amount) { return new Date(date.getTime() + amount * DAY); }

export function moveMonth(date, amount) {
  const next = new Date(date);
  const day = date.getUTCDate();
  next.setUTCDate(1);
  next.setUTCMonth(next.getUTCMonth() + amount);
  const last = new Date(next);
  last.setUTCMonth(last.getUTCMonth() + 1, 0);
  next.setUTCDate(Math.min(day, last.getUTCDate()));
  return next;
}

export function dateAllowed(value, { min, max, step, base }) {
  const date = parseDate(value);
  if (!date || (parseDate(min) && value < min) || (parseDate(max) && value > max)) return false;
  if (step === 'any') return true;
  const interval = Number(step) > 0 ? Number(step) : 1;
  const origin = parseDate(min) ?? parseDate(base) ?? parseDate('1970-01-01');
  const distance = (date.getTime() - origin.getTime()) / DAY / interval;
  return Math.abs(distance - Math.round(distance)) < 1e-8;
}

export function clampDate(value, min, max) {
  const date = parseDate(value) ? value : todayValue();
  return parseDate(min) && date < min ? min : parseDate(max) && date > max ? max : date;
}
