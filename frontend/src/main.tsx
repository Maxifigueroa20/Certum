import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router";
import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap/dist/js/bootstrap.bundle.min.js";
import "bootstrap-icons/font/bootstrap-icons.min.css";
import "@fontsource-variable/onest/wght.css";
import "@fontsource-variable/jetbrains-mono/wght.css";
import "./styles/theme.css";
import { App } from "./App";
import { SolanaProvider } from "./providers/SolanaProvider";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <SolanaProvider>
        <App />
      </SolanaProvider>
    </BrowserRouter>
  </StrictMode>,
);
