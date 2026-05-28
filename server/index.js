import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import { getDb } from "./db/index.js";
import { authMiddleware } from "./middleware/auth.js";
import authRoutes from "./routes/auth.js";
import apiRoutes from "./routes/api.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3001;

getDb();

app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: "2mb" }));

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, service: "benimpos-api" });
});

app.use("/api/auth", authRoutes);

app.use("/api", authMiddleware, apiRoutes);

if (process.env.NODE_ENV === "production") {
  const dist = path.join(__dirname, "..", "dist");
  app.use(express.static(dist));
  app.get("*", (_req, res) => {
    res.sendFile(path.join(dist, "index.html"));
  });
}

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: err.message || "Server error" });
});

app.listen(PORT, () => {
  console.log(`BenimPOS API running on http://localhost:${PORT}`);
  console.log("Login: admin@benimpos.com / admin123");
});
