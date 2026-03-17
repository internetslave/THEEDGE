export function normalizeUsername(value) {
  return String(value || '').trim().toLowerCase();
}

export function normalizeEmail(value) {
  return String(value || '').trim().toLowerCase();
}

export function normalizeCompCode(value) {
  return String(value || '').trim().toUpperCase();
}

export function safeObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

export function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

export function toEpochMs(value, fallback = Date.now()) {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim()) {
    const parsed = Date.parse(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  if (value instanceof Date && Number.isFinite(value.getTime())) return value.getTime();
  return fallback;
}

export function toIsoStringOrNull(value) {
  if (!value) return null;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? new Date(parsed).toISOString() : null;
}

export function clone(value) {
  return structuredClone(value);
}
