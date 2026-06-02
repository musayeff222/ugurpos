import { createRoot } from "react-dom/client";
import { createElement } from "react";
import SaleReceipt, { buildReceiptText } from "../components/print/SaleReceipt";

function cleanupPrint(rootEl, reactRoot, bodyClass) {
  reactRoot.unmount();
  rootEl.remove();
  document.body.classList.remove(bodyClass);
}

export function printSaleReceipt(data, { paper = "thermal", copyLabel = "" } = {}) {
  if (!data?.items?.length) {
    return { ok: false, message: "Yazdırılacak ürün bulunamadı." };
  }

  const bodyClass = paper === "a4" ? "printing-a4" : "printing-thermal";
  const rootEl = document.createElement("div");
  rootEl.className = "receipt-print-root print-area";
  document.body.appendChild(rootEl);
  document.body.classList.add(bodyClass);

  const reactRoot = createRoot(rootEl);
  reactRoot.render(
    createElement(SaleReceipt, {
      data: { ...data, copyLabel },
      paper,
      copyLabel,
    })
  );

  window.setTimeout(() => {
    window.print();
    window.setTimeout(() => cleanupPrint(rootEl, reactRoot, bodyClass), 300);
  }, 150);

  return { ok: true };
}

export function sendReceiptWhatsApp(data, phoneRaw = "") {
  if (!data?.items?.length) {
    return { ok: false, message: "Gönderilecek fiş bulunamadı." };
  }

  const text = encodeURIComponent(buildReceiptText(data));
  const digits = String(phoneRaw).replace(/\D/g, "");
  const url = digits.length >= 10 ? `https://wa.me/${digits}?text=${text}` : `https://wa.me/?text=${text}`;
  window.open(url, "_blank", "noopener,noreferrer");
  return { ok: true };
}
