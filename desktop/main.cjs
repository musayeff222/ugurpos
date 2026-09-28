const { app, BrowserWindow, shell } = require("electron");
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

function proxyApi(req, res) {
  const headers = { ...req.headers, host: API_HOST };
  const upstream = https.request(
    {
      hostname: API_HOST,
      port: 443,
      method: req.method,
      path: req.url,
      headers,
      timeout: 15000,
    },
    (incoming) => {
      res.writeHead(incoming.statusCode || 502, incoming.headers);
      incoming.pipe(res);
    }
  );

  const fail = () => {
    if (res.headersSent) return;
    res.writeHead(502, { "Content-Type": "application/json; charset=utf-8" });
    res.end(JSON.stringify({ error: "Internet yoxdur" }));
  };

  upstream.on("timeout", () => upstream.destroy());
  upstream.on("error", fail);
  req.pipe(upstream);
}

function startLocalServer(root) {
  const server = http.createServer((req, res) => {
    const url = new URL(req.url, "http://127.0.0.1");
    if (url.pathname.startsWith("/api")) {
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
