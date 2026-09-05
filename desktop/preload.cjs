const { contextBridge } = require("electron");

const siteUrl = process.env.UGURPOS_URL || "https://cigkofte.az";

contextBridge.exposeInMainWorld("ugurpos", {
  isDesktop: true,
  siteUrl,
  startUrl: `${siteUrl.replace(/\/$/, "")}/login/admin`,
});
