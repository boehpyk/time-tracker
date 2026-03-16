<template>
  <Dialog
    :visible="visible"
    header="You've been idle"
    :closable="false"
    :modal="true"
    :draggable="false"
    style="width: 28rem"
    @update:visible="emit('update:visible', $event)"
  >
    <p class="idle-message">
      You've been idle for {{ idleMinutes }} minute{{ idleMinutes === 1 ? '' : 's' }}.
      What would you like to do with the tracked time?
    </p>

    <template #footer>
      <div class="dialog-actions">
        <Button
          label="Keep time"
          severity="secondary"
          @click="onKeep"
        />
        <Button
          label="Discard idle time"
          severity="warning"
          @click="onDiscard"
        />
        <Button
          label="Stop timer"
          severity="danger"
          @click="onStop"
        />
      </div>
    </template>
  </Dialog>
</template>

<script setup lang="ts">
import { computed } from "vue";
import Dialog from "primevue/dialog";
import Button from "primevue/button";

const props = defineProps<{
  visible: boolean;
  idleSeconds: number;
}>();

const emit = defineEmits<{
  (e: "keep"): void;
  (e: "discard"): void;
  (e: "stop"): void;
  (e: "update:visible", value: boolean): void;
}>();

const idleMinutes = computed(() => Math.max(1, Math.round(props.idleSeconds / 60)));

function onKeep(): void {
  emit("update:visible", false);
  emit("keep");
}

function onDiscard(): void {
  emit("update:visible", false);
  emit("discard");
}

function onStop(): void {
  emit("update:visible", false);
  emit("stop");
}
</script>

<style scoped>
.idle-message {
  margin: 0 0 0.5rem 0;
  line-height: 1.5;
  color: var(--p-text-color, inherit);
}

.dialog-actions {
  display: flex;
  gap: 0.5rem;
  justify-content: flex-end;
  flex-wrap: wrap;
}
</style>
