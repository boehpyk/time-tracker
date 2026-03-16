import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import ReportExportButton from '../../../components/reports/ReportExportButton.vue'

// ---------------------------------------------------------------------------
// Mock pdfExport service — we do NOT test canvas rendering here.
// ---------------------------------------------------------------------------

vi.mock('../../../services/pdfExport', () => ({
  exportReportToPdf: vi.fn(),
}))

vi.mock('primevue/usetoast', () => ({
  useToast: () => ({ add: vi.fn() }),
}))

import { exportReportToPdf } from '../../../services/pdfExport'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function mountButton(props: Record<string, unknown> = {}) {
  return mount(ReportExportButton, {
    props,
    global: {
      stubs: {
        Button: {
          props: ['label', 'loading', 'disabled', 'icon', 'severity'],
          template: `<button :disabled="disabled" @click="$emit('click')">{{ label }}</button>`,
        },
      },
    },
  })
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('ReportExportButton', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders with default label "Export PDF"', () => {
    const wrapper = mountButton()
    expect(wrapper.text()).toContain('Export PDF')
  })

  it('calls exportReportToPdf with default filename when clicked', async () => {
    vi.mocked(exportReportToPdf).mockResolvedValue(undefined)
    const wrapper = mountButton()
    await wrapper.find('button').trigger('click')
    await flushPromises()
    expect(exportReportToPdf).toHaveBeenCalledWith('report.pdf')
  })

  it('calls exportReportToPdf with the provided filename prop', async () => {
    vi.mocked(exportReportToPdf).mockResolvedValue(undefined)
    const wrapper = mountButton({ filename: 'my-report.pdf' })
    await wrapper.find('button').trigger('click')
    await flushPromises()
    expect(exportReportToPdf).toHaveBeenCalledWith('my-report.pdf')
  })

  it('button is disabled while export is in progress', async () => {
    // exportReportToPdf will not resolve until we advance
    let resolve!: () => void
    vi.mocked(exportReportToPdf).mockReturnValue(
      new Promise<void>((r) => { resolve = r }),
    )

    const wrapper = mountButton()
    await wrapper.find('button').trigger('click')

    // Still in-flight — button should be disabled
    await wrapper.vm.$nextTick()
    expect(wrapper.find('button').attributes('disabled')).toBeDefined()

    // Resolve the export
    resolve()
    await flushPromises()

    // Now re-enabled
    expect(wrapper.find('button').attributes('disabled')).toBeUndefined()
  })

  it('re-enables button after export resolves', async () => {
    vi.mocked(exportReportToPdf).mockResolvedValue(undefined)
    const wrapper = mountButton()
    await wrapper.find('button').trigger('click')
    await flushPromises()
    expect(wrapper.find('button').attributes('disabled')).toBeUndefined()
  })

  it('re-enables button after export rejects', async () => {
    vi.mocked(exportReportToPdf).mockRejectedValue(new Error('canvas error'))
    const wrapper = mountButton()
    await wrapper.find('button').trigger('click')
    await flushPromises()
    expect(wrapper.find('button').attributes('disabled')).toBeUndefined()
  })
})
