import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { defineComponent, nextTick } from 'vue'
import { createTestingPinia } from '@pinia/testing'
import { useTimerStore } from '../../stores/timer'
import { useKeyboardShortcuts } from '../../composables/useKeyboardShortcuts'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Mount a minimal wrapper component that calls useKeyboardShortcuts() so that
 * onMounted/onUnmounted lifecycle hooks fire correctly.
 */
function mountWrapper(timerState: { isRunning: boolean } = { isRunning: false }) {
  const WrapperComponent = defineComponent({
    setup() {
      useKeyboardShortcuts()
    },
    template: '<div />',
  })

  return mount(WrapperComponent, {
    global: {
      plugins: [
        createTestingPinia({
          stubActions: false,
          initialState: {
            timer: {
              isRunning: timerState.isRunning,
              activeEntry: null,
              startedAt: null,
            },
          },
        }),
      ],
    },
  })
}

/**
 * Fire a keyboard event on document with the given properties.
 */
function fireKeydown(code: string, options: Partial<KeyboardEventInit> = {}) {
  const event = new KeyboardEvent('keydown', {
    code,
    bubbles: true,
    cancelable: true,
    ...options,
  })
  document.dispatchEvent(event)
  return event
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('useKeyboardShortcuts', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('calls stopTimer when Ctrl+Space is pressed and timer is running', async () => {
    const wrapper = mountWrapper({ isRunning: true })
    await nextTick()

    const timerStore = useTimerStore()
    vi.spyOn(timerStore, 'stopTimer').mockResolvedValue()

    fireKeydown('Space', { ctrlKey: true })
    await nextTick()

    expect(timerStore.stopTimer).toHaveBeenCalledTimes(1)
    wrapper.unmount()
  })

  it('does not call stopTimer when Ctrl+Space is pressed and timer is not running', async () => {
    const wrapper = mountWrapper({ isRunning: false })
    await nextTick()

    const timerStore = useTimerStore()
    vi.spyOn(timerStore, 'stopTimer').mockResolvedValue()

    fireKeydown('Space', { ctrlKey: true })
    await nextTick()

    expect(timerStore.stopTimer).not.toHaveBeenCalled()
    wrapper.unmount()
  })

  it('does not call stopTimer for Space without Ctrl', async () => {
    const wrapper = mountWrapper({ isRunning: true })
    await nextTick()

    const timerStore = useTimerStore()
    vi.spyOn(timerStore, 'stopTimer').mockResolvedValue()

    fireKeydown('Space', { ctrlKey: false })
    await nextTick()

    expect(timerStore.stopTimer).not.toHaveBeenCalled()
    wrapper.unmount()
  })

  it('does not call stopTimer for Ctrl + other key', async () => {
    const wrapper = mountWrapper({ isRunning: true })
    await nextTick()

    const timerStore = useTimerStore()
    vi.spyOn(timerStore, 'stopTimer').mockResolvedValue()

    fireKeydown('KeyK', { ctrlKey: true })
    await nextTick()

    expect(timerStore.stopTimer).not.toHaveBeenCalled()
    wrapper.unmount()
  })

  it('prevents default browser action when Ctrl+Space is pressed', async () => {
    const wrapper = mountWrapper({ isRunning: true })
    await nextTick()

    const timerStore = useTimerStore()
    vi.spyOn(timerStore, 'stopTimer').mockResolvedValue()

    const event = new KeyboardEvent('keydown', {
      code: 'Space',
      bubbles: true,
      cancelable: true,
      ctrlKey: true,
    })
    const preventDefaultSpy = vi.spyOn(event, 'preventDefault')
    document.dispatchEvent(event)
    await nextTick()

    expect(preventDefaultSpy).toHaveBeenCalledTimes(1)
    wrapper.unmount()
  })

  it('removes the keydown listener when the component is unmounted', async () => {
    const wrapper = mountWrapper({ isRunning: true })
    await nextTick()

    const timerStore = useTimerStore()
    vi.spyOn(timerStore, 'stopTimer').mockResolvedValue()

    wrapper.unmount()
    await nextTick()

    // After unmount the listener should have been removed — no further calls
    fireKeydown('Space', { ctrlKey: true })
    await nextTick()

    expect(timerStore.stopTimer).not.toHaveBeenCalled()
  })
})
