import { describe, it, expect, beforeEach, vi } from "vitest";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { api } from "../../services/tauriApi";

const mockInvoke = vi.mocked(invoke);
const mockListen = vi.mocked(listen);

beforeEach(() => {
  mockInvoke.mockReset();
  mockListen.mockReset();
});

describe("tauriApi", () => {
  describe("getProjects", () => {
    it("calls invoke with get_projects and no args", async () => {
      mockInvoke.mockResolvedValue([]);
      await api.getProjects();
      expect(mockInvoke).toHaveBeenCalledWith("get_projects");
    });
  });

  describe("createProject", () => {
    it("calls invoke with create_project and flat args", async () => {
      const payload = { name: "Test", color: "#ff0000" };
      mockInvoke.mockResolvedValue({ id: 1, ...payload, archived: 0, createdAt: "", updatedAt: "" });
      await api.createProject(payload);
      expect(mockInvoke).toHaveBeenCalledWith("create_project", {
        name: "Test",
        color: "#ff0000",
        description: null,
      });
    });
  });

  describe("updateProject", () => {
    it("calls invoke with update_project and flat args", async () => {
      mockInvoke.mockResolvedValue({ id: 1, name: "Updated", color: "#ff0000", archived: 0, createdAt: "", updatedAt: "" });
      await api.updateProject(1, { name: "Updated", color: "#ff0000" });
      expect(mockInvoke).toHaveBeenCalledWith("update_project", {
        id: 1,
        name: "Updated",
        color: "#ff0000",
        description: null,
      });
    });
  });

  describe("archiveProject", () => {
    it("calls invoke with archive_project and id", async () => {
      mockInvoke.mockResolvedValue({ id: 1, name: "P", color: "#ff0000", archived: 1, createdAt: "", updatedAt: "" });
      await api.archiveProject(1);
      expect(mockInvoke).toHaveBeenCalledWith("archive_project", { id: 1 });
    });
  });

  describe("deleteProject", () => {
    it("calls invoke with delete_project and id", async () => {
      mockInvoke.mockResolvedValue(undefined);
      await api.deleteProject(1);
      expect(mockInvoke).toHaveBeenCalledWith("delete_project", { id: 1 });
    });
  });

  describe("getTasks", () => {
    it("calls invoke with get_tasks and projectId", async () => {
      mockInvoke.mockResolvedValue([]);
      await api.getTasks(42);
      expect(mockInvoke).toHaveBeenCalledWith("get_tasks", { projectId: 42 });
    });
  });

  describe("createTask", () => {
    it("calls invoke with create_task and flat args", async () => {
      const payload = { projectId: 1, name: "Task 1" };
      mockInvoke.mockResolvedValue({ id: 1, ...payload, archived: 0, createdAt: "", updatedAt: "" });
      await api.createTask(payload);
      expect(mockInvoke).toHaveBeenCalledWith("create_task", {
        projectId: 1,
        name: "Task 1",
        description: null,
      });
    });
  });

  describe("updateTask", () => {
    it("calls invoke with update_task and flat args", async () => {
      mockInvoke.mockResolvedValue({ id: 1, projectId: 1, name: "Updated Task", archived: 0, createdAt: "", updatedAt: "" });
      await api.updateTask(1, { name: "Updated Task" });
      expect(mockInvoke).toHaveBeenCalledWith("update_task", {
        id: 1,
        name: "Updated Task",
        description: null,
      });
    });
  });

  describe("archiveTask", () => {
    it("calls invoke with archive_task and id", async () => {
      mockInvoke.mockResolvedValue({ id: 5, projectId: 1, name: "T", archived: 1, createdAt: "", updatedAt: "" });
      await api.archiveTask(5);
      expect(mockInvoke).toHaveBeenCalledWith("archive_task", { id: 5 });
    });
  });

  describe("deleteTask", () => {
    it("calls invoke with delete_task and id", async () => {
      mockInvoke.mockResolvedValue(undefined);
      await api.deleteTask(5);
      expect(mockInvoke).toHaveBeenCalledWith("delete_task", { id: 5 });
    });
  });

  describe("getActiveTimer", () => {
    it("calls invoke with get_active_timer", async () => {
      mockInvoke.mockResolvedValue(null);
      await api.getActiveTimer();
      expect(mockInvoke).toHaveBeenCalledWith("get_active_timer");
    });
  });

  describe("startTimer", () => {
    it("calls invoke with start_timer and flat taskId/notes", async () => {
      mockInvoke.mockResolvedValue({ id: 1, taskId: 3, startTime: "", createdAt: "", updatedAt: "" });
      await api.startTimer(3, "working");
      expect(mockInvoke).toHaveBeenCalledWith("start_timer", { taskId: 3, notes: "working" });
    });

    it("sends null for notes when omitted", async () => {
      mockInvoke.mockResolvedValue({ id: 1, taskId: 3, startTime: "", createdAt: "", updatedAt: "" });
      await api.startTimer(3);
      expect(mockInvoke).toHaveBeenCalledWith("start_timer", { taskId: 3, notes: null });
    });
  });

  describe("stopTimer", () => {
    it("calls invoke with stop_timer", async () => {
      mockInvoke.mockResolvedValue({ id: 1, taskId: 3, startTime: "", endTime: "", createdAt: "", updatedAt: "" });
      await api.stopTimer();
      expect(mockInvoke).toHaveBeenCalledWith("stop_timer");
    });
  });

  describe("discardIdleTime", () => {
    it("calls invoke with discard_idle_time and idleSeconds", async () => {
      mockInvoke.mockResolvedValue({ id: 1, taskId: 3, startTime: "", endTime: "", createdAt: "", updatedAt: "" });
      await api.discardIdleTime(120);
      expect(mockInvoke).toHaveBeenCalledWith("discard_idle_time", { idleSeconds: 120 });
    });
  });

  describe("getEntries", () => {
    it("calls invoke with get_entries and flat args", async () => {
      const filter = { limit: 20, offset: 0 };
      mockInvoke.mockResolvedValue([]);
      await api.getEntries(filter);
      expect(mockInvoke).toHaveBeenCalledWith("get_entries", {
        projectId: null,
        taskId: null,
        dateFrom: null,
        dateTo: null,
        showArchived: false,
        limit: 20,
        offset: 0,
      });
    });
  });

  describe("updateEntry", () => {
    it("calls invoke with update_entry and flat args", async () => {
      const payload = { id: 1, notes: "updated" };
      mockInvoke.mockResolvedValue({ id: 1, taskId: 1, startTime: "", createdAt: "", updatedAt: "" });
      await api.updateEntry(payload);
      expect(mockInvoke).toHaveBeenCalledWith("update_entry", {
        id: 1,
        notes: "updated",
        startTime: null,
        endTime: null,
      });
    });
  });

  describe("deleteEntry", () => {
    it("calls invoke with delete_entry and id", async () => {
      mockInvoke.mockResolvedValue(undefined);
      await api.deleteEntry(7);
      expect(mockInvoke).toHaveBeenCalledWith("delete_entry", { id: 7 });
    });
  });

  describe("getReport", () => {
    it("calls invoke with get_report and flat args", async () => {
      const filter = { dateFrom: "2026-03-01", dateTo: "2026-03-10" };
      mockInvoke.mockResolvedValue({ projects: [], totalSeconds: 0 });
      await api.getReport(filter);
      expect(mockInvoke).toHaveBeenCalledWith("get_report", {
        projectId: null,
        taskId: null,
        dateFrom: "2026-03-01",
        dateTo: "2026-03-10",
        includeArchived: false,
      });
    });
  });

  describe("getIdleSeconds", () => {
    it("calls invoke with get_idle_seconds", async () => {
      mockInvoke.mockResolvedValue(0);
      await api.getIdleSeconds();
      expect(mockInvoke).toHaveBeenCalledWith("get_idle_seconds");
    });
  });

  describe("updateTrayState", () => {
    it("calls invoke with update_tray_state with label first then isRunning", async () => {
      mockInvoke.mockResolvedValue(undefined);
      await api.updateTrayState("1:23:45", true);
      expect(mockInvoke).toHaveBeenCalledWith("update_tray_state", { label: "1:23:45", isRunning: true });
    });
  });

  describe("listenTrayToggle", () => {
    it("calls listen with tray-toggle-timer and the provided callback", async () => {
      const mockUnlisten = vi.fn();
      mockListen.mockResolvedValue(mockUnlisten);
      const callback = vi.fn();
      const unlisten = await api.listenTrayToggle(callback);
      expect(mockListen).toHaveBeenCalledWith("tray-toggle-timer", callback);
      expect(unlisten).toBe(mockUnlisten);
    });
  });
});
