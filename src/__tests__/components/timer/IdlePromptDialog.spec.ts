import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import IdlePromptDialog from '../../../components/timer/IdlePromptDialog.vue'

/**
 * Stub Dialog so tests run without PrimeVue plugin in jsdom.
 * The stub renders its header and footer slots and the default slot.
 */
const DialogStub = {
  name: 'Dialog',
  props: ['visible', 'header', 'closable', 'modal', 'draggable', 'style'],
  emits: ['update:visible'],
  template: `
    <div v-if="visible" class="dialog-stub">
      <div class="dialog-header">{{ header }}</div>
      <div class="dialog-content"><slot /></div>
      <div class="dialog-footer"><slot name="footer" /></div>
    </div>
  `,
}

const ButtonStub = {
  name: 'Button',
  props: ['label', 'severity'],
  emits: ['click'],
  template: `<button class="button-stub" :data-severity="severity" @click="$emit('click')">{{ label }}</button>`,
}

function mountDialog(props: { visible: boolean; idleSeconds: number }) {
  return mount(IdlePromptDialog, {
    props,
    global: {
      stubs: {
        Dialog: DialogStub,
        Button: ButtonStub,
      },
    },
  })
}

describe('IdlePromptDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('is not rendered when visible is false', () => {
    const wrapper = mountDialog({ visible: false, idleSeconds: 360 })
    expect(wrapper.find('.dialog-stub').exists()).toBe(false)
  })

  it('renders when visible is true', () => {
    const wrapper = mountDialog({ visible: true, idleSeconds: 360 })
    expect(wrapper.find('.dialog-stub').exists()).toBe(true)
  })

  it('shows the idle duration in minutes', () => {
    // 420 seconds = 7 minutes
    const wrapper = mountDialog({ visible: true, idleSeconds: 420 })
    const message = wrapper.find('.idle-message')
    expect(message.text()).toContain('7 minutes')
  })

  it('uses singular "minute" for exactly 60 seconds', () => {
    const wrapper = mountDialog({ visible: true, idleSeconds: 60 })
    const message = wrapper.find('.idle-message')
    expect(message.text()).toMatch(/1 minute[^s]/)
  })

  it('renders the dialog header with correct title', () => {
    const wrapper = mountDialog({ visible: true, idleSeconds: 300 })
    expect(wrapper.find('.dialog-header').text()).toBe("You've been idle")
  })

  it('renders three action buttons', () => {
    const wrapper = mountDialog({ visible: true, idleSeconds: 300 })
    const buttons = wrapper.findAll('.button-stub')
    expect(buttons).toHaveLength(3)
  })

  it('Keep time button emits keep and update:visible=false', async () => {
    const wrapper = mountDialog({ visible: true, idleSeconds: 300 })
    const buttons = wrapper.findAll('.button-stub')
    const keepBtn = buttons.find((b) => b.text() === 'Keep time')
    expect(keepBtn).toBeDefined()
    await keepBtn!.trigger('click')
    expect(wrapper.emitted('keep')).toHaveLength(1)
    expect(wrapper.emitted('update:visible')).toEqual([[false]])
  })

  it('Discard idle time button emits discard and update:visible=false', async () => {
    const wrapper = mountDialog({ visible: true, idleSeconds: 300 })
    const buttons = wrapper.findAll('.button-stub')
    const discardBtn = buttons.find((b) => b.text() === 'Discard idle time')
    expect(discardBtn).toBeDefined()
    await discardBtn!.trigger('click')
    expect(wrapper.emitted('discard')).toHaveLength(1)
    expect(wrapper.emitted('update:visible')).toEqual([[false]])
  })

  it('Stop timer button emits stop and update:visible=false', async () => {
    const wrapper = mountDialog({ visible: true, idleSeconds: 300 })
    const buttons = wrapper.findAll('.button-stub')
    const stopBtn = buttons.find((b) => b.text() === 'Stop timer')
    expect(stopBtn).toBeDefined()
    await stopBtn!.trigger('click')
    expect(wrapper.emitted('stop')).toHaveLength(1)
    expect(wrapper.emitted('update:visible')).toEqual([[false]])
  })

  it('Keep time button has secondary severity', () => {
    const wrapper = mountDialog({ visible: true, idleSeconds: 300 })
    const buttons = wrapper.findAll('.button-stub')
    const keepBtn = buttons.find((b) => b.text() === 'Keep time')
    expect(keepBtn!.attributes('data-severity')).toBe('secondary')
  })

  it('Discard idle time button has warning severity', () => {
    const wrapper = mountDialog({ visible: true, idleSeconds: 300 })
    const buttons = wrapper.findAll('.button-stub')
    const discardBtn = buttons.find((b) => b.text() === 'Discard idle time')
    expect(discardBtn!.attributes('data-severity')).toBe('warning')
  })

  it('Stop timer button has danger severity', () => {
    const wrapper = mountDialog({ visible: true, idleSeconds: 300 })
    const buttons = wrapper.findAll('.button-stub')
    const stopBtn = buttons.find((b) => b.text() === 'Stop timer')
    expect(stopBtn!.attributes('data-severity')).toBe('danger')
  })

  it('rounds idle seconds to nearest minute for display', async () => {
    // 380 seconds = 6.33 minutes → rounds to 6
    const wrapper = mountDialog({ visible: true, idleSeconds: 380 })
    await nextTick()
    expect(wrapper.find('.idle-message').text()).toContain('6 minutes')
  })

  it('shows at least 1 minute even for very small idle values', () => {
    // 30 seconds is less than a minute — should show "1 minute"
    const wrapper = mountDialog({ visible: true, idleSeconds: 30 })
    expect(wrapper.find('.idle-message').text()).toContain('1 minute')
  })
})
