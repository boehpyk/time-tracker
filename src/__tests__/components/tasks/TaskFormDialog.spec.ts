import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import { createTestingPinia } from '@pinia/testing'
import { useTasksStore } from '../../../stores/tasks'
import TaskFormDialog from '../../../components/tasks/TaskFormDialog.vue'
import type { Task } from '../../../types/index'

// Mock tauriApi so store actions don't call invoke()
vi.mock('../../../services/tauriApi', () => ({
  api: {
    getTasks: vi.fn(),
    createTask: vi.fn(),
    updateTask: vi.fn(),
    archiveTask: vi.fn(),
    deleteTask: vi.fn(),
  },
}))

// Mock PrimeVue service hooks
vi.mock('primevue/usetoast', () => ({
  useToast: () => ({ add: vi.fn() }),
}))

import { api } from '../../../services/tauriApi'
const mockApi = vi.mocked(api)

const stubs = {
  Dialog: {
    props: ['visible', 'header', 'modal', 'style'],
    emits: ['update:visible', 'hide'],
    template: `
      <div class="dialog-stub" v-if="visible">
        <div class="dialog-header">{{ header }}</div>
        <slot />
      </div>
    `,
  },
  InputText: {
    props: ['modelValue', 'invalid', 'autofocus', 'placeholder', 'class'],
    emits: ['update:modelValue'],
    template: `<input class="input-text-stub" :value="modelValue" @input="$emit('update:modelValue', $event.target.value)" />`,
  },
  Textarea: {
    props: ['modelValue', 'rows', 'autoResize', 'auto-resize', 'placeholder', 'class'],
    emits: ['update:modelValue'],
    template: `<textarea class="textarea-stub" :value="modelValue" @input="$emit('update:modelValue', $event.target.value)"></textarea>`,
  },
  Button: {
    props: ['label', 'icon', 'severity', 'text', 'loading', 'type'],
    emits: ['click'],
    template: `<button :type="type || 'button'" :data-label="label" class="btn-stub" @click="$emit('click')">{{ label }}</button>`,
  },
}

function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    id: 20,
    projectId: 10,
    name: 'Existing Task',
    description: 'A description',
    archived: 0,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    ...overrides,
  }
}

function mountDialog(props: { modelValue: boolean; projectId?: number; task?: Task } = { modelValue: true, projectId: 10 }) {
  return mount(TaskFormDialog, {
    props: { projectId: 10, ...props },
    global: {
      plugins: [createTestingPinia({ stubActions: false })],
      stubs,
    },
  })
}

describe('TaskFormDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ---------------------------------------------------------------------------
  // Mode header
  // ---------------------------------------------------------------------------

  it('shows "New Task" header in create mode (no task prop)', () => {
    const wrapper = mountDialog({ modelValue: true, projectId: 10 })
    expect(wrapper.find('.dialog-header').text()).toBe('New Task')
  })

  it('shows "Edit Task" header in edit mode (task prop supplied)', () => {
    const wrapper = mountDialog({ modelValue: true, projectId: 10, task: makeTask() })
    expect(wrapper.find('.dialog-header').text()).toBe('Edit Task')
  })

  it('renders nothing when modelValue is false', () => {
    const wrapper = mountDialog({ modelValue: false, projectId: 10 })
    expect(wrapper.find('.dialog-stub').exists()).toBe(false)
  })

  // ---------------------------------------------------------------------------
  // Pre-fill in edit mode
  // ---------------------------------------------------------------------------

  it('pre-fills name field with task name when opened in edit mode', async () => {
    // Mount closed, then open so the watcher fires
    const wrapper = mountDialog({ modelValue: false, projectId: 10, task: makeTask({ name: 'Existing Task' }) })
    await wrapper.setProps({ modelValue: true })
    await nextTick()
    const nameInput = wrapper.find('.input-text-stub')
    expect((nameInput.element as HTMLInputElement).value).toBe('Existing Task')
  })

  it('pre-fills description field with task description when opened in edit mode', async () => {
    const wrapper = mountDialog({ modelValue: false, projectId: 10, task: makeTask({ description: 'A description' }) })
    await wrapper.setProps({ modelValue: true })
    await nextTick()
    const textarea = wrapper.find('.textarea-stub')
    expect((textarea.element as HTMLTextAreaElement).value).toBe('A description')
  })

  it('has an empty name field in create mode', () => {
    const wrapper = mountDialog({ modelValue: true, projectId: 10 })
    const nameInput = wrapper.find('.input-text-stub')
    expect((nameInput.element as HTMLInputElement).value).toBe('')
  })

  // ---------------------------------------------------------------------------
  // Submit button label
  // ---------------------------------------------------------------------------

  it('shows "Create Task" submit button in create mode', () => {
    const wrapper = mountDialog({ modelValue: true, projectId: 10 })
    const submitBtn = wrapper.find('button[type="submit"]')
    expect(submitBtn.attributes('data-label')).toBe('Create Task')
  })

  it('shows "Save Changes" submit button in edit mode', () => {
    const wrapper = mountDialog({ modelValue: true, projectId: 10, task: makeTask() })
    const submitBtn = wrapper.find('button[type="submit"]')
    expect(submitBtn.attributes('data-label')).toBe('Save Changes')
  })

  // ---------------------------------------------------------------------------
  // Validation
  // ---------------------------------------------------------------------------

  it('shows validation error and does not call createTask when name is blank', async () => {
    const wrapper = mountDialog({ modelValue: true, projectId: 10 })
    const store = useTasksStore()

    await wrapper.find('form').trigger('submit')
    await nextTick()

    expect(wrapper.find('.task-form__error').text()).toBe('Name is required.')
    expect(store.createTask).not.toHaveBeenCalled()
  })

  // ---------------------------------------------------------------------------
  // Create flow
  // ---------------------------------------------------------------------------

  it('calls createTask store action on submit in create mode', async () => {
    const wrapper = mountDialog({ modelValue: true, projectId: 10 })
    const store = useTasksStore()

    mockApi.createTask.mockResolvedValueOnce(makeTask({ id: 99, name: 'New Task' }))

    const nameInput = wrapper.find('.input-text-stub')
    await nameInput.setValue('New Task')
    await wrapper.find('form').trigger('submit')
    await nextTick()
    await nextTick()

    expect(store.createTask).toHaveBeenCalledTimes(1)
    expect(store.createTask).toHaveBeenCalledWith(
      expect.objectContaining({ projectId: 10, name: 'New Task' }),
    )
  })

  // ---------------------------------------------------------------------------
  // Update flow
  // ---------------------------------------------------------------------------

  it('calls updateTask store action on submit in edit mode', async () => {
    const task = makeTask({ id: 20, name: 'Old Name' })
    const wrapper = mountDialog({ modelValue: true, projectId: 10, task })
    const store = useTasksStore()

    mockApi.updateTask.mockResolvedValueOnce({ ...task, name: 'Renamed' })

    const nameInput = wrapper.find('.input-text-stub')
    await nameInput.setValue('Renamed')
    await wrapper.find('form').trigger('submit')
    await nextTick()
    await nextTick()

    expect(store.updateTask).toHaveBeenCalledTimes(1)
    expect(store.updateTask).toHaveBeenCalledWith(
      expect.objectContaining({ id: 20, name: 'Renamed' }),
    )
  })

  // ---------------------------------------------------------------------------
  // Cancel button
  // ---------------------------------------------------------------------------

  it('emits close event when Cancel button is clicked', async () => {
    const wrapper = mountDialog({ modelValue: true, projectId: 10 })
    const cancelBtn = wrapper.findAll('.btn-stub').find(b => b.attributes('data-label') === 'Cancel')
    await cancelBtn!.trigger('click')
    expect(wrapper.emitted('close')).toHaveLength(1)
  })
})
