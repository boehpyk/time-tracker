import { watch, onUnmounted } from "vue";
import { useTimerStore } from "../stores/timer";
import { api } from "../services/tauriApi";

export interface UseIdleDetectionOptions {
  /** Number of seconds of idle time before onIdleDetected is called. Default: 300 (5 minutes). */
  thresholdSeconds?: number;
  /** Called once when idle time first exceeds the threshold. Not called again until the dialog is dismissed and idle drops below threshold. */
  onIdleDetected: (idleSeconds: number) => void;
}

/**
 * Polls the system idle time every 30 seconds while the timer is running.
 * When idle time exceeds `thresholdSeconds`, calls `onIdleDetected` once.
 * Resets after the callback so it can fire again on the next separate idle period.
 */
export function useIdleDetection(options: UseIdleDetectionOptions): void {
  const { thresholdSeconds = 300, onIdleDetected } = options;
  const timerStore = useTimerStore();

  let interval: ReturnType<typeof setInterval> | null = null;
  // Track whether we have already fired the callback for the current idle stretch,
  // so we do not repeatedly call onIdleDetected every 30s while the dialog is open.
  let firedForCurrentStretch = false;

  async function poll(): Promise<void> {
    try {
      const idleSeconds = await api.getIdleSeconds();
      if (idleSeconds >= thresholdSeconds && !firedForCurrentStretch) {
        firedForCurrentStretch = true;
        onIdleDetected(idleSeconds);
      } else if (idleSeconds < thresholdSeconds) {
        // User became active again — allow the callback to fire on the next idle stretch.
        firedForCurrentStretch = false;
      }
    } catch {
      // Any error is silently swallowed; the backend returns Ok(0) on errors, but
      // be defensive against unexpected JS-layer failures too.
    }
  }

  function startPolling(): void {
    if (interval !== null) return;
    firedForCurrentStretch = false;
    interval = setInterval(() => {
      void poll();
    }, 30_000);
  }

  function stopPolling(): void {
    if (interval !== null) {
      clearInterval(interval);
      interval = null;
    }
  }

  watch(
    () => timerStore.isRunning,
    (running) => {
      if (running) {
        startPolling();
      } else {
        stopPolling();
      }
    },
    { immediate: true }
  );

  onUnmounted(() => {
    stopPolling();
  });
}
