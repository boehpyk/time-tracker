import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import { createTestingPinia } from '@pinia/testing'
import { useTasksStore } from '../../stores/tasks'
import { useProjectsStore } from '../../stores/projects'
import ProjectDetailView from '../../views/ProjectDetailView.vue'
import type { Project, Task } from '../../types/index'

// ---------------------------------------------------------------------------
// Module-level mocks
// ---------------------------------------------------------------------------

vi.mock('../../services/tauriApi', () => ({
  api: {
    getProjects: vi.fn(),
    createProject: vi.fn(),
    updateProject: vi.fn(),
    deleteProject: vi.fn(),
    archiveProject: vi.fn(),
    getTasks: vi.fn(),
    createTask: vi.fn(),
    updateTask: vi.fn(),
    archiveTask: vi.fn(),
    deleteTask: vi.fn(),
  },
}))

vi.mock('primevue/usetoast', () => ({
  useToast: () => ({ add: vi.fn() }),
}))

const mockConfirmRequire = vi.fn()
vi.mock('primevue/useconfirm', () => ({
  useConfirm: () => ({ require: mockConfirmRequire }),
}))

// Mock vue-router so the view can call useRoute / useRouter without a real router
const mockPush = vi.fn()
vi.mock('vue-router', () => ({
  useRoute: () => ({ params: { id: '10' } }),
  useRouter: () => ({ push: mockPush }),
}))

// ---------------------------------------------------------------------------
// Stubs
// ---------------------------------------------------------------------------

const stubs = {
  // Stub heavy child components; focus tests on ProjectDetailView logic
  TaskListItem: {
    name: 'TaskListItem',
    props: ['task'],
    emits: ['edit', 'archive', 'delete'],
    template: `<div class="task-list-item-stub" :data-id="task.id" :data-name="task.name" />`,
  },
  TaskFormDialog: {
    props: ['modelValue', 'projectId', 'task'],
    emits: ['update:modelValue', 'close'],
    template: `<div class="task-form-dialog-stub" :data-visible="modelValue" />`,
  },
  Button: {
    props: ['label', 'icon', 'size', 'text', 'severity', 'disabled'],
    emits: ['click'],
    template: `<button :data-label="label" :disabled="disabled" class="btn-stub" @click="$emit('click')">{{ label }}</button>`,
  },
  Tag: {
    props: ['value', 'severity'],
    template: `<span class="tag-stub" :data-value="value">{{ value }}</span>`,
  },
  ProgressSpinner: { template: '<div class="progress-spinner-stub" />' },
  Message: {
    props: ['severity', 'closable'],
    template: `<div class="message-stub"><slot /></div>`,
  },
}

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function makeProject(overrides: Partial<Project> = {}): Project {
  return {
    id: 10,
    name: 'Test Project',
    color: '#6366f1',
    archived: 0,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    ...overrides,
  }
}

function makeTask(id: number, name: string, archived = 0): Task {
  return {
    id,
    projectId: 10,
    name,
    archived,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  }
}

// ---------------------------------------------------------------------------
// Mount helper
// ---------------------------------------------------------------------------

interface MountOptions {
  projects?: Project[]
  tasks?: Task[]
  projectsLoading?: boolean
  tasksLoading?: boolean
  tasksError?: string | null
}

function mountView({
  projects = [makeProject()],
  tasks = [],
  projectsLoading = false,
  tasksLoading = false,
  tasksError = null,
}: MountOptions = {}) {
  // tasksByProject keyed by project id
  const tasksByProject: Record<number, Task[]> = { 10: tasks }

  return mount(ProjectDetailView, {
    global: {
      plugins: [
        createTestingPinia({
          stubActions: true,
          initialState: {
            projects: { projects, loading: projectsLoading, error: null },
            tasks: { tasksByProject, loading: tasksLoading, error: tasksError },
          },
        }),
      ],
      stubs,
    },
  })
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('ProjectDetailView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // -------------------------------------------------------------------------
  // Mount behaviour
  // -------------------------------------------------------------------------

  it('calls fetchTasks on mount with the route project id', () => {
    mountView()
    const tasksStore = useTasksStore()
    expect(tasksStore.fetchTasks).toHaveBeenCalledWith(10)
  })

  it('calls fetchProjects on mount when the projects list is empty', () => {
    mountView({ projects: [] })
    const projectsStore = useProjectsStore()
    expect(projectsStore.fetchProjects).toHaveBeenCalledTimes(1)
  })

  it('does not call fetchProjects when projects are already loaded', () => {
    mountView({ projects: [makeProject()] })
    const projectsStore = useProjectsStore()
    expect(projectsStore.fetchProjects).not.toHaveBeenCalled()
  })

  // -------------------------------------------------------------------------
  // Task list rendering
  // -------------------------------------------------------------------------

  it('renders one TaskListItem per non-archived (active) task', () => {
    const tasks = [
      makeTask(1, 'Alpha'),
      makeTask(2, 'Beta'),
      makeTask(3, 'Old', 1), // archived
    ]
    const wrapper = mountView({ tasks })
    const items = wrapper.findAll('.task-list-item-stub')
    expect(items).toHaveLength(2)
  })

  it('renders the correct task names', () => {
    const tasks = [makeTask(1, 'Alpha'), makeTask(2, 'Beta')]
    const wrapper = mountView({ tasks })
    const names = wrapper.findAll('.task-list-item-stub').map(el => el.attributes('data-name'))
    expect(names).toContain('Alpha')
    expect(names).toContain('Beta')
  })

  // -------------------------------------------------------------------------
  // Empty state
  // -------------------------------------------------------------------------

  it('shows the empty state when there are no active tasks', () => {
    const wrapper = mountView({ tasks: [] })
    expect(wrapper.find('.project-detail__empty').exists()).toBe(true)
    expect(wrapper.find('.project-detail__empty-text').text()).toBe('No tasks yet')
  })

  it('does not show the empty state when active tasks exist', () => {
    const wrapper = mountView({ tasks: [makeTask(1, 'Alpha')] })
    expect(wrapper.find('.project-detail__empty').exists()).toBe(false)
  })

  // -------------------------------------------------------------------------
  // Dialog interaction
  // -------------------------------------------------------------------------

  it('opens TaskFormDialog when "New Task" button is clicked', async () => {
    const wrapper = mountView({ tasks: [makeTask(1, 'Alpha')] })

    // Dialog is not visible initially
    expect(wrapper.find('.task-form-dialog-stub').attributes('data-visible')).toBe('false')

    const newTaskBtn = wrapper.findAll('.btn-stub').find(b => b.attributes('data-label') === 'New Task')
    await newTaskBtn!.trigger('click')
    await nextTick()

    expect(wrapper.find('.task-form-dialog-stub').attributes('data-visible')).toBe('true')
  })

  it('opens TaskFormDialog when "New Task" is clicked in empty state', async () => {
    const wrapper = mountView({ tasks: [] })

    expect(wrapper.find('.project-detail__empty').exists()).toBe(true)

    const emptyNewBtn = wrapper.find('.project-detail__empty .btn-stub')
    await emptyNewBtn.trigger('click')
    await nextTick()

    expect(wrapper.find('.task-form-dialog-stub').attributes('data-visible')).toBe('true')
  })

  // -------------------------------------------------------------------------
  // Loading / error states
  // -------------------------------------------------------------------------

  it('shows the loading spinner when tasksStore.loading is true', () => {
    const wrapper = mountView({ tasksLoading: true })
    expect(wrapper.find('.progress-spinner-stub').exists()).toBe(true)
  })

  it('shows an error message when tasksStore.error is set', () => {
    const wrapper = mountView({ tasksError: 'DB failure' })
    expect(wrapper.find('.message-stub').exists()).toBe(true)
    expect(wrapper.find('.message-stub').text()).toContain('DB failure')
  })

  // -------------------------------------------------------------------------
  // Project not found
  // -------------------------------------------------------------------------

  it('shows a "Project not found" message when the project is not in the store', () => {
    // Empty projects list so id 10 won't be found; loading must be false
    const wrapper = mountView({ projects: [] })
    // fetchProjects is stubbed, so loading stays false; project will be null
    // The view shows "Project not found" only when !loading && !project
    // With stubActions:true, loading stays at its initial value (false)
    expect(wrapper.find('.message-stub').exists()).toBe(true)
  })

  // -------------------------------------------------------------------------
  // Delete confirmation
  // -------------------------------------------------------------------------

  it('calls confirm.require when the delete event is emitted by TaskListItem', async () => {
    const tasks = [makeTask(1, 'Alpha')]
    const wrapper = mountView({ tasks })

    await wrapper.findComponent({ name: 'TaskListItem' }).vm.$emit('delete', 1)

    expect(mockConfirmRequire).toHaveBeenCalledTimes(1)
    expect(mockConfirmRequire).toHaveBeenCalledWith(
      expect.objectContaining({ accept: expect.any(Function) }),
    )
  })

  it('calls tasksStore.deleteTask with the task id when confirm accept fires', async () => {
    const tasks = [makeTask(5, 'Beta')]
    const wrapper = mountView({ tasks })

    await wrapper.findComponent({ name: 'TaskListItem' }).vm.$emit('delete', 5)

    const tasksStore = useTasksStore()
    const acceptFn = mockConfirmRequire.mock.calls[0][0].accept as () => Promise<void>
    await acceptFn()

    expect(tasksStore.deleteTask).toHaveBeenCalledWith(5)
  })
})
