import {
  LocalOnlySync,
  LocalStorageSyncState,
  MapStore,
  Outbox,
  SyncEngine,
  TrackedStorage,
} from "@abh/core";
import { IndexedDbStorage } from "@abh/core/storage/indexeddb";
import { ThemeProvider, useAbh } from "@abh/ui";
import React from "react";
import ReactDOM from "react-dom/client";
import { App } from "./App";
import { CelebrationProvider } from "./Celebration";
import "./index.css";

// One real, on-device store — the single source of truth for every space.
//
// The app writes through `TrackedStorage`, so every mutation is queued in the
// outbox whether or not a remote exists. The engine holds the raw adapter, so
// records arriving from a remote are never queued straight back to it.
const storage = new IndexedDbStorage();
const outbox = new Outbox(new LocalStorageSyncState());
const store = new MapStore(new TrackedStorage(storage, outbox));

// `LocalOnlySync` is the shipped default: no network, no account, nothing
// leaves the device. The engine still runs its full lifecycle against it and
// keeps the outbox intact, so the day a remote exists every write made since
// install is pushed. Swapping in a real adapter is this one line:
//
//   adapter: new LoopbackSyncAdapter(new LocalStorageRelayLog())  // live across tabs
//   adapter: new HttpSyncAdapter(endpoint)                        // needs a server
const sync = new SyncEngine({ storage, outbox, adapter: new LocalOnlySync() });

void useAbh
  .getState()
  .init(store)
  .then(() => {
    useAbh.getState().attachSync(sync);
    return sync.start();
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
