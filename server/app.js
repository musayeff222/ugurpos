import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import { getDb, getDbDriver } from "./db/index.js";
import { getUploadsStats } from "./utils/uploadsDir.js";
import { authMiddleware } from "./middleware/auth.js";
import authRoutes from "./routes/auth.js";
import adminRoutes from "./routes/admin.js";
import apiRoutes from "./routes/api.js";
import publicRoutes from "./routes/public.js";
import { startBusinessDayScheduler } from "./utils/businessDayScheduler.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

app.set("trust proxy", 1);

getDb();
startBusinessDayScheduler();

app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: "5mb" }));

app.get("/api/health", (_req, res) => {
  const uploads = getUploadsStats();
  res.json({
    ok: true,
    service: "ugurpos-api",
    mode: "fullstack",
    db: getDbDriver(),
    uploadsDir: uploads.root,
    uploadsPersistent: uploads.persistent,
    uploads,
  });
});

app.use("/api/public", publicRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/admin", authMiddleware, adminRoutes);
app.use("/api", authMiddleware, apiRoutes);

export default app;
