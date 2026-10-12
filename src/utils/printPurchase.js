import { createRoot } from "react-dom/client";
import { createElement } from "react";
import PurchaseInvoice from "../components/print/PurchaseInvoice";
import "../styles/print-receipt.css";

function cleanupPrint(rootEl, reactRoot) {
  reactRoot.unmount();
  rootEl.remove();
  document.body.classList.remove("printing-a4");
}

export function printPurchaseInvoice(purchase, storeName) {
  if (!purchase?.lines?.length) return;
  const rootEl = document.createElement("div");
  rootEl.className = "receipt-print-root print-area";
  document.body.appendChild(rootEl);
  document.body.classList.add("printing-a4");
  const reactRoot = createRoot(rootEl);
  reactRoot.render(createElement(PurchaseInvoice, { purchase, storeName }));
  window.setTimeout(() => {
    window.print();
    window.setTimeout(() => cleanupPrint(rootEl, reactRoot), 300);
  }, 150);
}
