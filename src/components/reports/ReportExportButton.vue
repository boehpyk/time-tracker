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
import { generatePdfBytes } from '../../services/pdfExport'
import { api } from '../../services/tauriApi'

const props = withDefaults(defineProps<{
  defaultFilename?: string
}>(), {
  defaultFilename: 'report.pdf',
})

const emit = defineEmits<{
  exported: [savedPath: string]
}>()

const toast = useToast()
const isExporting = ref(false)

async function handleExport() {
  if (isExporting.value) return

  isExporting.value = true
  try {
    const bytes = await generatePdfBytes()
    const savedPath = await api.savePdfAs(bytes, props.defaultFilename)
    if (savedPath !== null) {
      emit('exported', savedPath)
    }
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
