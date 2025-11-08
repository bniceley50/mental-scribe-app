import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App.tsx";
import { LoggerProvider } from "./lib/logger/LoggerProvider";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <BrowserRouter>
    <LoggerProvider>
      <App />
    </LoggerProvider>
  </BrowserRouter>
);
