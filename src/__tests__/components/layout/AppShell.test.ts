import { describe, it, expect } from 'vitest'
import { shallowMount } from '@vue/test-utils'
import AppShell from '../../../components/layout/AppShell.vue'

/**
 * AppShell is a pure layout component: it renders SidebarNav + RouterView
 * inside a two-column flex shell. There is no store access and no async
 * logic, so we can mount it with global stubs only — no actual router
 * or pinia instance required.
 */
function mountAppShell() {
  return shallowMount(AppShell, {
    global: {
      stubs: {
        RouterView: { template: '<div class="router-view-stub" />' },
        SidebarNav: { name: 'SidebarNav', template: '<nav class="sidebar-nav-stub" />' },
      },
    },
  })
}

describe('AppShell', () => {
  it('renders the .app-shell container', () => {
    const wrapper = mountAppShell()
    expect(wrapper.find('.app-shell').exists()).toBe(true)
  })

  it('renders a SidebarNav component', () => {
    const wrapper = mountAppShell()
    expect(wrapper.findComponent({ name: 'SidebarNav' }).exists()).toBe(true)
  })

  it('renders a RouterView outlet', () => {
    const wrapper = mountAppShell()
    // shallowMount stubs RouterView; find it via our stub selector
    expect(wrapper.find('.router-view-stub').exists()).toBe(true)
  })

  it('renders the .app-main wrapper', () => {
    const wrapper = mountAppShell()
    expect(wrapper.find('.app-main').exists()).toBe(true)
  })

  it('SidebarNav is NOT nested inside .app-main', () => {
    const wrapper = mountAppShell()
    const appMain = wrapper.find('.app-main')
    expect(appMain.find('.sidebar-nav-stub').exists()).toBe(false)
  })

  it('RouterView is nested inside .app-main', () => {
    const wrapper = mountAppShell()
    const appMain = wrapper.find('.app-main')
    expect(appMain.find('.router-view-stub').exists()).toBe(true)
  })
})
