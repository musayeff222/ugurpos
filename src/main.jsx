import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { AuthProvider } from "./context/AuthContext";
import { LocaleProvider } from "./context/LocaleContext";
import { WebOrdersProvider } from "./context/WebOrdersContext";
import { StoreProvider } from "./store/StoreContext";
import "./styles/global.css";
import "./styles/forms.css";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <LocaleProvider>
          <WebOrdersProvider>
            <StoreProvider>
              <App />
            </StoreProvider>
          </WebOrdersProvider>
        </LocaleProvider>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>
);
