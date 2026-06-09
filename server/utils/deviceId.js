export function sanitizeDeviceId(deviceId) {
  if (!deviceId || typeof deviceId !== "string") return null;
  const trimmed = deviceId.trim().slice(0, 64);
  if (!/^dev_[a-zA-Z0-9_-]+$/.test(trimmed)) return null;
  return trimmed;
}
