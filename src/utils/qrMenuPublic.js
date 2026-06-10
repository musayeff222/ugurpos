import { resolveProductImageSrc } from "./cigkofteSiteImages";
import { getOrCreateDeviceId } from "./qrMenuStorage";

export async function fetchPublicFirmMenu() {
  const res = await fetch("/api/public/menu");
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Menü yüklenemedi");
  return data;
}

export async function fetchPublicBranchMenu(branchId) {
  const res = await fetch(`/api/public/menu/branches/${encodeURIComponent(branchId)}`);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Şube menüsü yüklenemedi");
  return data;
}

export function getPublicProductImageSrc(branchId, product) {
  return resolveProductImageSrc(branchId, product);
}

export async function submitPublicOrder(branchId, payload) {
  const deviceId = getOrCreateDeviceId();
  const res = await fetch(`/api/public/menu/branches/${encodeURIComponent(branchId)}/orders`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...payload, deviceId }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Sipariş gönderilemedi");
  return data;
}

export async function fetchPublicOrder(orderId) {
  const res = await fetch(`/api/public/orders/${encodeURIComponent(orderId)}`);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Sipariş bulunamadı");
  return data;
}

export async function fetchMyPublicOrders() {
  const deviceId = getOrCreateDeviceId();
  if (!deviceId) return [];
  const res = await fetch(`/api/public/my-orders?deviceId=${encodeURIComponent(deviceId)}`);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Siparişler yüklenemedi");
  return data.orders || [];
}

export function getMenuPublicUrl() {
  return `${window.location.origin}/m`;
}

export function getQrCodeUrl(menuUrl) {
  return `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(menuUrl)}`;
}
