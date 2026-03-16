<template>
  <div class="task-list-item" :class="{ 'task-list-item--archived': task.archived !== 0 }">
    <div class="task-list-item__body">
      <div class="task-list-item__header">
        <span class="task-list-item__name">{{ task.name }}</span>
        <Tag v-if="task.archived !== 0" value="Archived" severity="secondary" class="task-list-item__archived-tag" />
      </div>
      <p v-if="task.description" class="task-list-item__description">{{ task.description }}</p>
    </div>

    <div class="task-list-item__actions">
      <Button
        icon="pi pi-pencil"
        size="small"
        text
        rounded
        aria-label="Edit task"
        @click="emit('edit', task)"
      />
      <Button
        v-if="task.archived === 0"
        icon="pi pi-inbox"
        size="small"
        text
        rounded
        severity="secondary"
        aria-label="Archive task"
        @click="emit('archive', task.id)"
      />
      <Button
        icon="pi pi-trash"
        size="small"
        text
        rounded
        severity="danger"
        aria-label="Delete task"
        @click="emit('delete', task.id)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import Button from 'primevue/button'
import Tag from 'primevue/tag'
import type { Task } from '../../types/index'

defineProps<{
  task: Task
}>()

const emit = defineEmits<{
  edit: [task: Task]
  archive: [id: number]
  delete: [id: number]
}>()
</script>

<style scoped>
.task-list-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.875rem 1rem;
  border-radius: 0.375rem;
  border: 1px solid var(--p-surface-200);
  background: var(--p-surface-0);
  transition: box-shadow 0.15s ease;
}

.task-list-item:hover {
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.07);
}

.task-list-item--archived {
  opacity: 0.65;
}

.task-list-item__body {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}

.task-list-item__header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.task-list-item__name {
  font-weight: 500;
  font-size: 0.9375rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.task-list-item__archived-tag {
  font-size: 0.7rem;
  flex-shrink: 0;
}

.task-list-item__description {
  margin: 0;
  font-size: 0.8125rem;
  color: var(--p-text-muted-color);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.task-list-item__actions {
  display: flex;
  align-items: center;
  gap: 0.15rem;
  flex-shrink: 0;
}
</style>
