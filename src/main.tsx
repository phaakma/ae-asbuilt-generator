import React from "react";
import ReactDOM from "react-dom/client";
import { defineCustomElements } from "@esri/calcite-components/dist/loader";
import { setAssetPath } from "@esri/calcite-components/dist/components";
import App from "./App";
import "@esri/calcite-components/dist/calcite/calcite.css";
import "./styles.css";

setAssetPath(`${import.meta.env.BASE_URL}assets`);
defineCustomElements(window);

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
