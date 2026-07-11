const entries = new Map();
const MAX_ENTRIES = 100;
const TTL_MS = 10 * 60 * 1000;

export function getCached(key) {
  const entry = entries.get(key);
  if (!entry) return null;
  if (Date.now() - entry.createdAt > TTL_MS) {
    entries.delete(key);
    return null;
  }
  return entry.value;
}

export function setCached(key, value) {
  if (entries.size >= MAX_ENTRIES) entries.delete(entries.keys().next().value);
  entries.set(key, { createdAt: Date.now(), value });
  return value;
}
