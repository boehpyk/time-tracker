<template>
  <div class="summary-section">
    <h2 class="section-title">Summary by Project</h2>

    <DataTable :value="data?.projects ?? []" :loading="loading" striped-rows class="summary-table">
      <template #empty>
        <div class="empty-state">
          <i class="pi pi-chart-bar" style="font-size: 2rem; color: var(--p-text-muted-color)" />
          <p>No data. Adjust filters and run the report.</p>
        </div>
      </template>

      <Column field="projectName" header="Project">
        <template #body="{ data: row }: { data: ProjectReport }">
          <span class="project-badge" :style="{ '--dot-color': row.projectColor }">
            <span class="dot" />
            {{ row.projectName }}
          </span>
        </template>
      </Column>

      <Column header="Entries">
        <template #body="{ data: row }: { data: ProjectReport }">
          {{ row.tasks.reduce((s, t) => s + t.entryCount, 0) }}
        </template>
      </Column>

      <Column header="Total Time">
        <template #body="{ data: row }: { data: ProjectReport }">
          {{ formatSeconds(row.totalSeconds) }}
        </template>
      </Column>
    </DataTable>

    <div v-if="data && data.projects.length > 0" class="summary-total">
      Total: {{ formatSeconds(data.totalSeconds) }}
    </div>
  </div>
</template>

<script setup lang="ts">
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import type { ReportData, ProjectReport } from '../../types/index'

defineProps<{
  data: ReportData | null
  loading: boolean
}>()

function formatSeconds(s: number): string {
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  if (h > 0 || m > 0) return `${h}h ${m}m`
  return `${s}s`
}
</script>

<style scoped>
.summary-section {
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

.summary-total {
  text-align: right;
  font-weight: 600;
  font-size: 0.95rem;
  padding: 0.5rem 0;
  color: var(--p-text-color);
}
</style>
