<template>
  <div class="timer-widget">
    <div v-if="timerStore.isRunning && timerStore.activeEntry" class="timer-running">
      <div class="timer-context">
        <span
          class="project-dot"
          :style="{ backgroundColor: timerStore.activeEntry.projectColor }"
        ></span>
        <div class="timer-context-text">
          <span class="task-name">{{ timerStore.activeEntry.taskName }}</span>
          <span class="project-name">{{ timerStore.activeEntry.projectName }}</span>
        </div>
      </div>
      <div class="elapsed-display">{{ formattedElapsed }}</div>
      <Button
        data-testid="stop-btn"
        label="Stop"
        icon="pi pi-stop-circle"
        severity="danger"
        :loading="stopping"
        @click="handleStop"
        class="stop-btn"
      />
    </div>
    <div v-else class="timer-idle">
      <div class="elapsed-display idle-display">00:00:00</div>
      <Button
        data-testid="start-btn"
        label="Start Timer"
        icon="pi pi-play"
        severity="success"
        :loading="starting"
        :disabled="!selectedTask"
        @click="handleStart"
        class="start-btn"
      />
      <p v-if="!selectedTask" class="hint-text">Select a task above to start tracking</p>
    </div>
    <div v-if="error" class="timer-error">
      <Message severity="error" :closable="true" @close="error = null">{{ error }}</Message>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from "vue";
import Button from "primevue/button";
import Message from "primevue/message";
import { useTimerStore } from "../../stores/timer";
import { useTimer } from "../../composables/useTimer";
import type { Task } from "../../types/index";

const props = defineProps<{
  selectedTask: Task | null;
}>();

const timerStore = useTimerStore();
const { elapsedSeconds } = useTimer();

const starting = ref(false);
const stopping = ref(false);
const error = ref<string | null>(null);

const formattedElapsed = computed(() => {
  const total = elapsedSeconds.value;
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return [h, m, s].map((v) => String(v).padStart(2, "0")).join(":");
});

async function handleStart() {
  if (!props.selectedTask) return;
  starting.value = true;
  error.value = null;
  try {
    await timerStore.startTimer({ taskId: props.selectedTask.id });
  } catch (e) {
    error.value = String(e);
  } finally {
    starting.value = false;
  }
}

async function handleStop() {
  stopping.value = true;
  error.value = null;
  try {
    await timerStore.stopTimer();
  } catch (e) {
    error.value = String(e);
  } finally {
    stopping.value = false;
  }
}
</script>

<style scoped>
.timer-widget {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1.25rem;
  padding: 1.5rem;
}

.timer-running,
.timer-idle {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  width: 100%;
}

.timer-context {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.project-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  flex-shrink: 0;
}

.timer-context-text {
  display: flex;
  flex-direction: column;
  line-height: 1.3;
  text-align: left;
}

.task-name {
  font-size: 1rem;
  font-weight: 600;
}

.project-name {
  font-size: 0.8rem;
  color: var(--p-text-muted-color, #6b7280);
}

.elapsed-display {
  font-size: 3rem;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  letter-spacing: 0.05em;
  font-family: monospace;
}

.idle-display {
  color: var(--p-text-muted-color, #9ca3af);
}

.stop-btn,
.start-btn {
  min-width: 140px;
}

.hint-text {
  font-size: 0.8rem;
  color: var(--p-text-muted-color, #6b7280);
  margin: 0;
  text-align: center;
}

.timer-error {
  width: 100%;
}
</style>
