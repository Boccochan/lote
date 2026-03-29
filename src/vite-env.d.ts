/// <reference types="svelte" />
/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** When `"true"`, enables desktop E2E seed helpers (`__loteSeedAgentDemo`). */
  readonly VITE_E2E_CAPTURE?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
