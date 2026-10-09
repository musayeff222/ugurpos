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
import productionRoutes from "./routes/production.js";
import { startBusinessDayScheduler } from "./utils/businessDayScheduler.js";
import { notifyRequest } from "./utils/telegram.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

app.set("trust proxy", 1);

getDb();
startBusinessDayScheduler();

app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: "5mb" }));
app.use((req, res, next) => {
  const sendJson = res.json.bind(res);
  res.json = (body) => {
    res.locals.telegramBody = body;
    return sendJson(body);
  };
  res.on("finish", () => {
    try {
      notifyRequest(req, res);
    } catch {
      /* bildiriş satışın özünü dayandırmasın */
    }
  });
  next();
});

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
app.use("/api/production", authMiddleware, productionRoutes);
app.use("/api", authMiddleware, apiRoutes);

export default app;
