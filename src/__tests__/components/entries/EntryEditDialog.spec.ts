import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import EntryEditDialog from '../../../components/entries/EntryEditDialog.vue'
import type { EntryWithContext } from '../../../types/index'

// ---------------------------------------------------------------------------
// Module-level mocks
// ---------------------------------------------------------------------------

vi.mock('../../../services/tauriApi', () => ({
  api: {
    updateEntry: vi.fn(),
  },
}))

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

import { api } from '../../../services/tauriApi'

function makeEntry(overrides: Partial<EntryWithContext> = {}): EntryWithContext {
  return {
    id: 1,
    taskId: 10,
    taskName: 'My Task',
    projectId: 1,
    projectName: 'My Project',
    projectColor: '#6366f1',
    startTime: '2026-03-10T09:00:00Z',
    endTime: '2026-03-10T10:00:00Z',
    notes: 'Pre-filled notes',
    archived: 0,
    createdAt: '2026-03-10T09:00:00Z',
    updatedAt: '2026-03-10T10:00:00Z',
    ...overrides,
  }
}

/**
 * Minimal stubs for PrimeVue components to avoid needing the plugin tree.
 */
const stubs = {
  Dialog: {
    props: ['visible', 'modal', 'header', 'style'],
    emits: ['update:visible'],
    template: `
      <div class="dialog-stub" :data-visible="visible">
        <slot />
      </div>
    `,
  },
  InputText: {
    props: ['modelValue', 'invalid', 'placeholder', 'fluid'],
    emits: ['update:modelValue'],
    template: `<input class="input-text-stub" :value="modelValue" :placeholder="placeholder" @input="$emit('update:modelValue', $event.target.value)" />`,
  },
  Textarea: {
    props: ['modelValue', 'rows', 'autoResize', 'fluid'],
    emits: ['update:modelValue'],
    template: `<textarea class="textarea-stub" :value="modelValue" @input="$emit('update:modelValue', $event.target.value)" />`,
  },
  Button: {
    props: ['type', 'label', 'severity', 'loading', 'disabled'],
    emits: ['click'],
    template: `<button class="btn-stub" :type="type || 'button'" :data-label="label" :disabled="disabled || loading" @click="$emit('click')">{{ label }}</button>`,
  },
  Message: {
    props: ['severity', 'closable'],
    template: `<div class="message-stub"><slot /></div>`,
  },
}

function mountDialog(visible: boolean, entry: EntryWithContext | null = null) {
  return mount(EntryEditDialog, {
    props: { visible, entry },
    global: { stubs },
    attachTo: document.body,
  })
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('EntryEditDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // -------------------------------------------------------------------------
  // Visibility
  // -------------------------------------------------------------------------

  it('renders nothing meaningful when visible is false', () => {
    const wrapper = mountDialog(false, makeEntry())
    // The dialog stub renders with data-visible="false"
    expect(wrapper.find('.dialog-stub').attributes('data-visible')).toBe('false')
  })

  it('renders the dialog content when visible is true', () => {
    const wrapper = mountDialog(true, makeEntry())
    expect(wrapper.find('.dialog-stub').attributes('data-visible')).toBe('true')
  })

  // -------------------------------------------------------------------------
  // Pre-filled form values
  // -------------------------------------------------------------------------

  it('pre-fills the start time input from the entry prop', async () => {
    const entry = makeEntry({ startTime: '2026-03-10T09:00:00Z' })
    const wrapper = mountDialog(true, entry)
    await nextTick()
    const startInput = wrapper.find('#entry-start-time')
    expect((startInput.element as HTMLInputElement).value).toBe('2026-03-10T09:00:00Z')
  })

  it('pre-fills the end time input from the entry prop', async () => {
    const entry = makeEntry({ endTime: '2026-03-10T10:30:00Z' })
    const wrapper = mountDialog(true, entry)
    await nextTick()
    const endInput = wrapper.find('#entry-end-time')
    expect((endInput.element as HTMLInputElement).value).toBe('2026-03-10T10:30:00Z')
  })

  it('pre-fills the notes textarea from the entry prop', async () => {
    const entry = makeEntry({ notes: 'My pre-filled note' })
    const wrapper = mountDialog(true, entry)
    await nextTick()
    const textarea = wrapper.find('#entry-notes')
    expect((textarea.element as HTMLTextAreaElement).value).toBe('My pre-filled note')
  })

  it('leaves end time blank when entry has no endTime', async () => {
    const entry = makeEntry({ endTime: undefined })
    const wrapper = mountDialog(true, entry)
    await nextTick()
    const endInput = wrapper.find('#entry-end-time')
    expect((endInput.element as HTMLInputElement).value).toBe('')
  })

  // -------------------------------------------------------------------------
  // Successful submit
  // -------------------------------------------------------------------------

  it('calls api.updateEntry on submit with the correct payload', async () => {
    const entry = makeEntry({ id: 99, startTime: '2026-03-10T09:00:00Z', endTime: '2026-03-10T10:00:00Z', notes: 'Test note' })
    vi.mocked(api.updateEntry).mockResolvedValue({
      id: 99,
      taskId: 10,
      startTime: '2026-03-10T09:00:00Z',
      endTime: '2026-03-10T10:00:00Z',
      notes: 'Test note',
      archived: 0,
      createdAt: '2026-03-10T09:00:00Z',
      updatedAt: '2026-03-10T10:00:00Z',
    })
    const wrapper = mountDialog(true, entry)
    await nextTick()

    await wrapper.find('form').trigger('submit')
    await nextTick()

    expect(api.updateEntry).toHaveBeenCalledWith({
      id: 99,
      startTime: '2026-03-10T09:00:00Z',
      endTime: '2026-03-10T10:00:00Z',
      notes: 'Test note',
    })
  })

  it('emits "saved" after a successful update', async () => {
    const entry = makeEntry()
    vi.mocked(api.updateEntry).mockResolvedValue({
      id: entry.id,
      taskId: entry.taskId,
      startTime: entry.startTime,
      endTime: entry.endTime,
      archived: 0,
      createdAt: entry.createdAt,
      updatedAt: entry.updatedAt,
    })
    const wrapper = mountDialog(true, entry)
    await nextTick()

    await wrapper.find('form').trigger('submit')
    await nextTick()

    expect(wrapper.emitted('saved')).toBeTruthy()
  })

  it('emits "close" after a successful update', async () => {
    const entry = makeEntry()
    vi.mocked(api.updateEntry).mockResolvedValue({
      id: entry.id,
      taskId: entry.taskId,
      startTime: entry.startTime,
      endTime: entry.endTime,
      archived: 0,
      createdAt: entry.createdAt,
      updatedAt: entry.updatedAt,
    })
    const wrapper = mountDialog(true, entry)
    await nextTick()

    await wrapper.find('form').trigger('submit')
    await nextTick()

    expect(wrapper.emitted('close')).toBeTruthy()
  })

  // -------------------------------------------------------------------------
  // Cancel button
  // -------------------------------------------------------------------------

  it('emits "close" when the Cancel button is clicked', async () => {
    const wrapper = mountDialog(true, makeEntry())
    await nextTick()

    const cancelBtn = wrapper.findAll('.btn-stub').find(
      (b) => b.attributes('data-label') === 'Cancel',
    )
    expect(cancelBtn).toBeDefined()
    await cancelBtn!.trigger('click')

    expect(wrapper.emitted('close')).toBeTruthy()
    expect(api.updateEntry).not.toHaveBeenCalled()
  })

  // -------------------------------------------------------------------------
  // Validation: start_time required
  // -------------------------------------------------------------------------

  it('shows a validation error and does not call api when start_time is empty', async () => {
    const entry = makeEntry({ startTime: '2026-03-10T09:00:00Z' })
    const wrapper = mountDialog(true, entry)
    await nextTick()

    // Clear the start time field
    const startInput = wrapper.find('#entry-start-time')
    await startInput.setValue('')
    await nextTick()

    await wrapper.find('form').trigger('submit')
    await nextTick()

    expect(api.updateEntry).not.toHaveBeenCalled()
    // The error small tag should be visible
    const errorMsg = wrapper.findAll('small.p-error')
    expect(errorMsg.length).toBeGreaterThan(0)
    expect(errorMsg[0].text()).toContain('Start time is required')
  })

  // -------------------------------------------------------------------------
  // Validation: end_time before start_time
  // -------------------------------------------------------------------------

  it('shows a validation error when end_time is before start_time', async () => {
    const entry = makeEntry({
      startTime: '2026-03-10T10:00:00Z',
      endTime: '2026-03-10T09:00:00Z', // end before start
    })
    const wrapper = mountDialog(true, entry)
    await nextTick()

    await wrapper.find('form').trigger('submit')
    await nextTick()

    expect(api.updateEntry).not.toHaveBeenCalled()
    const errorMsgs = wrapper.findAll('small.p-error')
    const endError = errorMsgs.find((e) => e.text().includes('End time must be after'))
    expect(endError).toBeDefined()
  })

  it('does not show end_time validation error when end_time is after start_time', async () => {
    const entry = makeEntry({
      startTime: '2026-03-10T09:00:00Z',
      endTime: '2026-03-10T10:00:00Z',
    })
    vi.mocked(api.updateEntry).mockResolvedValue({
      id: entry.id,
      taskId: entry.taskId,
      startTime: entry.startTime,
      endTime: entry.endTime,
      archived: 0,
      createdAt: entry.createdAt,
      updatedAt: entry.updatedAt,
    })
    const wrapper = mountDialog(true, entry)
    await nextTick()

    await wrapper.find('form').trigger('submit')
    await nextTick()

    const endErrors = wrapper.findAll('small.p-error').filter((e) =>
      e.text().includes('End time must be after'),
    )
    expect(endErrors).toHaveLength(0)
  })

  // -------------------------------------------------------------------------
  // API error handling
  // -------------------------------------------------------------------------

  it('shows a submit error message when api.updateEntry rejects', async () => {
    const entry = makeEntry()
    vi.mocked(api.updateEntry).mockRejectedValue(new Error('Timestamp in the future'))
    const wrapper = mountDialog(true, entry)
    await nextTick()

    await wrapper.find('form').trigger('submit')
    await nextTick()

    expect(wrapper.find('.message-stub').exists()).toBe(true)
    expect(wrapper.find('.message-stub').text()).toContain('Timestamp in the future')
  })

  it('does not emit "saved" when api.updateEntry rejects', async () => {
    const entry = makeEntry()
    vi.mocked(api.updateEntry).mockRejectedValue(new Error('Network error'))
    const wrapper = mountDialog(true, entry)
    await nextTick()

    await wrapper.find('form').trigger('submit')
    await nextTick()

    expect(wrapper.emitted('saved')).toBeFalsy()
  })
})
