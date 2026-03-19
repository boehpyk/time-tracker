import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { save } from "@tauri-apps/plugin-dialog";
import { writeFile } from "@tauri-apps/plugin-fs";
import type {
  Project,
  Task,
  TimeEntry,
  ActiveTimer,
  CreateProjectPayload,
  UpdateProjectPayload,
  CreateTaskPayload,
  UpdateTaskPayload,
  UpdateEntryPayload,
  ReportFilter,
  ReportData,
  EntriesFilter,
  EntryWithContext,
} from "../types/index";

export const api = {
  // Projects
  getProjects(): Promise<Project[]> {
    return invoke("get_projects");
  },
  createProject(payload: CreateProjectPayload): Promise<Project> {
    return invoke("create_project", {
      name: payload.name,
      color: payload.color,
      description: payload.description ?? null,
    });
  },
  updateProject(id: number, payload: Omit<UpdateProjectPayload, "id">): Promise<Project> {
    return invoke("update_project", {
      id,
      name: payload.name,
      color: payload.color,
      description: payload.description ?? null,
    });
  },
  archiveProject(id: number): Promise<Project> {
    return invoke("archive_project", { id });
  },
  deleteProject(id: number): Promise<void> {
    return invoke("delete_project", { id });
  },

  // Tasks
  getTasks(projectId: number): Promise<Task[]> {
    return invoke("get_tasks", { projectId });
  },
  createTask(payload: CreateTaskPayload): Promise<Task> {
    return invoke("create_task", {
      projectId: payload.projectId,
      name: payload.name,
      description: payload.description ?? null,
    });
  },
  updateTask(id: number, payload: Omit<UpdateTaskPayload, "id">): Promise<Task> {
    return invoke("update_task", {
      id,
      name: payload.name,
      description: payload.description ?? null,
    });
  },
  archiveTask(id: number): Promise<Task> {
    return invoke("archive_task", { id });
  },
  deleteTask(id: number): Promise<void> {
    return invoke("delete_task", { id });
  },

  // Timer
  getActiveTimer(): Promise<ActiveTimer | null> {
    return invoke("get_active_timer");
  },
  startTimer(taskId: number, notes?: string): Promise<TimeEntry> {
    return invoke("start_timer", { taskId, notes: notes ?? null });
  },
  stopTimer(): Promise<TimeEntry> {
    return invoke("stop_timer");
  },
  discardIdleTime(idleSeconds: number): Promise<TimeEntry> {
    return invoke("discard_idle_time", { idleSeconds });
  },

  // Entries
  getEntries(filter: EntriesFilter): Promise<EntryWithContext[]> {
    return invoke("get_entries", {
      projectId: filter.projectId ?? null,
      taskId: filter.taskId ?? null,
      dateFrom: filter.dateFrom ?? null,
      dateTo: filter.dateTo ?? null,
      showArchived: filter.showArchived ?? false,
      limit: filter.limit,
      offset: filter.offset,
    });
  },
  updateEntry(payload: UpdateEntryPayload): Promise<TimeEntry> {
    return invoke("update_entry", {
      id: payload.id,
      notes: payload.notes ?? null,
      startTime: payload.startTime ?? null,
      endTime: payload.endTime ?? null,
    });
  },
  deleteEntry(id: number): Promise<void> {
    return invoke("delete_entry", { id });
  },

  // Reports
  getReport(filter: ReportFilter): Promise<ReportData> {
    return invoke("get_report", {
      projectId: filter.projectId ?? null,
      taskId: filter.taskId ?? null,
      dateFrom: filter.dateFrom ?? null,
      dateTo: filter.dateTo ?? null,
      includeArchived: filter.includeArchived ?? false,
    });
  },
  archiveReportedEntries(filter: ReportFilter): Promise<number> {
    return invoke("archive_reported_entries", {
      projectId: filter.projectId ?? null,
      taskId: filter.taskId ?? null,
      dateFrom: filter.dateFrom ?? null,
      dateTo: filter.dateTo ?? null,
    });
  },

  // Idle
  getIdleSeconds(): Promise<number> {
    return invoke("get_idle_seconds");
  },

  // Tray
  updateTrayState(label: string, isRunning: boolean): Promise<void> {
    return invoke("update_tray_state", { label, isRunning });
  },
  listenTrayToggle(callback: () => void): Promise<() => void> {
    return listen("tray-toggle-timer", callback);
  },

  // PDF export
  async savePdfAs(bytes: Uint8Array, defaultFilename: string): Promise<string | null> {
    const path = await save({
      defaultPath: defaultFilename,
      filters: [{ name: 'PDF', extensions: ['pdf'] }],
    });
    if (path === null) return null;
    await writeFile(path, bytes);
    return path;
  },
};
