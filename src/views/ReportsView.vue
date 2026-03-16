<template>
  <div class="reports-view">
    <div class="reports-header">
      <h1>Reports</h1>
      <div class="header-actions">
        <Button
          label="Preview"
          icon="pi pi-eye"
          severity="secondary"
          :disabled="!reportsStore.reportData || reportsStore.loading"
          @click="previewVisible = true"
        />
        <ReportExportButton filename="time-tracker-report.pdf" @exported="onExported" />
      </div>
    </div>

    <ReportFilterPanel v-model="localFilter" @run="runReport" />

    <Message v-if="reportsStore.error" severity="error" :closable="false">
      {{ reportsStore.error }}
    </Message>

    <div id="report-printable-area">
      <ReportSummaryTable :data="reportsStore.reportData" :loading="reportsStore.loading" />
      <ReportDetailTable :data="reportsStore.reportData" :loading="reportsStore.loading" />
    </div>

    <!-- Preview Dialog -->
    <Dialog
      v-model:visible="previewVisible"
      header="Report Preview"
      :style="{ width: '90vw', maxWidth: '960px' }"
      :modal="true"
      :closable="true"
      :draggable="false"
    >
      <div class="preview-content">
        <ReportSummaryTable :data="reportsStore.reportData" :loading="false" />
        <ReportDetailTable :data="reportsStore.reportData" :loading="false" />
      </div>

      <template #footer>
        <Button label="Close" severity="secondary" @click="previewVisible = false" />
        <ReportExportButton filename="time-tracker-report.pdf" @exported="onExported" />
      </template>
    </Dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import Message from 'primevue/message'
import Button from 'primevue/button'
import Dialog from 'primevue/dialog'
import { useToast } from 'primevue/usetoast'
import { useReportsStore } from '../stores/reports'
import { useProjectsStore } from '../stores/projects'
import { api } from '../services/tauriApi'
import ReportFilterPanel from '../components/reports/ReportFilterPanel.vue'
import ReportSummaryTable from '../components/reports/ReportSummaryTable.vue'
import ReportDetailTable from '../components/reports/ReportDetailTable.vue'
import ReportExportButton from '../components/reports/ReportExportButton.vue'
import type { ReportFilter } from '../types/index'

const reportsStore = useReportsStore()
const projectsStore = useProjectsStore()
const toast = useToast()

const localFilter = ref<ReportFilter>({ ...reportsStore.filter })
const previewVisible = ref(false)

async function runReport() {
  await reportsStore.fetchReport(localFilter.value)
}

async function onExported() {
  // Close preview if open
  previewVisible.value = false

  // Archive all entries matching the current filter
  try {
    const count = await api.archiveReportedEntries(localFilter.value)
    const detail = count > 0
      ? `Saved as time-tracker-report.pdf. ${count} ${count === 1 ? 'entry' : 'entries'} archived.`
      : 'Saved as time-tracker-report.pdf.'
    toast.add({
      severity: 'success',
      summary: 'Export complete',
      detail,
      life: 4000,
    })
  } catch {
    // Archive failed silently — export already succeeded
    toast.add({
      severity: 'success',
      summary: 'Export complete',
      detail: 'Saved as time-tracker-report.pdf.',
      life: 3000,
    })
  }
}

onMounted(async () => {
  if (projectsStore.projects.length === 0) {
    await projectsStore.fetchProjects()
  }
  await reportsStore.fetchReport()
})
</script>

<style scoped>
.reports-view {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  padding: 1.5rem;
  height: 100%;
}

.reports-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.reports-header h1 {
  font-size: 1.5rem;
  font-weight: 700;
  margin: 0;
}

.header-actions {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}

#report-printable-area {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.preview-content {
  display: flex;
  flex-direction: column;
  gap: 2rem;
  padding: 0.5rem 0;
  max-height: 70vh;
  overflow-y: auto;
}
</style>
