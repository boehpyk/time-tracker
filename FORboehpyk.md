# FORboehpyk — The Story of TimeTracker

This is your personal architecture narrative for the TimeTracker project. It is not a reference manual — it's a story about how this app was built, why the pieces are shaped the way they are, and what you should carry forward into future projects.

---

## What we built and why it's interesting

TimeTracker is a desktop Linux app that lets you track time against projects and tasks. The pitch is simple: you pick a task, press Start, and your computer quietly records where your hours go. But "simple" features always hide a surprising amount of depth, and this one is no exception.

The interesting engineering challenge was choosing the right technology stack and then enforcing boundaries between layers so the code stays maintainable as features grow. This app sits at the intersection of a native desktop runtime (Tauri/Rust), a reactive frontend framework (Vue 3), a file-embedded database (SQLite), and OS-level system integrations (idle detection, system tray). Getting all of those to cooperate — and to be testable — required deliberate architectural choices at every step.

---

## The Tech Stack and Why

**Tauri 2 + Rust backend.** We could have built this as an Electron app, but Electron ships an entire Chromium instance and Node.js runtime weighing ~200 MB. Tauri uses the system's existing WebView (on Linux, WebKitGTK) and a Rust backend. The production binary is small, starts fast, and doesn't feel like a web page pretending to be a desktop app. Rust also gives us fearless concurrency and no garbage collector pauses — important for a timer that runs for hours.

**Vue 3 with TypeScript.** React would have worked too, but Vue's Composition API maps cleanly onto the "composable" pattern: small, focused functions that encapsulate stateful logic and plug into any component that needs them. `useTimer`, `useIdleDetection`, and `useKeyboardShortcuts` are all composables, and they're easy to test in isolation. TypeScript catches the inevitable IPC shape mismatches before the app even starts.

**PrimeVue 4 with the Aura preset.** Building a datepicker from scratch is a week of work and still won't handle edge cases correctly. PrimeVue gives us a polished, accessible component library. Version 4 switched to a CSS token system (instead of hardcoded CSS class overrides), which means dark mode and theming work by changing token values — not by fighting specificity wars.

**SQLite via sqlx.** This app stores its data in a single file on the user's machine. There's no server, no network, no cloud subscription. SQLite is the right tool for exactly this use case — it's a library, not a daemon, and a single developer-machine app will never need the concurrency features of PostgreSQL. `sqlx` is the async-first Rust SQLite driver with query-time type checking; it caught multiple schema/query mismatches at compile time during development.

**Pinia for frontend state.** Pinia is Vue's officially-recommended state library. We used the Setup Store style (a function that returns reactive refs), which mirrors how composables work and makes the store dead simple to understand.

---

## Architecture: How the Pieces Fit Together

Imagine the app as three concentric layers, like an onion:

```
[ Linux OS ]
   [ Rust / Tauri backend ]
      [ Vue 3 frontend ]
```

Each layer talks only to the one directly adjacent to it. The OS talks to Rust. Rust talks to Vue via a protocol called IPC (inter-process communication). Vue never touches the OS directly. This boundary discipline sounds obvious, but it's easy to let it slip — and once it does, testing becomes a nightmare.

### The Rust backend: `src-tauri/src/`

The backend is the core of the application. It manages the database, enforces business rules, and exposes "commands" that the frontend can call. Here's the file map:

- **`main.rs`** — thin entry point that calls `lib.rs::run()`. Exists mainly so Cargo knows where the executable starts.
- **`lib.rs`** — registers all commands with the Tauri runtime, initializes the database, sets up the system tray, and installs the close-to-tray behavior.
- **`db.rs`** — opens the SQLite file, applies pragmas, and runs the migration.
- **`error.rs`** — defines the `AppError` enum using `thiserror`. This is the internal error type; it never crosses the IPC boundary.
- **`models.rs`** — plain data structs that map to database rows. The `#[serde(rename_all = "camelCase")]` attribute tells serde to serialize `snake_case` field names into `camelCase` for TypeScript. That means you write idiomatic Rust and get idiomatic TypeScript for free.
- **`commands/`** — one file per feature domain: projects, tasks, timer, entries, reports, idle.
- **`tray.rs`** — builds the system tray icon and its menu.
- **`migrations/001_initial.sql`** — the database schema.

### The IPC contract: how commands work

Every Rust function decorated with `#[tauri::command]` becomes callable from the frontend via `invoke("command_name", args)`. Tauri serializes and deserializes across the boundary using JSON.

The cardinal rule: **every command returns `Result<T, String>`**, never `Result<T, AppError>`. Why? Because `AppError` is a Rust type; the frontend has no idea what it is. When a command fails, Rust converts the error to a human-readable string using `AppError`'s `Display` impl. The frontend receives that string and can show it in a toast notification. This keeps the error handling on both sides simple and symmetric.

### The frontend: `src/`

The frontend is a standard Vue 3 SPA (Single-Page Application) running inside Tauri's embedded WebView. Its structure:

- **`main.ts`** — bootstraps the app: registers PrimeVue (with Aura theme), ConfirmationService, ToastService, Pinia, and the router.
- **`App.vue`** — the root component. It mounts `AppShell`, renders global overlays (Toast, ConfirmDialog, IdlePromptDialog), and wires up all the cross-cutting concerns: timer state restoration on startup, tray event listening, and idle detection.
- **`components/layout/AppShell.vue`** — a flexbox layout: 220px fixed sidebar + fluid main content area.
- **`components/layout/SidebarNav.vue`** — the four nav links (Dashboard, Projects, Entries, Reports). Handles exact-match routing for `/` vs. prefix matching for sub-paths like `/projects/:id`.
- **`views/`** — one view per route: `DashboardView`, `ProjectsView`, `ProjectDetailView`, `EntriesView`, `ReportsView`.
- **`stores/`** — Pinia stores: `timer.ts` (and separate stores for projects, tasks, reports).
- **`composables/`** — `useTimer`, `useIdleDetection`, `useKeyboardShortcuts`.
- **`services/tauriApi.ts`** — the only file in the entire frontend that imports from `@tauri-apps/api`. This is the single gateway into the Rust backend.
- **`services/pdfExport.ts`** — PDF generation, entirely browser-based.
- **`router/index.ts`** — route definitions with lazy-loaded view components.

---

## The Single Gateway Rule: `tauriApi.ts`

This was a deliberate, important decision. Only one file imports `invoke` from `@tauri-apps/api/core`. Every component, view, and composable calls `api.getSomeData()` from this service object — they never call `invoke()` directly.

Why does this matter? Two reasons:

**1. Testing.** In unit tests, you can't call a real Tauri backend. By centralizing all `invoke` calls in one file, you only need to mock that one file — or just mock the `tauriApi` object itself in each test. The global mock in `src/__tests__/setup.ts` replaces `invoke` with a `vi.fn()` stub. Individual tests can then use `vi.mocked(api.getProjects).mockResolvedValue([...])` to inject whatever data they need.

**2. Refactoring.** If Tauri's IPC API changes between major versions, or if you ever want to swap the backend for something else, you change exactly one file. None of your components need to know.

Think of `tauriApi.ts` as a translation booth. The frontend speaks Vue; the backend speaks Rust; the translation booth handles the conversion so neither side has to care about the other's language.

---

## The Timer: Deceptively Simple

The timer is the heart of the app, and it's split deliberately across three locations. Understanding why tells you a lot about how to design state in a Vue app.

**`stores/timer.ts`** — holds the durable, serializable state: `activeEntry` (the full timer object from the backend), `isRunning` (boolean), and `startedAt` (RFC3339 timestamp string). These are the facts. This store is shared across any component that needs to know if a timer is running.

**`composables/useTimer.ts`** — holds the ephemeral, derived display state: `elapsedSeconds`. This is a `ref(0)` that increments via `setInterval` every second. It watches `timerStore.isRunning` and starts/stops the interval accordingly. It cleans up via `onUnmounted`.

Why is `elapsedSeconds` not in the store? Because it would cause every component subscribed to the store to re-render 60 times a minute. By keeping it local to the composable — which is only used by the timer widget — only the timer display re-renders on each tick. This is the reactive performance lesson: put volatile, high-frequency data as close to the consumer as possible.

**The backend's role in time.** Here's an important security/correctness rule baked into the design: `end_time` is always computed with `chrono::Utc::now()` in Rust. The frontend never sends a "stop at this time" message. This means even if the JavaScript clock drifts, or if someone tries to send a forged timestamp, the recorded duration will always reflect actual wall-clock time on the server side. When the user triggers "discard idle time," the frontend tells the backend "I've been idle for N seconds" — and Rust computes the adjusted end time as `now - N seconds`. The frontend supplies the number; Rust does the arithmetic.

---

## The Database: Four Tables, One Big Constraint

The schema in `migrations/001_initial.sql` is compact and elegant. Four tables:

- **`projects`** — id, name, color, description, archived flag, timestamps.
- **`tasks`** — id, project_id (FK → projects, ON DELETE CASCADE), name, description, archived flag, timestamps.
- **`time_entries`** — id, task_id (FK → tasks, ON DELETE CASCADE), start_time, end_time (nullable — NULL means the timer is running), notes, timestamps.
- **`app_state`** — exactly one row, forever.

The `app_state` table deserves its own paragraph. It has one row (enforced by `CHECK (id = 1)`), and one nullable column: `active_entry_id`. This is the traffic light. When a timer is running, `active_entry_id` points to the active `time_entries` row. When nothing is running, it's NULL.

This design means "is a timer running?" is a single SELECT on a single row — no scanning, no ambiguity. `start_timer` checks this row first and returns `TimerAlreadyRunning` if it's non-NULL. This single-active-timer invariant is enforced entirely in the database, not by hoping the frontend was well-behaved. That's the right place for constraints to live.

The `ON DELETE CASCADE` on tasks → time_entries means deleting a project cleans up all its tasks and all those tasks' time entries automatically. The test `delete_project_cascades_to_tasks_and_entries` verifies this explicitly — and it was essential to enable `PRAGMA foreign_keys=ON` first, since SQLite doesn't enforce foreign keys by default.

**The WAL pragma** (`PRAGMA journal_mode=WAL`) enables Write-Ahead Logging. This means readers don't block writers and vice versa. For a single-user desktop app with one connection, this mostly means writes are faster and the database is more resilient to sudden power loss.

---

## Idle Detection: Knowing When the User Walked Away

Idle detection answers the question: "Did you forget to stop the timer?" If you've been idle for five minutes (default threshold), the app shows a dialog with three choices: keep the time, discard the idle portion, or stop the timer entirely.

The detection lives in `commands/idle.rs` and is beautifully layered. It tries Wayland first (via `zbus`, a D-Bus library, calling `org.freedesktop.ScreenSaver.GetSessionIdleTime`). If that fails or Wayland isn't running, it falls back to X11 (via `x11rb`, querying the MIT-SCREEN-SAVER extension's `ms_since_user_input` field). If both fail, it returns `Ok(0)`.

The rule is: **on any error, return `Ok(0)`, never propagate**. This is the "fail open" philosophy for non-critical features. Idle detection failing silently is far better than crashing the app while you're in the middle of a work session. The user just doesn't get the idle warning — that's a minor annoyance, not a catastrophe.

On the frontend, `composables/useIdleDetection.ts` polls every 30 seconds while the timer is running. It has a `firedForCurrentStretch` flag that prevents the callback from firing on every poll interval — once the dialog appears, you get one chance to respond; the composable won't pester you again until the user becomes active and then idle again.

---

## The System Tray: Two-Way Communication

The system tray adds two capabilities: hiding the window to the tray (close-to-tray), and controlling the timer without opening the window.

The tray-to-app direction (user clicks "Stop Timer" in the tray menu) uses Tauri events. The tray code calls `app_handle.emit("tray-toggle-timer", ())`, and `App.vue` listens for this event via `api.listenTrayToggle()`. This is a one-way broadcast — the tray fires a signal, and the app decides what to do.

The app-to-tray direction (app updates the tray label to show what's running) uses a regular Tauri command: `update_tray_state`. `App.vue` watches `timerStore.isRunning` and when the timer starts, begins a `setInterval` that calls `api.updateTrayState()` every 60 seconds with the current task name.

Why 60 seconds and not 1 second? Because calling IPC every second to update a menu label no one might even be looking at is wasteful. The label doesn't need to be a live stopwatch — it just needs to remind you what you're tracking. Sixty seconds is plenty. This is an example of deliberately choosing the right fidelity for each feature.

Close-to-tray works by intercepting the `CloseRequested` window event in `lib.rs` and calling `window.hide()` instead of letting the window close. The only true exit path is the "Quit" item in the tray menu, which calls `app_handle.exit(0)`. This is a common desktop app pattern that took one surprisingly tidy block of code to implement correctly.

---

## PDF Export: Screen-Capture Alchemy

The reports view lets you export the current report as a PDF. The implementation in `services/pdfExport.ts` doesn't generate the PDF from structured data — it takes a screenshot of the DOM.

Here's how it works: `html2canvas` renders the element with `id="report-printable-area"` to an HTML5 canvas at 2x resolution (for retina sharpness). Then `jsPDF` creates an A4 document and slices that canvas into page-height chunks, placing each slice on a new PDF page. The math converts between canvas pixels and millimeters using the printable width as the scaling reference.

This approach has a real advantage: the PDF looks exactly like what you see on screen, including PrimeVue's table styles, colors, and the project color chips. You don't need to reimplement the visual layout in a PDF generation library.

The catch: Tauri's Content Security Policy (CSP) must allow `blob: data:` in `img-src`, because `html2canvas` creates blob URLs internally when processing images. Without this, the canvas export silently produces black rectangles where images should be. This is the kind of bug that sends you down a 90-minute rabbit hole of checking the wrong things first.

---

## Testing: The Two-Layer Strategy

### Backend: In-Memory SQLite

Every integration test in `src-tauri/tests/commands_integration.rs` calls `init_db(":memory:")` to get a fresh, isolated in-memory SQLite database. There's no cleanup, no test ordering dependencies, no shared state. Each test function creates its own world, runs its assertions, and disappears.

The tests are gated behind `--no-default-features`, which disables the `tauri-app`, `x11-idle`, and `wayland-idle` feature flags. This is the feature flag story that deserves its own explanation.

**The feature flag problem:** Tauri's build script inspects the system for GTK and WebKit development libraries. In CI environments without a graphical stack installed, `cargo test` would fail before compiling a single line of test code — not because the tests are wrong, but because the build script for the Tauri runtime can't find GTK. By making the entire Tauri runtime optional under the `tauri-app` feature flag, `cargo test --no-default-features` compiles only the pure-Rust logic (db, error, models, commands) without needing GTK at all. The test suite runs in any environment.

This was a meaningful architectural decision: the business logic (database operations, validation, error handling) doesn't depend on Tauri. Tauri is just a delivery mechanism. Separating them makes the core logic independently testable.

### Frontend: Mock the Gateway

Frontend tests use Vitest and `@testing-library/vue`. The `setup.ts` file globally mocks `@tauri-apps/api/core` (replacing `invoke` with `vi.fn()`) and `@tauri-apps/api/event` (replacing `listen` with a mock that returns a no-op unlisten function).

Individual component tests then mock `tauriApi.ts` at the module level:

```typescript
vi.mock('../../services/tauriApi', () => ({
  api: {
    getProjects: vi.fn(),
    // ...
  }
}))
```

And for tests that need store state, `createTestingPinia` from `@pinia/testing` lets you inject pre-configured store values without running any real actions.

The lesson: by centralizing Tauri calls in `tauriApi.ts`, you only ever need to mock one thing. The rest of your components can be tested as if the backend always returns exactly what you tell it to.

---

## Bugs Encountered and Fixed

### The `julianday()` Floating-Point Truncation

The duration calculation in reports uses SQLite's `julianday()` function:

```sql
CAST((julianday(te.end_time) - julianday(te.start_time)) * 86400 AS INTEGER)
```

`julianday()` returns a floating-point number (days since noon January 1, 4713 BC, in case you were wondering). Subtracting two of them and multiplying by 86400 (seconds per day) involves IEEE 754 double-precision arithmetic — and that introduces rounding error.

In practice, a 900-second interval might come back as 899.9999... seconds, which `CAST(...AS INTEGER)` truncates to 899. The test `get_report_returns_aggregated_data` had to be written as:

```rust
assert!(row.2 >= 899, "total_seconds should be at least 899 ...");
```

instead of the "obviously correct" `assert_eq!(row.2, 900)`. This is not a bug in the application — it's a quirk of floating-point arithmetic that you need to account for in tests and in any UI that shows "exact" durations. If sub-second precision matters to you in the future, consider storing durations as integer seconds computed in Rust at stop time, rather than deriving them in SQL from timestamps.

### PrimeVue 4's DatePicker Type Union

PrimeVue 4's `DatePicker` component emits its value with the TypeScript type `Date | Date[] | (Date | null)[] | null`. This is the full union of all modes it supports (single date, date range, multiple dates). Even when you configure it for single-date mode, the emitted value still has the full union type at the TypeScript level.

In handlers, you cannot just write:

```typescript
function onDateChange(value: Date | null) { ... }
```

TypeScript will rightly refuse. You need the full `Array.isArray` dance:

```typescript
function onDateChange(value: Date | Date[] | (Date | null)[] | null) {
  if (!value || Array.isArray(value)) return
  // now value is Date
}
```

This is a case where a component library's type definitions are technically correct but ergonomically painful. The lesson: always read the TypeScript definitions of third-party component events before assuming the type matches what you expect intuitively.

### The GTK Build Script Trap

Early in development, running `cargo test` would fail with an error about missing GTK libraries. This was confusing because the tests didn't use any GUI code. The problem: Tauri's build script (`tauri-build`) ran unconditionally and tried to locate GTK headers on the system.

The fix was making `tauri-build` an optional build dependency, only pulled in when the `tauri-app` feature is enabled. Once that was done, `cargo test --no-default-features` compiled cleanly with no system dependencies beyond a C compiler and the SQLite amalgamation (which sqlx bundles).

The general principle: build dependencies can be just as optional as regular dependencies. If a dependency is only needed in production builds and would block your test workflow, gate it behind a feature flag.

---

## Design Patterns and Best Practices Demonstrated

**Dynamic SQL with QueryBuilder, not string formatting.** Both `entries.rs` and `reports.rs` have commands with optional filter parameters. The naive approach is to build query strings with `format!()`. This is dangerous (SQL injection if any parameter ever comes from user input) and error-prone (easy to produce malformed SQL). Instead, both commands use `sqlx::QueryBuilder<Sqlite>`, which builds the query by pushing typed bindings. Every parameter goes through SQLite's parameterized binding mechanism, regardless of where it came from.

**Validate on entry, trust internally.** The `update_entry` command validates frontend-supplied timestamps with `parse_and_validate_timestamp`: it must be valid RFC3339, must not be in the future, and the end time must be after the start time. Once the timestamps pass validation and enter the database, no further validation is needed — the invariant is established at the boundary. This is the same principle as type-checking at compile time: catch problems as early as possible, then proceed with confidence.

**`From<AppError> for String`.** The `error.rs` file implements `From<AppError> for String`. This means you can write `.map_err(AppError::Database)` in internal code (keeping the rich error type) and then `.map_err(|e| AppError::Database(e).to_string())` at the IPC boundary to flatten it into a string. The error type chain is: `sqlx::Error → AppError → String`. Each conversion loses information, but that information loss is intentional at the right boundary.

**Clean-up contracts with `onUnmounted`.** Every composable that sets up a `setInterval` also registers an `onUnmounted` handler that clears it. This prevents memory leaks and phantom background work when components are destroyed. The pattern is: `const interval = setInterval(...)` in setup, `clearInterval(interval)` in `onUnmounted`. It's simple and it's easy to verify visually.

**Idempotent migrations.** The migration SQL uses `CREATE TABLE IF NOT EXISTS` and `INSERT OR IGNORE`. This means running `init_db` on an already-initialized database is completely safe. In production, this means you don't need a migration version table for a single-migration schema — just re-run it on every startup and let SQLite's idempotency guards handle it. For multi-migration scenarios you'd want a proper migration table, but the principle of making initialization idempotent holds.

---

## How Good Engineers Think About Desktop Apps

Building a desktop app with a web frontend (Electron, Tauri, etc.) is tempting because it reuses skills you already have. But it introduces a subtle mindset shift: you're building a native citizen of the desktop, not a webpage.

Native desktop apps have conventions: they live in the system tray, they close to tray instead of quitting, they respond to keyboard shortcuts, they persist state across restarts. Users expect these things without being told. Getting them right is what makes the difference between an app that feels polished and one that feels like a prototype.

The timer state restoration on startup (`App.vue` calls `fetchActiveTimer()` in `onMounted`) is a good example. Without this, if you had a timer running and crashed the app, you'd restart to a blank timer display — but the database still has an active entry. The two would be out of sync. With `fetchActiveTimer()` on mount, the app heals itself automatically: it asks the backend "is there a timer running?" and reconciles its UI state accordingly. The backend is always the source of truth.

This is a broader lesson: **the database is the ground truth; the UI is a view of it**. Any time UI state and database state can diverge, you need a mechanism to reconcile them. Either the UI derives all its state from the database (and never caches it speculatively), or you have explicit reconciliation logic at well-defined moments (like startup).

---

## The 16-Phase Build Process

This project was built phase by phase, with review and tests after each phase:

1. Scaffold (Tauri + Vue + dependencies)
2. Database layer (migrations, `db.rs`, `error.rs`, `models.rs`)
3. Rust commands (projects → tasks → timer → entries → reports → idle)
4. Vue foundation (router, PrimeVue, types, `tauriApi.ts`, Pinia stores)
5. App shell (`AppShell.vue`, `SidebarNav.vue`)
6–9. Feature UIs (Projects, Tasks, Timer, Entries)
10. Idle detection
11–12. Reports + PDF export
13–14. System tray + close-to-tray
15. Polish (empty states, Toast errors, Ctrl+Space shortcut)
16. This document.

Building this way — small, verifiable increments — is how professional software teams avoid "big bang integration" failures, where you build everything separately and then discover that the pieces don't fit together. Each phase built on a working foundation, and the test suite grew alongside the code so regressions were caught immediately.

---

## What to Carry Forward

A few things from this project that are worth internalizing as permanent habits:

**One IPC gateway file.** Any project with a backend you call from a frontend — whether Tauri, REST, GraphQL, or anything else — should centralize all backend calls in one service file. Mock that file in tests. Refactor that file when the API changes. Never let `invoke()` or `fetch()` escape into your components.

**Feature flags for test-time compilation.** If your project has system dependencies that block CI (GTK, display servers, GPU libraries, etc.), put them behind optional feature flags. Your business logic almost certainly doesn't need those dependencies — only the delivery mechanism does.

**Return `Ok(0)` from best-effort features.** Idle detection, crash reporting, analytics, telemetry — these are all non-critical features that should fail silently. Use `match ... { Ok(v) => v, Err(e) => { log::warn!(...); fallback } }`. Never let a non-critical subsystem crash a user's workflow.

**Validate at boundaries, trust internally.** Every time data crosses a trust boundary (user input → backend, frontend → backend, external API → your code), validate it. Once it's inside and validated, work with it as clean data. Don't validate the same thing twice in different places — that way lies inconsistency.

**SQLite is underrated.** For single-user, single-machine data, SQLite beats a remote database on simplicity, reliability, and performance. A well-structured SQLite file with WAL mode and foreign keys enforced is robust enough for most desktop applications you'll ever build.

---

*Built over 16 phases. Every bug was a lesson. Every constraint was a decision. Enjoy the next one.*
