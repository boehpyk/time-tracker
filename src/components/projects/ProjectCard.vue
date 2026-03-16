<template>
  <div class="project-card" :class="{ 'project-card--archived': project.archived }">
    <div class="project-card__header">
      <span class="project-card__color-swatch" :style="{ backgroundColor: project.color }" />
      <span class="project-card__name project-card__name--link" @click="openDetail">{{ project.name }}</span>
      <Tag v-if="project.archived" value="Archived" severity="secondary" class="project-card__archived-tag" />
    </div>

    <p v-if="project.description" class="project-card__description">
      {{ project.description }}
    </p>

    <div class="project-card__meta">
      <span class="project-card__task-count">
        <i class="pi pi-check-square" />
        {{ taskCount }} {{ taskCount === 1 ? 'task' : 'tasks' }}
      </span>
    </div>

    <div class="project-card__actions">
      <Button
        label="Tasks"
        icon="pi pi-list-check"
        size="small"
        text
        severity="secondary"
        aria-label="View tasks"
        class="project-card__tasks-btn"
        @click="openDetail"
      />
      <Button
        icon="pi pi-pencil"
        size="small"
        text
        rounded
        aria-label="Edit project"
        @click="emit('edit', project)"
      />
      <Button
        v-if="!project.archived"
        icon="pi pi-inbox"
        size="small"
        text
        rounded
        severity="secondary"
        aria-label="Archive project"
        @click="handleArchive"
      />
      <Button
        icon="pi pi-trash"
        size="small"
        text
        rounded
        severity="danger"
        aria-label="Delete project"
        @click="confirmDelete"
      />
    </div>

  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import Button from 'primevue/button'
import Tag from 'primevue/tag'
import { useConfirm } from 'primevue/useconfirm'
import { useTasksStore } from '../../stores/tasks'
import type { Project } from '../../types/index'

const props = defineProps<{
  project: Project
}>()

const emit = defineEmits<{
  edit: [project: Project]
  archive: [id: number]
  delete: [id: number]
}>()

const tasksStore = useTasksStore()
const confirm = useConfirm()
const router = useRouter()

const taskCount = computed(() => {
  const tasks = tasksStore.tasksByProject[props.project.id]
  if (!tasks) return 0
  return tasks.filter(t => !t.archived).length
})

function openDetail() {
  router.push(`/projects/${props.project.id}`)
}

function handleArchive() {
  emit('archive', props.project.id)
}

function confirmDelete() {
  confirm.require({
    message: `Are you sure you want to delete "${props.project.name}"? This will also delete all tasks and time entries for this project.`,
    header: 'Delete Project',
    icon: 'pi pi-exclamation-triangle',
    rejectLabel: 'Cancel',
    acceptLabel: 'Delete',
    acceptClass: 'p-button-danger',
    accept: () => emit('delete', props.project.id),
  })
}
</script>

<style scoped>
.project-card {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding: 1.25rem;
  border-radius: 0.5rem;
  border: 1px solid var(--p-surface-200);
  background: var(--p-surface-0);
  transition: box-shadow 0.15s ease;
}

.project-card:hover {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.project-card--archived {
  opacity: 0.65;
}

.project-card__header {
  display: flex;
  align-items: center;
  gap: 0.6rem;
}

.project-card__color-swatch {
  display: inline-block;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  flex-shrink: 0;
}

.project-card__name {
  font-weight: 600;
  font-size: 1rem;
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.project-card__name--link {
  cursor: pointer;
}

.project-card__name--link:hover {
  text-decoration: underline;
}

.project-card__tasks-btn {
  margin-right: auto;
}

.project-card__archived-tag {
  font-size: 0.7rem;
}

.project-card__description {
  margin: 0;
  font-size: 0.875rem;
  color: var(--p-text-muted-color);
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.project-card__meta {
  font-size: 0.8125rem;
  color: var(--p-text-muted-color);
}

.project-card__task-count {
  display: flex;
  align-items: center;
  gap: 0.3rem;
}

.project-card__actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.25rem;
  margin-top: auto;
  padding-top: 0.5rem;
  border-top: 1px solid var(--p-surface-100);
}
</style>
