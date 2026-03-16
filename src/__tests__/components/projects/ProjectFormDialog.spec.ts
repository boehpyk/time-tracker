import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import { createTestingPinia } from '@pinia/testing'
import { useProjectsStore } from '../../../stores/projects'
import ProjectFormDialog from '../../../components/projects/ProjectFormDialog.vue'
import type { Project } from '../../../types/index'

// Mock tauriApi — store actions call api.* methods
vi.mock('../../../services/tauriApi', () => ({
  api: {
    getProjects: vi.fn(),
    createProject: vi.fn(),
    updateProject: vi.fn(),
    deleteProject: vi.fn(),
    archiveProject: vi.fn(),
  },
}))

// Mock primevue service hooks so the component mounts without providers
const mockConfirmRequire = vi.fn()
vi.mock('primevue/useconfirm', () => ({
  useConfirm: () => ({ require: mockConfirmRequire }),
}))
vi.mock('primevue/usetoast', () => ({
  useToast: () => ({ add: vi.fn() }),
}))

import { api } from '../../../services/tauriApi'

const mockApi = vi.mocked(api)

const existingProject: Project = {
  id: 10,
  name: 'Existing Project',
  color: '#ef4444',
  description: 'Some description',
  archived: 0,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
}

/**
 * Shared stubs for PrimeVue components used inside ProjectFormDialog.
 * Dialog renders its default slot when :visible is true.
 */
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
    props: ['modelValue', 'rows', 'autoResize', 'placeholder', 'class'],
    emits: ['update:modelValue'],
    template: `<textarea class="textarea-stub" :value="modelValue" @input="$emit('update:modelValue', $event.target.value)"></textarea>`,
  },
  Button: {
    props: ['label', 'icon', 'severity', 'text', 'loading', 'type'],
    emits: ['click'],
    template: `<button :type="type" :data-label="label" class="btn-stub" @click="$emit('click')">{{ label }}</button>`,
  },
  ConfirmDialog: { template: '<div />' },
}

function mountDialog(props: { modelValue: boolean; project?: Project } = { modelValue: true }) {
  return mount(ProjectFormDialog, {
    props,
    global: {
      plugins: [createTestingPinia({ stubActions: false })],
      stubs,
    },
  })
}

describe('ProjectFormDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // -------------------------------------------------------------------------
  // Visibility / mode
  // -------------------------------------------------------------------------

  it('renders nothing when modelValue is false', () => {
    const wrapper = mountDialog({ modelValue: false })
    expect(wrapper.find('.dialog-stub').exists()).toBe(false)
  })

  it('shows "New Project" header when no project prop is passed', () => {
    const wrapper = mountDialog({ modelValue: true })
    expect(wrapper.find('.dialog-header').text()).toBe('New Project')
  })

  it('shows "Edit Project" header when a project prop is passed', () => {
    const wrapper = mountDialog({ modelValue: true, project: existingProject })
    expect(wrapper.find('.dialog-header').text()).toBe('Edit Project')
  })

  // -------------------------------------------------------------------------
  // Pre-fill in edit mode
  // -------------------------------------------------------------------------

  it('pre-fills the name field with the project name when in edit mode', async () => {
    // The component populates form state in a watch on modelValue (false → true),
    // so mount closed first then open.
    const wrapper = mountDialog({ modelValue: false, project: existingProject })
    await wrapper.setProps({ modelValue: true })
    await nextTick()
    const nameInput = wrapper.find('.input-text-stub')
    expect((nameInput.element as HTMLInputElement).value).toBe('Existing Project')
  })

  it('pre-fills the description field with the project description when in edit mode', async () => {
    const wrapper = mountDialog({ modelValue: false, project: existingProject })
    await wrapper.setProps({ modelValue: true })
    await nextTick()
    const textarea = wrapper.find('.textarea-stub')
    expect((textarea.element as HTMLTextAreaElement).value).toBe('Some description')
  })

  it('has an empty name field in create mode', () => {
    const wrapper = mountDialog({ modelValue: true })
    const nameInput = wrapper.find('.input-text-stub')
    expect((nameInput.element as HTMLInputElement).value).toBe('')
  })

  // -------------------------------------------------------------------------
  // Form labels and submit button labels
  // -------------------------------------------------------------------------

  it('shows "Create Project" submit button in create mode', () => {
    const wrapper = mountDialog({ modelValue: true })
    const submitBtn = wrapper.find('button[type="submit"]')
    expect(submitBtn.attributes('data-label')).toBe('Create Project')
  })

  it('shows "Save Changes" submit button in edit mode', () => {
    const wrapper = mountDialog({ modelValue: true, project: existingProject })
    const submitBtn = wrapper.find('button[type="submit"]')
    expect(submitBtn.attributes('data-label')).toBe('Save Changes')
  })

  it('shows the Delete Project button only in edit mode', () => {
    const createWrapper = mountDialog({ modelValue: true })
    const editWrapper = mountDialog({ modelValue: true, project: existingProject })

    const deleteBtn = (w: ReturnType<typeof mountDialog>) =>
      w.findAll('.btn-stub').find(b => b.attributes('data-label') === 'Delete Project')

    expect(deleteBtn(createWrapper)).toBeUndefined()
    expect(deleteBtn(editWrapper)).toBeDefined()
  })

  // -------------------------------------------------------------------------
  // Validation
  // -------------------------------------------------------------------------

  it('shows validation error and does not call createProject when name is blank', async () => {
    const wrapper = mountDialog({ modelValue: true })
    const store = useProjectsStore()

    // Submit with blank name
    await wrapper.find('form').trigger('submit')
    await nextTick()

    expect(wrapper.find('.project-form__error').text()).toBe('Name is required.')
    expect(store.createProject).not.toHaveBeenCalled()
  })

  // -------------------------------------------------------------------------
  // Create flow
  // -------------------------------------------------------------------------

  it('calls createProject store action when form is submitted in create mode', async () => {
    const wrapper = mountDialog({ modelValue: true })
    const store = useProjectsStore()

    mockApi.createProject.mockResolvedValueOnce({
      id: 99,
      name: 'New Project',
      color: '#6366f1',
      archived: 0,
      createdAt: '',
      updatedAt: '',
    })

    // Type a name
    const nameInput = wrapper.find('.input-text-stub')
    await nameInput.setValue('New Project')
    await wrapper.find('form').trigger('submit')

    // Flush microtasks
    await nextTick()
    await nextTick()

    expect(store.createProject).toHaveBeenCalledTimes(1)
    expect(store.createProject).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'New Project' }),
    )
  })

  // -------------------------------------------------------------------------
  // Update flow
  // -------------------------------------------------------------------------

  it('calls updateProject store action when form is submitted in edit mode', async () => {
    const wrapper = mountDialog({ modelValue: true, project: existingProject })
    const store = useProjectsStore()

    mockApi.updateProject.mockResolvedValueOnce({ ...existingProject, name: 'Renamed' })

    const nameInput = wrapper.find('.input-text-stub')
    await nameInput.setValue('Renamed')
    await wrapper.find('form').trigger('submit')

    await nextTick()
    await nextTick()

    expect(store.updateProject).toHaveBeenCalledTimes(1)
    expect(store.updateProject).toHaveBeenCalledWith(
      expect.objectContaining({ id: 10, name: 'Renamed' }),
    )
  })

  // -------------------------------------------------------------------------
  // Cancel button
  // -------------------------------------------------------------------------

  it('emits close event when Cancel button is clicked', async () => {
    const wrapper = mountDialog({ modelValue: true })
    const cancelBtn = wrapper.findAll('.btn-stub').find(b => b.attributes('data-label') === 'Cancel')
    await cancelBtn!.trigger('click')
    expect(wrapper.emitted('close')).toHaveLength(1)
  })

  // -------------------------------------------------------------------------
  // Delete flow in edit mode
  // -------------------------------------------------------------------------

  it('calls confirm.require when Delete Project button is clicked in edit mode', async () => {
    const wrapper = mountDialog({ modelValue: true, project: existingProject })
    const deleteBtn = wrapper.findAll('.btn-stub').find(b => b.attributes('data-label') === 'Delete Project')
    await deleteBtn!.trigger('click')
    expect(mockConfirmRequire).toHaveBeenCalledTimes(1)
    expect(mockConfirmRequire).toHaveBeenCalledWith(
      expect.objectContaining({ accept: expect.any(Function) }),
    )
  })

  it('calls deleteProject store action when delete confirm accept fires', async () => {
    const wrapper = mountDialog({ modelValue: true, project: existingProject })
    const store = useProjectsStore()

    mockApi.deleteProject.mockResolvedValueOnce(undefined)

    const deleteBtn = wrapper.findAll('.btn-stub').find(b => b.attributes('data-label') === 'Delete Project')
    await deleteBtn!.trigger('click')

    const acceptFn = mockConfirmRequire.mock.calls[0][0].accept as () => Promise<void>
    await acceptFn()

    await nextTick()
    await nextTick()

    expect(store.deleteProject).toHaveBeenCalledWith(10)
  })
})
