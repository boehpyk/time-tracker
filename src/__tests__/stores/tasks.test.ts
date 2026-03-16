import { describe, it, expect, beforeEach, vi } from "vitest";
import { setActivePinia, createPinia } from "pinia";
import { useTasksStore } from "../../stores/tasks";
import { api } from "../../services/tauriApi";
import type { Task } from "../../types/index";

vi.mock("../../services/tauriApi", () => ({
  api: {
    getTasks: vi.fn(),
    createTask: vi.fn(),
    updateTask: vi.fn(),
    archiveTask: vi.fn(),
    deleteTask: vi.fn(),
  },
}));

const mockApi = vi.mocked(api);

const fakeTask: Task = {
  id: 10,
  projectId: 1,
  name: "Write tests",
  archived: 0,
  createdAt: "2026-03-01T00:00:00Z",
  updatedAt: "2026-03-01T00:00:00Z",
};

beforeEach(() => {
  setActivePinia(createPinia());
  vi.clearAllMocks();
});

describe("useTasksStore", () => {
  describe("fetchTasks", () => {
    it("loads tasks into tasksByProject keyed by projectId", async () => {
      mockApi.getTasks.mockResolvedValue([fakeTask]);
      const store = useTasksStore();
      await store.fetchTasks(1);
      expect(store.tasksByProject[1]).toEqual([fakeTask]);
      expect(store.loading).toBe(false);
    });

    it("sets error when api throws", async () => {
      mockApi.getTasks.mockRejectedValue(new Error("not found"));
      const store = useTasksStore();
      await store.fetchTasks(99);
      expect(store.error).toBe("Error: not found");
    });
  });

  describe("createTask", () => {
    it("appends created task to correct project bucket", async () => {
      mockApi.createTask.mockResolvedValue(fakeTask);
      const store = useTasksStore();
      const result = await store.createTask({ projectId: 1, name: "Write tests" });
      expect(result).toEqual(fakeTask);
      expect(store.tasksByProject[1]).toEqual(expect.arrayContaining([fakeTask]));
    });

    it("initialises project bucket if it did not exist", async () => {
      mockApi.createTask.mockResolvedValue(fakeTask);
      const store = useTasksStore();
      expect(store.tasksByProject[1]).toBeUndefined();
      await store.createTask({ projectId: 1, name: "Write tests" });
      expect(store.tasksByProject[1]).toHaveLength(1);
    });
  });

  describe("updateTask", () => {
    it("replaces task in its project bucket", async () => {
      const updated = { ...fakeTask, name: "Updated task" };
      mockApi.updateTask.mockResolvedValue(updated);
      const store = useTasksStore();
      store.tasksByProject[1] = [fakeTask];
      const result = await store.updateTask({ id: 10, name: "Updated task" });
      expect(result.name).toBe("Updated task");
      expect(store.tasksByProject[1][0].name).toBe("Updated task");
    });
  });

  describe("archiveTask", () => {
    it("replaces task in its project bucket with archived version returned by api", async () => {
      const archivedTask = { ...fakeTask, archived: 1 };
      mockApi.archiveTask.mockResolvedValue(archivedTask);
      const store = useTasksStore();
      store.tasksByProject[1] = [{ ...fakeTask }];
      await store.archiveTask(10);
      expect(store.tasksByProject[1][0].archived).toBe(1);
    });
  });

  describe("deleteTask", () => {
    it("removes task from its project bucket", async () => {
      mockApi.deleteTask.mockResolvedValue(undefined);
      const store = useTasksStore();
      store.tasksByProject[1] = [fakeTask];
      await store.deleteTask(10);
      expect(store.tasksByProject[1]).toHaveLength(0);
    });
  });
});
