<template>
  <div class="entries-view">
    <div class="entries-header">
      <h1>Time Entries</h1>
    </div>

    <!-- Filter Controls -->
    <div class="filter-bar">
      <div class="filter-field">
        <label for="filter-project">Project</label>
        <Select
          id="filter-project"
          v-model="filterProjectId"
          :options="projectOptions"
          option-label="label"
          option-value="value"
          placeholder="All projects"
          show-clear
          @change="onFilterChange"
        />
      </div>

      <div class="filter-field">
        <label for="filter-date-from">From</label>
        <DatePicker
          id="filter-date-from"
          v-model="filterDateFrom"
          date-format="yy-mm-dd"
          placeholder="Start date"
          show-clear
          @update:model-value="onFilterChange"
        />
      </div>

      <div class="filter-field">
        <label for="filter-date-to">To</label>
        <DatePicker
          id="filter-date-to"
          v-model="filterDateTo"
          date-format="yy-mm-dd"
          placeholder="End date"
          show-clear
          @update:model-value="onFilterChange"
        />
      </div>

      <div class="filter-field filter-field--checkbox">
        <label>
          <ToggleSwitch v-model="showArchived" @change="onFilterChange" />
          Show archived
        </label>
      </div>

      <Button
        label="Refresh"
        icon="pi pi-refresh"
        severity="secondary"
        @click="loadEntries"
      />
    </div>

    <!-- Error state -->
    <Message v-if="error" severity="error" :closable="false">{{ error }}</Message>

    <!-- Data Table -->
    <DataTable
      :value="entries"
      :loading="loading"
      striped-rows
      class="entries-table"
    >
      <template #empty>
        <div class="empty-state">
          <i class="pi pi-clock" style="font-size: 2rem; color: var(--p-text-muted-color)" />
          <p>No time entries found. Start tracking time to see entries here.</p>
        </div>
      </template>

      <Column field="projectName" header="Project">
        <template #body="{ data }: { data: EntryWithContext }">
          <span class="project-badge" :style="{ '--dot-color': data.projectColor }">
            <span class="dot" />
            {{ data.projectName }}
          </span>
        </template>
      </Column>

      <Column field="taskName" header="Task" />

      <Column header="Start Time">
        <template #body="{ data }: { data: EntryWithContext }">
          {{ formatDateTime(data.startTime) }}
        </template>
      </Column>

      <Column header="End Time">
        <template #body="{ data }: { data: EntryWithContext }">
          <span v-if="data.endTime">{{ formatDateTime(data.endTime) }}</span>
          <Tag v-else value="Running" severity="success" />
        </template>
      </Column>

      <Column header="Duration">
        <template #body="{ data }: { data: EntryWithContext }">
          {{ formatDuration(data.startTime, data.endTime) }}
        </template>
      </Column>

      <Column header="Notes">
        <template #body="{ data }: { data: EntryWithContext }">
          <span class="notes-cell">{{ data.notes ?? '—' }}</span>
        </template>
      </Column>

      <Column header="Actions" style="width: 9rem">
        <template #body="{ data }: { data: EntryWithContext }">
          <div class="action-buttons">
            <Button
              icon="pi pi-pencil"
              severity="secondary"
              size="small"
              rounded
              text
              aria-label="Edit entry"
              @click="openEditDialog(data)"
            />
            <Button
              icon="pi pi-trash"
              severity="danger"
              size="small"
              rounded
              text
              aria-label="Delete entry"
              @click="confirmDelete($event, data)"
            />
          </div>
        </template>
      </Column>
    </DataTable>

    <!-- Pagination -->
    <div v-if="!loading && entries.length > 0" class="pagination-bar">
      <span class="page-info">
        Showing {{ offset + 1 }}–{{ offset + entries.length }}
        <template v-if="hasMore">of many</template>
      </span>
      <div class="page-buttons">
        <Button
          label="Previous"
          icon="pi pi-chevron-left"
          severity="secondary"
          size="small"
          :disabled="offset === 0"
          @click="prevPage"
        />
        <Button
          label="Next"
          icon="pi pi-chevron-right"
          icon-pos="right"
          severity="secondary"
          size="small"
          :disabled="!hasMore"
          @click="nextPage"
        />
      </div>
    </div>

    <!-- Edit Dialog -->
    <EntryEditDialog
      :visible="editDialogVisible"
      :entry="selectedEntry"
      @saved="onEntrySaved"
      @close="closeEditDialog"
      @update:visible="(v: boolean) => { if (!v) closeEditDialog() }"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useConfirm } from 'primevue/useconfirm'
import { useToast } from 'primevue/usetoast'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Button from 'primevue/button'
import Select from 'primevue/select'
import DatePicker from 'primevue/datepicker'
import Message from 'primevue/message'
import Tag from 'primevue/tag'
import ToggleSwitch from 'primevue/toggleswitch'
import { api } from '../services/tauriApi'
import { useProjectsStore } from '../stores/projects'
import EntryEditDialog from '../components/entries/EntryEditDialog.vue'
import type { EntryWithContext } from '../types/index'

const confirm = useConfirm()
const toast = useToast()
const projectsStore = useProjectsStore()

// Filter state
const filterProjectId = ref<number | null>(null)
const filterDateFrom = ref<Date | null>(null)
const filterDateTo = ref<Date | null>(null)
const showArchived = ref(false)

// Pagination
const PAGE_SIZE = 20
const offset = ref(0)

// Data state
const entries = ref<EntryWithContext[]>([])
const loading = ref(false)
const error = ref<string | null>(null)

// Dialog state
const editDialogVisible = ref(false)
const selectedEntry = ref<EntryWithContext | null>(null)

// Computed
const projectOptions = computed(() =>
  projectsStore.projects.map((p) => ({ label: p.name, value: p.id }))
)

// Whether there might be more pages (we loaded a full page)
const hasMore = computed(() => entries.value.length === PAGE_SIZE)

function toIsoDateString(d: Date | null): string | undefined {
  if (!d) return undefined
  // Format as YYYY-MM-DD using local date parts to respect user's timezone selection
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

async function loadEntries() {
  loading.value = true
  error.value = null
  try {
    entries.value = await api.getEntries({
      limit: PAGE_SIZE,
      offset: offset.value,
      projectId: filterProjectId.value ?? undefined,
      dateFrom: toIsoDateString(filterDateFrom.value),
      dateTo: toIsoDateString(filterDateTo.value),
      showArchived: showArchived.value,
    })
  } catch (e) {
    error.value = String(e)
  } finally {
    loading.value = false
  }
}

function onFilterChange() {
  offset.value = 0
  loadEntries()
}

function prevPage() {
  offset.value = Math.max(0, offset.value - PAGE_SIZE)
  loadEntries()
}

function nextPage() {
  offset.value += PAGE_SIZE
  loadEntries()
}

// Formatting helpers
function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatDuration(startIso: string, endIso?: string): string {
  if (!endIso) return 'Running'
  const seconds = Math.floor(
    (new Date(endIso).getTime() - new Date(startIso).getTime()) / 1000
  )
  if (seconds < 0) return '—'
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0) return `${h}h ${m}m`
  if (m > 0) return `${m}m ${s}s`
  return `${s}s`
}

// Dialog management
function openEditDialog(entry: EntryWithContext) {
  selectedEntry.value = entry
  editDialogVisible.value = true
}

function closeEditDialog() {
  editDialogVisible.value = false
  selectedEntry.value = null
}

function onEntrySaved() {
  loadEntries()
  toast.add({
    severity: 'success',
    summary: 'Entry updated',
    detail: 'Time entry saved successfully.',
    life: 3000,
  })
}

// Delete with confirmation — useConfirm() called in the view, not in a child
function confirmDelete(event: Event, entry: EntryWithContext) {
  confirm.require({
    target: event.currentTarget as HTMLElement,
    message: 'Delete this time entry? This cannot be undone.',
    header: 'Delete Entry',
    icon: 'pi pi-exclamation-triangle',
    acceptLabel: 'Delete',
    rejectLabel: 'Cancel',
    acceptClass: 'p-button-danger',
    accept: async () => {
      try {
        await api.deleteEntry(entry.id)
        toast.add({
          severity: 'success',
          summary: 'Entry deleted',
          detail: 'Time entry removed.',
          life: 3000,
        })
        // If deleting the last item on a non-first page, step back
        if (entries.value.length === 1 && offset.value > 0) {
          offset.value -= PAGE_SIZE
        }
        loadEntries()
      } catch (e) {
        toast.add({
          severity: 'error',
          summary: 'Delete failed',
          detail: String(e),
          life: 5000,
        })
      }
    },
  })
}

onMounted(async () => {
  // Ensure projects are loaded for the filter dropdown
  if (projectsStore.projects.length === 0) {
    await projectsStore.fetchProjects()
  }
  await loadEntries()
})
</script>

<style scoped>
.entries-view {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  padding: 1.5rem;
  height: 100%;
}

.entries-header h1 {
  font-size: 1.5rem;
  font-weight: 700;
  margin: 0;
}

.filter-bar {
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

.filter-field--checkbox {
  flex-direction: row;
  align-items: center;
  gap: 0.5rem;
  padding-bottom: 0.2rem;
}

.filter-field--checkbox label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--p-text-color);
  text-transform: none;
  letter-spacing: normal;
  cursor: pointer;
}

.entries-table {
  flex: 1;
}

.project-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
}

.dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background-color: var(--dot-color, #6b7280);
  flex-shrink: 0;
}

.notes-cell {
  max-width: 220px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  display: inline-block;
}

.action-buttons {
  display: flex;
  gap: 0.25rem;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
  padding: 3rem 1rem;
  color: var(--p-text-muted-color, #6b7280);
}

.pagination-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.5rem 0;
}

.page-info {
  font-size: 0.875rem;
  color: var(--p-text-muted-color, #6b7280);
}

.page-buttons {
  display: flex;
  gap: 0.5rem;
}
</style>
