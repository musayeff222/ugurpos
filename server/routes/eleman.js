import { Router } from "express";
import { getDb } from "../db/index.js";
import { invoiceImageUpload } from "../middleware/imageUpload.js";
import { signElemanToken } from "../middleware/auth.js";
import {
  acceptElemanDelivery,
  createElemanDelivery,
  createElemanPurchase,
  elemanOverview,
  listBranchCashiers,
  pendingStaffDeliveries,
  publicElemanUser,
  updateElemanSelf,
} from "../utils/eleman.js";

const router = Router();

function sendError(res, err, status = 400) {
  res.status(status).json({ error: err.message || "İşlem yapılamadı" });
}

function requireEleman(req, res, next) {
  if (req.user?.loginType !== "eleman") {
    return res.status(403).json({ error: "Əlman girişi lazımdır" });
  }
  next();
}

function requireStaff(req, res, next) {
  if (req.user?.role !== "staff" || !req.user?.staffId) {
    return res.status(403).json({ error: "Kassir girişi lazımdır" });
  }
  next();
}

function invoiceUrlFromFile(req) {
  return `/uploads/eleman-invoices/${encodeURIComponent(req.user.firmId)}/${encodeURIComponent(req.file.filename)}`;
}

function maybeInvoiceUpload(req, res, next) {
  const type = String(req.headers["content-type"] || "");
  if (!type.includes("multipart/form-data")) return next();
  invoiceImageUpload.single("image")(req, res, (err) => {
    if (!err) return next();
    const tooBig = err.code === "LIMIT_FILE_SIZE";
    return res.status(400).json({
      error: tooBig ? "Şəkil çox böyükdür. Kameradan yenidən çəkin." : err.message || "Faktura yüklənmədi",
    });
  });
}

router.patch("/profile", requireEleman, (req, res) => {
  try {
    const db = getDb();
    const row = updateElemanSelf(db, req.user.firmId, req.user.elemanId, req.body || {});
    const firmName =
      db.prepare("SELECT firm_name FROM users WHERE firm_id = ? LIMIT 1").get(req.user.firmId)?.firm_name ||
      req.user.firmName;
    res.json({
      token: signElemanToken(row),
      user: publicElemanUser(row, firmName, req.user.currency),
    });
  } catch (err) {
    sendError(res, err);
  }
});

router.get("/overview", requireEleman, (req, res) => {
  try {
    res.json(elemanOverview(getDb(), req.user.firmId, req.user.elemanId));
  } catch (err) {
    sendError(res, err);
  }
});

router.get("/branches/:branchId/cashiers", requireEleman, (req, res) => {
  try {
    res.json(listBranchCashiers(getDb(), req.user.firmId, req.params.branchId));
  } catch (err) {
    sendError(res, err);
  }
});

router.post("/invoice", requireEleman, maybeInvoiceUpload, (req, res) => {
  try {
    if (!req.file?.filename) throw new Error("Faktura şəklini yükləyin");
    res.json({ invoiceUrl: invoiceUrlFromFile(req) });
  } catch (err) {
    sendError(res, err);
  }
});

router.post("/purchases", requireEleman, maybeInvoiceUpload, (req, res) => {
  try {
    let lines = req.body?.lines;
    if (typeof lines === "string") {
      try {
        lines = JSON.parse(lines);
      } catch {
        throw new Error("Məhsul siyahısı səhvdir");
      }
    }
    const invoiceUrl = req.file?.filename ? invoiceUrlFromFile(req) : String(req.body?.invoiceUrl || "").trim();
    res.status(201).json(createElemanPurchase(getDb(), req.user.firmId, req.user.elemanId, { lines, invoiceUrl }));
  } catch (err) {
    sendError(res, err);
  }
});

router.post("/deliveries", requireEleman, (req, res) => {
  try {
    res.status(201).json(createElemanDelivery(getDb(), req.user.firmId, req.user.elemanId, req.body || {}));
  } catch (err) {
    sendError(res, err);
  }
});

router.get("/deliveries/pending", requireStaff, (req, res) => {
  try {
    res.json(pendingStaffDeliveries(getDb(), req.user.staffId, req.user.branchId));
  } catch (err) {
    sendError(res, err);
  }
});

router.post("/deliveries/:id/accept", requireStaff, (req, res) => {
  try {
    res.json(acceptElemanDelivery(getDb(), req.user.staffId, req.user.branchId, req.params.id));
  } catch (err) {
    sendError(res, err);
  }
});

export default router;
