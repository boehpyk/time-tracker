import { describe, it, expect, beforeEach, vi } from "vitest";
import { setActivePinia, createPinia } from "pinia";
import { useProjectsStore } from "../../stores/projects";
import { api } from "../../services/tauriApi";
import type { Project } from "../../types/index";

vi.mock("../../services/tauriApi", () => ({
  api: {
    getProjects: vi.fn(),
    createProject: vi.fn(),
    updateProject: vi.fn(),
    archiveProject: vi.fn(),
    deleteProject: vi.fn(),
  },
}));

const mockApi = vi.mocked(api);

const fakeProject: Project = {
  id: 1,
  name: "TimeTracker",
  color: "#4caf50",
  archived: 0,
  createdAt: "2026-03-01T00:00:00Z",
  updatedAt: "2026-03-01T00:00:00Z",
};

beforeEach(() => {
  setActivePinia(createPinia());
  vi.clearAllMocks();
});

describe("useProjectsStore", () => {
  describe("fetchProjects", () => {
    it("loads projects from api and sets loading state", async () => {
      mockApi.getProjects.mockResolvedValue([fakeProject]);
      const store = useProjectsStore();
      await store.fetchProjects();
      expect(store.projects).toEqual([fakeProject]);
      expect(store.loading).toBe(false);
      expect(store.error).toBeNull();
    });

    it("sets error when api throws", async () => {
      mockApi.getProjects.mockRejectedValue(new Error("DB error"));
      const store = useProjectsStore();
      await store.fetchProjects();
      expect(store.error).toBe("Error: DB error");
      expect(store.loading).toBe(false);
    });
  });

  describe("createProject", () => {
    it("adds created project to projects array and returns it", async () => {
      mockApi.createProject.mockResolvedValue(fakeProject);
      const store = useProjectsStore();
      const result = await store.createProject({ name: "TimeTracker", color: "#4caf50" });
      expect(result).toEqual(fakeProject);
      expect(store.projects).toEqual(expect.arrayContaining([fakeProject]));
    });
  });

  describe("updateProject", () => {
    it("replaces project in array with updated version", async () => {
      const updated = { ...fakeProject, name: "Renamed" };
      mockApi.updateProject.mockResolvedValue(updated);
      const store = useProjectsStore();
      store.projects = [fakeProject];
      const result = await store.updateProject({ id: 1, name: "Renamed", color: "#4caf50" });
      expect(result.name).toBe("Renamed");
      expect(store.projects[0].name).toBe("Renamed");
    });
  });

  describe("archiveProject", () => {
    it("replaces project in array with archived version returned by api", async () => {
      const archivedProject = { ...fakeProject, archived: 1 };
      mockApi.archiveProject.mockResolvedValue(archivedProject);
      const store = useProjectsStore();
      store.projects = [{ ...fakeProject }];
      await store.archiveProject(1);
      expect(store.projects[0].archived).toBe(1);
    });
  });

  describe("deleteProject", () => {
    it("removes project from array", async () => {
      mockApi.deleteProject.mockResolvedValue(undefined);
      const store = useProjectsStore();
      store.projects = [fakeProject];
      await store.deleteProject(1);
      expect(store.projects).toHaveLength(0);
    });
  });
});
