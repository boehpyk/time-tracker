# TimeTracker — Application Description

## What It Does

TimeTracker is a desktop Linux application for tracking time spent on projects and tasks. Users create projects (e.g. "Client A", "Internal"), add tasks under each project, and start/stop a timer against any task. All time entries are stored locally in a SQLite database. Reports summarize logged hours by project and task over a selected date range and can be exported as PDF.

The app lives in the system tray: it can be hidden to the background while the timer keeps running, and the tray icon shows the current timer state. If the user walks away from the keyboard, idle detection kicks in and offers to discard the idle time.

## Key Features

- **Projects & Tasks** — create, archive, and delete projects; add tasks within each project
- **Timer** — start/stop against any task; only one timer can run at a time
- **Idle Detection** — detects keyboard/mouse inactivity via X11 or Wayland; prompts to keep, discard idle time, or stop the timer
- **Time Entries** — paginated log of all recorded entries; inline editing of notes and times
- **Reports** — filter by project, task, and date range; summary and detail tables
- **PDF Export** — export the current report view to a multi-page A4 PDF
- **System Tray** — minimize to tray, toggle timer from tray menu, tray label reflects running state
- **Keyboard Shortcut** — Ctrl+Space to start/stop the timer

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Desktop shell | Tauri 2 |
| Frontend framework | Vue 3 (Composition API) |
| Language (frontend) | TypeScript |
| UI component library | PrimeVue 4 (Aura theme preset) |
| State management | Pinia |
| Routing | Vue Router 4 |
| Build tool | Vite |
| Backend language | Rust |
| Database | SQLite (via `tauri-plugin-sql`) |
| ORM / query builder | sqlx 0.7 |
| Date/time | chrono 0.4 |
| Error handling | thiserror |
| Idle detection (X11) | x11rb (MIT-SCREEN-SAVER extension) |
| Idle detection (Wayland) | zbus (`org.freedesktop.ScreenSaver`) |
| PDF export | html2canvas + jsPDF |
| Frontend testing | Vitest, @vue/test-utils, @pinia/testing |
| Backend testing | cargo test, sqlx in-memory SQLite |

## Platform

Linux only (x11rb and zbus are Linux-specific). Packaged as a native desktop app via Tauri's AppImage / deb bundler.
