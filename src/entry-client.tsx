import React from "react";
import ReactDOM from "react-dom/client";
import { StartClient } from "@tanstack/react-start/client";

const rootElement = document.getElementById("app") as HTMLElement;

ReactDOM.hydrateRoot(rootElement,
  <React.StrictMode>
    <StartClient />
  </React.StrictMode>
);
