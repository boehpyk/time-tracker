import { onMounted, onUnmounted } from 'vue'
import { useTimerStore } from '../stores/timer'

/**
 * Registers global keyboard shortcuts for the application.
 *
 * Ctrl+Space — toggle the running timer:
 *   - If the timer is running, stop it.
 *   - If the timer is not running, do nothing (starting requires a task
 *     selection that lives at the DashboardView level, not globally).
 *
 * Must be called inside a component setup() (e.g. App.vue) so that
 * onMounted/onUnmounted lifecycle hooks are available.
 */
export function useKeyboardShortcuts(): void {
  const timerStore = useTimerStore()

  function handleKeydown(event: KeyboardEvent): void {
    if (event.ctrlKey && event.code === 'Space') {
      event.preventDefault()
      if (timerStore.isRunning) {
        timerStore.stopTimer().catch(() => {
          // Swallow errors — this is a best-effort global shortcut
        })
      }
    }
  }

  onMounted(() => {
    document.addEventListener('keydown', handleKeydown)
  })

  onUnmounted(() => {
    document.removeEventListener('keydown', handleKeydown)
  })
}
