<template>
  <div class="projects-view">
    <div class="projects-view__header">
      <div class="projects-view__title-group">
        <h1 class="projects-view__title">Projects</h1>
        <span v-if="!projectsStore.loading" class="projects-view__count">
          {{ activeProjects.length }} active
        </span>
      </div>
      <div class="projects-view__header-actions">
        <Button
          v-if="archivedProjects.length > 0"
          :label="showArchived ? 'Hide archived' : 'Show archived'"
          icon="pi pi-inbox"
          size="small"
          text
          severity="secondary"
          @click="showArchived = !showArchived"
        />
        <Button
          label="New Project"
          icon="pi pi-plus"
          @click="openCreateDialog"
        />
      </div>
    </div>

    <div v-if="projectsStore.loading" class="projects-view__skeleton-grid">
      <div v-for="n in 4" :key="n" class="projects-view__skeleton-card">
        <Skeleton height="1.25rem" width="60%" class="mb-2" />
        <Skeleton height="0.875rem" width="40%" class="mb-3" />
        <Skeleton height="2rem" width="100%" />
      </div>
    </div>

    <div v-else-if="projectsStore.error" class="projects-view__error">
      <Message severity="error" :closable="false">
        Failed to load projects: {{ projectsStore.error }}
      </Message>
    </div>

    <template v-else>
      <div v-if="activeProjects.length === 0 && !showArchived" class="projects-view__empty">
        <i class="pi pi-folder-open projects-view__empty-icon" />
        <p class="projects-view__empty-text">No projects yet</p>
        <p class="projects-view__empty-sub">Create your first project to start tracking time.</p>
        <Button label="New Project" icon="pi pi-plus" @click="openCreateDialog" />
      </div>

      <div v-else class="projects-view__grid">
        <ProjectCard
          v-for="project in visibleProjects"
          :key="project.id"
          :project="project"
          @edit="openEditDialog"
          @archive="handleArchive"
          @delete="handleDelete"
        />
      </div>
    </template>

    <ProjectFormDialog
      v-model="dialogVisible"
      :project="editingProject ?? undefined"
      @close="closeDialog"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import Button from 'primevue/button'
import Skeleton from 'primevue/skeleton'
import Message from 'primevue/message'
import { useToast } from 'primevue/usetoast'
import { useProjectsStore } from '../stores/projects'
import { useTasksStore } from '../stores/tasks'
import ProjectCard from '../components/projects/ProjectCard.vue'
import ProjectFormDialog from '../components/projects/ProjectFormDialog.vue'
import type { Project } from '../types/index'

const projectsStore = useProjectsStore()
const tasksStore = useTasksStore()
const toast = useToast()

const dialogVisible = ref(false)
const editingProject = ref<Project | null>(null)
const showArchived = ref(false)

const activeProjects = computed(() =>
  projectsStore.projects.filter(p => !p.archived)
)

const archivedProjects = computed(() =>
  projectsStore.projects.filter(p => p.archived)
)

const visibleProjects = computed(() =>
  showArchived.value
    ? projectsStore.projects
    : activeProjects.value
)

onMounted(async () => {
  await projectsStore.fetchProjects()
  // Fetch tasks for all projects so task counts are available
  for (const project of projectsStore.projects) {
    tasksStore.fetchTasks(project.id)
  }
})

function openCreateDialog() {
  editingProject.value = null
  dialogVisible.value = true
}

function openEditDialog(project: Project) {
  editingProject.value = project
  dialogVisible.value = true
}

function closeDialog() {
  dialogVisible.value = false
  editingProject.value = null
}

async function handleArchive(id: number) {
  try {
    await projectsStore.archiveProject(id)
    toast.add({ severity: 'info', summary: 'Project archived', life: 3000 })
  } catch (e) {
    toast.add({ severity: 'error', summary: 'Error', detail: String(e), life: 5000 })
  }
}

async function handleDelete(id: number) {
  try {
    await projectsStore.deleteProject(id)
    toast.add({ severity: 'success', summary: 'Project deleted', life: 3000 })
  } catch (e) {
    toast.add({ severity: 'error', summary: 'Error', detail: String(e), life: 5000 })
  }
}
</script>

<style scoped>
.projects-view {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  padding: 1.5rem;
  height: 100%;
}

.projects-view__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 0.75rem;
}

.projects-view__title-group {
  display: flex;
  align-items: baseline;
  gap: 0.75rem;
}

.projects-view__title {
  margin: 0;
  font-size: 1.5rem;
  font-weight: 700;
}

.projects-view__count {
  font-size: 0.875rem;
  color: var(--p-text-muted-color);
}

.projects-view__header-actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.projects-view__skeleton-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 1rem;
}

.projects-view__skeleton-card {
  padding: 1.25rem;
  border: 1px solid var(--p-content-border-color, #e5e7eb);
  border-radius: var(--p-border-radius, 6px);
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.projects-view__error {
  max-width: 600px;
}

.projects-view__empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  padding: 4rem 1rem;
  text-align: center;
}

.projects-view__empty-icon {
  font-size: 3rem;
  color: var(--p-text-muted-color);
}

.projects-view__empty-text {
  margin: 0;
  font-size: 1.125rem;
  font-weight: 600;
}

.projects-view__empty-sub {
  margin: 0;
  color: var(--p-text-muted-color);
  font-size: 0.875rem;
}

.projects-view__grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 1rem;
  align-content: start;
}
</style>
