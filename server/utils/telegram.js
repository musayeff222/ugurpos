const TOKEN = String(process.env.TELEGRAM_BOT_TOKEN || "").trim();

function chatIds() {
  return String(process.env.TELEGRAM_CHAT_IDS || "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);
}

function labelFor(method, path) {
  if (path.includes("/auth/staff-login")) return "Kassir girişi";
  if (path.includes("/auth/branch-login")) return "Şöbə girişi";
  if (path.includes("/auth/login")) return "Admin girişi";
  if (path.includes("/staff/end-shift") || path.includes("/staff/shifts/close")) return "Növbə bitdi";
  if (path.includes("/staff/shifts/open")) return "Növbə başladı";
  if (path.includes("/cash-withdrawals")) return method === "DELETE" ? "Kassadan xərc silindi" : "Kassadan xərc";
  if (path.includes("/menu/") && path.includes("/orders")) return "Veb sifariş";
  if (path.endsWith("/sales") && method === "POST") return "Satış";
  if (path.includes("/sales/") && method === "DELETE") return "Satış silindi";
  if (path.includes("/sales/") && method === "PATCH") return "Satış düzəldi";
  if (path.includes("/products")) return "Məhsul əməliyyatı";
  if (path.includes("/catalog")) return "Kataloq əməliyyatı";
  if (path.includes("/production")) return "İstehsalat əməliyyatı";
  if (path.includes("/staff")) return "Personal əməliyyatı";
  return "Əməliyyat";
}

export function notifyTelegram(text) {
  const ids = chatIds();
  if (!TOKEN || !ids.length || !text) return;
  const message = String(text).slice(0, 4000);
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

  const who = req.user?.staffName || req.user?.email || req.user?.branchName || "";
  const branch = req.user?.branchName || "";
  const lines = [labelFor(method, path)];
  if (branch && who !== branch) lines.push(branch);
  if (who) lines.push(who);
  lines.push(`${method} ${path}`);
  notifyTelegram(lines.join("\n"));
}
