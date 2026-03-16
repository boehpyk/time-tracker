<template>
  <div class="filter-panel">
    <div class="filter-field">
      <label for="rp-project">Project</label>
      <Select
        id="rp-project"
        :model-value="modelValue.projectId"
        :options="projectOptions"
        option-label="label"
        option-value="value"
        placeholder="All projects"
        show-clear
        @update:model-value="onProjectChange"
      />
    </div>

    <div class="filter-field">
      <label for="rp-task">Task</label>
      <Select
        id="rp-task"
        :model-value="modelValue.taskId"
        :options="taskOptions"
        option-label="label"
        option-value="value"
        placeholder="All tasks"
        show-clear
        :disabled="!modelValue.projectId"
        @update:model-value="onTaskChange"
      />
    </div>

    <div class="filter-field">
      <label for="rp-date-from">From</label>
      <DatePicker
        id="rp-date-from"
        :model-value="dateFromDate"
        date-format="yy-mm-dd"
        placeholder="Start date"
        show-clear
        @update:model-value="onDateFromChange"
      />
    </div>

    <div class="filter-field">
      <label for="rp-date-to">To</label>
      <DatePicker
        id="rp-date-to"
        :model-value="dateToDate"
        date-format="yy-mm-dd"
        placeholder="End date"
        show-clear
        @update:model-value="onDateToChange"
      />
    </div>

    <div class="filter-field filter-field--toggle">
      <label for="rp-archived">Archived</label>
      <ToggleSwitch
        id="rp-archived"
        :model-value="modelValue.includeArchived ?? false"
        @update:model-value="onIncludeArchivedChange"
      />
    </div>

    <Button
      label="Run Report"
      icon="pi pi-play"
      severity="primary"
      @click="$emit('run')"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import Select from 'primevue/select'
import DatePicker from 'primevue/datepicker'
import Button from 'primevue/button'
import ToggleSwitch from 'primevue/toggleswitch'
import { useProjectsStore } from '../../stores/projects'
import { api } from '../../services/tauriApi'
import type { ReportFilter, Task } from '../../types/index'

const props = defineProps<{
  modelValue: ReportFilter
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: ReportFilter): void
  (e: 'run'): void
}>()

const projectsStore = useProjectsStore()

const projectOptions = computed(() =>
  projectsStore.projects.map((p) => ({ label: p.name, value: p.id }))
)

const tasks = ref<Task[]>([])

const taskOptions = computed(() =>
  tasks.value.map((t) => ({ label: t.name, value: t.id }))
)

watch(
  () => props.modelValue.projectId,
  async (projectId) => {
    tasks.value = []
    if (projectId) {
      try {
        tasks.value = await api.getTasks(projectId)
      } catch {
        tasks.value = []
      }
    }
  },
  { immediate: true }
)

function toDateString(d: Date | null | undefined): string | undefined {
  if (!d) return undefined
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

const dateFromDate = computed(() =>
  props.modelValue.dateFrom ? new Date(props.modelValue.dateFrom + 'T00:00:00') : null
)

const dateToDate = computed(() =>
  props.modelValue.dateTo ? new Date(props.modelValue.dateTo + 'T00:00:00') : null
)

function onProjectChange(value: number | null | undefined) {
  emit('update:modelValue', {
    ...props.modelValue,
    projectId: value ?? undefined,
    taskId: undefined,
  })
}

function onTaskChange(value: number | null | undefined) {
  emit('update:modelValue', {
    ...props.modelValue,
    taskId: value ?? undefined,
  })
}

function onDateFromChange(value: Date | Date[] | (Date | null)[] | null | undefined) {
  const single = Array.isArray(value) ? null : value
  emit('update:modelValue', {
    ...props.modelValue,
    dateFrom: toDateString(single),
  })
}

function onDateToChange(value: Date | Date[] | (Date | null)[] | null | undefined) {
  const single = Array.isArray(value) ? null : value
  emit('update:modelValue', {
    ...props.modelValue,
    dateTo: toDateString(single),
  })
}

function onIncludeArchivedChange(value: boolean) {
  emit('update:modelValue', {
    ...props.modelValue,
    includeArchived: value,
  })
}
</script>

<style scoped>
.filter-panel {
  display: flex;
  align-items: flex-end;
  gap: 1rem;
  flex-wrap: wrap;
}

.filter-field {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.filter-field label {
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--p-text-muted-color, #6b7280);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.filter-field--toggle {
  justify-content: flex-end;
  padding-bottom: 0.35rem;
}
</style>
