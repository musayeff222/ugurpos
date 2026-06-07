import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { AuthProvider } from "./context/AuthContext";
import { WebOrdersProvider } from "./context/WebOrdersContext";
import { StoreProvider } from "./store/StoreContext";
import "./styles/global.css";
import "./styles/forms.css";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <WebOrdersProvider>
          <StoreProvider>
            <App />
          </StoreProvider>
        </WebOrdersProvider>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>
);
