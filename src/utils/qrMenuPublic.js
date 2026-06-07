export async function fetchPublicFirmMenu(slug) {
  const res = await fetch(`/api/public/menu/${encodeURIComponent(slug)}`);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Menü yüklenemedi");
  return data;
}

export async function fetchPublicBranchMenu(slug, branchId) {
  const res = await fetch(`/api/public/menu/${encodeURIComponent(slug)}/branches/${encodeURIComponent(branchId)}`);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Şube menüsü yüklenemedi");
  return data;
}

export function getPublicProductImageSrc(slug, branchId, product) {
  if (!product?.hasImage) return null;
  return `/api/public/menu/${encodeURIComponent(slug)}/branches/${encodeURIComponent(branchId)}/products/${product.id}/image`;
}

export async function submitPublicOrder(slug, branchId, payload) {
  const res = await fetch(
    `/api/public/menu/${encodeURIComponent(slug)}/branches/${encodeURIComponent(branchId)}/orders`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }
  );
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

export function getMenuPublicUrl(menuSlug) {
  return `${window.location.origin}/m/${menuSlug}`;
}

export function getQrCodeUrl(menuUrl) {
  return `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(menuUrl)}`;
}
