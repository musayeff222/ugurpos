export function sanitizeClientSyncId(value) {
  if (!value || typeof value !== "string") return null;
  const trimmed = value.trim().slice(0, 80);
  if (!/^[a-zA-Z0-9_-]+$/.test(trimmed)) return null;
  return trimmed;
}
