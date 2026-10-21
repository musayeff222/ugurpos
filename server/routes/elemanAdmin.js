import { Router } from "express";
import { getDb } from "../db/index.js";
import {
  addElemanCash,
  createElemanPerson,
  getElemanPerson,
  listElemanPeople,
  listElemanProducts,
  setElemanBlocked,
  updateElemanPerson,
  updateElemanProduct,
} from "../utils/eleman.js";

const router = Router();

function sendError(res, err) {
  res.status(400).json({ error: err.message || "İşlem yapılamadı" });
}

router.get("/products", (req, res) => {
  try {
    res.json(listElemanProducts(getDb(), req.user.firmId));
  } catch (err) {
    sendError(res, err);
  }
});

router.patch("/products/:id", (req, res) => {
  try {
    res.json(updateElemanProduct(getDb(), req.user.firmId, req.params.id, req.body || {}));
  } catch (err) {
    sendError(res, err);
  }
});

router.get("/people", (req, res) => {
  try {
    res.json(listElemanPeople(getDb(), req.user.firmId));
  } catch (err) {
    sendError(res, err);
  }
});

router.post("/people", (req, res) => {
  try {
    res.status(201).json(createElemanPerson(getDb(), req.user.firmId, req.body || {}));
  } catch (err) {
    sendError(res, err);
  }
});

router.get("/people/:id", (req, res) => {
  try {
    res.json(getElemanPerson(getDb(), req.user.firmId, req.params.id));
  } catch (err) {
    sendError(res, err);
  }
});

router.patch("/people/:id", (req, res) => {
  try {
    res.json(updateElemanPerson(getDb(), req.user.firmId, req.params.id, req.body || {}));
  } catch (err) {
    sendError(res, err);
  }
});

router.post("/people/:id/block", (req, res) => {
  try {
    res.json(setElemanBlocked(getDb(), req.user.firmId, req.params.id, req.body?.blocked !== false));
  } catch (err) {
    sendError(res, err);
  }
});

router.post("/people/:id/unblock", (req, res) => {
  try {
    res.json(setElemanBlocked(getDb(), req.user.firmId, req.params.id, false));
  } catch (err) {
    sendError(res, err);
  }
});

router.post("/people/:id/cash", (req, res) => {
  try {
    res.json(addElemanCash(getDb(), req.user.firmId, req.params.id, req.body || {}));
  } catch (err) {
    sendError(res, err);
  }
});

export default router;
