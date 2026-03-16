<template>
  <div class="app-shell">
    <SidebarNav />
    <main class="app-main">
      <RouterView />
    </main>
  </div>
</template>

<script setup lang="ts">
import { RouterView } from 'vue-router'
import SidebarNav from './SidebarNav.vue'
</script>

<style scoped>
.app-shell {
  display: flex;
  height: 100vh;
  width: 100vw;
  overflow: hidden;
}

.app-main {
  flex: 1;
  overflow-y: auto;
  padding: 1.5rem;
  background-color: var(--p-surface-0);
}
</style>
