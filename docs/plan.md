# TimeTracker — Implementation Plan

The project is built in 16 sequential phases. Each phase is owned by a specialist agent, reviewed, and tested before the next phase begins.

---

## Phase 1 — Scaffold

**Owner:** backend + frontend
**Goal:** Bootstrap the full project skeleton so both layers can start work.

- Run `npm create tauri-app@latest` at the project root
- Install all frontend dependencies:
  - `primevue @primevue/themes pinia vue-router @tauri-apps/api`
  - `html2canvas jspdf`
  - `vitest @vue/test-utils @pinia/testing` (dev)
- Install all Rust dependencies in `Cargo.toml`:
  - `tauri` (features: `tray-icon`, `system-tray`)
  - `tauri-plugin-sql` (features: `sqlite`)
  - `serde`, `serde_json`, `chrono`, `thiserror`, `log`
  - `x11rb` (optional, features: `screensaver`), `zbus` (optional)
- Confirm `cargo check` and `npm run build` both pass on the empty scaffold

---

## Phase 2 — Database Layer

**Owner:** backend
**Goal:** Establish the SQLite schema and Rust data access foundation.

### Files to create
- `src-tauri/migrations/001_initial.sql` — full schema
- `src-tauri/src/error.rs` — `AppError` enum with `thiserror`; `impl From<AppError> for String`
- `src-tauri/src/models.rs` — serde structs for `Project`, `Task`, `TimeEntry`, `AppState`, `ActiveTimer` (all fields `camelCase` renamed for IPC)
- `src-tauri/src/db.rs` — open pool, run `PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;`, execute migration

### Schema outline
```sql
CREATE TABLE projects (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#6366f1',
  description TEXT,
  archived INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE tasks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  archived INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE time_entries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  start_time TEXT NOT NULL,
  end_time TEXT,
  notes TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE app_state (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  active_entry_id INTEGER REFERENCES time_entries(id) ON DELETE SET NULL
);

INSERT INTO app_state (id, active_entry_id) VALUES (1, NULL);
```

---

## Phase 3 — Rust Commands

**Owner:** backend
**Goal:** Implement all Tauri IPC commands. All return `Result<T, String>`.

### Files to create
- `src-tauri/src/commands/mod.rs`
- `src-tauri/src/commands/projects.rs`
- `src-tauri/src/commands/tasks.rs`
- `src-tauri/src/commands/timer.rs`
- `src-tauri/src/commands/entries.rs`
- `src-tauri/src/commands/reports.rs`
- `src-tauri/src/commands/idle.rs`
- Update `src-tauri/src/lib.rs` — register all commands in `invoke_handler`

### Command inventory

**Projects**
- `get_projects() -> Vec<Project>`
- `create_project(name, color, description?) -> Project`
- `update_project(id, name, color, description?) -> Project`
- `archive_project(id) -> Project`
- `delete_project(id) -> ()`

**Tasks**
- `get_tasks(project_id) -> Vec<Task>`
- `create_task(project_id, name, description?) -> Task`
- `update_task(id, name, description?) -> Task`
- `archive_task(id) -> Task`
- `delete_task(id) -> ()`

**Timer**
- `get_active_timer() -> Option<ActiveTimer>` — joins `time_entries`, `tasks`, `projects`
- `start_timer(task_id, notes?) -> TimeEntry` — errors if `active_entry_id` is not NULL
- `stop_timer(adjust_end_time?) -> TimeEntry` — sets `end_time = Utc::now()` (never use frontend time)
- `discard_idle_time(idle_seconds: u64) -> TimeEntry` — sets `end_time = Utc::now() - idle_seconds`

**Entries**
- `get_entries(project_id?, task_id?, date_from?, date_to?, limit, offset) -> Vec<TimeEntry>`
- `update_entry(id, notes?, start_time?, end_time?) -> TimeEntry`
- `delete_entry(id) -> ()`

**Reports**
- `get_report(project_id?, task_id?, date_from?, date_to?) -> ReportData` — aggregated durations

**Idle**
- `get_idle_seconds() -> u64` — returns 0 on any error; checks Wayland first, then X11, then returns 0

---

## Phase 4 — Vue Foundation

**Owner:** frontend
**Goal:** Set up the Vue 3 application layer so all subsequent UI phases can build on it.

### Files to create
- `src/main.ts` — mount app, register PrimeVue (Aura preset), Pinia, Vue Router
- `src/types/index.ts` — TypeScript interfaces mirroring all Rust models
- `src/services/tauriApi.ts` — centralized `invoke` wrapper (only file that imports `@tauri-apps/api/core`)
- `src/stores/timer.ts` — `activeEntry`, `isRunning`, `startedAt`; actions: `fetchActiveTimer`, `startTimer`, `stopTimer`
- `src/stores/projects.ts` — projects list; actions: CRUD
- `src/stores/tasks.ts` — tasks list keyed by project; actions: CRUD
- `src/stores/reports.ts` — report data and filter state
- `src/router/index.ts` — routes for Dashboard, Projects, ProjectDetail, Entries, Reports

---

## Phase 5 — App Shell

**Owner:** frontend
**Goal:** Persistent layout with sidebar navigation and routed content area.

### Files to create
- `src/components/layout/AppShell.vue` — outer layout wrapper
- `src/components/layout/SidebarNav.vue` — nav links to all views
- `src/App.vue` — mount `AppShell`, call `fetchActiveTimer` on `onMounted`, listen for `tray-toggle-timer` event

---

## Phase 6 — Projects UI

**Owner:** frontend

- `src/views/ProjectsView.vue` — grid of project cards, "New Project" button
- `src/components/projects/ProjectCard.vue` — name, color swatch, task count, archive/delete actions
- `src/components/projects/ProjectFormDialog.vue` — create/edit form with color picker and confirm-on-delete

---

## Phase 7 — Tasks UI

**Owner:** frontend

- `src/views/ProjectDetailView.vue` — project header, task list, "New Task" button
- `src/components/tasks/TaskListItem.vue` — task name, archive/delete actions
- `src/components/tasks/TaskFormDialog.vue` — create/edit form

---

## Phase 8 — Timer UI

**Owner:** frontend

- `src/composables/useTimer.ts` — `setInterval` tick computing `elapsedSeconds` from `timerStore.startedAt`
- `src/views/DashboardView.vue` — active timer display, quick-start panel
- `src/components/timer/TimerWidget.vue` — elapsed time display, Start/Stop button (`data-testid="stop-btn"` when running)
- `src/components/timer/TaskSelector.vue` — searchable dropdown of active tasks across all projects

---

## Phase 9 — Entries View

**Owner:** frontend

- `src/views/EntriesView.vue` — paginated table of all time entries
- `src/components/entries/EntryEditDialog.vue` — inline edit of notes, start time, end time

---

## Phase 10 — Idle Detection

**Owner:** backend + frontend

**Backend:** `commands/idle.rs` already scaffolded in Phase 3; verify it compiles with optional feature flags.

**Frontend:**
- `src/composables/useIdleDetection.ts` — polls `api.getIdleSeconds()` every 30s when `isRunning`; emits `idle-detected` when threshold (default 300s) exceeded
- `src/components/timer/IdlePromptDialog.vue` — three options: "Keep time", "Discard idle time" (calls `api.discardIdleTime`), "Stop timer"

---

## Phase 11 — Reports

**Owner:** frontend

- `src/views/ReportsView.vue` — contains filter panel and both tables; wraps printable area in `id="report-printable-area"`
- `src/components/reports/ReportFilterPanel.vue` — project/task selects, date range pickers
- `src/components/reports/ReportSummaryTable.vue` — totals per project
- `src/components/reports/ReportDetailTable.vue` — per-entry breakdown

---

## Phase 12 — PDF Export

**Owner:** frontend

- `src/services/pdfExport.ts` — `html2canvas` captures `#report-printable-area`; `jsPDF` paginates and saves
- `src/components/reports/ReportExportButton.vue` — triggers export; shows loading state
- Verify `tauri.conf.json` has `"blob: data:"` in `img-src` CSP (coordinate with backend if missing)

---

## Phase 13 — System Tray

**Owner:** backend + frontend

**Backend:**
- `src-tauri/src/tray.rs` — build tray icon; menu items: "Show / Hide", timer label, "Quit"
- Left-click toggles window visibility
- "Start/Stop Timer" menu item emits `tray-toggle-timer` event to frontend
- `update_tray_state(label: String, is_running: bool)` command updates menu item text
- Register tray in `lib.rs`

**Frontend:**
- `App.vue` already listens for `tray-toggle-timer` (Phase 5); connect to `timerStore`
- Call `api.updateTrayState(label, isRunning)` via a 60000ms interval when timer is running

---

## Phase 14 — Close-to-Tray

**Owner:** backend

- Intercept the `CloseRequested` window event in `lib.rs`
- Call `window.hide()` instead of allowing the default close
- Provide a "Quit" action in the tray menu that calls `app.exit(0)`

---

## Phase 15 — Polish

**Owner:** frontend

- Empty states for Projects, Tasks, and Entries views
- Global Toast error handling — wrap all store actions in try/catch and show PrimeVue `Toast`
- Ctrl+Space keyboard shortcut to toggle the timer (`useEventListener` on `document`)
- Loading skeletons during async fetches

---

## Phase 16 — Documentation

**Owner:** orchestrator

Write `FOR[yourname].md` in the project root: a narrative explanation of the full architecture, technical decisions, bugs encountered, lessons learned, and best practices demonstrated by this project. See global `CLAUDE.md` for the expected format.

---

## Phase 17 — README file

**Owner:** orchestrator

Write `README.md` in the project root: a concise project overview, tech stack summary, setup instructions, and usage guide. Include a link to `FOR[yourname].md` for the architecture narrative.

---


## Review & Test Gate (applies to every phase)

Each phase runs through this loop. The iteration counter starts at 1 (initial
implementation) and increments on every fix cycle. Maximum 3 total iterations.

### Per-iteration steps
1. Specialist agent(s) implement the phase (or fix issues from prior iteration).
2. **Test agent** (backend-test or frontend-test) writes and runs tests.
   - If tests fail → specialist fixes → re-run tests (counts as a new iteration).
3. Once tests pass → **Review agent** checks changed files against all
   architectural rules (CRITICAL / MAJOR / MINOR / STYLE).
   - If CRITICAL or MAJOR issues found → specialist fixes → go back to step 1
     (counts as a new iteration).
4. When review returns PASS (zero CRITICAL, zero MAJOR) → advance to next phase.

### Iteration limit
- After the 3rd iteration (initial + 2 fix cycles), if review still finds
  CRITICAL or MAJOR issues → **INTERACTIVE MODE**:
  - Orchestrator halts.
  - Presents the full list of outstanding review findings to the user.
  - Asks the user to choose: fix manually, skip issue, or abort.
  - Resumes only after the user responds.
