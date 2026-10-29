import { formatDateTime, formatMoney } from "./format";

function wrapText(ctx, text, maxWidth) {
  const words = String(text || "").split(/\s+/);
  const lines = [];
  let line = "";
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (ctx.measureText(next).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = next;
    }
  }
  if (line) lines.push(line);
  return lines.length ? lines : [""];
}

function drawPurchaseCanvas(purchase, extras = {}) {
  const canvas = document.createElement("canvas");
  canvas.width = 794;
  canvas.height = 1123;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#fffaf6";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#7a1f12";
  ctx.fillRect(0, 0, canvas.width, 88);

  ctx.fillStyle = "#ffffff";
  ctx.font = "700 22px Segoe UI, Arial, sans-serif";
  ctx.fillText("İK  İstanbul Çiğköfte", 48, 38);
  ctx.font = "800 32px Segoe UI, Arial, sans-serif";
  ctx.fillText("Alış fakturası", 48, 72);

  let y = 140;
  ctx.fillStyle = "#1c1917";
  ctx.font = "600 20px Segoe UI, Arial, sans-serif";
  ctx.fillText(extras.storeName || "UgurPOS", 48, y);
  y += 32;
  ctx.font = "500 18px Segoe UI, Arial, sans-serif";
  ctx.fillStyle = "#57534e";
  ctx.fillText(extras.personName || "Əlman", 48, y);
  y += 28;
  ctx.fillText(formatDateTime(purchase?.createdAt || new Date(), "az"), 48, y);
  y += 28;
  ctx.fillText(`No: ${String(purchase?.id || "").slice(-8)}`, 48, y);
  y += 36;

  ctx.strokeStyle = "#e7e0d8";
  ctx.beginPath();
  ctx.moveTo(48, y);
  ctx.lineTo(746, y);
  ctx.stroke();
  y += 36;

  ctx.fillStyle = "#78716c";
  ctx.font = "700 14px Segoe UI, Arial, sans-serif";
  ctx.fillText("MƏHSUL", 48, y);
  ctx.fillText("SAY", 430, y);
  ctx.fillText("QİYMƏT", 530, y);
  ctx.fillText("CƏM", 660, y);
  y += 24;

  ctx.fillStyle = "#1c1917";
  ctx.font = "500 16px Segoe UI, Arial, sans-serif";
  for (const line of purchase?.lines || []) {
    const qty = `${line.qty} ${line.unit || ""}`.trim();
    const names = wrapText(ctx, line.name, 360);
    names.forEach((part, index) => {
      ctx.fillText(part, 48, y + index * 22);
    });
    ctx.fillText(qty, 430, y);
    ctx.fillText(formatMoney(line.price), 530, y);
    ctx.fillText(formatMoney(Number(line.qty || 0) * Number(line.price || 0)), 660, y);
    y += Math.max(28, names.length * 22 + 8);
    if (y > 980) break;
  }

  y = Math.max(y + 12, 1000);
  ctx.fillStyle = "#7a1f12";
  ctx.fillRect(48, y, 698, 56);
  ctx.fillStyle = "#ffffff";
  ctx.font = "800 22px Segoe UI, Arial, sans-serif";
  ctx.fillText("Ümumi", 68, y + 36);
  ctx.fillText(formatMoney(purchase?.total), 520, y + 36);
  return canvas;
}

function jpegToPdf(jpeg, width, height) {
  const pageW = 595;
  const pageH = 842;
  const fit = Math.min((pageW - 48) / width, (pageH - 48) / height);
  const w = width * fit;
  const h = height * fit;
  const x = (pageW - w) / 2;
  const y = (pageH - h) / 2;
  const encoder = new TextEncoder();
  const chunks = [];
  const offsets = [0];
  let pos = 0;
  const add = (text, binary) => {
    const bytes = binary || encoder.encode(text);
    chunks.push(bytes);
    pos += bytes.length;
  };
  const startObj = () => {
    offsets.push(pos);
  };

  add("%PDF-1.4\n");
  startObj();
  add("1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj\n");
  startObj();
  add("2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj\n");
  startObj();
  add(
    `3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageW} ${pageH}] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >> endobj\n`
  );
  startObj();
  add(
    `4 0 obj << /Type /XObject /Subtype /Image /Width ${width} /Height ${height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpeg.length} >> stream\n`
  );
  add("", jpeg);
  add("\nendstream endobj\n");
  const content = `q ${w.toFixed(2)} 0 0 ${h.toFixed(2)} ${x.toFixed(2)} ${y.toFixed(2)} cm /Im0 Do Q\n`;
  startObj();
  add(`5 0 obj << /Length ${content.length} >> stream\n${content}endstream endobj\n`);
  const xref = pos;
  add("xref\n0 6\n0000000000 65535 f \n");
  for (let i = 1; i <= 5; i += 1) {
    add(`${String(offsets[i]).padStart(10, "0")} 00000 n \n`);
  }
  add(`trailer << /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`);

  const out = new Uint8Array(pos);
  let offset = 0;
  for (const chunk of chunks) {
    out.set(chunk, offset);
    offset += chunk.length;
  }
  return out;
}

function canvasToJpegBytes(canvas) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      async (blob) => {
        if (!blob) {
          reject(new Error("PDF hazırlanmadı"));
          return;
        }
        resolve(new Uint8Array(await blob.arrayBuffer()));
      },
      "image/jpeg",
      0.88
    );
  });
}

export function elemanPurchaseShareText(purchase, extras = {}) {
  const lines = (purchase?.lines || [])
    .map(
      (line) =>
        `${line.qty} ${line.unit || ""} ${line.name} · ${formatMoney(line.price)} = ${formatMoney(
          Number(line.qty || 0) * Number(line.price || 0)
        )}`
    )
    .join("\n");
  return [
    "Alış fakturası",
    extras.storeName || "",
    extras.personName || "",
    formatDateTime(purchase?.createdAt || new Date(), "az"),
    "",
    lines,
    "",
    `Cəm: ${formatMoney(purchase?.total)}`,
  ]
    .filter((row) => row !== "")
    .join("\n");
}

export async function elemanPurchasePdfFile(purchase, extras = {}) {
  const canvas = drawPurchaseCanvas(purchase, extras);
  const jpeg = await canvasToJpegBytes(canvas);
  const pdf = jpegToPdf(jpeg, canvas.width, canvas.height);
  const name = `alis-${String(purchase?.id || "fatura").slice(-8)}.pdf`;
  return new File([pdf], name, { type: "application/pdf" });
}

function triggerDownload(file) {
  const url = URL.createObjectURL(file);
  const link = document.createElement("a");
  link.href = url;
  link.download = file.name;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1500);
}

export async function downloadElemanPurchasePdf(purchase, extras = {}) {
  const file = await elemanPurchasePdfFile(purchase, extras);
  triggerDownload(file);
  return file;
}

export async function shareElemanPurchaseWhatsApp(purchase, extras = {}) {
  const file = await elemanPurchasePdfFile(purchase, extras);
  const text = elemanPurchaseShareText(purchase, extras);
  try {
    if (navigator.canShare?.({ files: [file] })) {
      await navigator.share({ files: [file], title: "Alış fakturası", text });
      return;
    }
  } catch (err) {
    if (err?.name === "AbortError") return;
  }
  triggerDownload(file);
  window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank", "noopener,noreferrer");
}
