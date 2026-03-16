import { describe, it, expect } from "vitest";
import type {
  Project,
  Task,
  TimeEntry,
  AppState,
  ActiveTimer,
  CreateProjectPayload,
  UpdateProjectPayload,
  CreateTaskPayload,
  UpdateTaskPayload,
  StartTimerPayload,
  UpdateEntryPayload,
  ReportFilter,
  ReportRow,
  ReportData,
  TaskReport,
  ProjectReport,
  EntriesFilter,
  EntryWithContext,
} from "../../types/index";

// Shape validation: construct objects that satisfy each interface
// TypeScript compile errors here = interface mismatch

describe("types/index", () => {
  it("Project interface has required fields including archived as number", () => {
    const p: Project = {
      id: 1,
      name: "Test",
      color: "#ff0000",
      archived: 0,
      createdAt: "2026-03-01T00:00:00Z",
      updatedAt: "2026-03-01T00:00:00Z",
    };
    expect(p.archived).toBe(0);
    expect(typeof p.archived).toBe("number");
  });

  it("Project archived field accepts 1 for archived state", () => {
    const p: Project = {
      id: 1,
      name: "Test",
      color: "#ff0000",
      archived: 1,
      createdAt: "2026-03-01T00:00:00Z",
      updatedAt: "2026-03-01T00:00:00Z",
    };
    expect(p.archived).toBe(1);
  });

  it("Project description is optional", () => {
    const p: Project = {
      id: 1,
      name: "Test",
      color: "#ff0000",
      archived: 0,
      createdAt: "2026-03-01T00:00:00Z",
      updatedAt: "2026-03-01T00:00:00Z",
    };
    expect(p.description).toBeUndefined();
  });

  it("Task interface has projectId and archived as number", () => {
    const t: Task = {
      id: 10,
      projectId: 1,
      name: "Task",
      archived: 0,
      createdAt: "2026-03-01T00:00:00Z",
      updatedAt: "2026-03-01T00:00:00Z",
    };
    expect(t.projectId).toBe(1);
    expect(typeof t.archived).toBe("number");
  });

  it("TimeEntry endTime and notes are optional", () => {
    const e: TimeEntry = {
      id: 1,
      taskId: 10,
      startTime: "2026-03-01T08:00:00Z",
      archived: 0,
      createdAt: "2026-03-01T08:00:00Z",
      updatedAt: "2026-03-01T08:00:00Z",
    };
    expect(e.endTime).toBeUndefined();
    expect(e.notes).toBeUndefined();
  });

  it("AppState activeEntryId is optional", () => {
    const s: AppState = { id: 1 };
    expect(s.activeEntryId).toBeUndefined();
  });

  it("ActiveTimer has all required fields", () => {
    const at: ActiveTimer = {
      entryId: 1,
      taskId: 10,
      taskName: "Task",
      projectId: 1,
      projectName: "Project",
      projectColor: "#ff0000",
      startTime: "2026-03-01T08:00:00Z",
    };
    expect(at.notes).toBeUndefined();
  });

  it("ReportFilter projectId and taskId are optional", () => {
    const f: ReportFilter = { dateFrom: "2026-03-01", dateTo: "2026-03-10" };
    expect(f.projectId).toBeUndefined();
    expect(f.taskId).toBeUndefined();
  });

  it("ReportFilter all fields are optional", () => {
    const f: ReportFilter = {};
    expect(f.dateFrom).toBeUndefined();
    expect(f.dateTo).toBeUndefined();
  });

  it("ReportRow has totalSeconds and entryCount as numbers", () => {
    const r: ReportRow = {
      projectId: 1,
      projectName: "P",
      projectColor: "#0f0",
      taskId: 2,
      taskName: "T",
      totalSeconds: 3600,
      entryCount: 3,
    };
    expect(typeof r.totalSeconds).toBe("number");
    expect(typeof r.entryCount).toBe("number");
  });

  it("TaskReport has taskId, taskName, totalSeconds and entryCount", () => {
    const r: TaskReport = {
      taskId: 1,
      taskName: "Write code",
      totalSeconds: 1800,
      entryCount: 2,
      entries: [],
    };
    expect(r.totalSeconds).toBe(1800);
  });

  it("ProjectReport has nested tasks array", () => {
    const r: ProjectReport = {
      projectId: 1,
      projectName: "P",
      projectColor: "#0f0",
      totalSeconds: 3600,
      tasks: [{ taskId: 1, taskName: "T", totalSeconds: 3600, entryCount: 1, entries: [] }],
    };
    expect(r.tasks).toHaveLength(1);
  });

  it("ReportData has projects array and totalSeconds", () => {
    const d: ReportData = {
      projects: [],
      totalSeconds: 0,
    };
    expect(d.projects).toEqual([]);
    expect(d.totalSeconds).toBe(0);
  });

  it("EntriesFilter requires limit and offset", () => {
    const f: EntriesFilter = { limit: 20, offset: 0 };
    expect(f.projectId).toBeUndefined();
    expect(f.taskId).toBeUndefined();
  });

  it("EntryWithContext includes taskName and project fields", () => {
    const e: EntryWithContext = {
      id: 1,
      taskId: 10,
      startTime: "2026-03-01T08:00:00Z",
      archived: 0,
      createdAt: "2026-03-01T08:00:00Z",
      updatedAt: "2026-03-01T08:00:00Z",
      taskName: "Task",
      projectId: 1,
      projectName: "Project",
      projectColor: "#ff0000",
    };
    expect(e.taskName).toBe("Task");
    expect(e.projectColor).toBe("#ff0000");
  });

  // These assertions verify payload types compile correctly
  it("CreateProjectPayload has name and color required", () => {
    const p: CreateProjectPayload = { name: "P", color: "#f00" };
    expect(p.name).toBe("P");
  });

  it("UpdateProjectPayload requires id, name and color", () => {
    const p: UpdateProjectPayload = { id: 1, name: "Renamed", color: "#00f" };
    expect(p.id).toBe(1);
    expect(p.name).toBe("Renamed");
  });

  it("CreateTaskPayload requires projectId and name", () => {
    const p: CreateTaskPayload = { projectId: 1, name: "T" };
    expect(p.projectId).toBe(1);
  });

  it("UpdateTaskPayload requires id and name", () => {
    const p: UpdateTaskPayload = { id: 1, name: "Updated" };
    expect(p.id).toBe(1);
    expect(p.name).toBe("Updated");
  });

  it("StartTimerPayload requires taskId", () => {
    const p: StartTimerPayload = { taskId: 3 };
    expect(p.taskId).toBe(3);
  });

  it("UpdateEntryPayload only requires id", () => {
    const p: UpdateEntryPayload = { id: 1 };
    expect(p.id).toBe(1);
  });
});
