import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createTestingPinia } from '@pinia/testing'
import ReportsView from '../../views/ReportsView.vue'
import type { ReportData } from '../../types/index'

// ---------------------------------------------------------------------------
// Module-level mocks
// ---------------------------------------------------------------------------

vi.mock('../../services/tauriApi', () => ({
  api: {
    getReport: vi.fn(),
    getProjects: vi.fn(),
    getTasks: vi.fn(),
  },
}))

vi.mock('primevue/usetoast', () => ({
  useToast: () => ({ add: vi.fn() }),
}))

// ---------------------------------------------------------------------------
// Stubs
// ---------------------------------------------------------------------------

const stubs = {
  ReportFilterPanel: {
    props: ['modelValue'],
    emits: ['update:modelValue', 'run'],
    template: `<div class="filter-panel-stub" @click="$emit('run')" />`,
  },
  ReportSummaryTable: {
    props: ['data', 'loading'],
    template: `<div class="summary-table-stub" :data-loading="loading" :data-has-data="!!data" />`,
  },
  ReportDetailTable: {
    props: ['data', 'loading'],
    template: `<div class="detail-table-stub" :data-loading="loading" :data-has-data="!!data" />`,
  },
  ReportExportButton: {
    props: ['filename'],
    template: `<button class="export-button-stub">Export PDF</button>`,
  },
  Message: {
    props: ['severity', 'closable'],
    template: `<div class="message-stub"><slot /></div>`,
  },
}

function makeReportData(overrides: Partial<ReportData> = {}): ReportData {
  return {
    projects: [],
    totalSeconds: 0,
    ...overrides,
  }
}

function mountView(storeState: Record<string, unknown> = {}) {
  return mount(ReportsView, {
    global: {
      plugins: [
        createTestingPinia({
          stubActions: true,
          initialState: {
            reports: {
              reportData: null,
              loading: false,
              error: null,
              filter: {
                dateFrom: '2026-03-04',
                dateTo: '2026-03-11',
              },
              ...storeState,
            },
            projects: { projects: [], loading: false, error: null },
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

describe('ReportsView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders the page heading', async () => {
    const wrapper = mountView()
    expect(wrapper.find('h1').text()).toBe('Reports')
  })

  it('renders the filter panel, summary table, and detail table', async () => {
    const wrapper = mountView()
    expect(wrapper.find('.filter-panel-stub').exists()).toBe(true)
    expect(wrapper.find('.summary-table-stub').exists()).toBe(true)
    expect(wrapper.find('.detail-table-stub').exists()).toBe(true)
  })

  it('wraps tables in an element with id="report-printable-area"', async () => {
    const wrapper = mountView()
    expect(wrapper.find('#report-printable-area').exists()).toBe(true)
    expect(wrapper.find('#report-printable-area .summary-table-stub').exists()).toBe(true)
    expect(wrapper.find('#report-printable-area .detail-table-stub').exists()).toBe(true)
  })

  it('does not show error message when store has no error', async () => {
    const wrapper = mountView()
    await flushPromises()
    expect(wrapper.find('.message-stub').exists()).toBe(false)
  })

  it('shows error message when store has an error', async () => {
    const wrapper = mountView({ error: 'Database error' })
    await flushPromises()
    expect(wrapper.find('.message-stub').exists()).toBe(true)
    expect(wrapper.find('.message-stub').text()).toContain('Database error')
  })

  it('passes reportData from store to both tables', async () => {
    const reportData = makeReportData({ totalSeconds: 3600 })
    const wrapper = mountView({ reportData })
    await flushPromises()
    expect(wrapper.find('.summary-table-stub').attributes('data-has-data')).toBe('true')
    expect(wrapper.find('.detail-table-stub').attributes('data-has-data')).toBe('true')
  })
})
