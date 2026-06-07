import express from "express";
import cors from "cors";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { getDb } from "./db/index.js";
import { authMiddleware } from "./middleware/auth.js";
import authRoutes from "./routes/auth.js";
import adminRoutes from "./routes/admin.js";
import apiRoutes from "./routes/api.js";
import publicRoutes from "./routes/public.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

app.set("trust proxy", 1);

getDb();

app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: "5mb" }));

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, service: "ugurpos-api" });
});

app.use("/api/public", publicRoutes);

app.use("/api/auth", authRoutes);
app.use("/api/admin", authMiddleware, adminRoutes);
app.use("/api", authMiddleware, apiRoutes);

const dist = path.join(__dirname, "..", "dist");
const distIndex = path.join(dist, "index.html");

if (!process.env.VERCEL && fs.existsSync(distIndex)) {
  app.use(express.static(dist, { index: false }));
  app.get(/^(?!\/api).*/, (_req, res) => {
    res.sendFile(distIndex);
  });
}

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: err.message || "Server error" });
});

export default app;
