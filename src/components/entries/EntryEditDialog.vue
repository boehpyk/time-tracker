<template>
  <Dialog
    :visible="visible"
    modal
    header="Edit Entry"
    :style="{ width: '480px' }"
    @update:visible="onVisibilityChange"
  >
    <form @submit.prevent="onSubmit" class="entry-edit-form">
      <div class="field">
        <label for="entry-start-time">Start Time (ISO 8601)</label>
        <InputText
          id="entry-start-time"
          v-model="form.startTime"
          :class="{ 'p-invalid': errors.startTime }"
          placeholder="e.g. 2024-01-15T09:00:00Z"
          fluid
        />
        <small v-if="errors.startTime" class="p-error">{{ errors.startTime }}</small>
        <small v-else class="field-hint">{{ formatHint(form.startTime) }}</small>
      </div>

      <div class="field">
        <label for="entry-end-time">End Time (ISO 8601, leave blank if running)</label>
        <InputText
          id="entry-end-time"
          v-model="form.endTime"
          :class="{ 'p-invalid': errors.endTime }"
          placeholder="e.g. 2024-01-15T10:30:00Z"
          fluid
        />
        <small v-if="errors.endTime" class="p-error">{{ errors.endTime }}</small>
        <small v-else-if="form.endTime" class="field-hint">{{ formatHint(form.endTime) }}</small>
      </div>

      <div class="field">
        <label for="entry-notes">Notes</label>
        <Textarea
          id="entry-notes"
          v-model="form.notes"
          rows="3"
          autoResize
          fluid
        />
      </div>

      <Message v-if="submitError" severity="error" :closable="false">{{ submitError }}</Message>

      <div class="dialog-footer">
        <Button
          type="button"
          label="Cancel"
          severity="secondary"
          @click="onCancel"
          :disabled="saving"
        />
        <Button
          type="submit"
          label="Save"
          :loading="saving"
        />
      </div>
    </form>
  </Dialog>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import Dialog from 'primevue/dialog'
import InputText from 'primevue/inputtext'
import Textarea from 'primevue/textarea'
import Button from 'primevue/button'
import Message from 'primevue/message'
import { api } from '../../services/tauriApi'
import type { EntryWithContext } from '../../types/index'

const props = defineProps<{
  visible: boolean
  entry: EntryWithContext | null
}>()

const emit = defineEmits<{
  (e: 'saved'): void
  (e: 'close'): void
  (e: 'update:visible', value: boolean): void
}>()

interface FormState {
  startTime: string
  endTime: string
  notes: string
}

const form = ref<FormState>({ startTime: '', endTime: '', notes: '' })
const errors = ref<Partial<Record<keyof FormState, string>>>({})
const saving = ref(false)
const submitError = ref<string | null>(null)

// Populate form whenever the entry prop changes or the dialog opens
watch(
  () => [props.entry, props.visible] as const,
  ([entry, visible]) => {
    if (visible && entry) {
      form.value = {
        startTime: entry.startTime,
        endTime: entry.endTime ?? '',
        notes: entry.notes ?? '',
      }
      errors.value = {}
      submitError.value = null
    }
  },
  { immediate: true }
)

function formatHint(iso: string): string {
  if (!iso) return ''
  const d = new Date(iso)
  return isNaN(d.getTime()) ? '' : d.toLocaleString()
}

function validate(): boolean {
  const newErrors: Partial<Record<keyof FormState, string>> = {}

  if (!form.value.startTime.trim()) {
    newErrors.startTime = 'Start time is required.'
  } else if (isNaN(new Date(form.value.startTime).getTime())) {
    newErrors.startTime = 'Not a valid date/time string.'
  }

  if (form.value.endTime.trim()) {
    if (isNaN(new Date(form.value.endTime).getTime())) {
      newErrors.endTime = 'Not a valid date/time string.'
    } else if (
      form.value.startTime.trim() &&
      !newErrors.startTime &&
      new Date(form.value.endTime) <= new Date(form.value.startTime)
    ) {
      newErrors.endTime = 'End time must be after start time.'
    }
  }

  errors.value = newErrors
  return Object.keys(newErrors).length === 0
}

async function onSubmit() {
  if (!props.entry) return
  if (!validate()) return

  saving.value = true
  submitError.value = null
  try {
    await api.updateEntry({
      id: props.entry.id,
      startTime: form.value.startTime.trim() || undefined,
      endTime: form.value.endTime.trim() || undefined,
      notes: form.value.notes.trim() || undefined,
    })
    emit('saved')
    emit('close')
  } catch (e) {
    submitError.value = String(e)
  } finally {
    saving.value = false
  }
}

function onCancel() {
  emit('close')
}

function onVisibilityChange(value: boolean) {
  if (!value) emit('close')
  emit('update:visible', value)
}
</script>

<style scoped>
.entry-edit-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.field label {
  font-weight: 600;
  font-size: 0.875rem;
}

.field-hint {
  color: var(--p-text-muted-color, #6b7280);
  font-size: 0.78rem;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
  padding-top: 0.5rem;
}
</style>
