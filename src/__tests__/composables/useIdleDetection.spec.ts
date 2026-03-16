import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { defineComponent, nextTick } from 'vue'
import { setActivePinia, createPinia } from 'pinia'
import { useTimerStore } from '../../stores/timer'
import { useIdleDetection } from '../../composables/useIdleDetection'

// Mock tauriApi so the composable can be tested without Tauri runtime
vi.mock('../../services/tauriApi', () => ({
  api: {
    getActiveTimer: vi.fn(),
    startTimer: vi.fn(),
    stopTimer: vi.fn(),
    getIdleSeconds: vi.fn(),
  },
}))

import { api } from '../../services/tauriApi'
const getIdleSecondsMock = vi.mocked(api.getIdleSeconds)

/**
 * Mount a minimal component that calls useIdleDetection so that Vue lifecycle
 * hooks (watch + onUnmounted) are properly wired.
 */
function mountWithIdleDetection(onIdleDetected: (s: number) => void, threshold = 300) {
  const TestComponent = defineComponent({
    setup() {
      useIdleDetection({ thresholdSeconds: threshold, onIdleDetected })
    },
    template: '<div />',
  })

  return mount(TestComponent, {
    global: { plugins: [createPinia()] },
  })
}

describe('useIdleDetection', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    setActivePinia(createPinia())
    vi.clearAllMocks()
    getIdleSecondsMock.mockResolvedValue(0)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('does not start polling when isRunning is false', async () => {
    const onIdleDetected = vi.fn()
    mountWithIdleDetection(onIdleDetected)

    // Advance well past the 30s poll interval
    vi.advanceTimersByTime(60_000)
    await nextTick()

    expect(getIdleSecondsMock).not.toHaveBeenCalled()
  })

  it('starts polling every 30s when isRunning becomes true', async () => {
    const onIdleDetected = vi.fn()
    const wrapper = mountWithIdleDetection(onIdleDetected)

    const store = useTimerStore()
    store.isRunning = true
    await nextTick()

    // Two 30s intervals = 2 polls
    vi.advanceTimersByTime(60_000)
    // Allow promises in poll() to resolve
    await Promise.resolve()
    await nextTick()

    expect(getIdleSecondsMock).toHaveBeenCalledTimes(2)
    wrapper.unmount()
  })

  it('calls onIdleDetected when idle seconds exceed threshold', async () => {
    const onIdleDetected = vi.fn()
    getIdleSecondsMock.mockResolvedValue(310)

    const wrapper = mountWithIdleDetection(onIdleDetected, 300)

    const store = useTimerStore()
    store.isRunning = true
    await nextTick()

    vi.advanceTimersByTime(30_000)
    await Promise.resolve()
    await nextTick()

    expect(onIdleDetected).toHaveBeenCalledWith(310)
    wrapper.unmount()
  })

  it('does not call onIdleDetected when idle is below threshold', async () => {
    const onIdleDetected = vi.fn()
    getIdleSecondsMock.mockResolvedValue(120)

    const wrapper = mountWithIdleDetection(onIdleDetected, 300)

    const store = useTimerStore()
    store.isRunning = true
    await nextTick()

    vi.advanceTimersByTime(30_000)
    await Promise.resolve()
    await nextTick()

    expect(onIdleDetected).not.toHaveBeenCalled()
    wrapper.unmount()
  })

  it('fires onIdleDetected only once per idle stretch', async () => {
    const onIdleDetected = vi.fn()
    getIdleSecondsMock.mockResolvedValue(350)

    const wrapper = mountWithIdleDetection(onIdleDetected, 300)

    const store = useTimerStore()
    store.isRunning = true
    await nextTick()

    // Advance through three poll intervals — idle stays above threshold
    vi.advanceTimersByTime(30_000)
    await Promise.resolve()
    await nextTick()
    vi.advanceTimersByTime(30_000)
    await Promise.resolve()
    await nextTick()
    vi.advanceTimersByTime(30_000)
    await Promise.resolve()
    await nextTick()

    // Even after three polls, callback fires only once
    expect(onIdleDetected).toHaveBeenCalledTimes(1)
    wrapper.unmount()
  })

  it('allows onIdleDetected to fire again after idle drops below threshold', async () => {
    const onIdleDetected = vi.fn()

    // First poll: over threshold; second poll: under threshold; third: over again
    getIdleSecondsMock
      .mockResolvedValueOnce(350) // fires
      .mockResolvedValueOnce(10)  // resets
      .mockResolvedValueOnce(400) // fires again

    const wrapper = mountWithIdleDetection(onIdleDetected, 300)

    const store = useTimerStore()
    store.isRunning = true
    await nextTick()

    for (let i = 0; i < 3; i++) {
      vi.advanceTimersByTime(30_000)
      await Promise.resolve()
      await nextTick()
    }

    expect(onIdleDetected).toHaveBeenCalledTimes(2)
    wrapper.unmount()
  })

  it('stops polling when isRunning becomes false', async () => {
    const onIdleDetected = vi.fn()
    const wrapper = mountWithIdleDetection(onIdleDetected)

    const store = useTimerStore()
    store.isRunning = true
    await nextTick()

    // One poll
    vi.advanceTimersByTime(30_000)
    await Promise.resolve()
    await nextTick()
    expect(getIdleSecondsMock).toHaveBeenCalledTimes(1)

    // Stop the timer — polling should cease
    store.isRunning = false
    await nextTick()

    vi.advanceTimersByTime(60_000)
    await Promise.resolve()
    await nextTick()

    // Still only 1 call
    expect(getIdleSecondsMock).toHaveBeenCalledTimes(1)
    wrapper.unmount()
  })

  it('stops polling on component unmount', async () => {
    const onIdleDetected = vi.fn()
    const wrapper = mountWithIdleDetection(onIdleDetected)

    const store = useTimerStore()
    store.isRunning = true
    await nextTick()

    vi.advanceTimersByTime(30_000)
    await Promise.resolve()
    await nextTick()
    const callsBeforeUnmount = getIdleSecondsMock.mock.calls.length

    wrapper.unmount()

    vi.advanceTimersByTime(60_000)
    await Promise.resolve()
    await nextTick()

    expect(getIdleSecondsMock).toHaveBeenCalledTimes(callsBeforeUnmount)
  })

  it('silently ignores errors from getIdleSeconds', async () => {
    const onIdleDetected = vi.fn()
    getIdleSecondsMock.mockRejectedValue(new Error('IPC error'))

    const wrapper = mountWithIdleDetection(onIdleDetected, 300)

    const store = useTimerStore()
    store.isRunning = true
    await nextTick()

    // Should not throw
    vi.advanceTimersByTime(30_000)
    await Promise.resolve()
    await nextTick()

    expect(onIdleDetected).not.toHaveBeenCalled()
    wrapper.unmount()
  })
})
