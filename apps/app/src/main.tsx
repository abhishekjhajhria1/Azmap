import { MapStore } from "@abh/core";
import { IndexedDbStorage } from "@abh/core/storage/indexeddb";
import { ThemeProvider, useAbh } from "@abh/ui";
import React from "react";
import ReactDOM from "react-dom/client";
import { App } from "./App";
import { CelebrationProvider } from "./Celebration";
import "./index.css";

// One real, on-device store — the single source of truth for every space.
const store = new MapStore(new IndexedDbStorage());
void useAbh.getState().init(store);

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ThemeProvider>
      {/* Calm ambient backdrop so the glass has something to blur. */}
      <div className="abh-ambient" aria-hidden />
      <CelebrationProvider>
        <App />
      </CelebrationProvider>
    </ThemeProvider>
  </React.StrictMode>,
);
