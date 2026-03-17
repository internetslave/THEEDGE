const CONTROL_CHARS_RE = /[\u0000-\u001F\u007F]/g;

export function isPlainObject(value) {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

export function sanitizeText(value, {
  maxLength = 120,
  allowNewlines = false,
  fallback = '',
} = {}) {
  if (value == null) return fallback;
  let text = String(value)
    .replace(CONTROL_CHARS_RE, allowNewlines ? '' : ' ')
    .replace(/[<>]/g, '')
    .trim();

  if (!allowNewlines) {
    text = text.replace(/\s+/g, ' ');
  } else {
    text = text
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      .replace(/[ \t]+/g, ' ')
      .replace(/\n{3,}/g, '\n\n');
  }

  return text.slice(0, maxLength);
}

export function sanitizeEmail(value, maxLength = 200) {
  const email = sanitizeText(value, { maxLength, fallback: '' }).toLowerCase();
  if (!email) return '';
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) ? email : '';
}

export function clampInteger(value, {
  min = 0,
  max = Number.MAX_SAFE_INTEGER,
  fallback = 0,
} = {}) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(min, Math.min(max, parsed));
}

export function clampNumber(value, {
  min = 0,
  max = Number.MAX_SAFE_INTEGER,
  fallback = 0,
} = {}) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(min, Math.min(max, parsed));
}

export function sanitizeBoolean(value) {
  return value === true || value === 'true' || value === 1 || value === '1';
}

export function sanitizeIsoDate(value, fallback = new Date().toISOString()) {
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? new Date(parsed).toISOString() : fallback;
}

export function sanitizeStringArray(value, {
  maxItems = 20,
  itemMaxLength = 80,
} = {}) {
  if (!Array.isArray(value)) return [];
  return value
    .slice(0, maxItems)
    .map((item) => sanitizeText(item, { maxLength: itemMaxLength, fallback: '' }))
    .filter(Boolean);
}
