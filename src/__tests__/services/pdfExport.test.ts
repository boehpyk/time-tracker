import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { exportReportToPdf } from '../../services/pdfExport'

// ---------------------------------------------------------------------------
// Module-level mocks — html2canvas and jsPDF are not available in jsdom.
// ---------------------------------------------------------------------------

vi.mock('html2canvas', () => ({
  default: vi.fn(),
}))

vi.mock('jspdf', () => ({
  jsPDF: vi.fn(),
}))

import html2canvas from 'html2canvas'
import { jsPDF } from 'jspdf'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Build a canvas-like object whose getContext and toDataURL are controlled.
 * We use a plain object rather than a real HTMLCanvasElement so we never
 * call document.createElement inside the spy interceptor.
 */
function makeCanvasLike(widthPx: number, heightPx: number) {
  return {
    width: widthPx,
    height: heightPx,
    getContext: vi.fn().mockReturnValue({
      drawImage: vi.fn(),
    }),
    toDataURL: vi.fn().mockReturnValue('data:image/png;base64,AAA='),
  }
}

function makeMockPdf() {
  return {
    addPage: vi.fn(),
    addImage: vi.fn(),
    save: vi.fn(),
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('exportReportToPdf', () => {
  // Track whether we need to restore createElement after each test
  let restoreCreateElement: (() => void) | null = null

  beforeEach(() => {
    vi.clearAllMocks()
    restoreCreateElement = null
  })

  afterEach(() => {
    if (restoreCreateElement) {
      restoreCreateElement()
      restoreCreateElement = null
    }
  })

  // Helper: spy on document.createElement so that any 'canvas' request returns
  // a fake canvas-like object.  All other tags fall through to the real method.
  function spyCreateElement(widthPx: number, heightPx: number) {
    // Capture the real method BEFORE installing the spy
    const realCreate = document.createElement.bind(document)
    const spy = vi.spyOn(document, 'createElement').mockImplementation(
      (tag: string) => {
        if (tag === 'canvas') {
          return makeCanvasLike(widthPx, heightPx) as unknown as HTMLElement
        }
        return realCreate(tag)
      },
    )
    restoreCreateElement = () => spy.mockRestore()
  }

  it('throws when #report-printable-area is not found', async () => {
    const existing = document.getElementById('report-printable-area')
    if (existing) existing.remove()

    await expect(exportReportToPdf()).rejects.toThrow(
      '#report-printable-area not found',
    )
  })

  it('calls html2canvas with scale 2, useCORS true, logging false', async () => {
    const el = document.createElement('div')
    el.id = 'report-printable-area'
    document.body.appendChild(el)

    const fakeCanvas = makeCanvasLike(840, 500)
    vi.mocked(html2canvas).mockResolvedValue(fakeCanvas as unknown as HTMLCanvasElement)

    const mockPdf = makeMockPdf()
    vi.mocked(jsPDF).mockImplementation(() => mockPdf as unknown as jsPDF)

    spyCreateElement(840, 500)

    await exportReportToPdf()

    expect(html2canvas).toHaveBeenCalledWith(el, {
      scale: 2,
      useCORS: true,
      logging: false,
    })

    el.remove()
  })

  it('creates a jsPDF in portrait A4 and calls save with default filename', async () => {
    const el = document.createElement('div')
    el.id = 'report-printable-area'
    document.body.appendChild(el)

    const fakeCanvas = makeCanvasLike(840, 500)
    vi.mocked(html2canvas).mockResolvedValue(fakeCanvas as unknown as HTMLCanvasElement)

    const mockPdf = makeMockPdf()
    vi.mocked(jsPDF).mockImplementation(() => mockPdf as unknown as jsPDF)

    spyCreateElement(840, 500)

    await exportReportToPdf()

    expect(jsPDF).toHaveBeenCalledWith('portrait', 'mm', 'a4')
    expect(mockPdf.save).toHaveBeenCalledWith('report.pdf')

    el.remove()
  })

  it('saves with a custom filename when provided', async () => {
    const el = document.createElement('div')
    el.id = 'report-printable-area'
    document.body.appendChild(el)

    const fakeCanvas = makeCanvasLike(840, 500)
    vi.mocked(html2canvas).mockResolvedValue(fakeCanvas as unknown as HTMLCanvasElement)

    const mockPdf = makeMockPdf()
    vi.mocked(jsPDF).mockImplementation(() => mockPdf as unknown as jsPDF)

    spyCreateElement(840, 500)

    await exportReportToPdf('my-custom-report.pdf')

    expect(mockPdf.save).toHaveBeenCalledWith('my-custom-report.pdf')

    el.remove()
  })

  it('adds multiple pages when canvas height exceeds one A4 page', async () => {
    const el = document.createElement('div')
    el.id = 'report-printable-area'
    document.body.appendChild(el)

    // Tall canvas: 840px wide ≈ 190mm printable → pxPerMm ≈ 4.42
    // 5000px tall → ≈ 1130mm → needs multiple A4 pages (277mm printable each)
    const fakeCanvas = makeCanvasLike(840, 5000)
    vi.mocked(html2canvas).mockResolvedValue(fakeCanvas as unknown as HTMLCanvasElement)

    const mockPdf = makeMockPdf()
    vi.mocked(jsPDF).mockImplementation(() => mockPdf as unknown as jsPDF)

    spyCreateElement(840, 5000)

    await exportReportToPdf()

    // addPage called once per extra page; addImage called once per page total
    expect(mockPdf.addPage).toHaveBeenCalled()
    expect(mockPdf.addImage).toHaveBeenCalledTimes(mockPdf.addPage.mock.calls.length + 1)

    el.remove()
  })
})
