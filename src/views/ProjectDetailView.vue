<template>
  <div class="project-detail">
    <!-- Header -->
    <div class="project-detail__header">
      <div class="project-detail__back">
        <Button
          icon="pi pi-arrow-left"
          text
          rounded
          size="small"
          aria-label="Back to projects"
          @click="router.push('/projects')"
        />
      </div>

      <template v-if="project">
        <span class="project-detail__color-swatch" :style="{ backgroundColor: project.color }" />
        <h1 class="project-detail__title">{{ project.name }}</h1>
        <Tag v-if="project.archived !== 0" value="Archived" severity="secondary" />
        <p v-if="project.description" class="project-detail__description">{{ project.description }}</p>
      </template>
      <template v-else-if="!projectsStore.loading">
        <h1 class="project-detail__title">Project</h1>
      </template>

      <div class="project-detail__header-spacer" />

      <Button
        label="New Task"
        icon="pi pi-plus"
        :disabled="!project || project.archived !== 0"
        @click="openCreateDialog"
      />
    </div>

    <!-- Loading -->
    <div v-if="tasksStore.loading || projectsStore.loading" class="project-detail__loading">
      <ProgressSpinner style="width: 40px; height: 40px" />
    </div>

    <!-- Error -->
    <div v-else-if="tasksStore.error" class="project-detail__error">
      <Message severity="error" :closable="false">
        Failed to load tasks: {{ tasksStore.error }}
      </Message>
    </div>

    <!-- Project not found -->
    <div v-else-if="!project" class="project-detail__error">
      <Message severity="warn" :closable="false">Project not found.</Message>
    </div>

    <template v-else>
      <!-- Toggle archived -->
      <div v-if="archivedTasks.length > 0" class="project-detail__toolbar">
        <Button
          :label="showArchived ? 'Hide archived' : 'Show archived'"
          icon="pi pi-inbox"
          size="small"
          text
          severity="secondary"
          @click="showArchived = !showArchived"
        />
        <span class="project-detail__count">
          {{ visibleTasks.length }} {{ visibleTasks.length === 1 ? 'task' : 'tasks' }}
        </span>
      </div>

      <!-- Empty state -->
      <div v-if="visibleTasks.length === 0" class="project-detail__empty">
        <i class="pi pi-check-square project-detail__empty-icon" />
        <p class="project-detail__empty-text">No tasks yet</p>
        <p class="project-detail__empty-sub">Create your first task to start tracking time.</p>
        <Button
          label="New Task"
          icon="pi pi-plus"
          :disabled="project.archived !== 0"
          @click="openCreateDialog"
        />
      </div>

      <!-- Task list -->
      <div v-else class="project-detail__list">
        <TaskListItem
          v-for="task in visibleTasks"
          :key="task.id"
          :task="task"
          @edit="openEditDialog"
          @archive="handleArchive"
          @delete="handleDelete"
        />
      </div>
    </template>

    <TaskFormDialog
      v-model="dialogVisible"
      :project-id="projectId"
      :task="editingTask ?? undefined"
      @close="closeDialog"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import Button from 'primevue/button'
import Tag from 'primevue/tag'
import ProgressSpinner from 'primevue/progressspinner'
import Message from 'primevue/message'
import { useToast } from 'primevue/usetoast'
import { useConfirm } from 'primevue/useconfirm'
import { useProjectsStore } from '../stores/projects'
import { useTasksStore } from '../stores/tasks'
import TaskListItem from '../components/tasks/TaskListItem.vue'
import TaskFormDialog from '../components/tasks/TaskFormDialog.vue'
import type { Task } from '../types/index'

const route = useRoute()
const router = useRouter()
const projectsStore = useProjectsStore()
const tasksStore = useTasksStore()
const toast = useToast()
const confirm = useConfirm()

const projectId = computed(() => Number(route.params.id))

const project = computed(() =>
  projectsStore.projects.find(p => p.id === projectId.value) ?? null
)

const allTasks = computed(() =>
  tasksStore.tasksByProject[projectId.value] ?? []
)

const activeTasks = computed(() =>
  allTasks.value.filter(t => t.archived === 0)
)

const archivedTasks = computed(() =>
  allTasks.value.filter(t => t.archived !== 0)
)

const showArchived = ref(false)

const visibleTasks = computed(() =>
  showArchived.value ? allTasks.value : activeTasks.value
)

const dialogVisible = ref(false)
const editingTask = ref<Task | null>(null)

onMounted(async () => {
  if (projectsStore.projects.length === 0) {
    await projectsStore.fetchProjects()
  }
  await tasksStore.fetchTasks(projectId.value)
})

function openCreateDialog() {
  editingTask.value = null
  dialogVisible.value = true
}

function openEditDialog(task: Task) {
  editingTask.value = task
  dialogVisible.value = true
}

function closeDialog() {
  dialogVisible.value = false
  editingTask.value = null
}

async function handleArchive(id: number) {
  try {
    await tasksStore.archiveTask(id)
    toast.add({ severity: 'info', summary: 'Task archived', life: 3000 })
  } catch (e) {
    toast.add({ severity: 'error', summary: 'Error', detail: String(e), life: 5000 })
  }
}

function handleDelete(taskId: number) {
  confirm.require({
    message: 'Delete this task? This cannot be undone.',
    header: 'Delete Task',
    icon: 'pi pi-exclamation-triangle',
    acceptClass: 'p-button-danger',
    accept: async () => {
      try {
        await tasksStore.deleteTask(taskId)
        toast.add({ severity: 'success', summary: 'Task deleted', life: 3000 })
      } catch (e) {
        toast.add({ severity: 'error', summary: 'Error', detail: String(e), life: 5000 })
      }
    },
  })
}
</script>

<style scoped>
.project-detail {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  padding: 1.5rem;
  height: 100%;
}

.project-detail__header {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.6rem;
}

.project-detail__back {
  margin-right: 0.25rem;
}

.project-detail__color-swatch {
  display: inline-block;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  flex-shrink: 0;
}

.project-detail__title {
  margin: 0;
  font-size: 1.5rem;
  font-weight: 700;
}

.project-detail__description {
  margin: 0;
  font-size: 0.875rem;
  color: var(--p-text-muted-color);
  width: 100%;
  order: 10;
}

.project-detail__header-spacer {
  flex: 1;
}

.project-detail__loading {
  display: flex;
  justify-content: center;
  padding: 3rem 0;
}

.project-detail__error {
  max-width: 600px;
}

.project-detail__toolbar {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.project-detail__count {
  font-size: 0.875rem;
  color: var(--p-text-muted-color);
}

.project-detail__empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  padding: 4rem 1rem;
  text-align: center;
}

.project-detail__empty-icon {
  font-size: 3rem;
  color: var(--p-text-muted-color);
}

.project-detail__empty-text {
  margin: 0;
  font-size: 1.125rem;
  font-weight: 600;
}

.project-detail__empty-sub {
  margin: 0;
  color: var(--p-text-muted-color);
  font-size: 0.875rem;
}

.project-detail__list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
</style>
