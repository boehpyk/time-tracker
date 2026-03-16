# TimeTracker

A desktop time-tracking application for Linux. Track time against projects and tasks, detect idle time automatically, manage everything from the system tray, and export reports to PDF.

Built with **Tauri 2 · Vue 3 · TypeScript · PrimeVue 4 · SQLite**.

---

## Features

- **Projects & tasks** — organise work into projects, each with multiple tasks
- **One-click timer** — start/stop tracking against any task; only one timer runs at a time
- **Idle detection** — detects inactivity via X11 (MIT-SCREEN-SAVER) or Wayland (org.freedesktop.ScreenSaver); prompts to discard idle time
- **System tray** — toggle the timer from the tray icon without opening the window; close-to-tray keeps it running in the background
- **Entries view** — browse, edit, and delete time entries with full CRUD
- **Reports** — aggregate time by project/task over any date range
- **PDF export** — export any report to PDF with one click

---

## Tech stack

| Layer | Technology |
|---|---|
| Desktop shell | Tauri 2 |
| Frontend | Vue 3 + TypeScript + Vite |
| UI components | PrimeVue 4 (Aura theme) |
| State management | Pinia |
| Database | SQLite via tauri-plugin-sql |
| PDF export | html2canvas + jsPDF |
| Backend language | Rust 1.77.2+ |

---

## Prerequisites

- **Rust** — install via [rustup](https://rustup.rs/); minimum version 1.77.2
- **Node.js** — v18 or later (v20 recommended)
- **Linux** with X11 or Wayland
- Tauri system dependencies (WebKit2GTK, GTK3, etc.) — see the [Tauri prerequisites guide](https://tauri.app/start/prerequisites/)

---

## Setup

```bash
# 1. Clone the repository
git clone <repo-url>
cd time-tracker

# 2. Install frontend dependencies
npm install

# 3. Run in development mode (starts both Vite dev server and Tauri window)
npm run tauri dev
```

---

## Building for production

```bash
npm run tauri build
```

Produces a self-contained binary + installer under `src-tauri/target/release/bundle/`.

---

## Development commands

### Frontend

```bash
# Type-check only
npm run type-check

# Build (type-checks then compiles)
npm run build

# Run frontend unit tests (Vitest)
npm run test

# Vite dev server only (no Tauri window)
npm run dev
```

### Backend (Rust)

```bash
# Type-check without compiling
cargo check --manifest-path src-tauri/Cargo.toml

# Lint
cargo clippy --manifest-path src-tauri/Cargo.toml

# Run all Rust tests (no GTK/Tauri system libs required)
cargo test --manifest-path src-tauri/Cargo.toml --no-default-features

# Run a single test
cargo test --manifest-path src-tauri/Cargo.toml --no-default-features test_start_timer_fails_when_active
```

---

## Architecture

Key points at a glance:

- `src-tauri/` — Rust/Tauri backend; all database access and system calls live here
- `src/` — Vue 3 frontend; communicates with the backend exclusively via Tauri IPC (`invoke()`)
- `src/services/tauriApi.ts` — the single file allowed to call `invoke()`; all components go through it
- `src-tauri/migrations/001_initial.sql` — full database schema; applied automatically on first run
- Tests: Rust integration tests use an in-memory SQLite DB; frontend tests use Vitest + `@vue/test-utils`
