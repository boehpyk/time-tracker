import { defineStore } from "pinia";
import { ref } from "vue";
import { api } from "../services/tauriApi";
import type { Project, CreateProjectPayload, UpdateProjectPayload } from "../types/index";

export const useProjectsStore = defineStore("projects", () => {
  const projects = ref<Project[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);

  async function fetchProjects(): Promise<void> {
    loading.value = true;
    error.value = null;
    try {
      projects.value = await api.getProjects();
    } catch (e) {
      error.value = String(e);
    } finally {
      loading.value = false;
    }
  }

  async function createProject(payload: CreateProjectPayload): Promise<Project> {
    const project = await api.createProject(payload);
    projects.value.push(project);
    return project;
  }

  async function updateProject(payload: UpdateProjectPayload): Promise<Project> {
    const { id, ...rest } = payload;
    const updated = await api.updateProject(id, rest);
    const idx = projects.value.findIndex((p) => p.id === id);
    if (idx !== -1) projects.value[idx] = updated;
    return updated;
  }

  async function archiveProject(id: number): Promise<void> {
    const updated = await api.archiveProject(id);
    const idx = projects.value.findIndex((p) => p.id === id);
    if (idx !== -1) projects.value[idx] = updated;
  }

  async function deleteProject(id: number): Promise<void> {
    await api.deleteProject(id);
    projects.value = projects.value.filter((p) => p.id !== id);
  }

  return { projects, loading, error, fetchProjects, createProject, updateProject, archiveProject, deleteProject };
});
