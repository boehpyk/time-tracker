<template>
  <Button
    :label="isExporting ? 'Exporting…' : 'Export PDF'"
    icon="pi pi-file-pdf"
    :loading="isExporting"
    :disabled="isExporting"
    severity="secondary"
    @click="handleExport"
  />
</template>

<script setup lang="ts">
import { ref } from 'vue'
import Button from 'primevue/button'
import { useToast } from 'primevue/usetoast'
import { exportReportToPdf } from '../../services/pdfExport'

const props = withDefaults(defineProps<{
  filename?: string
}>(), {
  filename: 'report.pdf',
})

const emit = defineEmits<{
  exported: []
}>()

const toast = useToast()
const isExporting = ref(false)

async function handleExport() {
  if (isExporting.value) return

  isExporting.value = true
  try {
    await exportReportToPdf(props.filename)
    emit('exported')
  } catch (err) {
    toast.add({
      severity: 'error',
      summary: 'Export failed',
      detail: err instanceof Error ? err.message : String(err),
      life: 5000,
    })
  } finally {
    isExporting.value = false
  }
}
</script>
