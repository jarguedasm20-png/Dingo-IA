import React from "react";
import { createRoot } from "react-dom/client";
import { DingoApp } from "./DingoApp.jsx";
import "../styles.css";

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <DingoApp />
  </React.StrictMode>,
);
