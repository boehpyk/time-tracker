import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { createRouter, createMemoryHistory } from 'vue-router'
import SidebarNav from '../../../components/layout/SidebarNav.vue'

/**
 * Build a minimal router with memory history so RouterLink works in jsdom.
 * We define stubs for the actual view components — SidebarNav only cares
 * about the paths, not the page content.
 */
function makeRouter(initialPath: string = '/') {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', component: { template: '<div />' } },
      { path: '/projects', component: { template: '<div />' } },
      { path: '/projects/:id', component: { template: '<div />' } },
      { path: '/entries', component: { template: '<div />' } },
      { path: '/reports', component: { template: '<div />' } },
    ],
  })
  router.push(initialPath)
  return router
}

async function mountSidebar(path: string = '/') {
  const router = makeRouter(path)
  await router.isReady()
  return mount(SidebarNav, {
    global: { plugins: [router] },
  })
}

describe('SidebarNav', () => {
  describe('rendered nav links', () => {
    it('renders a link to Dashboard (/)', async () => {
      const wrapper = await mountSidebar('/')
      const links = wrapper.findAll('a')
      const labels = links.map((l) => l.text())
      expect(labels).toContain('Dashboard')
    })

    it('renders a link to Projects (/projects)', async () => {
      const wrapper = await mountSidebar('/')
      const links = wrapper.findAll('a')
      const labels = links.map((l) => l.text())
      expect(labels).toContain('Projects')
    })

    it('renders a link to Entries (/entries)', async () => {
      const wrapper = await mountSidebar('/')
      const links = wrapper.findAll('a')
      const labels = links.map((l) => l.text())
      expect(labels).toContain('Entries')
    })

    it('renders a link to Reports (/reports)', async () => {
      const wrapper = await mountSidebar('/')
      const links = wrapper.findAll('a')
      const labels = links.map((l) => l.text())
      expect(labels).toContain('Reports')
    })

    it('renders exactly 4 nav links', async () => {
      const wrapper = await mountSidebar('/')
      expect(wrapper.findAll('a').length).toBe(4)
    })

    it('renders the app title TimeTracker', async () => {
      const wrapper = await mountSidebar('/')
      expect(wrapper.find('.sidebar-title').text()).toBe('TimeTracker')
    })
  })

  describe('active state — Dashboard (exact match)', () => {
    it('marks Dashboard as active when route is exactly /', async () => {
      const wrapper = await mountSidebar('/')
      const dashboardLink = wrapper.findAll('a').find((l) => l.text() === 'Dashboard')
      expect(dashboardLink?.classes()).toContain('nav-item--active')
    })

    it('does not mark Dashboard as active when route is /projects', async () => {
      const wrapper = await mountSidebar('/projects')
      const dashboardLink = wrapper.findAll('a').find((l) => l.text() === 'Dashboard')
      expect(dashboardLink?.classes()).not.toContain('nav-item--active')
    })

    it('does not mark Dashboard as active when route is /entries', async () => {
      const wrapper = await mountSidebar('/entries')
      const dashboardLink = wrapper.findAll('a').find((l) => l.text() === 'Dashboard')
      expect(dashboardLink?.classes()).not.toContain('nav-item--active')
    })
  })

  describe('active state — Projects (prefix match)', () => {
    it('marks Projects as active when route is exactly /projects', async () => {
      const wrapper = await mountSidebar('/projects')
      const projectsLink = wrapper.findAll('a').find((l) => l.text() === 'Projects')
      expect(projectsLink?.classes()).toContain('nav-item--active')
    })

    it('marks Projects as active when route is /projects/123', async () => {
      const wrapper = await mountSidebar('/projects/123')
      const projectsLink = wrapper.findAll('a').find((l) => l.text() === 'Projects')
      expect(projectsLink?.classes()).toContain('nav-item--active')
    })

    it('does not mark Projects as active when route is /', async () => {
      const wrapper = await mountSidebar('/')
      const projectsLink = wrapper.findAll('a').find((l) => l.text() === 'Projects')
      expect(projectsLink?.classes()).not.toContain('nav-item--active')
    })
  })

  describe('active state — Entries and Reports', () => {
    it('marks Entries as active when route is /entries', async () => {
      const wrapper = await mountSidebar('/entries')
      const entriesLink = wrapper.findAll('a').find((l) => l.text() === 'Entries')
      expect(entriesLink?.classes()).toContain('nav-item--active')
    })

    it('marks Reports as active when route is /reports', async () => {
      const wrapper = await mountSidebar('/reports')
      const reportsLink = wrapper.findAll('a').find((l) => l.text() === 'Reports')
      expect(reportsLink?.classes()).toContain('nav-item--active')
    })

    it('does not mark Entries as active when on /reports', async () => {
      const wrapper = await mountSidebar('/reports')
      const entriesLink = wrapper.findAll('a').find((l) => l.text() === 'Entries')
      expect(entriesLink?.classes()).not.toContain('nav-item--active')
    })
  })

  describe('icon rendering', () => {
    it('renders pi-home icon for Dashboard', async () => {
      const wrapper = await mountSidebar('/')
      const dashboardItem = wrapper.findAll('li').find((li) => li.text().includes('Dashboard'))
      expect(dashboardItem?.find('i').classes()).toContain('pi-home')
    })

    it('renders pi-folder icon for Projects', async () => {
      const wrapper = await mountSidebar('/')
      const projectsItem = wrapper.findAll('li').find((li) => li.text().includes('Projects'))
      expect(projectsItem?.find('i').classes()).toContain('pi-folder')
    })
  })
})
