<template>
  <nav class="sidebar-nav">
    <div class="sidebar-header">
      <span class="sidebar-title">TimeTracker</span>
    </div>

    <ul class="nav-list">
      <li v-for="item in navItems" :key="item.path">
        <RouterLink
          :to="item.path"
          class="nav-item"
          :class="{ 'nav-item--active': isActive(item.path, item.exact) }"
          :data-testid="item.testId"
        >
          <i :class="item.icon" class="nav-item__icon" />
          <span class="nav-item__label">{{ item.label }}</span>
        </RouterLink>
      </li>
    </ul>
  </nav>
</template>

<script setup lang="ts">
import { RouterLink, useRoute } from 'vue-router'

const route = useRoute()

interface NavItem {
  path: string
  label: string
  icon: string
  testId: string
  exact?: boolean
}

const navItems: NavItem[] = [
  { path: '/', label: 'Dashboard', icon: 'pi pi-home', testId: 'nav-dashboard', exact: true },
  { path: '/projects', label: 'Projects', icon: 'pi pi-folder', testId: 'nav-projects' },
  { path: '/entries', label: 'Entries', icon: 'pi pi-list', testId: 'nav-entries' },
  { path: '/reports', label: 'Reports', icon: 'pi pi-chart-bar', testId: 'nav-reports' },
]

function isActive(path: string, exact = false): boolean {
  if (exact) {
    return route.path === path
  }
  return route.path === path || route.path.startsWith(path + '/')
}
</script>

<style scoped>
.sidebar-nav {
  display: flex;
  flex-direction: column;
  width: 220px;
  min-width: 220px;
  height: 100%;
  background-color: var(--p-surface-100);
  border-right: 1px solid var(--p-surface-200);
  padding: 0;
}

.sidebar-header {
  display: flex;
  align-items: center;
  padding: 1.25rem 1rem;
  border-bottom: 1px solid var(--p-surface-200);
}

.sidebar-title {
  font-size: 1.125rem;
  font-weight: 700;
  color: var(--p-primary-color);
  letter-spacing: -0.01em;
}

.nav-list {
  list-style: none;
  margin: 0;
  padding: 0.5rem 0;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 0.625rem;
  padding: 0.625rem 1rem;
  margin: 0.125rem 0.5rem;
  border-radius: var(--p-border-radius-md, 6px);
  color: var(--p-text-color);
  text-decoration: none;
  font-size: 0.9rem;
  font-weight: 500;
  transition: background-color 0.15s, color 0.15s;
  cursor: pointer;
}

.nav-item:hover {
  background-color: var(--p-surface-200);
  color: var(--p-primary-color);
}

.nav-item--active {
  background-color: var(--p-primary-50, var(--p-surface-200));
  color: var(--p-primary-color);
  font-weight: 600;
}

.nav-item__icon {
  font-size: 1rem;
  width: 1.25rem;
  text-align: center;
  flex-shrink: 0;
}

.nav-item__label {
  flex: 1;
}
</style>
