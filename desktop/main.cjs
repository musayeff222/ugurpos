const { app, BrowserWindow, ipcMain, shell } = require("electron");
const crypto = require("crypto");
const http = require("http");
const https = require("https");
const fs = require("fs");
const path = require("path");

const API_HOST = "cigkofte.az";

function readProfile() {
  const defaults = {
    startPath: "/login/kasiyer",
    title: "UgurPOS Kassir",
    fullscreen: false,
  };
  try {
    const pkg = require("./package.json");
    return { ...defaults, ...(pkg.ugurposProfile || {}) };
  } catch {
    return defaults;
  }
}

const PROFILE = readProfile();
const START_PATH = PROFILE.startPath || "/login/kasiyer";

ipcMain.on("ugurpos-quit", () => {
  app.quit();
});

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
};

function appDir() {
  if (app.isPackaged) return path.join(process.resourcesPath, "app");
  return path.join(__dirname, "app");
}

const HOP_HEADERS = new Set([
  "connection",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailers",
  "transfer-encoding",
  "upgrade",
  "host",
  "referer",
  "origin",
  "accept-encoding",
  "alt-svc",
  "expect",
]);

function imageCacheDir() {
  return path.join(app.getPath("userData"), "image-cache");
}

function cachePathFor(pathname) {
  const hash = crypto.createHash("sha1").update(pathname).digest("hex");
  const ext = path.extname(pathname).toLowerCase();
  return path.join(imageCacheDir(), hash + (MIME[ext] ? ext : ".img"));
}

function isImagePath(pathname) {
  return pathname.startsWith("/uploads") || /\/image$/i.test(pathname);
}

function sniffImageType(buf) {
  if (!buf || buf.length < 12) return "";
  if (buf.toString("ascii", 0, 4) === "RIFF" && buf.toString("ascii", 8, 12) === "WEBP") return "image/webp";
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "image/jpeg";
  if (buf[0] === 0x89 && buf.toString("ascii", 1, 4) === "PNG") return "image/png";
  if (buf.toString("ascii", 0, 3) === "GIF") return "image/gif";
  return "";
}

function copyRequestHeaders(req, imageLike) {
  const headers = {};
  for (const [key, value] of Object.entries(req.headers || {})) {
    if (HOP_HEADERS.has(key.toLowerCase())) continue;
    headers[key] = value;
  }
  headers.host = API_HOST;
  headers["accept-encoding"] = "identity";
  if (imageLike) {
    headers.accept = "image/jpeg,image/png,image/webp,image/gif,*/*;q=0.8";
  }
  return headers;
}

function copyResponseHeaders(incoming) {
  const headers = {};
  const skip = new Set([
    "connection",
    "keep-alive",
    "proxy-authenticate",
    "proxy-authorization",
    "te",
    "trailers",
    "transfer-encoding",
    "upgrade",
    "alt-svc",
    "accept-ranges",
  ]);
  for (const [key, value] of Object.entries(incoming.headers || {})) {
    if (skip.has(key.toLowerCase())) continue;
    headers[key] = value;
  }
  return headers;
}

function sendCachedImage(res, cacheFile) {
  if (!cacheFile || !fs.existsSync(cacheFile)) return false;
  try {
    const buf = fs.readFileSync(cacheFile);
    if (!buf.length) return false;
    const type = sniffImageType(buf) || MIME[path.extname(cacheFile).toLowerCase()] || "application/octet-stream";
    res.writeHead(200, {
      "Content-Type": type,
      "Content-Length": buf.length,
      "Cache-Control": "private, max-age=86400",
    });
    res.end(buf);
    return true;
  } catch {
    return false;
  }
}

function proxyApi(req, res, options = {}) {
  const parsed = new URL(req.url, "http://127.0.0.1");
  const imageLike = isImagePath(parsed.pathname);
  const cacheFile = imageLike ? cachePathFor(parsed.pathname) : null;
  const requestPath = options.path || req.url;
  const hops = options.hops || 0;

  const fail = () => {
    if (res.headersSent) return;
    if (imageLike && sendCachedImage(res, cacheFile)) return;
    res.writeHead(502, { "Content-Type": "application/json; charset=utf-8" });
    res.end(JSON.stringify({ error: "Internet yoxdur" }));
  };

  const upstream = https.request(
    {
      hostname: API_HOST,
      port: 443,
      method: req.method,
      path: requestPath,
      headers: copyRequestHeaders(req, imageLike),
      timeout: 15000,
    },
    (incoming) => {
      const status = incoming.statusCode || 502;
      const location = incoming.headers.location;
      if (location && hops < 3 && [301, 302, 303, 307, 308].includes(status)) {
        incoming.resume();
        try {
          const next = new URL(location, `https://${API_HOST}${requestPath}`);
          proxyApi(req, res, { path: `${next.pathname}${next.search}`, hops: hops + 1 });
        } catch {
          fail();
        }
        return;
      }

      if (imageLike) {
        const chunks = [];
        incoming.on("data", (chunk) => chunks.push(chunk));
        incoming.on("error", fail);
        incoming.on("end", () => {
          if (res.headersSent) return;
          const buf = Buffer.concat(chunks);
          const sniffed = sniffImageType(buf);
          if (status >= 400 || !buf.length || (status === 200 && !sniffed && !String(incoming.headers["content-type"] || "").startsWith("image/"))) {
            if (sendCachedImage(res, cacheFile)) return;
            const headers = copyResponseHeaders(incoming);
            res.writeHead(status, headers);
            res.end(buf);
            return;
          }
          const headers = copyResponseHeaders(incoming);
          if (sniffed) headers["content-type"] = sniffed;
          headers["content-length"] = Buffer.byteLength(buf);
          res.writeHead(status, headers);
          res.end(buf);
          if (status === 200 && sniffed && cacheFile) {
            try {
              fs.mkdirSync(imageCacheDir(), { recursive: true });
              fs.writeFileSync(cacheFile, buf);
            } catch {
              /* keş yazılmasa satış davam etsin */
            }
          }
        });
        return;
      }

      res.writeHead(status, copyResponseHeaders(incoming));
      incoming.pipe(res);
    }
  );

  upstream.on("timeout", () => upstream.destroy());
  upstream.on("error", fail);
  if (req.method === "GET" || req.method === "HEAD") upstream.end();
  else req.pipe(upstream);
}

function startLocalServer(root) {
  const server = http.createServer((req, res) => {
    const url = new URL(req.url, "http://127.0.0.1");
    if (url.pathname.startsWith("/api") || url.pathname.startsWith("/uploads")) {
      proxyApi(req, res);
      return;
    }

    let filePath = path.normalize(path.join(root, decodeURIComponent(url.pathname)));
    if (!filePath.startsWith(root)) {
      res.writeHead(403);
      res.end();
      return;
    }

    if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
      filePath = path.join(root, "index.html");
    }

    const type = MIME[path.extname(filePath).toLowerCase()] || "application/octet-stream";
    res.writeHead(200, { "Content-Type": type, "Cache-Control": "no-cache" });
    fs.createReadStream(filePath).pipe(res);
  });

  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => resolve(server));
  });
}

function createWindow(port) {
  const fullscreen = Boolean(PROFILE.fullscreen);
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 700,
    show: false,
    fullscreen,
    title: PROFILE.title || "UgurPOS",
    icon: path.join(__dirname, "icon.png"),
    autoHideMenuBar: true,
    backgroundColor: "#032d60",
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      additionalArguments: [`--ugurpos-start=${START_PATH}`],
    },
  });

  win.once("ready-to-show", () => {
    if (fullscreen) win.setFullScreen(true);
    else win.maximize();
    win.show();
  });
  win.loadURL(`http://127.0.0.1:${port}${START_PATH}`);

  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith("http://127.0.0.1")) return { action: "allow" };
    shell.openExternal(url);
    return { action: "deny" };
  });
}

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.whenReady().then(async () => {
    const root = appDir();
    if (!fs.existsSync(path.join(root, "index.html"))) {
      const win = new BrowserWindow({ width: 520, height: 360, autoHideMenuBar: true });
      win.loadFile(path.join(__dirname, "offline.html"));
      return;
    }
    const server = await startLocalServer(root);
    const { port } = server.address();
    createWindow(port);

    app.on("activate", () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow(port);
    });
    app.on("second-instance", () => {
      const win = BrowserWindow.getAllWindows()[0];
      if (win) {
        if (win.isMinimized()) win.restore();
        if (PROFILE.fullscreen) win.setFullScreen(true);
        win.focus();
      }
    });
  });

  app.on("window-all-closed", () => {
    if (process.platform !== "darwin") app.quit();
  });
}
