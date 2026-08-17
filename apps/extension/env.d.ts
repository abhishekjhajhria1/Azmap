/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Base URL of the sync relay. Unset = the extension is local-only. */
  readonly VITE_ABH_SYNC_URL?: string;
}
interface ImportMeta {
  readonly env: ImportMetaEnv;
}
