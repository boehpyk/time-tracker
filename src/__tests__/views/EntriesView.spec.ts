import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { nextTick, h, provide, inject, defineComponent } from 'vue'
import { createTestingPinia } from '@pinia/testing'
import EntriesView from '../../views/EntriesView.vue'
import type { EntryWithContext } from '../../types/index'

// ---------------------------------------------------------------------------
// Module-level mocks
// ---------------------------------------------------------------------------

vi.mock('../../services/tauriApi', () => ({
  api: {
    getEntries: vi.fn(),
    deleteEntry: vi.fn(),
    updateEntry: vi.fn(),
    getProjects: vi.fn(),
  },
}))

vi.mock('primevue/usetoast', () => ({
  useToast: () => ({ add: vi.fn() }),
}))

const confirmRequireMock = vi.fn()
vi.mock('primevue/useconfirm', () => ({
  useConfirm: () => ({ require: confirmRequireMock }),
}))

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

import { api } from '../../services/tauriApi'

function makeEntry(id: number, overrides: Partial<EntryWithContext> = {}): EntryWithContext {
  return {
    id,
    taskId: 10,
    taskName: 'Task ' + id,
    projectId: 1,
    projectName: 'Project Alpha',
    projectColor: '#6366f1',
    startTime: '2026-03-10T09:00:00Z',
    endTime: '2026-03-10T10:00:00Z',
    notes: 'Some notes',
    archived: 0,
    createdAt: '2026-03-10T09:00:00Z',
    updatedAt: '2026-03-10T10:00:00Z',
    ...overrides,
  }
}

// ---------------------------------------------------------------------------
// Stubs
//
// The challenge: PrimeVue's DataTable renders each row and calls Column's
// #body scoped slot with { data: row }.  Replicating this in a stub requires
// passing per-row data down through two levels of slots.
//
// Strategy: use Vue's provide/inject.
//   - DataTableStub provides ROW_DATA_KEY once per row inside a RowProvider
//     wrapper component.
//   - ColumnStub injects ROW_DATA_KEY and passes it to its own #body scoped
//     slot so that EntriesView's <template #body="{ data }"> templates work.
//
// The RowProvider is defined OUTSIDE DataTableStub so Vue treats it as a
// stable component definition (not a new component every render cycle), which
// ensures inject() resolves from the correct provider ancestor.
// ---------------------------------------------------------------------------

const ROW_DATA_KEY = Symbol('dt-row-data')

// RowProvider: provides the row data and renders the shared Column slot tree.
const RowProvider = defineComponent({
  name: 'RowProvider',
  props: {
    row: { type: Object, required: true },
    rowId: { type: Number, required: true },
  },
  setup(props, { slots }) {
    provide(ROW_DATA_KEY, props.row)
    return () =>
      h(
        'div',
        { class: 'datatable-row', 'data-id': String(props.rowId) },
        slots.default ? slots.default() : [],
      )
  },
})

// ColumnStub: injects the row and calls #body slot with { data: row }.
const ColumnStub = defineComponent({
  name: 'ColumnStub',
  props: {
    field: String,
    header: String,
    // accept Object as well as String for the style prop
    style: [String, Object],
  },
  setup(_, { slots }) {
    return () => {
      const rowData = inject(ROW_DATA_KEY, undefined)
      return h(
        'div',
        { class: 'column-stub' },
        slots.body ? slots.body({ data: rowData }) : [],
      )
    }
  },
})

// DataTableStub: loops over `value` and renders a RowProvider per row.
const DataTableStub = defineComponent({
  name: 'DataTableStub',
  props: {
    value: { type: Array, default: (): EntryWithContext[] => [] },
    loading: { type: Boolean, default: false },
    stripedRows: Boolean,
  },
  setup(props, { slots }) {
    return () => {
      const rows = (props.value ?? []) as EntryWithContext[]
      let body: ReturnType<typeof h>[]

      if (rows.length > 0) {
        body = rows.map((row) =>
          h(RowProvider, { row, rowId: row.id }, { default: slots.default })
        )
      } else {
        body = slots.empty ? slots.empty({}) : []
      }

      return h(
        'div',
        { class: 'datatable-stub', 'data-loading': String(props.loading) },
        body,
      )
    }
  },
})

const stubs = {
  DataTable: DataTableStub,
  Column: ColumnStub,
  Button: {
    props: ['label', 'icon', 'severity', 'size', 'rounded', 'text', 'disabled', 'loading', 'iconPos'],
    emits: ['click'],
    template: `<button class="btn-stub" :data-label="label" :data-icon="icon" :disabled="disabled" @click="$emit('click', $event)">{{ label }}</button>`,
  },
  Select: {
    props: ['modelValue', 'options', 'optionLabel', 'optionValue', 'placeholder', 'showClear'],
    emits: ['update:modelValue', 'change'],
    template: `<select class="select-stub"></select>`,
  },
  DatePicker: {
    props: ['modelValue', 'dateFormat', 'placeholder', 'showClear'],
    emits: ['update:modelValue'],
    template: `<input class="datepicker-stub" type="text" />`,
  },
  Message: {
    props: ['severity', 'closable'],
    template: `<div class="message-stub"><slot /></div>`,
  },
  Tag: {
    props: ['value', 'severity'],
    template: `<span class="tag-stub">{{ value }}</span>`,
  },
  EntryEditDialog: {
    props: ['visible', 'entry'],
    emits: ['saved', 'close', 'update:visible'],
    template: `<div class="entry-edit-dialog-stub" :data-visible="visible" :data-entry-id="entry && entry.id" />`,
  },
  ToggleSwitch: {
    props: ['modelValue'],
    emits: ['update:modelValue', 'change'],
    template: `<input type="checkbox" class="toggleswitch-stub" :checked="modelValue" @change="$emit('update:modelValue', $event.target.checked); $emit('change')" />`,
  },
}

function mountView(initialState: Record<string, unknown> = {}) {
  return mount(EntriesView, {
    global: {
      plugins: [
        createTestingPinia({
          stubActions: true,
          initialState: {
            projects: { projects: [], loading: false, error: null },
            ...initialState,
          },
        }),
      ],
      stubs,
    },
  })
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('EntriesView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // -------------------------------------------------------------------------
  // Mount / initial load
  // -------------------------------------------------------------------------

  it('calls api.getEntries on mount with default limit and offset', async () => {
    vi.mocked(api.getEntries).mockResolvedValue([])
    mountView()
    await flushPromises()
    expect(api.getEntries).toHaveBeenCalledTimes(1)
    expect(api.getEntries).toHaveBeenCalledWith(
      expect.objectContaining({ limit: 20, offset: 0 }),
    )
  })

  // -------------------------------------------------------------------------
  // Rendering rows
  // -------------------------------------------------------------------------

  it('renders one datatable row per entry returned from api', async () => {
    const entries = [makeEntry(1), makeEntry(2), makeEntry(3)]
    vi.mocked(api.getEntries).mockResolvedValue(entries)
    const wrapper = mountView()
    await flushPromises()
    const rows = wrapper.findAll('.datatable-row')
    expect(rows).toHaveLength(3)
  })

  // -------------------------------------------------------------------------
  // Empty state
  // -------------------------------------------------------------------------

  it('shows the empty state when api returns no entries', async () => {
    vi.mocked(api.getEntries).mockResolvedValue([])
    const wrapper = mountView()
    await flushPromises()
    expect(wrapper.find('.empty-state').exists()).toBe(true)
  })

  it('does not show empty state when entries are returned', async () => {
    vi.mocked(api.getEntries).mockResolvedValue([makeEntry(1)])
    const wrapper = mountView()
    await flushPromises()
    expect(wrapper.find('.empty-state').exists()).toBe(false)
  })

  // -------------------------------------------------------------------------
  // Loading state
  // -------------------------------------------------------------------------

  it('sets data-loading="true" on the DataTable while the fetch is in progress', async () => {
    vi.mocked(api.getEntries).mockReturnValue(new Promise(() => {}))
    const wrapper = mountView()
    // onMounted is async so we need two ticks: one for the mount lifecycle
    // to complete and one for the reactive loading=true update to flush.
    await nextTick()
    await nextTick()
    expect(wrapper.find('.datatable-stub').attributes('data-loading')).toBe('true')
  })

  it('sets data-loading="false" after the fetch resolves', async () => {
    vi.mocked(api.getEntries).mockResolvedValue([])
    const wrapper = mountView()
    await flushPromises()
    expect(wrapper.find('.datatable-stub').attributes('data-loading')).toBe('false')
  })

  // -------------------------------------------------------------------------
  // Error state
  // -------------------------------------------------------------------------

  it('shows error message when api.getEntries rejects', async () => {
    vi.mocked(api.getEntries).mockRejectedValue(new Error('DB connection failed'))
    const wrapper = mountView()
    await flushPromises()
    expect(wrapper.find('.message-stub').exists()).toBe(true)
    expect(wrapper.find('.message-stub').text()).toContain('DB connection failed')
  })

  it('does not show error message on successful fetch', async () => {
    vi.mocked(api.getEntries).mockResolvedValue([makeEntry(1)])
    const wrapper = mountView()
    await flushPromises()
    expect(wrapper.find('.message-stub').exists()).toBe(false)
  })

  // -------------------------------------------------------------------------
  // Delete flow
  // -------------------------------------------------------------------------

  it('calls confirm.require when the delete button is clicked', async () => {
    vi.mocked(api.getEntries).mockResolvedValue([makeEntry(1)])
    const wrapper = mountView()
    await flushPromises()

    const deleteBtn = wrapper.findAll('.btn-stub').find(
      (b) => b.attributes('data-icon') === 'pi pi-trash',
    )
    expect(deleteBtn).toBeDefined()
    await deleteBtn!.trigger('click')
    expect(confirmRequireMock).toHaveBeenCalledTimes(1)
  })

  it('calls api.deleteEntry when confirm accept callback is invoked', async () => {
    const entry = makeEntry(42)
    vi.mocked(api.getEntries).mockResolvedValue([entry])
    vi.mocked(api.deleteEntry).mockResolvedValue(undefined)
    const wrapper = mountView()
    await flushPromises()

    const deleteBtn = wrapper.findAll('.btn-stub').find(
      (b) => b.attributes('data-icon') === 'pi pi-trash',
    )
    await deleteBtn!.trigger('click')

    const callArg = confirmRequireMock.mock.calls[0][0]
    expect(typeof callArg.accept).toBe('function')

    await callArg.accept()
    expect(api.deleteEntry).toHaveBeenCalledWith(42)
  })

  it('reloads entries after a successful delete', async () => {
    const entry = makeEntry(7)
    vi.mocked(api.getEntries).mockResolvedValue([entry])
    vi.mocked(api.deleteEntry).mockResolvedValue(undefined)
    const wrapper = mountView()
    await flushPromises()

    expect(api.getEntries).toHaveBeenCalledTimes(1)

    const deleteBtn = wrapper.findAll('.btn-stub').find(
      (b) => b.attributes('data-icon') === 'pi pi-trash',
    )
    await deleteBtn!.trigger('click')
    const { accept } = confirmRequireMock.mock.calls[0][0]
    await accept()
    await flushPromises()

    expect(api.getEntries).toHaveBeenCalledTimes(2)
  })

  // -------------------------------------------------------------------------
  // Edit flow
  // -------------------------------------------------------------------------

  it('opens EntryEditDialog when the edit button is clicked', async () => {
    vi.mocked(api.getEntries).mockResolvedValue([makeEntry(5)])
    const wrapper = mountView()
    await flushPromises()

    expect(wrapper.find('.entry-edit-dialog-stub').attributes('data-visible')).toBe('false')

    const editBtn = wrapper.findAll('.btn-stub').find(
      (b) => b.attributes('data-icon') === 'pi pi-pencil',
    )
    expect(editBtn).toBeDefined()
    await editBtn!.trigger('click')
    await nextTick()

    expect(wrapper.find('.entry-edit-dialog-stub').attributes('data-visible')).toBe('true')
    expect(wrapper.find('.entry-edit-dialog-stub').attributes('data-entry-id')).toBe('5')
  })

  it('reloads entries when EntryEditDialog emits "saved"', async () => {
    vi.mocked(api.getEntries).mockResolvedValue([makeEntry(5)])
    const wrapper = mountView()
    await flushPromises()

    expect(api.getEntries).toHaveBeenCalledTimes(1)

    const editBtn = wrapper.findAll('.btn-stub').find(
      (b) => b.attributes('data-icon') === 'pi pi-pencil',
    )
    await editBtn!.trigger('click')
    await nextTick()

    // Emit a Vue component event (not a DOM event) so that EntriesView's
    // @saved listener fires.
    wrapper.findComponent(stubs.EntryEditDialog).vm.$emit('saved')
    await flushPromises()

    expect(api.getEntries).toHaveBeenCalledTimes(2)
  })

  it('closes EntryEditDialog when it emits "close"', async () => {
    vi.mocked(api.getEntries).mockResolvedValue([makeEntry(5)])
    const wrapper = mountView()
    await flushPromises()

    const editBtn = wrapper.findAll('.btn-stub').find(
      (b) => b.attributes('data-icon') === 'pi pi-pencil',
    )
    await editBtn!.trigger('click')
    await nextTick()
    expect(wrapper.find('.entry-edit-dialog-stub').attributes('data-visible')).toBe('true')

    // Emit the Vue close event on the stub component instance.
    wrapper.findComponent(stubs.EntryEditDialog).vm.$emit('close')
    await nextTick()
    expect(wrapper.find('.entry-edit-dialog-stub').attributes('data-visible')).toBe('false')
  })
})
