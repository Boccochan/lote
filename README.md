# Lote

A local-first Notion-style notes app with **Ollama** chat and an **MCP client** (Tauri + Svelte + Vite). Next.js is not used.

## Prerequisites

- [Node.js](https://nodejs.org/) (with npm)
- [Rust](https://rustup.rs/) (`rustup`). This repo pins **Rust 1.88** in `src-tauri/rust-toolchain.toml` (rustup will fetch it on first use).
- Windows: [WebView2](https://developer.microsoft.com/microsoft-edge/webview2/) (usually bundled with the OS)
- For Ollama: the app’s default model is **`gemma3:1b`** ([Gemma 3](https://ollama.com/library/gemma3)). If you don’t have it yet, run `ollama pull gemma3:1b`. There is no `gamma3` tag in Ollama (a common typo is `gemma`).

## Install dependencies

```bash
npm install
```

## Run (desktop app)

In development, the Vite dev server and a Tauri window start.

```bash
npm run tauri:dev
```

Or:

```bash
npx tauri dev
```

## Frontend only (browser)

To run the UI without Tauri (`invoke` calls will fail):

```bash
npm run dev
```

Open the URL shown in the terminal (default `http://localhost:5173`).

## Build

### Frontend (static assets)

```bash
npm run build
```

Output is in `dist/`.

### Desktop installer / binary

```bash
npm run tauri:build
```

Or:

```bash
npx tauri build
```

On Windows, MSI and similar artifacts appear under `src-tauri/target/release/bundle/`. The executable is under `src-tauri/target/release/`.

## Type check

```bash
npm run check
```

## Where data is stored

Page Markdown is saved under the OS app data directory (e.g. near `%APPDATA%` on Windows) in `lote/pages/`.
