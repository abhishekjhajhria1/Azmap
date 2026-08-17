import { ThemeProvider, useAbh } from "@abh/ui";
import React from "react";
import ReactDOM from "react-dom/client";
import { App } from "./App";
import { CelebrationProvider } from "./Celebration";
import { store, sync, useAccountSync } from "./sync";
import "./index.css";

// Load the map, mirror sync status into the store, then start the engine.
// If this device is already part of an account, sync switches from local-only
// to encrypted account sync before the first round.
void useAbh
  .getState()
  .init(store)
  .then(async () => {
    useAbh.getState().attachSync(sync);
    await useAccountSync();
    await sync.start();
  });

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
