/// <reference types="vite/client" />

/** Build-time configuration. Everything here is optional: the app is designed
 *  to work with no server at all, and only reaches for one if told where. */
interface ImportMetaEnv {
  /** Base URL of the sync relay, e.g. `https://sync.abh.app`. Unset = local-only. */
  readonly VITE_ABH_SYNC_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
