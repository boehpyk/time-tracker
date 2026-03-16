import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import { createTestingPinia } from '@pinia/testing'
import { useTimerStore } from '../../stores/timer'
import DashboardView from '../../views/DashboardView.vue'
import type { ActiveTimer, Task } from '../../types/index'

vi.mock('../../services/tauriApi', () => ({
  api: {
    getActiveTimer: vi.fn(),
    startTimer: vi.fn(),
    stopTimer: vi.fn(),
    getProjects: vi.fn(),
    getTasks: vi.fn(),
  },
}))

// Stub the useTimer composable so interval logic doesn't interfere
vi.mock('../../composables/useTimer', () => ({
  useTimer: vi.fn(() => ({ elapsedSeconds: { value: 0 } })),
}))

const fakeActiveEntry: ActiveTimer = {
  entryId: 1,
  taskId: 10,
  taskName: 'Write tests',
  projectId: 5,
  projectName: 'TimeTracker',
  projectColor: '#6366f1',
  startTime: '2026-03-10T08:00:00Z',
}

const fakeTask: Task = {
  id: 10,
  projectId: 5,
  name: 'Write tests',
  archived: 0,
  createdAt: '2026-03-10T00:00:00Z',
  updatedAt: '2026-03-10T00:00:00Z',
}

/**
 * Shared stubs for child components that rely on PrimeVue plugin or Tauri.
 * TimerWidget and TaskSelector are stubbed to isolate DashboardView logic.
 */
const stubs = {
  Card: {
    template: `<div class="card-stub"><slot name="title" /><slot name="content" /></div>`,
  },
  ProgressSpinner: { template: '<div class="progress-spinner-stub" />' },
  TimerWidget: {
    props: ['selectedTask'],
    template: `<div class="timer-widget-stub" :data-task-id="selectedTask?.id ?? null" />`,
  },
  TaskSelector: {
    emits: ['select'],
    template: `<div class="task-selector-stub" />`,
  },
}

function mountView(
  timerState: Partial<{ isRunning: boolean; activeEntry: ActiveTimer | null; startedAt: string | null }> = {},
) {
  return mount(DashboardView, {
    global: {
      plugins: [
        createTestingPinia({
          stubActions: true,
          initialState: {
            timer: {
              isRunning: timerState.isRunning ?? false,
              activeEntry: timerState.activeEntry ?? null,
              startedAt: timerState.startedAt ?? null,
            },
            projects: { projects: [], loading: false, error: null },
            tasks: { tasksByProject: {}, loading: false, error: null },
          },
        }),
      ],
      stubs,
    },
  })
}

describe('DashboardView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // -------------------------------------------------------------------------
  // Mount behaviour
  // -------------------------------------------------------------------------

  it('calls fetchActiveTimer on mount', () => {
    mountView()
    const store = useTimerStore()
    expect(store.fetchActiveTimer).toHaveBeenCalledTimes(1)
  })

  // -------------------------------------------------------------------------
  // Component presence
  // -------------------------------------------------------------------------

  it('renders TimerWidget', async () => {
    const wrapper = mountView()
    // Let the mount promise resolve (loading -> false)
    await nextTick()
    await nextTick()
    expect(wrapper.find('.timer-widget-stub').exists()).toBe(true)
  })

  it('shows TaskSelector when not running', async () => {
    const wrapper = mountView({ isRunning: false })
    await nextTick()
    await nextTick()
    expect(wrapper.find('.task-selector-stub').exists()).toBe(true)
  })

  it('hides TaskSelector when timer is running', async () => {
    const wrapper = mountView({ isRunning: true, activeEntry: fakeActiveEntry })
    await nextTick()
    await nextTick()
    expect(wrapper.find('.task-selector-stub').exists()).toBe(false)
  })

  // -------------------------------------------------------------------------
  // Active info card
  // -------------------------------------------------------------------------

  it('shows the active info card when timer is running and activeEntry is set', async () => {
    const wrapper = mountView({ isRunning: true, activeEntry: fakeActiveEntry })
    await nextTick()
    await nextTick()
    expect(wrapper.find('.active-info').exists()).toBe(true)
  })

  it('does not show the active info card when timer is not running', async () => {
    const wrapper = mountView({ isRunning: false })
    await nextTick()
    await nextTick()
    expect(wrapper.find('.active-info').exists()).toBe(false)
  })

  it('shows the task name in the active info card', async () => {
    const wrapper = mountView({ isRunning: true, activeEntry: fakeActiveEntry })
    await nextTick()
    await nextTick()
    const infoValues = wrapper.findAll('.info-value')
    const taskValue = infoValues.find((el) => el.text().includes('Write tests'))
    expect(taskValue).toBeDefined()
  })

  it('shows the project name in the active info card', async () => {
    const wrapper = mountView({ isRunning: true, activeEntry: fakeActiveEntry })
    await nextTick()
    await nextTick()
    const infoValues = wrapper.findAll('.info-value')
    const projectValue = infoValues.find((el) => el.text().includes('TimeTracker'))
    expect(projectValue).toBeDefined()
  })

  // -------------------------------------------------------------------------
  // Task selection
  // -------------------------------------------------------------------------

  it('passes the selected task to TimerWidget after TaskSelector emits select', async () => {
    const wrapper = mountView({ isRunning: false })
    await nextTick()
    await nextTick()

    // Simulate TaskSelector emitting the select event via the stub element
    const selector = wrapper.find('.task-selector-stub')
    await selector.trigger('select', fakeTask)

    // Vue test-utils trigger doesn't forward custom event args the same way;
    // use the component instance directly via the wrapper's TaskSelector stub component
    const taskSelectorWrapper = wrapper.findComponent(stubs.TaskSelector)
    await taskSelectorWrapper.vm.$emit('select', fakeTask)
    await nextTick()

    const widget = wrapper.find('.timer-widget-stub')
    expect(widget.attributes('data-task-id')).toBe(String(fakeTask.id))
  })

  // -------------------------------------------------------------------------
  // Page title
  // -------------------------------------------------------------------------

  it('renders the page title "Dashboard"', () => {
    const wrapper = mountView()
    expect(wrapper.find('.page-title').text()).toBe('Dashboard')
  })
})
