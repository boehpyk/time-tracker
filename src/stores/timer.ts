import { defineStore } from "pinia";
import { ref } from "vue";
import { api } from "../services/tauriApi";
import type { ActiveTimer, StartTimerPayload } from "../types/index";

export const useTimerStore = defineStore("timer", () => {
  const activeEntry = ref<ActiveTimer | null>(null);
  const isRunning = ref(false);
  const startedAt = ref<string | null>(null);

  async function fetchActiveTimer(): Promise<void> {
    const timer = await api.getActiveTimer();
    if (timer) {
      activeEntry.value = timer;
      isRunning.value = true;
      startedAt.value = timer.startTime;
    } else {
      activeEntry.value = null;
      isRunning.value = false;
      startedAt.value = null;
    }
  }

  async function startTimer(payload: StartTimerPayload): Promise<void> {
    await api.startTimer(payload.taskId, payload.notes);
    await fetchActiveTimer();
  }

  async function stopTimer(): Promise<void> {
    await api.stopTimer();
    activeEntry.value = null;
    isRunning.value = false;
    startedAt.value = null;
  }

  return { activeEntry, isRunning, startedAt, fetchActiveTimer, startTimer, stopTimer };
});
