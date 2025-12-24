# ZenPen 2.0 (Local Second Brain) - Implementation Plan

## Vision
A self-hosted, "Zen" writing environment that acts as a local second brain.
- **Authoring:** A distraction-free, beautiful editor (Svelte + Lexical) running locally.
- **Analysis:** Custom plugins (e.g., phoneme highlighting, sentence complexity) to aid the writing process.
- **Publishing:** A decoupled static site generator (Astro) that builds a "Kinfolk-inspired" blog from the content.

## Architecture

### 1. The Editor (Frontend)
- **Framework:** Svelte (via Vite)
- **Library:** `svelte-lexical` (Bindings for Facebook's Lexical editor)
- **Sync:** `yjs` + `y-websocket` (Real-time collaboration/sync between iPad and Desktop)
- **Location:** `/editor`

### 2. The Brain (Backend)
- **Runtime:** Node.js
- **Database:** SQLite (`zen.db`)
- **Role:**
    - Hosts the WebSocket server for real-time sync.
    - Persists Yjs binary updates to the SQLite database.
    - (Future) Handles the "Export & Publish" workflow.
- **Location:** `/editor/server`

### 3. The Generator (Output)
- **Framework:** Astro
- **Role:** Takes Markdown content and generates the static site.
- **Workflow:**
    1. User clicks "Publish" in Editor.
    2. Backend exports Post -> Markdown.
    3. Backend triggers Astro Build.
    4. Backend deploys to Cloudflare Pages (or copies to `dist`).
- **Location:** Root (`/`)

## Roadmap

### Phase 1: Foundation (Current Status)
- [x] Scaffold Svelte + Lexical editor.
- [x] Set up Node.js + WebSocket backend.
- [x] Implement SQLite persistence for Yjs documents.
- [x] Basic "Zen" styling.

### Phase 2: Analysis Plugins
- [ ] **Sentence Length Highlighter:** Visual indicator for sentences exceeding a word count threshold.
- [ ] **Phoneme Analysis:** (Future) Highlighting based on phonetic patterns.

### Phase 3: The Bridge
- [ ] **Export to Markdown:** Script to convert Lexical/Yjs state to standard Markdown frontmatter + body.
- [ ] **Astro Integration:** Backend endpoint to write these MD files to `src/content/blog` and trigger a build.

### Phase 4: Polish
- [ ] Authentication (Simple local password or token).
- [ ] Image Drag & Drop (Upload to local `public/images`).
- [ ] Mobile/iPad optimization (Touch events, virtual keyboard handling).
