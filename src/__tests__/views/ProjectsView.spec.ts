import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import { createTestingPinia } from '@pinia/testing'
import { useProjectsStore } from '../../stores/projects'
import ProjectsView from '../../views/ProjectsView.vue'
import type { Project } from '../../types/index'

// Mock tauriApi so store actions don't call invoke()
vi.mock('../../services/tauriApi', () => ({
  api: {
    getProjects: vi.fn(),
    createProject: vi.fn(),
    updateProject: vi.fn(),
    deleteProject: vi.fn(),
    archiveProject: vi.fn(),
    getTasks: vi.fn(),
  },
}))

// Mock PrimeVue service hooks — the view calls useToast
vi.mock('primevue/usetoast', () => ({
  useToast: () => ({ add: vi.fn() }),
}))

// Mock useConfirm used by child components
vi.mock('primevue/useconfirm', () => ({
  useConfirm: () => ({ require: vi.fn() }),
}))

function makeProject(id: number, name: string, archived = 0): Project {
  return {
    id,
    name,
    color: '#6366f1',
    archived,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  }
}

/**
 * Stubs for PrimeVue components and child Vue components that would need the
 * full PrimeVue plugin tree or Tauri runtime to mount correctly.
 */
const stubs = {
  // Stub child feature components so this test focuses on ProjectsView logic
  ProjectCard: {
    props: ['project'],
    emits: ['edit', 'archive', 'delete'],
    template: `<div class="project-card-stub" :data-id="project.id" :data-name="project.name" />`,
  },
  ProjectFormDialog: {
    props: ['modelValue', 'project'],
    emits: ['update:modelValue', 'close'],
    template: `<div class="project-form-dialog-stub" :data-visible="modelValue" />`,
  },
  Button: {
    props: ['label', 'icon', 'size', 'text', 'severity'],
    emits: ['click'],
    template: `<button :data-label="label" class="btn-stub" @click="$emit('click')">{{ label }}</button>`,
  },
  Skeleton: {
    props: ['height', 'width'],
    template: '<div class="skeleton-stub" />',
  },
  Message: {
    props: ['severity', 'closable'],
    template: `<div class="message-stub"><slot /></div>`,
  },
}

function mountView(initialProjects: Project[] = [], loading = false, error: string | null = null) {
  return mount(ProjectsView, {
    global: {
      plugins: [
        createTestingPinia({
          stubActions: true,
          initialState: {
            projects: { projects: initialProjects, loading, error },
            tasks: { tasksByProject: {}, loading: false, error: null },
          },
        }),
      ],
      stubs,
    },
  })
}

describe('ProjectsView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // -------------------------------------------------------------------------
  // Mount behaviour
  // -------------------------------------------------------------------------

  it('calls fetchProjects on mount', () => {
    mountView()
    const store = useProjectsStore()
    expect(store.fetchProjects).toHaveBeenCalledTimes(1)
  })

  // -------------------------------------------------------------------------
  // Active project rendering
  // -------------------------------------------------------------------------

  it('renders one ProjectCard per active (non-archived) project', () => {
    const projects = [
      makeProject(1, 'Alpha'),
      makeProject(2, 'Beta'),
      makeProject(3, 'Archived One', 1),
    ]
    const wrapper = mountView(projects)
    const cards = wrapper.findAll('.project-card-stub')
    // Only the 2 non-archived projects should be shown by default
    expect(cards).toHaveLength(2)
  })

  it('shows the correct project names in the cards', () => {
    const wrapper = mountView([makeProject(1, 'Alpha'), makeProject(2, 'Beta')])
    const names = wrapper.findAll('.project-card-stub').map(c => c.attributes('data-name'))
    expect(names).toContain('Alpha')
    expect(names).toContain('Beta')
  })

  it('shows the active project count in the header', () => {
    const wrapper = mountView([makeProject(1, 'Alpha'), makeProject(2, 'Beta'), makeProject(3, 'Archived', 1)])
    // 2 active projects
    expect(wrapper.find('.projects-view__count').text()).toBe('2 active')
  })

  // -------------------------------------------------------------------------
  // Empty state
  // -------------------------------------------------------------------------

  it('shows the empty state when there are no active projects', () => {
    const wrapper = mountView([])
    expect(wrapper.find('.projects-view__empty').exists()).toBe(true)
  })

  it('does not show the empty state when active projects exist', () => {
    const wrapper = mountView([makeProject(1, 'Alpha')])
    expect(wrapper.find('.projects-view__empty').exists()).toBe(false)
  })

  // -------------------------------------------------------------------------
  // Loading / error states
  // -------------------------------------------------------------------------

  it('shows the skeleton grid when loading is true', () => {
    const wrapper = mountView([], true)
    expect(wrapper.find('.projects-view__skeleton-grid').exists()).toBe(true)
    expect(wrapper.findAll('.skeleton-stub').length).toBeGreaterThan(0)
    expect(wrapper.find('.project-card-stub').exists()).toBe(false)
  })

  it('shows the error message when error is set', () => {
    const wrapper = mountView([], false, 'Database error')
    expect(wrapper.find('.message-stub').exists()).toBe(true)
    expect(wrapper.find('.message-stub').text()).toContain('Database error')
  })

  // -------------------------------------------------------------------------
  // New Project button opens form dialog
  // -------------------------------------------------------------------------

  it('opens the form dialog when "New Project" button is clicked', async () => {
    const wrapper = mountView([makeProject(1, 'Alpha')])
    // Confirm dialog is not yet visible
    expect(wrapper.find('.project-form-dialog-stub').attributes('data-visible')).toBe('false')

    // Click the "New Project" button in the header
    const newBtn = wrapper.findAll('.btn-stub').find(b => b.attributes('data-label') === 'New Project')
    await newBtn!.trigger('click')
    await nextTick()

    expect(wrapper.find('.project-form-dialog-stub').attributes('data-visible')).toBe('true')
  })

  it('opens the form dialog when "New Project" is clicked in empty state', async () => {
    const wrapper = mountView([])
    expect(wrapper.find('.projects-view__empty').exists()).toBe(true)

    const emptyNewBtn = wrapper.find('.projects-view__empty .btn-stub')
    await emptyNewBtn.trigger('click')
    await nextTick()

    expect(wrapper.find('.project-form-dialog-stub').attributes('data-visible')).toBe('true')
  })

  // -------------------------------------------------------------------------
  // Archive toggle
  // -------------------------------------------------------------------------

  it('shows the "Show archived" button only when archived projects exist', () => {
    const withArchived = mountView([makeProject(1, 'Alpha'), makeProject(2, 'Old', 1)])
    const withoutArchived = mountView([makeProject(1, 'Alpha')])

    const hasArchiveBtn = (w: ReturnType<typeof mountView>) =>
      w.findAll('.btn-stub').some(b => b.attributes('data-label')?.includes('archived'))

    expect(hasArchiveBtn(withArchived)).toBe(true)
    expect(hasArchiveBtn(withoutArchived)).toBe(false)
  })

  it('shows all projects (including archived) when "Show archived" is toggled', async () => {
    const projects = [makeProject(1, 'Alpha'), makeProject(2, 'Old', 1)]
    const wrapper = mountView(projects)

    expect(wrapper.findAll('.project-card-stub')).toHaveLength(1)

    const archiveToggleBtn = wrapper.findAll('.btn-stub').find(b =>
      b.attributes('data-label')?.includes('archived'),
    )
    await archiveToggleBtn!.trigger('click')
    await nextTick()

    expect(wrapper.findAll('.project-card-stub')).toHaveLength(2)
  })
})
