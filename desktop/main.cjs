const { app, BrowserWindow, shell } = require("electron");
const path = require("path");

const SITE = process.env.UGURPOS_URL || "https://cigkofte.az";
const START_URL = `${SITE.replace(/\/$/, "")}/login/admin`;

function createWindow() {
  const win = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    title: "UgurPOS — İstanbul Çiğköfte",
    autoHideMenuBar: true,
    backgroundColor: "#111827",
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  win.maximize();

  const loadSite = () => {
    win.loadURL(START_URL);
  };

  const loadOfflinePage = () => {
    win.loadFile(path.join(__dirname, "offline.html"));
  };

  loadSite();

  win.webContents.on("did-fail-load", (_event, code, _desc, url, isMainFrame) => {
    if (!isMainFrame) return;
    if (code === -3) return;
    if (url && url.startsWith("file:")) return;
    loadOfflinePage();
  });

  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith(SITE)) {
      return { action: "allow" };
    }
    shell.openExternal(url);
    return { action: "deny" };
  });

  win.webContents.on("will-navigate", (event, url) => {
    if (url.startsWith(SITE) || url.startsWith("file:")) return;
    event.preventDefault();
    shell.openExternal(url);
  });
}

app.whenReady().then(() => {
  createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
