# Lote

A local-first workspace app with notes, **Ollama** chat, and an **MCP client**.

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
