<template>
  <div class="task-selector">
    <AutoComplete
      v-model="selectedOption"
      :suggestions="filteredOptions"
      option-label="label"
      placeholder="Search for a task..."
      :dropdown="true"
      force-selection
      @complete="search"
      @item-select="onItemSelect"
      class="w-full"
    >
      <template #option="{ option }">
        <div class="task-option">
          <span
            class="project-dot"
            :style="{ backgroundColor: option.projectColor }"
          ></span>
          <div class="task-option-text">
            <span class="task-name">{{ option.taskName }}</span>
            <span class="project-name">{{ option.projectName }}</span>
          </div>
        </div>
      </template>
    </AutoComplete>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import AutoComplete from "primevue/autocomplete";
import { useProjectsStore } from "../../stores/projects";
import { useTasksStore } from "../../stores/tasks";
import type { Task } from "../../types/index";

interface TaskOption {
  label: string;
  taskId: number;
  taskName: string;
  projectId: number;
  projectName: string;
  projectColor: string;
  task: Task;
}

const emit = defineEmits<{
  (e: "select", task: Task): void;
}>();

const projectsStore = useProjectsStore();
const tasksStore = useTasksStore();

const selectedOption = ref<TaskOption | null>(null);
const query = ref("");

const allOptions = computed<TaskOption[]>(() => {
  const options: TaskOption[] = [];
  for (const project of projectsStore.projects) {
    if (project.archived) continue;
    const tasks = tasksStore.tasksByProject[project.id] ?? [];
    for (const task of tasks) {
      if (task.archived) continue;
      options.push({
        label: `${task.name} — ${project.name}`,
        taskId: task.id,
        taskName: task.name,
        projectId: project.id,
        projectName: project.name,
        projectColor: project.color,
        task,
      });
    }
  }
  return options;
});

const filteredOptions = ref<TaskOption[]>([]);

function search(event: { query: string }) {
  query.value = event.query;
  const q = event.query.toLowerCase().trim();
  if (!q) {
    filteredOptions.value = allOptions.value;
  } else {
    filteredOptions.value = allOptions.value.filter(
      (o) =>
        o.taskName.toLowerCase().includes(q) ||
        o.projectName.toLowerCase().includes(q)
    );
  }
}

function onItemSelect(event: { value: TaskOption }) {
  emit("select", event.value.task);
}

onMounted(async () => {
  if (projectsStore.projects.length === 0) {
    await projectsStore.fetchProjects();
  }
  const fetchPromises = projectsStore.projects
    .filter((p) => !p.archived)
    .map((p) => {
      if (!tasksStore.tasksByProject[p.id]) {
        return tasksStore.fetchTasks(p.id);
      }
      return Promise.resolve();
    });
  await Promise.all(fetchPromises);
  filteredOptions.value = allOptions.value;
});
</script>

<style scoped>
.task-selector {
  width: 100%;
}

.task-option {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.125rem 0;
}

.project-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
}

.task-option-text {
  display: flex;
  flex-direction: column;
  line-height: 1.2;
}

.task-name {
  font-size: 0.9rem;
  font-weight: 500;
}

.project-name {
  font-size: 0.75rem;
  color: var(--p-text-muted-color, #6b7280);
}
</style>
