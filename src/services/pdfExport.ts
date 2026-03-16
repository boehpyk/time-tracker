import html2canvas from 'html2canvas'
import { jsPDF } from 'jspdf'

/**
 * Captures the element with id="report-printable-area" using html2canvas,
 * then paginates and saves the result as an A4 portrait PDF.
 *
 * Does NOT import from @tauri-apps/api — plain browser-compatible service.
 */
export async function exportReportToPdf(filename?: string): Promise<void> {
  const element = document.getElementById('report-printable-area')
  if (!element) {
    throw new Error('Export target #report-printable-area not found in the DOM.')
  }

  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    logging: false,
  })

  // A4 dimensions in mm
  const pageWidthMm = 210
  const pageHeightMm = 297

  const pdf = new jsPDF('portrait', 'mm', 'a4')

  // Convert canvas pixel dimensions to mm at the chosen scale.
  // We want the image to fill the full page width with a small margin.
  const marginMm = 10
  const printableWidthMm = pageWidthMm - marginMm * 2

  const canvasWidthPx = canvas.width
  const canvasHeightPx = canvas.height

  // How many mm does one canvas pixel represent?
  const pxPerMm = canvasWidthPx / printableWidthMm

  // Total rendered height in mm
  const totalHeightMm = canvasHeightPx / pxPerMm

  // Printable height per page (with top + bottom margin)
  const printableHeightMm = pageHeightMm - marginMm * 2

  let remainingHeightMm = totalHeightMm
  let sourceOffsetPx = 0
  let isFirstPage = true

  while (remainingHeightMm > 0) {
    if (!isFirstPage) {
      pdf.addPage()
    }
    isFirstPage = false

    const sliceHeightMm = Math.min(remainingHeightMm, printableHeightMm)
    const sliceHeightPx = Math.round(sliceHeightMm * pxPerMm)

    // Create a temporary canvas for this page slice
    const pageCanvas = document.createElement('canvas')
    pageCanvas.width = canvasWidthPx
    pageCanvas.height = sliceHeightPx

    const ctx = pageCanvas.getContext('2d')
    if (ctx) {
      ctx.drawImage(
        canvas,
        0, sourceOffsetPx,          // source x, y
        canvasWidthPx, sliceHeightPx, // source width, height
        0, 0,                        // destination x, y
        canvasWidthPx, sliceHeightPx, // destination width, height
      )
    }

    const pageImageData = pageCanvas.toDataURL('image/png')
    pdf.addImage(
      pageImageData,
      'PNG',
      marginMm,       // x
      marginMm,       // y
      printableWidthMm,
      sliceHeightMm,
    )

    sourceOffsetPx += sliceHeightPx
    remainingHeightMm -= sliceHeightMm
  }

  pdf.save(filename ?? 'report.pdf')
}
