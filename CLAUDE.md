# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

TimeTracker is a desktop Linux application built with **Tauri 2 + Vue 3 + TypeScript + PrimeVue 4 + SQLite**. It tracks time against projects and tasks, with idle detection, system tray integration, and PDF report export.

## Commands

### Backend (Rust / Tauri)
```bash
# Type-check and compile
cargo check --manifest-path src-tauri/Cargo.toml

# Lint (fix correctness and suspicious lints)
cargo clippy --manifest-path src-tauri/Cargo.toml

# Run all Rust tests
cargo test --manifest-path src-tauri/Cargo.toml

# Run a single test
cargo test --manifest-path src-tauri/Cargo.toml test_start_timer_fails_when_active
```

### Frontend (Vue 3 / TypeScript)
```bash
# Build (also type-checks)
npm run build --prefix /home/boehpyk/Work/Sites/time-tracker

# Type-check only
npm run type-check --prefix /home/boehpyk/Work/Sites/time-tracker

# Run unit tests
npm run test --prefix /home/boehpyk/Work/Sites/time-tracker

# Dev server
npm run dev --prefix /home/boehpyk/Work/Sites/time-tracker
```

### Full app (Tauri)
```bash
npm run tauri dev    # dev mode
npm run tauri build  # production build
```

## Architecture

### Layer boundaries
- **`src-tauri/`** — Rust/Tauri backend. The backend agent is the ONLY entity that modifies files here.
- **`src/`** — Vue 3/TypeScript frontend. The frontend agent is the ONLY entity that modifies files here.
- Communication between layers happens exclusively via Tauri IPC (`invoke()`).

### IPC contract
- All Tauri commands return `Result<T, String>` — never `Result<T, AppError>` directly across the IPC boundary.
- `end_time` is **always** computed in Rust with `chrono::Utc::now()`. Never trust a timestamp from the frontend.
- Rust structs use `snake_case`; Tauri serializes to `camelCase` for TypeScript automatically.

### Frontend API centralization
`src/services/tauriApi.ts` is the **only** file that imports from `@tauri-apps/api/core`. All other files call `api.someMethod()` from this service. No other file may call `invoke()` directly.

### Timer state
- Pinia store (`stores/timer.ts`) holds: `activeEntry`, `isRunning`, `startedAt`.
- `elapsedSeconds` is **not** in the store — it lives in `composables/useTimer.ts` as a local `ref`, ticking via `setInterval`.
- `App.vue` calls `fetchActiveTimer()` on `onMounted` to restore timer state after app restart.

### Single active timer invariant
The `app_state` table has exactly one row (`id=1`). `active_entry_id` (nullable FK → `time_entries`) enforces that at most one timer can run at a time. `start_timer` returns an error if called when one is already active.

### Database
- SQLite via `tauri-plugin-sql`.
- Every DB open must run: `PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;`
- Migrations live in `src-tauri/migrations/001_initial.sql`, loaded via `include_str!()`.

### Idle detection
`commands/idle.rs` detects X11 (`x11rb`, MIT-SCREEN-SAVER extension) and Wayland (`zbus`, `org.freedesktop.ScreenSaver.GetSessionIdleTime`) idle time. **On any error, return `Ok(0)` — never propagate or crash.** The frontend polls every 30s via `composables/useIdleDetection.ts`.

### Tray integration
- `App.vue` listens for the `tray-toggle-timer` Tauri event to start/stop the timer.
- Tray label updates via `api.updateTrayState()` at most **once per 60s** (use a 60000ms interval, not 1000ms) to avoid IPC spam.

### PDF export
`services/pdfExport.ts` uses `html2canvas` + `jsPDF` to capture `#report-printable-area`. Requires `"blob: data:"` in `img-src` in `tauri.conf.json` CSP.

### PrimeVue 4 theming
Always use token-based theming with the Aura preset. Never import from `primevue/resources/` (that's PrimeVue 3).
```typescript
app.use(PrimeVue, { theme: { preset: Aura, options: { darkModeSelector: '.dark-mode' } } })
```

## Testing

### Backend tests
- Unit tests: inline `#[cfg(test)]` blocks in each module.
- Integration tests: `src-tauri/tests/`, using an in-memory SQLite DB (`SqlitePool::connect(":memory:")`).
- Naming: unit → `test_<function>_<scenario>`, integration → `<command>_<happy_path_or_error>`.

### Frontend tests
- Vitest unit/component tests in `src/__tests__/` mirroring the `src/` structure.
- Mock `@tauri-apps/api/core` globally in `src/__tests__/setup.ts` using `vi.mock`.
- Use `@pinia/testing` (`createTestingPinia`) for component tests that need store state.
- Naming: `describe` = module/component name; `it` = `<does X> when <condition>`.

## Implementation phases (reference)

The project follows a 16-phase plan tracked by the orchestrator agent:
1. Scaffold (Tauri + Vue + deps)
2. DB layer (migrations, `db.rs`, `error.rs`, `models.rs`)
3. Rust commands (projects → tasks → timer → entries → reports → idle)
4. Vue foundation (router, PrimeVue, types, `tauriApi.ts`, Pinia stores)
5. App shell (`AppShell.vue`, `SidebarNav.vue`)
6–9. Feature UIs (Projects, Tasks, Timer, Entries)
10. Idle detection
11–12. Reports + PDF export
13–14. System tray + close-to-tray
15. Polish (empty states, Toast errors, Ctrl+Space shortcut)
16. `FOR[yourname].md` architecture narrative

After each phase: review → tests → advance.
