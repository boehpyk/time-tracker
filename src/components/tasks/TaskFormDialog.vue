<template>
  <Dialog
    v-model:visible="visible"
    :header="isEditMode ? 'Edit Task' : 'New Task'"
    modal
    :style="{ width: '26rem' }"
    @hide="onHide"
  >
    <form class="task-form" @submit.prevent="handleSubmit">
      <div class="task-form__field">
        <label for="task-name" class="task-form__label">
          Name <span class="task-form__required">*</span>
        </label>
        <InputText
          id="task-name"
          v-model="form.name"
          placeholder="Task name"
          class="w-full"
          :invalid="!!errors.name"
          autofocus
        />
        <small v-if="errors.name" class="task-form__error">{{ errors.name }}</small>
      </div>

      <div class="task-form__field">
        <label for="task-description" class="task-form__label">Description</label>
        <Textarea
          id="task-description"
          v-model="form.description"
          placeholder="Optional description"
          rows="3"
          class="w-full"
          auto-resize
        />
      </div>

      <div class="task-form__actions">
        <Button label="Cancel" severity="secondary" text @click="emit('close')" />
        <Button
          :label="isEditMode ? 'Save Changes' : 'Create Task'"
          icon="pi pi-check"
          type="submit"
          :loading="saving"
        />
      </div>
    </form>
  </Dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import Dialog from 'primevue/dialog'
import InputText from 'primevue/inputtext'
import Textarea from 'primevue/textarea'
import Button from 'primevue/button'
import { useToast } from 'primevue/usetoast'
import { useTasksStore } from '../../stores/tasks'
import type { Task } from '../../types/index'

const props = defineProps<{
  modelValue: boolean
  projectId: number
  task?: Task
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  close: []
}>()

const tasksStore = useTasksStore()
const toast = useToast()

const isEditMode = computed(() => !!props.task)

const visible = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val),
})

interface FormState {
  name: string
  description: string
}

const form = ref<FormState>({ name: '', description: '' })
const errors = ref<Partial<Record<keyof FormState, string>>>({})
const saving = ref(false)

watch(
  () => props.modelValue,
  (open) => {
    if (open) {
      form.value = {
        name: props.task?.name ?? '',
        description: props.task?.description ?? '',
      }
      errors.value = {}
    }
  }
)

function validate(): boolean {
  errors.value = {}
  if (!form.value.name.trim()) {
    errors.value.name = 'Name is required.'
    return false
  }
  return true
}

async function handleSubmit() {
  if (!validate()) return
  saving.value = true
  try {
    if (isEditMode.value && props.task) {
      await tasksStore.updateTask({
        id: props.task.id,
        name: form.value.name.trim(),
        description: form.value.description.trim() || undefined,
      })
      toast.add({ severity: 'success', summary: 'Task updated', life: 3000 })
    } else {
      await tasksStore.createTask({
        projectId: props.projectId,
        name: form.value.name.trim(),
        description: form.value.description.trim() || undefined,
      })
      toast.add({ severity: 'success', summary: 'Task created', life: 3000 })
    }
    emit('close')
  } catch (e) {
    toast.add({ severity: 'error', summary: 'Error', detail: String(e), life: 5000 })
  } finally {
    saving.value = false
  }
}

function onHide() {
  emit('close')
}
</script>

<style scoped>
.task-form {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.task-form__field {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.task-form__label {
  font-size: 0.875rem;
  font-weight: 500;
}

.task-form__required {
  color: var(--p-red-500);
}

.task-form__error {
  color: var(--p-red-500);
  font-size: 0.8rem;
}

.task-form__actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
  padding-top: 0.5rem;
  border-top: 1px solid var(--p-surface-100);
}
</style>
