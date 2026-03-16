<template>
  <div class="detail-section">
    <h2 class="section-title">Breakdown by Entry</h2>

    <DataTable :value="rows" :loading="loading" striped-rows class="detail-table">
      <template #empty>
        <div class="empty-state">
          <i class="pi pi-list" style="font-size: 2rem; color: var(--p-text-muted-color)" />
          <p>No data. Adjust filters and run the report.</p>
        </div>
      </template>

      <Column field="projectName" header="Project">
        <template #body="{ data: row }: { data: DetailRow }">
          <span class="project-badge" :style="{ '--dot-color': row.projectColor }">
            <span class="dot" />
            {{ row.projectName }}
          </span>
        </template>
      </Column>

      <Column field="taskName" header="Task" />

      <Column header="Date">
        <template #body="{ data: row }: { data: DetailRow }">
          {{ formatDate(row.startTime) }}
        </template>
      </Column>

      <Column header="Started">
        <template #body="{ data: row }: { data: DetailRow }">
          {{ formatTime(row.startTime) }}
        </template>
      </Column>

      <Column header="Ended">
        <template #body="{ data: row }: { data: DetailRow }">
          {{ formatTime(row.endTime) }}
        </template>
      </Column>

      <Column header="Duration">
        <template #body="{ data: row }: { data: DetailRow }">
          {{ formatSeconds(row.durationSeconds) }}
        </template>
      </Column>
    </DataTable>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import type { ReportData } from '../../types/index'

interface DetailRow {
  projectName: string
  projectColor: string
  taskName: string
  startTime: string
  endTime: string
  durationSeconds: number
}

const props = defineProps<{
  data: ReportData | null
  loading: boolean
}>()

const rows = computed<DetailRow[]>(() => {
  if (!props.data) return []
  return props.data.projects.flatMap((p) =>
    p.tasks.flatMap((t) =>
      t.entries.map((e) => ({
        projectName: p.projectName,
        projectColor: p.projectColor,
        taskName: t.taskName,
        startTime: e.startTime,
        endTime: e.endTime,
        durationSeconds: e.durationSeconds,
      }))
    )
  )
})

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatSeconds(s: number): string {
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  if (h > 0 || m > 0) return `${h}h ${m}m`
  return `${s}s`
}
</script>

<style scoped>
.detail-section {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.section-title {
  font-size: 1.1rem;
  font-weight: 600;
  margin: 0;
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

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
  padding: 3rem 1rem;
  color: var(--p-text-muted-color, #6b7280);
}
</style>
