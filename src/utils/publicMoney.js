import { formatMoney } from "./format";

/** Web siparis sayfasinda fiyatlar her zaman AZN (₼) olarak gosterilir. */
export function formatPublicMoney(value) {
  return formatMoney(value, "az");
}
