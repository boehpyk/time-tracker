<template>
  <Dialog
    v-model:visible="visible"
    :header="isEditMode ? 'Edit Project' : 'New Project'"
    modal
    :style="{ width: '28rem' }"
    @hide="onHide"
  >
    <form class="project-form" @submit.prevent="handleSubmit">
      <div class="project-form__field">
        <label for="project-name" class="project-form__label">
          Name <span class="project-form__required">*</span>
        </label>
        <InputText
          id="project-name"
          v-model="form.name"
          placeholder="Project name"
          class="w-full"
          :invalid="!!errors.name"
          autofocus
        />
        <small v-if="errors.name" class="project-form__error">{{ errors.name }}</small>
      </div>

      <div class="project-form__field">
        <label class="project-form__label">Color</label>
        <div class="project-form__color-row">
          <span
            v-for="preset in colorPresets"
            :key="preset"
            class="project-form__color-chip"
            :class="{ 'project-form__color-chip--selected': form.color === preset }"
            :style="{ backgroundColor: preset }"
            :title="preset"
            @click="form.color = preset"
          />
          <input
            type="color"
            class="project-form__color-picker"
            :value="form.color"
            title="Custom color"
            @input="onColorInput"
          />
        </div>
        <div class="project-form__color-preview">
          <span class="project-form__color-swatch" :style="{ backgroundColor: form.color }" />
          <span class="project-form__color-value">{{ form.color }}</span>
        </div>
      </div>

      <div class="project-form__field">
        <label for="project-description" class="project-form__label">Description</label>
        <Textarea
          id="project-description"
          v-model="form.description"
          placeholder="Optional description"
          rows="3"
          class="w-full"
          auto-resize
        />
      </div>

      <div class="project-form__actions">
        <Button
          v-if="isEditMode"
          label="Delete Project"
          icon="pi pi-trash"
          severity="danger"
          text
          class="project-form__delete-btn"
          :loading="deleting"
          @click="confirmDelete"
        />
        <div class="project-form__actions-right">
          <Button label="Cancel" severity="secondary" text @click="emit('close')" />
          <Button
            :label="isEditMode ? 'Save Changes' : 'Create Project'"
            icon="pi pi-check"
            type="submit"
            :loading="saving"
          />
        </div>
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
import { useConfirm } from 'primevue/useconfirm'
import { useToast } from 'primevue/usetoast'
import { useProjectsStore } from '../../stores/projects'
import type { Project } from '../../types/index'

const props = defineProps<{
  modelValue: boolean
  project?: Project
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  close: []
}>()

const projectsStore = useProjectsStore()
const confirm = useConfirm()
const toast = useToast()

const colorPresets = [
  '#6366f1', '#8b5cf6', '#ec4899', '#ef4444',
  '#f97316', '#eab308', '#22c55e', '#14b8a6',
  '#3b82f6', '#06b6d4', '#64748b', '#78716c',
]

const isEditMode = computed(() => !!props.project)

const visible = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val),
})

interface FormState {
  name: string
  color: string
  description: string
}

const form = ref<FormState>({
  name: '',
  color: colorPresets[0],
  description: '',
})

const errors = ref<Partial<Record<keyof FormState, string>>>({})
const saving = ref(false)
const deleting = ref(false)

watch(
  () => props.modelValue,
  (open) => {
    if (open) {
      if (props.project) {
        form.value = {
          name: props.project.name,
          color: props.project.color,
          description: props.project.description ?? '',
        }
      } else {
        form.value = { name: '', color: colorPresets[0], description: '' }
      }
      errors.value = {}
    }
  }
)

function onColorInput(event: Event) {
  const target = event.target as HTMLInputElement
  form.value.color = target.value
}

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
    if (isEditMode.value && props.project) {
      await projectsStore.updateProject({
        id: props.project.id,
        name: form.value.name.trim(),
        color: form.value.color,
        description: form.value.description.trim() || undefined,
      })
      toast.add({ severity: 'success', summary: 'Project updated', life: 3000 })
    } else {
      await projectsStore.createProject({
        name: form.value.name.trim(),
        color: form.value.color,
        description: form.value.description.trim() || undefined,
      })
      toast.add({ severity: 'success', summary: 'Project created', life: 3000 })
    }
    emit('close')
  } catch (e) {
    toast.add({ severity: 'error', summary: 'Error', detail: String(e), life: 5000 })
  } finally {
    saving.value = false
  }
}

function confirmDelete() {
  confirm.require({
    message: `Are you sure you want to delete "${props.project?.name}"? All tasks and time entries for this project will also be deleted.`,
    header: 'Delete Project',
    icon: 'pi pi-exclamation-triangle',
    rejectLabel: 'Cancel',
    acceptLabel: 'Delete',
    acceptClass: 'p-button-danger',
    accept: handleDelete,
  })
}

async function handleDelete() {
  if (!props.project) return
  deleting.value = true
  try {
    await projectsStore.deleteProject(props.project.id)
    toast.add({ severity: 'success', summary: 'Project deleted', life: 3000 })
    emit('close')
  } catch (e) {
    toast.add({ severity: 'error', summary: 'Error', detail: String(e), life: 5000 })
  } finally {
    deleting.value = false
  }
}

function onHide() {
  emit('close')
}
</script>

<style scoped>
.project-form {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.project-form__field {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.project-form__label {
  font-size: 0.875rem;
  font-weight: 500;
}

.project-form__required {
  color: var(--p-red-500);
}

.project-form__error {
  color: var(--p-red-500);
  font-size: 0.8rem;
}

.project-form__color-row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  align-items: center;
}

.project-form__color-chip {
  display: inline-block;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  cursor: pointer;
  border: 2px solid transparent;
  transition: transform 0.1s ease, border-color 0.1s ease;
}

.project-form__color-chip:hover {
  transform: scale(1.15);
}

.project-form__color-chip--selected {
  border-color: var(--p-primary-color);
  transform: scale(1.15);
}

.project-form__color-picker {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  border: none;
  padding: 0;
  cursor: pointer;
  background: none;
}

.project-form__color-preview {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.8125rem;
  color: var(--p-text-muted-color);
}

.project-form__color-swatch {
  display: inline-block;
  width: 12px;
  height: 12px;
  border-radius: 50%;
}

.project-form__color-value {
  font-family: monospace;
}

.project-form__actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: 0.5rem;
  border-top: 1px solid var(--p-surface-100);
}

.project-form__delete-btn {
  margin-right: auto;
}

.project-form__actions-right {
  display: flex;
  gap: 0.5rem;
}
</style>
