import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import ReportExportButton from '../../../components/reports/ReportExportButton.vue'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock('../../../services/pdfExport', () => ({
  generatePdfBytes: vi.fn(),
}))

vi.mock('../../../services/tauriApi', () => ({
  api: {
    savePdfAs: vi.fn(),
  },
}))

vi.mock('primevue/usetoast', () => ({
  useToast: () => ({ add: vi.fn() }),
}))

import { generatePdfBytes } from '../../../services/pdfExport'
import { api } from '../../../services/tauriApi'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const FAKE_BYTES = new Uint8Array([1, 2, 3])

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

  it('calls savePdfAs with default filename and emits exported with the saved path', async () => {
    vi.mocked(generatePdfBytes).mockResolvedValue(FAKE_BYTES)
    vi.mocked(api.savePdfAs).mockResolvedValue('/home/user/report.pdf')

    const wrapper = mountButton()
    await wrapper.find('button').trigger('click')
    await flushPromises()

    expect(generatePdfBytes).toHaveBeenCalled()
    expect(api.savePdfAs).toHaveBeenCalledWith(FAKE_BYTES, 'report.pdf')
    expect(wrapper.emitted('exported')).toEqual([['/home/user/report.pdf']])
  })

  it('calls savePdfAs with the provided defaultFilename prop', async () => {
    vi.mocked(generatePdfBytes).mockResolvedValue(FAKE_BYTES)
    vi.mocked(api.savePdfAs).mockResolvedValue('/home/user/my-report.pdf')

    const wrapper = mountButton({ defaultFilename: 'my-report.pdf' })
    await wrapper.find('button').trigger('click')
    await flushPromises()

    expect(api.savePdfAs).toHaveBeenCalledWith(FAKE_BYTES, 'my-report.pdf')
  })

  it('does not emit exported when user cancels the save dialog', async () => {
    vi.mocked(generatePdfBytes).mockResolvedValue(FAKE_BYTES)
    vi.mocked(api.savePdfAs).mockResolvedValue(null)

    const wrapper = mountButton()
    await wrapper.find('button').trigger('click')
    await flushPromises()

    expect(wrapper.emitted('exported')).toBeUndefined()
  })

  it('button is disabled while export is in progress', async () => {
    let resolve!: (v: string) => void
    vi.mocked(generatePdfBytes).mockReturnValue(
      new Promise<Uint8Array>((r) => { resolve = (v) => r(v as unknown as Uint8Array) }),
    )

    const wrapper = mountButton()
    await wrapper.find('button').trigger('click')
    await wrapper.vm.$nextTick()

    expect(wrapper.find('button').attributes('disabled')).toBeDefined()

    resolve('/home/user/report.pdf')
    await flushPromises()
  })

  it('re-enables button after export resolves', async () => {
    vi.mocked(generatePdfBytes).mockResolvedValue(FAKE_BYTES)
    vi.mocked(api.savePdfAs).mockResolvedValue('/home/user/report.pdf')

    const wrapper = mountButton()
    await wrapper.find('button').trigger('click')
    await flushPromises()

    expect(wrapper.find('button').attributes('disabled')).toBeUndefined()
  })

  it('re-enables button after export rejects', async () => {
    vi.mocked(generatePdfBytes).mockRejectedValue(new Error('canvas error'))

    const wrapper = mountButton()
    await wrapper.find('button').trigger('click')
    await flushPromises()

    expect(wrapper.find('button').attributes('disabled')).toBeUndefined()
  })
})
