import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import ReportSummaryTable from '../../../components/reports/ReportSummaryTable.vue'
import type { ReportData, ProjectReport } from '../../../types/index'

// ---------------------------------------------------------------------------
// Stubs
// ---------------------------------------------------------------------------

const stubs = {
  DataTable: {
    props: ['value', 'loading', 'stripedRows'],
    template: `
      <div class="datatable-stub" :data-loading="loading">
        <slot v-if="!value || value.length === 0" name="empty" />
        <div v-for="(row, i) in value" :key="i" class="dt-row">
          <slot :data="row" />
        </div>
      </div>
    `,
  },
  Column: {
    props: ['field', 'header'],
    // Do not render the body slot to avoid crashing on undefined row data.
    template: `<div class="column-stub"></div>`,
  },
}

function makeProject(overrides: Partial<ProjectReport> = {}): ProjectReport {
  return {
    projectId: 1,
    projectName: 'Alpha',
    projectColor: '#ff0000',
    totalSeconds: 3600,
    tasks: [{ taskId: 10, taskName: 'Task A', totalSeconds: 3600, entryCount: 2, entries: [] }],
    ...overrides,
  }
}

function makeReportData(overrides: Partial<ReportData> = {}): ReportData {
  return {
    projects: [],
    totalSeconds: 0,
    ...overrides,
  }
}

function mountTable(data: ReportData | null, loading = false) {
  return mount(ReportSummaryTable, {
    props: { data, loading },
    global: { stubs },
  })
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('ReportSummaryTable', () => {
  it('shows empty state when data is null', () => {
    const wrapper = mountTable(null)
    expect(wrapper.find('.empty-state').exists()).toBe(true)
  })

  it('shows empty state when projects array is empty', () => {
    const wrapper = mountTable(makeReportData())
    expect(wrapper.find('.empty-state').exists()).toBe(true)
  })

  it('does not show the total row when there are no projects', () => {
    const wrapper = mountTable(makeReportData())
    expect(wrapper.find('.summary-total').exists()).toBe(false)
  })

  it('shows the total row when there is at least one project', () => {
    const data = makeReportData({
      projects: [makeProject()],
      totalSeconds: 3600,
    })
    const wrapper = mountTable(data)
    expect(wrapper.find('.summary-total').exists()).toBe(true)
    expect(wrapper.find('.summary-total').text()).toContain('1h 0m')
  })

  it('renders section title', () => {
    const wrapper = mountTable(null)
    expect(wrapper.find('.section-title').text()).toBe('Summary by Project')
  })
})
