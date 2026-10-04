import { formatMoney } from "./format";

/** Web sifariş səhifəsində qiymət Kurulum-dakı valyuta ilə göstərilir. */
export function formatPublicMoney(value) {
  return formatMoney(value);
}
