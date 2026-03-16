import { defineStore } from "pinia";
import { ref } from "vue";
import { api } from "../services/tauriApi";
import type { Task, CreateTaskPayload, UpdateTaskPayload } from "../types/index";

export const useTasksStore = defineStore("tasks", () => {
  // keyed by projectId
  const tasksByProject = ref<Record<number, Task[]>>({});
  const loading = ref(false);
  const error = ref<string | null>(null);

  async function fetchTasks(projectId: number): Promise<void> {
    loading.value = true;
    error.value = null;
    try {
      tasksByProject.value[projectId] = await api.getTasks(projectId);
    } catch (e) {
      error.value = String(e);
    } finally {
      loading.value = false;
    }
  }

  async function createTask(payload: CreateTaskPayload): Promise<Task> {
    const task = await api.createTask(payload);
    if (!tasksByProject.value[payload.projectId]) {
      tasksByProject.value[payload.projectId] = [];
    }
    tasksByProject.value[payload.projectId].push(task);
    return task;
  }

  async function updateTask(payload: UpdateTaskPayload): Promise<Task> {
    const { id, ...rest } = payload;
    const updated = await api.updateTask(id, rest);
    for (const pid in tasksByProject.value) {
      const idx = tasksByProject.value[pid].findIndex((t) => t.id === id);
      if (idx !== -1) {
        tasksByProject.value[pid][idx] = updated;
        break;
      }
    }
    return updated;
  }

  async function archiveTask(id: number): Promise<void> {
    const updated = await api.archiveTask(id);
    for (const pid in tasksByProject.value) {
      const idx = tasksByProject.value[pid].findIndex((t) => t.id === id);
      if (idx !== -1) {
        tasksByProject.value[pid][idx] = updated;
        break;
      }
    }
  }

  async function deleteTask(id: number): Promise<void> {
    await api.deleteTask(id);
    for (const pid in tasksByProject.value) {
      tasksByProject.value[pid] = tasksByProject.value[pid].filter((t) => t.id !== id);
    }
  }

  return { tasksByProject, loading, error, fetchTasks, createTask, updateTask, archiveTask, deleteTask };
});
