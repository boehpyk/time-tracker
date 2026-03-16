import { ref, watch, onUnmounted } from "vue";
import { useTimerStore } from "../stores/timer";

export function useTimer() {
  const timerStore = useTimerStore();
  const elapsedSeconds = ref(0);
  let interval: ReturnType<typeof setInterval> | null = null;

  function tick() {
    if (!timerStore.startedAt) return;
    elapsedSeconds.value = Math.floor(
      (Date.now() - new Date(timerStore.startedAt).getTime()) / 1000
    );
  }

  function startInterval() {
    tick();
    interval = setInterval(tick, 1000);
  }

  function clearCurrentInterval() {
    if (interval !== null) {
      clearInterval(interval);
      interval = null;
    }
  }

  watch(
    () => timerStore.isRunning,
    (running) => {
      if (running) {
        startInterval();
      } else {
        clearCurrentInterval();
        elapsedSeconds.value = 0;
      }
    },
    { immediate: true }
  );

  onUnmounted(() => {
    clearCurrentInterval();
  });

  return { elapsedSeconds };
}
