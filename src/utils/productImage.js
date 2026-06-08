import { getToken } from "../api/client";

export function getProductImageSrc(product) {
  if (!product?.hasImage && !product?.imageUrl) return null;
  if (product.imageUrl?.startsWith("/uploads/")) return product.imageUrl;
  const token = getToken();
  const base = product.imageUrl || `/api/products/${product.id}/image`;
  if (!token) return base;
  return `${base}?token=${encodeURIComponent(token)}`;
}
