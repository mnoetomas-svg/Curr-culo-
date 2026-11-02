import { toPng } from 'html-to-image';
import { jsPDF } from 'jspdf';

export async function exportElementToA4Pdf(
  element: HTMLElement,
  fileName: string,
  pixelRatio = 2.8
): Promise<void> {
  // Wait for fonts and images to settle
  if (document.fonts && document.fonts.ready) {
    await document.fonts.ready;
  }

  const widthPx = 794;
  const fullHeightPx = Math.max(1123, element.scrollHeight);

  const dataUrl = await toPng(element, {
    quality: 1.0,
    pixelRatio,
    width: widthPx,
    height: fullHeightPx,
    backgroundColor: '#FFFFFF',
    cacheBust: true,
  });

  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
    compress: true,
  });

  const pageWidthMm = 210;
  const pageHeightMm = 297;
  const imgHeightMm = (fullHeightPx * pageWidthMm) / widthPx;

  let heightLeftMm = imgHeightMm;
  let positionMm = 0;

  pdf.addImage(dataUrl, 'PNG', 0, positionMm, pageWidthMm, imgHeightMm, undefined, 'FAST');
  heightLeftMm -= pageHeightMm;

  // Add extra A4 pages seamlessly if the CV exceeds 1 page (with 4mm tolerance)
  while (heightLeftMm > 4) {
    positionMm = heightLeftMm - imgHeightMm;
    pdf.addPage();
    pdf.addImage(dataUrl, 'PNG', 0, positionMm, pageWidthMm, imgHeightMm, undefined, 'FAST');
    heightLeftMm -= pageHeightMm;
  }

  const safeTitle =
    fileName
      .trim()
      .replace(/[^a-zA-Z0-9À-ÿ_\-\s]/g, '')
      .replace(/\s+/g, '_') || 'Curriculo_Profissional';

  pdf.save(`${safeTitle}.pdf`);
}
