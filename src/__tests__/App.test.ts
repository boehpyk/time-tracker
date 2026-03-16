import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createRouter, createMemoryHistory } from 'vue-router'
import { createTestingPinia } from '@pinia/testing'
import { useTimerStore } from '../stores/timer'
import App from '../App.vue'

// Mock the tauriApi service so all api.* calls are intercepted.
// listenTrayToggle replaces the former direct listen() call.
vi.mock('../services/tauriApi', () => ({
  api: {
    getActiveTimer: vi.fn(),
    startTimer: vi.fn(),
    stopTimer: vi.fn(),
    updateTrayState: vi.fn(),
    listenTrayToggle: vi.fn(),
  },
}))

import { api } from '../services/tauriApi'

const mockApi = vi.mocked(api)

function makeRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [{ path: '/', component: { template: '<div />' } }],
  })
}

/**
 * Mounts App.vue with:
 * - AppShell stubbed to avoid rendering the full layout tree
 * - A testing pinia with real actions (stubActions: false) so fetchActiveTimer
 *   executes and calls through to api.getActiveTimer
 */
function mountApp(timerState: Partial<{ isRunning: boolean }> = {}) {
  return mount(App, {
    global: {
      plugins: [
        makeRouter(),
        createTestingPinia({
          stubActions: false,
          initialState: {
            timer: {
              isRunning: false,
              activeEntry: null,
              startedAt: null,
              ...timerState,
            },
          },
        }),
      ],
      stubs: {
        AppShell: { template: '<div class="app-shell-stub" />' },
      },
    },
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  // Default: listenTrayToggle resolves with a no-op unlisten function.
  mockApi.listenTrayToggle.mockResolvedValue(vi.fn())
  mockApi.getActiveTimer.mockResolvedValue(null)
  mockApi.updateTrayState.mockResolvedValue(undefined)
  mockApi.stopTimer.mockResolvedValue({
    id: 1,
    taskId: 1,
    startTime: '2026-03-10T08:00:00Z',
    endTime: '2026-03-10T09:00:00Z',
    archived: 0,
    createdAt: '2026-03-10T08:00:00Z',
    updatedAt: '2026-03-10T09:00:00Z',
  })
})

// Helper: drain the microtask queue enough for onMounted async work to complete.
async function flush() {
  for (let i = 0; i < 5; i++) {
    await Promise.resolve()
  }
}

describe('App.vue', () => {
  describe('onMounted — timer restoration', () => {
    it('calls api.getActiveTimer on mount', async () => {
      mountApp()
      await flush()
      expect(mockApi.getActiveTimer).toHaveBeenCalledTimes(1)
    })

    it('does not throw when getActiveTimer returns null', async () => {
      mockApi.getActiveTimer.mockResolvedValue(null)
      expect(() => mountApp()).not.toThrow()
      await flush()
      expect(mockApi.getActiveTimer).toHaveBeenCalled()
    })
  })

  describe('onMounted — tray event listener', () => {
    it('registers a listener via api.listenTrayToggle', async () => {
      mountApp()
      await flush()
      expect(mockApi.listenTrayToggle).toHaveBeenCalledWith(expect.any(Function))
    })
  })

  describe('tray-toggle-timer event — timer is running', () => {
    it('calls api.stopTimer when tray event fires and timer is running', async () => {
      let trayCallback: (() => Promise<void>) | null = null
      mockApi.listenTrayToggle.mockImplementation(async (cb) => {
        trayCallback = cb as () => Promise<void>
        return vi.fn()
      })

      mountApp()
      await flush()

      expect(trayCallback).not.toBeNull()

      // Ensure the store reflects a running timer when the callback fires.
      const store = useTimerStore()
      store.isRunning = true

      await trayCallback!()
      await flush()

      expect(mockApi.stopTimer).toHaveBeenCalledTimes(1)
    })

    it('calls api.updateTrayState("Start Timer", false) after stopping', async () => {
      let trayCallback: (() => Promise<void>) | null = null
      mockApi.listenTrayToggle.mockImplementation(async (cb) => {
        trayCallback = cb as () => Promise<void>
        return vi.fn()
      })

      mountApp()
      await flush()

      const store = useTimerStore()
      store.isRunning = true

      await trayCallback!()
      await flush()

      expect(mockApi.updateTrayState).toHaveBeenCalledWith('Start Timer', false)
    })
  })

  describe('tray-toggle-timer event — timer is not running', () => {
    it('does not call api.stopTimer when timer is not running', async () => {
      let trayCallback: (() => Promise<void>) | null = null
      mockApi.listenTrayToggle.mockImplementation(async (cb) => {
        trayCallback = cb as () => Promise<void>
        return vi.fn()
      })

      mountApp({ isRunning: false })
      await flush()

      const store = useTimerStore()
      store.isRunning = false

      await trayCallback!()
      await flush()

      expect(mockApi.stopTimer).not.toHaveBeenCalled()
    })

    it('does not call api.updateTrayState when timer is not running', async () => {
      let trayCallback: (() => Promise<void>) | null = null
      mockApi.listenTrayToggle.mockImplementation(async (cb) => {
        trayCallback = cb as () => Promise<void>
        return vi.fn()
      })

      mountApp({ isRunning: false })
      await flush()

      const store = useTimerStore()
      store.isRunning = false

      await trayCallback!()
      await flush()

      expect(mockApi.updateTrayState).not.toHaveBeenCalled()
    })
  })

  describe('onUnmounted — cleanup', () => {
    it('calls the unlisten function when the component is unmounted', async () => {
      const mockUnlisten = vi.fn()
      mockApi.listenTrayToggle.mockResolvedValue(mockUnlisten)

      const wrapper = mountApp()
      await flush()

      wrapper.unmount()

      expect(mockUnlisten).toHaveBeenCalledTimes(1)
    })
  })
})
