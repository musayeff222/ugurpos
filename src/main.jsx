import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { AuthProvider } from "./context/AuthContext";
import { LocaleProvider } from "./context/LocaleContext";
import { WebOrdersProvider } from "./context/WebOrdersContext";
import { AdminAlertsProvider } from "./context/AdminAlertsContext";
import { OfflineProvider } from "./offline/OfflineContext";
import { StoreProvider } from "./store/StoreContext";
import "./styles/global.css";
import "./styles/forms.css";

if (import.meta.env.PROD && "serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  });
}

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <OfflineProvider>
          <LocaleProvider>
            <WebOrdersProvider>
              <AdminAlertsProvider>
                <StoreProvider>
                  <App />
                </StoreProvider>
              </AdminAlertsProvider>
            </WebOrdersProvider>
          </LocaleProvider>
        </OfflineProvider>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>
);
