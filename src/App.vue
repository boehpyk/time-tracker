<template>
  <AppShell />
  <Toast position="bottom-right" />
  <ConfirmDialog />
  <IdlePromptDialog
    v-model:visible="idleDialogVisible"
    :idle-seconds="currentIdleSeconds"
    @keep="onIdleKeep"
    @discard="onIdleDiscard"
    @stop="onIdleStop"
  />
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch } from 'vue'
import AppShell from './components/layout/AppShell.vue'
import Toast from 'primevue/toast'
import ConfirmDialog from 'primevue/confirmdialog'
import IdlePromptDialog from './components/timer/IdlePromptDialog.vue'
import { useTimerStore } from './stores/timer'
import { api } from './services/tauriApi'
import { useIdleDetection } from './composables/useIdleDetection'
import { useKeyboardShortcuts } from './composables/useKeyboardShortcuts'

const timerStore = useTimerStore()

const idleDialogVisible = ref(false)
const currentIdleSeconds = ref(0)

// Global keyboard shortcuts (e.g. Ctrl+Space to stop the timer).
useKeyboardShortcuts()

// Wire up idle detection. The composable starts/stops polling based on isRunning.
useIdleDetection({
  thresholdSeconds: 300,
  onIdleDetected(idleSeconds: number) {
    currentIdleSeconds.value = idleSeconds
    idleDialogVisible.value = true
  },
})

async function onIdleKeep(): Promise<void> {
  idleDialogVisible.value = false
}

async function onIdleDiscard(): Promise<void> {
  try {
    await api.discardIdleTime(currentIdleSeconds.value)
    await timerStore.fetchActiveTimer()
  } catch (err) {
    console.error('Failed to discard idle time:', err)
  } finally {
    idleDialogVisible.value = false
  }
}

async function onIdleStop(): Promise<void> {
  try {
    await timerStore.stopTimer()
  } catch (err) {
    console.error('Failed to stop timer from idle prompt:', err)
  } finally {
    idleDialogVisible.value = false
  }
}

let unlistenTrayToggle: (() => void) | null = null
let trayUpdateInterval: ReturnType<typeof setInterval> | null = null

onMounted(async () => {
  // Restore timer state after app restart
  await timerStore.fetchActiveTimer()

  // Listen for tray toggle event
  unlistenTrayToggle = await api.listenTrayToggle(async () => {
    if (timerStore.isRunning) {
      await timerStore.stopTimer()
      if (trayUpdateInterval) {
        clearInterval(trayUpdateInterval)
        trayUpdateInterval = null
      }
      await api.updateTrayState('Start Timer', false)
    } else {
      // No task is selected at the app shell level — log a warning and do nothing
      console.warn('tray-toggle-timer: no active task selected, cannot start timer from tray')
    }
  })
})

// Keep tray label in sync whenever the timer starts or stops from the UI.
watch(() => timerStore.isRunning, (running) => {
  if (running) {
    startTraySync()
  } else {
    if (trayUpdateInterval) {
      clearInterval(trayUpdateInterval)
      trayUpdateInterval = null
    }
  }
})

onUnmounted(() => {
  if (unlistenTrayToggle) {
    unlistenTrayToggle()
    unlistenTrayToggle = null
  }
  if (trayUpdateInterval) {
    clearInterval(trayUpdateInterval)
    trayUpdateInterval = null
  }
})

function startTraySync(): void {
  if (trayUpdateInterval) return
  trayUpdateInterval = setInterval(async () => {
    if (timerStore.isRunning && timerStore.activeEntry) {
      const label = `${timerStore.activeEntry.taskName} — running`
      await api.updateTrayState(label, true)
    } else {
      if (trayUpdateInterval) {
        clearInterval(trayUpdateInterval)
        trayUpdateInterval = null
      }
    }
  }, 60_000)
}
</script>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

html,
body {
  height: 100%;
  font-family: var(--p-font-family, sans-serif);
}

#app {
  height: 100%;
}
</style>
