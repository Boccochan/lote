/// <reference types="@sveltejs/kit" />

declare global {
  namespace App {
    // interface Error {}
    // interface Locals {}
    // interface PageData {}
    // interface PageState {}
  }

  interface Window {
    /** Set only when built with `VITE_E2E_CAPTURE=true` (desktop PR capture). */
    __loteSeedAgentDemo?: (scenario: 'create' | 'save' | 'delete') => void
  }
}

export {}
