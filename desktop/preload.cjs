const { contextBridge } = require("electron");

const startArg = process.argv.find((arg) => arg.startsWith("--ugurpos-start="));
const startUrl = startArg ? startArg.slice("--ugurpos-start=".length) : "/login/kasiyer";

contextBridge.exposeInMainWorld("ugurpos", {
  isDesktop: true,
  siteUrl: "https://cigkofte.az",
  startUrl,
});
