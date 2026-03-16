import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { defineComponent, nextTick } from 'vue'
import { setActivePinia, createPinia } from 'pinia'
import { useTimerStore } from '../../stores/timer'
import { useTimer } from '../../composables/useTimer'

// Mock the tauriApi so the timer store can be instantiated without Tauri
vi.mock('../../services/tauriApi', () => ({
  api: {
    getActiveTimer: vi.fn(),
    startTimer: vi.fn(),
    stopTimer: vi.fn(),
  },
}))

/**
 * Mount a minimal component that calls useTimer() so that the composable's
 * Vue lifecycle hooks (watch + onUnmounted) are properly wired up.
 */
function mountWithTimer() {
  const TestComponent = defineComponent({
    setup() {
      const { elapsedSeconds } = useTimer()
      return { elapsedSeconds }
    },
    template: '<div>{{ elapsedSeconds }}</div>',
  })

  return mount(TestComponent, {
    global: {
      plugins: [createPinia()],
    },
  })
}

describe('useTimer', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    setActivePinia(createPinia())
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('elapsedSeconds starts at 0 when isRunning is false', () => {
    const wrapper = mountWithTimer()
    expect(wrapper.vm.elapsedSeconds).toBe(0)
  })

  it('elapsedSeconds increments each second when isRunning becomes true', async () => {
    const wrapper = mountWithTimer()
    const store = useTimerStore()

    // Set startedAt to "now" and flip isRunning — the watcher fires synchronously
    store.startedAt = new Date(Date.now()).toISOString()
    store.isRunning = true
    await nextTick()

    // Advance 3 seconds; three ticks should fire
    vi.advanceTimersByTime(3000)
    await nextTick()

    expect(wrapper.vm.elapsedSeconds).toBeGreaterThanOrEqual(3)
  })

  it('elapsedSeconds reflects wall-clock elapsed time from startedAt', async () => {
    const wrapper = mountWithTimer()
    const store = useTimerStore()

    // startedAt is 10s in the past
    store.startedAt = new Date(Date.now() - 10_000).toISOString()
    store.isRunning = true
    await nextTick()

    // After the immediate tick, value should already reflect the 10s head-start
    expect(wrapper.vm.elapsedSeconds).toBeGreaterThanOrEqual(10)
  })

  it('elapsedSeconds resets to 0 when isRunning becomes false', async () => {
    const wrapper = mountWithTimer()
    const store = useTimerStore()

    store.startedAt = new Date(Date.now() - 5_000).toISOString()
    store.isRunning = true
    await nextTick()

    expect(wrapper.vm.elapsedSeconds).toBeGreaterThanOrEqual(5)

    store.isRunning = false
    await nextTick()

    expect(wrapper.vm.elapsedSeconds).toBe(0)
  })

  it('interval is cleared on unmount so no ticks fire after', async () => {
    const wrapper = mountWithTimer()
    const store = useTimerStore()

    store.startedAt = new Date(Date.now()).toISOString()
    store.isRunning = true
    await nextTick()

    wrapper.unmount()

    // Capture value right after unmount
    const valueAfterUnmount = wrapper.vm.elapsedSeconds

    // Advance time — value should remain frozen because the interval was cleared
    vi.advanceTimersByTime(5_000)

    expect(wrapper.vm.elapsedSeconds).toBe(valueAfterUnmount)
  })
})
