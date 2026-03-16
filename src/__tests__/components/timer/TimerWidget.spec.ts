import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import { createTestingPinia } from '@pinia/testing'
import { useTimerStore } from '../../../stores/timer'
import TimerWidget from '../../../components/timer/TimerWidget.vue'
import type { Task, ActiveTimer } from '../../../types/index'

// tauriApi is mocked so no real Tauri IPC is called
vi.mock('../../../services/tauriApi', () => ({
  api: {
    getActiveTimer: vi.fn(),
    startTimer: vi.fn(),
    stopTimer: vi.fn(),
  },
}))

// useTimer composable is mocked to remove the setInterval dependency
vi.mock('../../../composables/useTimer', () => ({
  useTimer: vi.fn(() => ({ elapsedSeconds: { value: 0 } })),
}))

const fakeTask: Task = {
  id: 10,
  projectId: 5,
  name: 'Write tests',
  archived: 0,
  createdAt: '2026-03-10T00:00:00Z',
  updatedAt: '2026-03-10T00:00:00Z',
}

const fakeActiveEntry: ActiveTimer = {
  entryId: 1,
  taskId: 10,
  taskName: 'Write tests',
  projectId: 5,
  projectName: 'TimeTracker',
  projectColor: '#6366f1',
  startTime: '2026-03-10T08:00:00Z',
}

const commonStubs = {
  Button: {
    props: ['label', 'icon', 'severity', 'loading', 'disabled'],
    emits: ['click'],
    template: `<button
      :data-testid="$attrs['data-testid']"
      :data-label="label"
      :disabled="disabled"
      class="btn-stub"
      @click="$emit('click')"
    >{{ label }}</button>`,
  },
  Message: {
    props: ['severity', 'closable'],
    emits: ['close'],
    template: `<div class="message-stub"><slot /></div>`,
  },
}

function mountWidget(
  timerState: Partial<{ isRunning: boolean; activeEntry: ActiveTimer | null }> = {},
  selectedTask: Task | null = null,
) {
  return mount(TimerWidget, {
    props: { selectedTask },
    global: {
      plugins: [
        createTestingPinia({
          stubActions: true,
          initialState: {
            timer: {
              isRunning: timerState.isRunning ?? false,
              activeEntry: timerState.activeEntry ?? null,
              startedAt: timerState.activeEntry?.startTime ?? null,
            },
          },
        }),
      ],
      stubs: commonStubs,
    },
  })
}

describe('TimerWidget', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // -------------------------------------------------------------------------
  // Idle state (not running)
  // -------------------------------------------------------------------------

  it('renders formatted time "00:00:00" when not running', () => {
    const wrapper = mountWidget({ isRunning: false })
    expect(wrapper.find('.idle-display').text()).toBe('00:00:00')
  })

  it('renders the start button when not running', () => {
    const wrapper = mountWidget({ isRunning: false })
    expect(wrapper.find('[data-testid="start-btn"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="stop-btn"]').exists()).toBe(false)
  })

  it('start button is disabled when no task is selected', () => {
    const wrapper = mountWidget({ isRunning: false }, null)
    const startBtn = wrapper.find('[data-testid="start-btn"]')
    expect(startBtn.attributes('disabled')).toBeDefined()
  })

  it('start button is enabled when a task is selected', () => {
    const wrapper = mountWidget({ isRunning: false }, fakeTask)
    const startBtn = wrapper.find('[data-testid="start-btn"]')
    expect(startBtn.attributes('disabled')).toBeUndefined()
  })

  it('shows hint text when no task is selected', () => {
    const wrapper = mountWidget({ isRunning: false }, null)
    expect(wrapper.find('.hint-text').exists()).toBe(true)
  })

  it('does not show hint text when a task is selected', () => {
    const wrapper = mountWidget({ isRunning: false }, fakeTask)
    expect(wrapper.find('.hint-text').exists()).toBe(false)
  })

  // -------------------------------------------------------------------------
  // Running state
  // -------------------------------------------------------------------------

  it('renders the stop button with data-testid="stop-btn" when running', () => {
    const wrapper = mountWidget({ isRunning: true, activeEntry: fakeActiveEntry })
    expect(wrapper.find('[data-testid="stop-btn"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="start-btn"]').exists()).toBe(false)
  })

  it('shows the task name when timer is running', () => {
    const wrapper = mountWidget({ isRunning: true, activeEntry: fakeActiveEntry })
    expect(wrapper.find('.task-name').text()).toBe('Write tests')
  })

  it('shows the project name when timer is running', () => {
    const wrapper = mountWidget({ isRunning: true, activeEntry: fakeActiveEntry })
    expect(wrapper.find('.project-name').text()).toBe('TimeTracker')
  })

  // -------------------------------------------------------------------------
  // Interactions
  // -------------------------------------------------------------------------

  it('clicking stop button calls timerStore.stopTimer()', async () => {
    const wrapper = mountWidget({ isRunning: true, activeEntry: fakeActiveEntry })
    const store = useTimerStore()

    await wrapper.find('[data-testid="stop-btn"]').trigger('click')
    await nextTick()

    expect(store.stopTimer).toHaveBeenCalledTimes(1)
  })

  it('clicking start button calls timerStore.startTimer() with the selected task id', async () => {
    const wrapper = mountWidget({ isRunning: false }, fakeTask)
    const store = useTimerStore()

    await wrapper.find('[data-testid="start-btn"]').trigger('click')
    await nextTick()

    expect(store.startTimer).toHaveBeenCalledWith({ taskId: fakeTask.id })
  })
})
