import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createTestingPinia } from '@pinia/testing'
import ProjectCard from '../../../components/projects/ProjectCard.vue'
import type { Project } from '../../../types/index'

// Mock tauriApi so the tasks store (used by ProjectCard) never hits invoke()
vi.mock('../../../services/tauriApi', () => ({
  api: {
    getTasks: vi.fn(),
  },
}))

// Mock useConfirm so the component mounts without a PrimeVue Confirmation provider.
// We capture the require fn so we can assert on its arguments.
const mockConfirmRequire = vi.fn()
vi.mock('primevue/useconfirm', () => ({
  useConfirm: () => ({ require: mockConfirmRequire }),
}))

// Mock useToast to avoid needing the Toast provider
vi.mock('primevue/usetoast', () => ({
  useToast: () => ({ add: vi.fn() }),
}))

const fakeProject: Project = {
  id: 42,
  name: 'My Test Project',
  color: '#6366f1',
  archived: 0,
  createdAt: '2026-03-01T00:00:00Z',
  updatedAt: '2026-03-01T00:00:00Z',
}

const archivedProject: Project = {
  ...fakeProject,
  id: 43,
  archived: 1,
}

/**
 * Mounts ProjectCard with a testing pinia.
 * PrimeVue components that need a real runtime (ConfirmDialog, Button, Tag) are stubbed.
 */
function mountCard(project: Project = fakeProject) {
  return mount(ProjectCard, {
    props: { project },
    global: {
      plugins: [
        createTestingPinia({ stubActions: false }),
      ],
      stubs: {
        ConfirmDialog: { template: '<div class="confirm-dialog-stub" />' },
        Tag: { template: '<span class="tag-stub">{{ value }}</span>', props: ['value', 'severity'] },
        Button: {
          template: '<button :aria-label="ariaLabel" @click="$emit(\'click\')">{{ label }}</button>',
          props: ['ariaLabel', 'label', 'icon', 'size', 'text', 'rounded', 'severity', 'loading'],
          emits: ['click'],
        },
      },
    },
  })
}

describe('ProjectCard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders the project name', () => {
    const wrapper = mountCard()
    expect(wrapper.find('.project-card__name').text()).toBe('My Test Project')
  })

  it('renders the color swatch with the correct background-color', () => {
    const wrapper = mountCard()
    const swatch = wrapper.find('.project-card__color-swatch')
    expect(swatch.exists()).toBe(true)
    expect(swatch.attributes('style')).toContain('background-color: rgb(99, 102, 241)')
  })

  it('renders the description when provided', () => {
    const projectWithDesc: Project = { ...fakeProject, description: 'A great project' }
    const wrapper = mountCard(projectWithDesc)
    expect(wrapper.find('.project-card__description').text()).toBe('A great project')
  })

  it('does not render description element when description is absent', () => {
    const wrapper = mountCard(fakeProject)
    expect(wrapper.find('.project-card__description').exists()).toBe(false)
  })

  it('shows 0 tasks when tasks store has no entry for this project', () => {
    const wrapper = mountCard()
    expect(wrapper.find('.project-card__task-count').text()).toContain('0 tasks')
  })

  it('shows correct task count from tasks store', () => {
    // Pre-populate the store via initialState so the computed picks it up on mount
    const wrapper = mount(ProjectCard, {
      props: { project: fakeProject },
      global: {
        plugins: [
          createTestingPinia({
            stubActions: false,
            initialState: {
              tasks: {
                tasksByProject: {
                  42: [
                    { id: 1, projectId: 42, name: 'Task A', archived: 0, createdAt: '', updatedAt: '' },
                    { id: 2, projectId: 42, name: 'Task B', archived: 0, createdAt: '', updatedAt: '' },
                    { id: 3, projectId: 42, name: 'Task C (archived)', archived: 1, createdAt: '', updatedAt: '' },
                  ],
                },
              },
            },
          }),
        ],
        stubs: {
          ConfirmDialog: { template: '<div class="confirm-dialog-stub" />' },
          Tag: { template: '<span class="tag-stub">{{ value }}</span>', props: ['value', 'severity'] },
          Button: {
            template: '<button :aria-label="ariaLabel" @click="$emit(\'click\')">{{ label }}</button>',
            props: ['ariaLabel', 'label', 'icon', 'size', 'text', 'rounded', 'severity', 'loading'],
            emits: ['click'],
          },
        },
      },
    })
    expect(wrapper.find('.project-card__task-count').text()).toContain('2 tasks')
  })

  it('uses singular "task" when count is 1', () => {
    const wrapper = mount(ProjectCard, {
      props: { project: fakeProject },
      global: {
        plugins: [
          createTestingPinia({
            stubActions: false,
            initialState: {
              tasks: {
                tasksByProject: {
                  42: [
                    { id: 1, projectId: 42, name: 'Solo Task', archived: 0, createdAt: '', updatedAt: '' },
                  ],
                },
              },
            },
          }),
        ],
        stubs: {
          ConfirmDialog: { template: '<div class="confirm-dialog-stub" />' },
          Tag: { template: '<span class="tag-stub">{{ value }}</span>', props: ['value', 'severity'] },
          Button: {
            template: '<button :aria-label="ariaLabel" @click="$emit(\'click\')">{{ label }}</button>',
            props: ['ariaLabel', 'label', 'icon', 'size', 'text', 'rounded', 'severity', 'loading'],
            emits: ['click'],
          },
        },
      },
    })
    expect(wrapper.find('.project-card__task-count').text()).toContain('1 task')
  })

  it('emits edit event with project when edit button is clicked', async () => {
    const wrapper = mountCard()
    const editBtn = wrapper.find('[aria-label="Edit project"]')
    await editBtn.trigger('click')
    expect(wrapper.emitted('edit')).toHaveLength(1)
    expect(wrapper.emitted('edit')![0]).toEqual([fakeProject])
  })

  it('emits archive event with project id when archive button is clicked', async () => {
    const wrapper = mountCard()
    const archiveBtn = wrapper.find('[aria-label="Archive project"]')
    await archiveBtn.trigger('click')
    expect(wrapper.emitted('archive')).toHaveLength(1)
    expect(wrapper.emitted('archive')![0]).toEqual([42])
  })

  it('does not render archive button for archived projects', () => {
    const wrapper = mountCard(archivedProject)
    expect(wrapper.find('[aria-label="Archive project"]').exists()).toBe(false)
  })

  it('renders the Archived tag for archived projects', () => {
    const wrapper = mountCard(archivedProject)
    expect(wrapper.find('.tag-stub').exists()).toBe(true)
    expect(wrapper.find('.tag-stub').text()).toBe('Archived')
  })

  it('does not render the Archived tag for active projects', () => {
    const wrapper = mountCard(fakeProject)
    expect(wrapper.find('.tag-stub').exists()).toBe(false)
  })

  it('calls confirm.require when delete button is clicked', async () => {
    const wrapper = mountCard()
    const deleteBtn = wrapper.find('[aria-label="Delete project"]')
    await deleteBtn.trigger('click')
    expect(mockConfirmRequire).toHaveBeenCalledTimes(1)
    expect(mockConfirmRequire).toHaveBeenCalledWith(
      expect.objectContaining({
        accept: expect.any(Function),
      }),
    )
  })

  it('emits delete event with project id when confirm accept callback fires', async () => {
    const wrapper = mountCard()
    const deleteBtn = wrapper.find('[aria-label="Delete project"]')
    await deleteBtn.trigger('click')
    // Invoke the accept callback that was passed to confirm.require
    const acceptFn = mockConfirmRequire.mock.calls[0][0].accept as () => void
    acceptFn()
    expect(wrapper.emitted('delete')).toHaveLength(1)
    expect(wrapper.emitted('delete')![0]).toEqual([42])
  })
})
