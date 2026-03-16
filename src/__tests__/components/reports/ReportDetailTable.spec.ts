import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import ReportDetailTable from '../../../components/reports/ReportDetailTable.vue'
import type { ReportData, ProjectReport, TaskReport } from '../../../types/index'

// ---------------------------------------------------------------------------
// Stubs
// ---------------------------------------------------------------------------

const stubs = {
  DataTable: {
    props: ['value', 'loading', 'stripedRows'],
    template: `
      <div class="datatable-stub" :data-row-count="value ? value.length : 0">
        <slot v-if="!value || value.length === 0" name="empty" />
        <div v-for="(row, i) in value" :key="i" class="dt-row">
        </div>
      </div>
    `,
  },
  // Column stub intentionally omits slot rendering to avoid accessing
  // properties on the empty {} placeholder object.
  Column: {
    props: ['field', 'header'],
    template: `<div class="column-stub" />`,
  },
}

// ---------------------------------------------------------------------------
// Factories
// ---------------------------------------------------------------------------

function makeTask(overrides: Partial<TaskReport> = {}): TaskReport {
  return {
    taskId: 10,
    taskName: 'Task A',
    totalSeconds: 3600,
    entryCount: 2,
    entries: [
      {
        entryId: 1,
        startTime: '2026-03-16T09:00:00Z',
        endTime: '2026-03-16T10:00:00Z',
        durationSeconds: 3600,
      },
      {
        entryId: 2,
        startTime: '2026-03-16T11:00:00Z',
        endTime: '2026-03-16T11:30:00Z',
        durationSeconds: 1800,
      },
    ],
    ...overrides,
  }
}

function makeProject(overrides: Partial<ProjectReport> = {}): ProjectReport {
  return {
    projectId: 1,
    projectName: 'Alpha',
    projectColor: '#ff0000',
    totalSeconds: 5400,
    tasks: [
      makeTask({ taskId: 10, taskName: 'Task A' }),
      makeTask({
        taskId: 11,
        taskName: 'Task B',
        totalSeconds: 1800,
        entryCount: 1,
        entries: [
          {
            entryId: 3,
            startTime: '2026-03-16T14:00:00Z',
            endTime: '2026-03-16T14:30:00Z',
            durationSeconds: 1800,
          },
        ],
      }),
    ],
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
  return mount(ReportDetailTable, {
    props: { data, loading },
    global: { stubs },
  })
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('ReportDetailTable', () => {
  it('shows empty state when data is null', () => {
    const wrapper = mountTable(null)
    expect(wrapper.find('.empty-state').exists()).toBe(true)
  })

  it('shows empty state when projects array is empty', () => {
    const wrapper = mountTable(makeReportData())
    expect(wrapper.find('.empty-state').exists()).toBe(true)
  })

  it('flattens entries from all tasks into rows', () => {
    // makeProject() has 2 tasks: Task A (2 entries) + Task B (1 entry) = 3 rows
    const data = makeReportData({ projects: [makeProject()] })
    const wrapper = mountTable(data)
    expect(wrapper.find('.datatable-stub').attributes('data-row-count')).toBe('3')
  })

  it('flattens entries across multiple projects', () => {
    const p1 = makeProject({ projectId: 1 })
    // p1: 2 tasks × (2 + 1) entries = 3 entries
    const p2 = makeProject({
      projectId: 2,
      projectName: 'Beta',
      tasks: [
        makeTask({
          taskId: 20,
          taskName: 'Task C',
          totalSeconds: 900,
          entryCount: 1,
          entries: [
            {
              entryId: 4,
              startTime: '2026-03-16T15:00:00Z',
              endTime: '2026-03-16T15:15:00Z',
              durationSeconds: 900,
            },
          ],
        }),
      ],
    })
    // p1 has 3 entries, p2 has 1 entry → 4 rows total
    const data = makeReportData({ projects: [p1, p2] })
    const wrapper = mountTable(data)
    expect(wrapper.find('.datatable-stub').attributes('data-row-count')).toBe('4')
  })

  it('renders section title', () => {
    const wrapper = mountTable(null)
    expect(wrapper.find('.section-title').text()).toBe('Breakdown by Entry')
  })
})
