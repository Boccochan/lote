# Lote

ローカル向けの Notion 風メモ + **Ollama** チャット + **MCP クライアント**（Tauri + Svelte + Vite）。Next.js は使いません。

## 前提

- [Node.js](https://nodejs.org/)（npm 付き）
- [Rust](https://rustup.rs/)（`rustup`）。このリポジトリは `src-tauri/rust-toolchain.toml` で **Rust 1.88** を指定しています（初回は `rustup` が自動取得します）。
- Windows: [WebView2](https://developer.microsoft.com/microsoft-edge/webview2/)（通常は OS に同梱）
- Ollama を使う場合: アプリの既定モデルは **`gemma3:1b`**（[Gemma 3](https://ollama.com/library/gemma3)）。未入手なら `ollama pull gemma3:1b`。`gamma3` というタグは Ollama にありません（`gemma` の誤記のことが多いです）

## 依存関係のインストール

```bash
npm install
```

## 起動（デスクトップアプリ）

開発時は Vite の dev サーバと Tauri のウィンドウが立ち上がります。

```bash
npm run tauri:dev
```

または:

```bash
npx tauri dev
```

## フロントのみ（ブラウザで確認）

Tauri なしで UI だけ動かす場合（`invoke` は失敗します）。

```bash
npm run dev
```

ブラウザで表示される URL（既定は `http://localhost:5173`）を開きます。

## ビルド

### フロント（静的ファイル）

```bash
npm run build
```

成果物は `dist/` です。

### デスクトップ用インストーラ / 実行ファイル

```bash
npm run tauri:build
```

または:

```bash
npx tauri build
```

Windows では `src-tauri/target/release/bundle/` 以下に MSI などが生成されます。実行ファイルは `src-tauri/target/release/` にあります。

## 型チェック

```bash
npm run check
```

## データの保存場所

ページの Markdown は OS のアプリデータ配下（例: Windows では `%APPDATA%` 付近）の `lote/pages/` に保存されます。
