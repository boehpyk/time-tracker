export interface Project {
  id: number;
  name: string;
  color: string;
  description?: string;
  archived: number; // 0 = false, 1 = true (SQLite INTEGER)
  createdAt: string;
  updatedAt: string;
}

export interface Task {
  id: number;
  projectId: number;
  name: string;
  description?: string;
  archived: number; // 0 = false, 1 = true (SQLite INTEGER)
  createdAt: string;
  updatedAt: string;
}

export interface TimeEntry {
  id: number;
  taskId: number;
  startTime: string;
  endTime?: string;
  notes?: string;
  archived: number; // 0 = active, 1 = archived
  createdAt: string;
  updatedAt: string;
}

export interface AppState {
  id: number;
  activeEntryId?: number;
}

export interface ActiveTimer {
  entryId: number;
  taskId: number;
  taskName: string;
  projectId: number;
  projectName: string;
  projectColor: string;
  startTime: string;
  notes?: string;
}

// Payload types for create/update commands
export interface CreateProjectPayload {
  name: string;
  color: string;
  description?: string;
}

export interface UpdateProjectPayload {
  id: number;
  name: string;
  color: string;
  description?: string;
}

export interface CreateTaskPayload {
  projectId: number;
  name: string;
  description?: string;
}

export interface UpdateTaskPayload {
  id: number;
  name: string;
  description?: string;
}

export interface StartTimerPayload {
  taskId: number;
  notes?: string;
}

export interface UpdateEntryPayload {
  id: number;
  startTime?: string;
  endTime?: string;
  notes?: string;
}

export interface ReportFilter {
  dateFrom?: string;
  dateTo?: string;
  projectId?: number;
  taskId?: number;
  includeArchived?: boolean;
}

export interface EntryDetail {
  entryId: number;
  startTime: string;
  endTime: string;
  durationSeconds: number;
}

export interface TaskReport {
  taskId: number;
  taskName: string;
  totalSeconds: number;
  entryCount: number;
  entries: EntryDetail[];
}

export interface ProjectReport {
  projectId: number;
  projectName: string;
  projectColor: string;
  totalSeconds: number;
  tasks: TaskReport[];
}

export interface ReportData {
  projects: ProjectReport[];
  totalSeconds: number;
  dateFrom?: string;
  dateTo?: string;
}

// Kept for backward-compat with any code that references flat report rows.
// Represents a single task row before aggregation into ReportData.
export interface ReportRow {
  projectId: number;
  projectName: string;
  projectColor: string;
  taskId: number;
  taskName: string;
  totalSeconds: number;
  entryCount: number;
}

export interface EntriesFilter {
  limit: number;
  offset: number;
  projectId?: number;
  taskId?: number;
  dateFrom?: string;
  dateTo?: string;
  showArchived?: boolean;
}

export interface EntryWithContext extends TimeEntry {
  taskName: string;
  projectId: number;
  projectName: string;
  projectColor: string;
}
