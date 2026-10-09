import { Router } from "express";
import { getDb } from "../db/index.js";
import {
  createKassa,
  createPurchase,
  createWholesaler,
  getAccountingOverview,
  payDebt,
  pullBranchCash,
} from "../utils/accounting.js";

const router = Router();

function sendError(res, err) {
  res.status(400).json({ error: err.message || "İşlem yapılamadı" });
}

router.get("/", (req, res) => {
  try {
    res.json(getAccountingOverview(getDb(), req.user.firmId));
  } catch (err) {
    sendError(res, err);
  }
});

router.post("/wholesalers", (req, res) => {
  try {
    res.status(201).json(createWholesaler(getDb(), req.user.firmId, req.body || {}));
  } catch (err) {
    sendError(res, err);
  }
});

router.post("/kassas", (req, res) => {
  try {
    res.status(201).json(createKassa(getDb(), req.user.firmId, req.body || {}));
  } catch (err) {
    sendError(res, err);
  }
});

router.post("/purchases", (req, res) => {
  try {
    res.status(201).json(createPurchase(getDb(), req.user.firmId, req.body || {}));
  } catch (err) {
    sendError(res, err);
  }
});

router.post("/debts/pay", (req, res) => {
  try {
    res.json(payDebt(getDb(), req.user.firmId, req.body || {}));
  } catch (err) {
    sendError(res, err);
  }
});

router.post("/pull", (req, res) => {
  try {
    res.status(201).json(pullBranchCash(getDb(), req.user.firmId, req.body || {}));
  } catch (err) {
    sendError(res, err);
  }
});

export default router;
