import { Router } from "express";
import { getDb } from "../db/index.js";
import { invoiceImageUpload } from "../middleware/imageUpload.js";
import {
  acceptElemanDelivery,
  createElemanDelivery,
  createElemanPurchase,
  elemanOverview,
  listBranchCashiers,
  pendingStaffDeliveries,
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

router.post("/invoice", requireEleman, invoiceImageUpload.single("image"), (req, res) => {
  try {
    if (!req.file?.filename) throw new Error("Faktura şəklini yükləyin");
    res.json({
      invoiceUrl: `/uploads/eleman-invoices/${encodeURIComponent(req.user.firmId)}/${encodeURIComponent(req.file.filename)}`,
    });
  } catch (err) {
    sendError(res, err);
  }
});

router.post("/purchases", requireEleman, (req, res) => {
  try {
    res.status(201).json(createElemanPurchase(getDb(), req.user.firmId, req.user.elemanId, req.body || {}));
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
