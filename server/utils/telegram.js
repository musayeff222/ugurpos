const TOKEN = String(process.env.TELEGRAM_BOT_TOKEN || "").trim();

function chatIds() {
  return String(process.env.TELEGRAM_CHAT_IDS || "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);
}

function botText(value) {
  return String(value ?? "")
    .replace(/ə/g, "e")
    .replace(/Ə/g, "E")
    .trim();
}

function clock(value) {
  const date = value ? new Date(value) : new Date();
  if (!Number.isFinite(date.getTime())) return "";
  return new Intl.DateTimeFormat("tr-TR", {
    timeZone: "Asia/Baku",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function sumItems(items) {
  return (Array.isArray(items) ? items : []).reduce((sum, item) => {
    const qty = Number(item.qty) || 0;
    const price = Number(item.price) || 0;
    return sum + qty * price;
  }, 0);
}

function money(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "";
  return `${n.toFixed(2)} AZN`;
}

function paymentName(type, methodName) {
  const names = {
    cash: "Nakit",
    pos: "Kart",
    open: "Acik hesap",
    partial: "Parcali odeme",
    other: methodName || "Diger",
    refund: "Iade",
  };
  return names[type] || type || "";
}

function itemLines(items) {
  return (Array.isArray(items) ? items : []).slice(0, 25).map((item) => {
    const qty = Number(item.qty) || 0;
    const price = Number(item.price) || 0;
    const name = botText(item.name || "Urun");
    if (price > 0) return `${qty} x ${name} = ${money(qty * price)}`;
    return `${qty} x ${name}`;
  });
}

function linesOf(parts) {
  return parts
    .filter((line) => typeof line === "string" && line.trim())
    .map((line) => botText(line))
    .join("\n");
}

function saleText(data, requestBody, user) {
  const items = data.items?.length ? data.items : requestBody?.items;
  const lines = itemLines(items);
  const total = data.total != null && data.total !== "" ? data.total : sumItems(items);
  return linesOf([
    "SATIS",
    `Saat: ${clock(data.createdAt)}`,
    user?.branchName && `Sube: ${user.branchName}`,
    (data.staffName || requestBody?.staffName || user?.staffName) &&
      `Kasiyer: ${data.staffName || requestBody?.staffName || user.staffName}`,
    data.code && `Fis: ${data.code}`,
    `Odeme: ${paymentName(data.paymentType || requestBody?.paymentType, data.paymentMethodName)}`,
    `Tutar: ${money(total)}`,
    Number(data.cashAmount) > 0 && `Nakit: ${money(data.cashAmount)}`,
    Number(data.posAmount) > 0 && `Kart: ${money(data.posAmount)}`,
    (data.note || requestBody?.note) && `Not: ${data.note || requestBody.note}`,
    lines.length ? "Satilanlar:" : "Satilanlar: urun satiri gelmedi",
    ...lines,
  ]);
}

function expenseText(data, user) {
  return linesOf([
    "KASSADAN XERC",
    `Saat: ${clock(data.createdAt)}`,
    user?.branchName && `Sube: ${user.branchName}`,
    (data.staffName || user?.staffName) && `Personel: ${data.staffName || user.staffName}`,
    `Tutar: ${money(data.amount)}`,
    data.reason && `Sebep: ${data.reason}`,
    data.note && `Not: ${data.note}`,
  ]);
}

function orderText(data) {
  const items = itemLines(data.items);
  return linesOf([
    "WEB SIPARIS",
    data.code && `Kod: ${data.code}`,
    data.branchName && `Sube: ${data.branchName}`,
    data.customerName && `Musteri: ${data.customerName}`,
    data.customerPhone && `Telefon: ${data.customerPhone}`,
    (data.deliveryAddress || data.tableNo) && `Adres: ${data.deliveryAddress || data.tableNo}`,
    `Tutar: ${money(data.total)}`,
    data.note && `Not: ${data.note}`,
    items.length && "Urunler:",
    ...items,
  ]);
}

function loginText(path, data, user) {
  const account = data?.user || user || {};
  const title = path.includes("staff-login")
    ? "KASSIR GIRISI"
    : path.includes("branch-login")
      ? "SUBE GIRISI"
      : "ADMIN GIRISI";
  return linesOf([
    title,
    `Saat: ${clock(account.shiftStartedAt)}`,
    (account.staffName || account.branchName || account.email) &&
      `Kim: ${account.staffName || account.branchName || account.email}`,
    account.branchName && account.staffName && `Sube: ${account.branchName}`,
    account.staffRole && `Gorev: ${account.staffRole}`,
  ]);
}

function shiftText(path, data, user) {
  const shift = data?.shift || {};
  const title = path.includes("open") ? "NOBET BASLADI" : "NOBET BITTI";
  return linesOf([
    title,
    `Saat: ${clock(shift.endedAt || shift.startedAt)}`,
    (user?.staffName || shift.staffName) && `Personel: ${user?.staffName || shift.staffName}`,
    user?.branchName && `Sube: ${user.branchName}`,
    shift.startedAt && `Baslangic: ${clock(shift.startedAt)}`,
    shift.endedAt && `Bitis: ${clock(shift.endedAt)}`,
  ]);
}

function productText(method, data, user) {
  const row = data?.product || data || {};
  const title = method === "DELETE" ? "URUN SILINDI" : method === "POST" ? "URUN EKLENDI" : "URUN GUNCELLENDI";
  return linesOf([
    title,
    user?.branchName && `Sube: ${user.branchName}`,
    row.name && `Ad: ${row.name}`,
    (row.price1 != null || row.price != null) && `Fiyat: ${money(row.price1 ?? row.price)}`,
    row.stock != null && `Stok: ${row.stock} ${row.unit || ""}`.trim(),
  ]);
}

export function formatNotice(method, path, user, data, requestBody) {
  const body = data && typeof data === "object" ? data : {};
  const incoming = requestBody && typeof requestBody === "object" ? requestBody : {};
  if (path.endsWith("/sales") && method === "POST") return saleText(body, incoming, user);
  if (path.includes("/sales/") && (method === "DELETE" || method === "PATCH")) {
    return linesOf([
      method === "DELETE" ? "SATIS SILINDI" : "SATIS DUZELTILDI",
      user?.branchName && `Sube: ${user.branchName}`,
      body.code && `Fis: ${body.code}`,
      body.total != null && `Tutar: ${money(body.total)}`,
      body.paymentType && `Odeme: ${paymentName(body.paymentType, body.paymentMethodName)}`,
    ]);
  }
  if (path.includes("/cash-withdrawals")) return expenseText(body, user);
  if (path.includes("/orders")) return orderText(body);
  if (/\/auth\/(login|branch-login|staff-login)$/.test(path)) return loginText(path, body, user);
  if (path.includes("/staff/end-shift") || path.includes("/staff/shifts/")) return shiftText(path, body, user);
  if (path.includes("/products") || path.includes("/catalog")) return productText(method, body, user);
  return linesOf([
    "ISLEM",
    user?.branchName && `Sube: ${user.branchName}`,
    (user?.staffName || user?.email) && `Kim: ${user.staffName || user.email}`,
    body.name && `Ad: ${body.name}`,
    body.amount != null && `Tutar: ${money(body.amount)}`,
    body.total != null && `Tutar: ${money(body.total)}`,
    body.reason && `Sebep: ${body.reason}`,
  ]);
}

export function notifyTelegram(text) {
  const ids = chatIds();
  const message = botText(text).slice(0, 4000);
  if (!TOKEN || !ids.length || !message) return;
  for (const chatId of ids) {
    fetch(`https://api.telegram.org/bot${TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        disable_web_page_preview: true,
      }),
    }).catch(() => {});
  }
}

export function notifyRequest(req, res) {
  const method = req.method;
  if (!["POST", "PUT", "PATCH", "DELETE"].includes(method)) return;
  const path = String(req.originalUrl || req.url || "").split("?")[0];
  if (!path.startsWith("/api/") || path === "/api/health") return;

  const login = /\/auth\/(login|branch-login|staff-login)$/.test(path);
  const shift =
    path.includes("/staff/end-shift") || path.includes("/staff/shifts/open") || path.includes("/staff/shifts/close");
  if (method === "POST" && res.statusCode !== 201 && !(login && res.statusCode === 200) && !(shift && res.statusCode < 300)) {
    return;
  }
  if (method !== "POST" && res.statusCode >= 300) return;
  if (login && res.statusCode !== 200) return;

  const data = res.locals?.telegramBody;
  const safe = data?.token ? { ...data, token: undefined } : data;
  notifyTelegram(formatNotice(method, path, req.user, safe, req.body));
}
