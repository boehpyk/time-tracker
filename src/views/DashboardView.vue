<template>
  <div class="dashboard-view">
    <h1 class="page-title">Dashboard</h1>

    <div class="dashboard-content">
      <Card class="timer-card">
        <template #title>
          <div class="card-title">
            <i class="pi pi-clock"></i>
            <span>{{ timerStore.isRunning ? "Timer Running" : "Start Tracking" }}</span>
          </div>
        </template>
        <template #content>
          <div v-if="loading" class="state-loading">
            <ProgressSpinner style="width: 40px; height: 40px" />
            <span>Loading timer state...</span>
          </div>
          <div v-else>
            <div v-if="!timerStore.isRunning" class="task-select-section">
              <label class="select-label">Select a task to track</label>
              <TaskSelector @select="onTaskSelected" />
            </div>
            <TimerWidget :selected-task="selectedTask" />
          </div>
        </template>
      </Card>

      <Card v-if="timerStore.isRunning && timerStore.activeEntry" class="active-info-card">
        <template #title>
          <div class="card-title">
            <i class="pi pi-info-circle"></i>
            <span>Currently Tracking</span>
          </div>
        </template>
        <template #content>
          <div class="active-info">
            <div class="info-row">
              <span class="info-label">Task</span>
              <span class="info-value">{{ timerStore.activeEntry.taskName }}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Project</span>
              <span class="info-value project-value">
                <span
                  class="project-dot"
                  :style="{ backgroundColor: timerStore.activeEntry.projectColor }"
                ></span>
                {{ timerStore.activeEntry.projectName }}
              </span>
            </div>
            <div class="info-row">
              <span class="info-label">Started at</span>
              <span class="info-value">{{ formattedStartTime }}</span>
            </div>
          </div>
        </template>
      </Card>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import Card from "primevue/card";
import ProgressSpinner from "primevue/progressspinner";
import { useTimerStore } from "../stores/timer";
import TimerWidget from "../components/timer/TimerWidget.vue";
import TaskSelector from "../components/timer/TaskSelector.vue";
import type { Task } from "../types/index";

const timerStore = useTimerStore();
const selectedTask = ref<Task | null>(null);
const loading = ref(true);

function onTaskSelected(task: Task) {
  selectedTask.value = task;
}

const formattedStartTime = computed(() => {
  if (!timerStore.activeEntry?.startTime) return "";
  const d = new Date(timerStore.activeEntry.startTime);
  return d.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
});

onMounted(async () => {
  try {
    await timerStore.fetchActiveTimer();
  } finally {
    loading.value = false;
  }
});
</script>

<style scoped>
.dashboard-view {
  padding: 1.5rem;
  max-width: 900px;
  margin: 0 auto;
}

.page-title {
  font-size: 1.5rem;
  font-weight: 700;
  margin-bottom: 1.5rem;
  margin-top: 0;
}

.dashboard-content {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.timer-card,
.active-info-card {
  width: 100%;
}

.card-title {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 1rem;
  font-weight: 600;
}

.state-loading {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem 0;
  color: var(--p-text-muted-color, #6b7280);
}

.task-select-section {
  margin-bottom: 1rem;
}

.select-label {
  display: block;
  font-size: 0.85rem;
  font-weight: 500;
  margin-bottom: 0.5rem;
  color: var(--p-text-muted-color, #6b7280);
}

.active-info {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.info-row {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.info-label {
  font-size: 0.8rem;
  font-weight: 500;
  color: var(--p-text-muted-color, #6b7280);
  min-width: 80px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.info-value {
  font-size: 0.95rem;
  font-weight: 500;
}

.project-value {
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

.project-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
}
</style>
