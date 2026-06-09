/**
 * UgurPOS — full-stack entry (Hostinger / VPS / self-hosted)
 * Express API (server/app.js) + React SPA (dist/)
 */
import express from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import app from "./server/app.js";
import { resolveUploadsRoot } from "./server/utils/uploadsDir.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.join(__dirname, "dist");
const distIndex = path.join(distDir, "index.html");
const uploadsDir = resolveUploadsRoot();

if (!process.env.VERCEL) {
  if (!fs.existsSync(distIndex)) {
    console.error("[UgurPOS] dist/index.html yok. Build: npm run build");
    process.exit(1);
  }

  app.use(
    "/uploads/menu-logos",
    express.static(path.join(uploadsDir, "menu-logos"), {
      maxAge: 0,
      etag: true,
      fallthrough: true,
    })
  );

  app.use(
    "/uploads",
    express.static(uploadsDir, {
      maxAge: process.env.NODE_ENV === "production" ? "7d" : 0,
      fallthrough: true,
    })
  );

  app.use(express.static(distDir));

  // Express 5: '*' isimli wildcard gerektirir (/{*splat})
  app.get("/{*splat}", (req, res, next) => {
    if (req.path.startsWith("/api")) return next();
    res.sendFile(distIndex, (err) => {
      if (err) next(err);
    });
  });
}

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: err.message || "Server error" });
});

const PORT = Number(process.env.PORT) || 3001;
const HOST = process.env.HOST || "0.0.0.0";

process.on("uncaughtException", (err) => {
  console.error("[UgurPOS] uncaughtException:", err);
  process.exit(1);
});

process.on("unhandledRejection", (err) => {
  console.error("[UgurPOS] unhandledRejection:", err);
  process.exit(1);
});

try {
  app.listen(PORT, HOST, () => {
    console.log(`UgurPOS full-stack running on port ${PORT}`);
    console.log(`Static: ${distDir}`);
    console.log(`Uploads: ${uploadsDir}`);
    if (process.env.NODE_ENV !== "production") {
      console.log("Login: admin@benimpos.com / admin123");
    }
  });
} catch (err) {
  console.error("[UgurPOS] Server baslatilamadi:", err);
  process.exit(1);
}

export default app;
