import React from "react";
import ReactDOM from "react-dom/client";
import { ThemeProvider } from "next-themes";
import App from "./App";
import { StoreProvider } from "./lib/store";
import { TooltipProvider } from "./components/ui/tooltip";
import { Toaster } from "./components/ui/sonner";
import "./theme.css";
ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
      <TooltipProvider>
        <StoreProvider>
          <App />
          <Toaster position="bottom-right" closeButton />
        </StoreProvider>
      </TooltipProvider>
    </ThemeProvider>
  </React.StrictMode>,
);
