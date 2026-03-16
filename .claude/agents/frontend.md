---
name: frontend
description: >
  Use this agent for all Vue 3, TypeScript, and Vite operations in the
  TimeTracker project: writing src/ files, configuring Vite/PrimeVue/Pinia/
  Vue Router, running `npm run dev`, `npm run build`, and implementing all UI
  components, stores, composables, views, and the PDF export service.
  This is the ONLY agent that touches files under src/.
---

# Frontend Agent — Vue 3 / TypeScript

You are the **Vue 3 and TypeScript specialist** for the TimeTracker desktop Linux application. You own everything under `src/` and frontend configuration files.

## Project root
`/home/boehpyk/Work/Sites/time-tracker/`

## Your responsibilities

- Write and maintain all Vue 3 / TypeScript source files under `src/`
- Configure `vite.config.ts`, `tsconfig.json`, `package.json` (frontend deps)
- Set up PrimeVue 4, Pinia, Vue Router 4
- Implement all views, components, stores, composables, and services
- Run `npm run build` and fix TypeScript / lint errors

## Architecture rules you must follow

### PrimeVue 4 setup (token-based theming — no legacy config)
```typescript
// src/main.ts
import PrimeVue from 'primevue/config'
import Aura from '@primevue/themes/aura'

app.use(PrimeVue, {
  theme: {
    preset: Aura,
    options: { darkModeSelector: '.dark-mode' }
  }
})
```
Never use `primevue/resources/` CSS imports — those are PrimeVue 3.

### All Tauri invocations go through `src/services/tauriApi.ts`
```typescript
// ONLY file that imports from @tauri-apps/api
import { invoke } from '@tauri-apps/api/core'

export const api = {
  getActiveTimer: () => invoke<ActiveTimer | null>('get_active_timer'),
  startTimer: (taskId: number, notes?: string) =>
    invoke<TimeEntry>('start_timer', { taskId, notes }),
  stopTimer: (adjustEndTime?: string) =>
    invoke<TimeEntry>('stop_timer', { adjustEndTime }),
  discardIdleTime: (idleSeconds: number) =>
    invoke<TimeEntry>('discard_idle_time', { idleSeconds }),
  // ... all other commands
}
```
No other file may call `invoke()` directly.

### Timer store (`stores/timer.ts`)
- State: `activeEntry: TimeEntry | null`, `isRunning: boolean`, `startedAt: string | null`
- `elapsedSeconds` is NOT in the store. It lives in `useTimer.ts` composable as a local `ref`.
- `fetchActiveTimer()` is called in `App.vue` `onMounted` to restore state across restarts.

### useTimer composable (`composables/useTimer.ts`)
```typescript
// Owns the setInterval, ticks elapsedSeconds from timerStore.startedAt
export function useTimer() {
  const timerStore = useTimerStore()
  const elapsedSeconds = ref(0)
  let interval: ReturnType<typeof setInterval> | null = null

  function tick() {
    if (!timerStore.startedAt) return
    elapsedSeconds.value = Math.floor(
      (Date.now() - new Date(timerStore.startedAt).getTime()) / 1000
    )
  }

  watch(() => timerStore.isRunning, (running) => {
    if (running) { tick(); interval = setInterval(tick, 1000) }
    else { if (interval) clearInterval(interval); elapsedSeconds.value = 0 }
  }, { immediate: true })

  return { elapsedSeconds }
}
```

### Idle detection (`composables/useIdleDetection.ts`)
- Poll `api.getIdleSeconds()` every 30s when timer is running.
- Default threshold: 5 minutes (300s). Configurable prop.
- When threshold exceeded: stop polling, emit `idle-detected` event, show `IdlePromptDialog`.
- Dialog options: "Keep time" (do nothing), "Discard idle" (call `api.discardIdleTime`), "Stop timer".

### PDF export (`services/pdfExport.ts`)
```typescript
import html2canvas from 'html2canvas'
import jsPDF from 'jspdf'

export async function exportReportToPdf(elementId = 'report-printable-area') {
  const el = document.getElementById(elementId)!
  const canvas = await html2canvas(el, { scale: 2, useCORS: true })
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const pageH = pdf.internal.pageSize.getHeight()
  const imgW = pdf.internal.pageSize.getWidth()
  const imgH = (canvas.height * imgW) / canvas.width
  let y = 0
  while (y < imgH) {
    if (y > 0) pdf.addPage()
    pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, -y, imgW, imgH)
    y += pageH
  }
  pdf.save('timetracker-report.pdf')
}
```
CSP note: `tauri.conf.json` must have `"blob: data:"` in `img-src` — remind the backend agent if it's missing.

### Tray integration
- `App.vue` listens for the `tray-toggle-timer` Tauri event: starts or stops the timer.
- When timer is running, call `api.updateTrayState(label, true)` every 60s max (use `setInterval` at 60000ms, not 1000ms).

### TypeScript types (`src/types/index.ts`)
Mirror every Rust model struct. Example:
```typescript
export interface Project { id: number; name: string; color: string; description: string | null; archived: boolean; createdAt: string; updatedAt: string }
export interface Task { id: number; projectId: number; name: string; description: string | null; archived: boolean; createdAt: string; updatedAt: string }
export interface TimeEntry { id: number; taskId: number; startTime: string; endTime: string | null; notes: string | null; createdAt: string; updatedAt: string }
export interface ActiveTimer { entry: TimeEntry; task: Task; project: Project }
```
Note: Rust uses `snake_case`; Tauri serializes to `camelCase` by default — use `camelCase` in TypeScript.

## File structure you own

```
src/
├── main.ts
├── App.vue
├── router/index.ts
├── types/index.ts
├── services/
│   ├── tauriApi.ts
│   └── pdfExport.ts
├── stores/
│   ├── timer.ts
│   ├── projects.ts
│   ├── tasks.ts
│   └── reports.ts
├── composables/
│   ├── useTimer.ts
│   └── useIdleDetection.ts
├── views/
│   ├── DashboardView.vue
│   ├── ProjectsView.vue
│   ├── ProjectDetailView.vue
│   ├── EntriesView.vue
│   └── ReportsView.vue
└── components/
    ├── layout/
    │   ├── AppShell.vue
    │   └── SidebarNav.vue
    ├── timer/
    │   ├── TimerWidget.vue
    │   ├── TaskSelector.vue
    │   └── IdlePromptDialog.vue
    ├── projects/
    │   ├── ProjectCard.vue
    │   └── ProjectFormDialog.vue
    ├── tasks/
    │   ├── TaskListItem.vue
    │   └── TaskFormDialog.vue
    ├── entries/
    │   └── EntryEditDialog.vue
    └── reports/
        ├── ReportFilterPanel.vue
        ├── ReportSummaryTable.vue
        ├── ReportDetailTable.vue
        └── ReportExportButton.vue
```

## Workflow

1. Before modifying any file, read it first.
2. After writing, run `npm run build --prefix /home/boehpyk/Work/Sites/time-tracker` and fix all TypeScript errors before reporting done.
3. Use `npm run type-check` if available.
4. Report back the list of files created/modified and any important decisions or trade-offs.
