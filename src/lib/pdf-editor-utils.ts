import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

export interface TextModification {
  pageNumber: number;
  x: number;
  y: number;
  text: string;
  fontSize?: number;
  color?: { r: number; g: number; b: number };
}

export interface PdfModification {
  type: 'text' | 'highlight' | 'form' | 'annotation';
  pageNumber: number;
  x: number;
  y: number;
  width?: number;
  height?: number;
  content: any;
  timestamp: Date;
}

export class PdfEditor {
  private modifications: PdfModification[] = [];

  addModification(modification: Omit<PdfModification, 'timestamp'>) {
    this.modifications.push({
      ...modification,
      timestamp: new Date()
    });
  }

  getModifications(): PdfModification[] {
    return [...this.modifications];
  }

  clearModifications() {
    this.modifications = [];
  }

  async applyModificationsToPdf(pdfBuffer: ArrayBuffer): Promise<Uint8Array> {
    // Create a completely new PDF document
    const newPdfDoc = await PDFDocument.create();
    const helveticaFont = await newPdfDoc.embedFont(StandardFonts.Helvetica);

    // Load original PDF to copy pages
    const originalPdfDoc = await PDFDocument.load(pdfBuffer);
    const originalPages = originalPdfDoc.getPages();

    // Group modifications by page
    const modsByPage = this.modifications.reduce(
      (acc, mod) => {
        if (!acc[mod.pageNumber]) {
          acc[mod.pageNumber] = [];
        }
        acc[mod.pageNumber].push(mod);
        return acc;
      },
      {} as Record<number, PdfModification[]>
    );

    // Copy each page and apply modifications
    for (let i = 0; i < originalPages.length; i++) {
      const pageNumber = i + 1;

      // Copy page content (images, graphics, but not text)
      const [copiedPage] = await newPdfDoc.copyPages(originalPdfDoc, [i]);
      const newPage = newPdfDoc.addPage(copiedPage);

      // Apply modifications for this page
      const pageMods = modsByPage[pageNumber] || [];

      for (const mod of pageMods) {
        switch (mod.type) {
          case 'text':
            await this.applyTextModification(newPage, mod, helveticaFont);
            break;
          case 'highlight':
            await this.applyHighlightModification(newPage, mod);
            break;
        }
      }
    }

    return await newPdfDoc.save();
  }

  private async applyTextModification(
    page: any,
    mod: PdfModification,
    font: any
  ) {
    const { x, y, content } = mod;
    const {
      text,
      fontSize = 12,
      color = { r: 0, g: 0, b: 0 },
      action
    } = content;

    // Skip drawing if this is an erase operation or empty text
    if (action === 'erase' || !text || text.trim() === '') {
      return;
    }

    // Draw text at the specified position
    page.drawText(text, {
      x,
      y: page.getHeight() - y, // Convert from canvas to PDF coordinate system
      size: fontSize,
      font,
      color: rgb(color.r / 255, color.g / 255, color.b / 255)
    });
  }

  private async applyHighlightModification(page: any, mod: PdfModification) {
    const { x, y, width = 100, height = 20, content } = mod;
    const { color = { r: 255, g: 255, b: 0 }, opacity = 0.3 } = content;

    page.drawRectangle({
      x,
      y: page.getHeight() - y - height, // Convert coordinate system
      width,
      height,
      color: rgb(color.r / 255, color.g / 255, color.b / 255),
      opacity
    });
  }
}

export async function extractTextFromPdfPage(
  pdfDoc: any,
  pageNumber: number
): Promise<{
  text: string;
  positions: Array<{
    text: string;
    x: number;
    y: number;
    width: number;
    height: number;
  }>;
}> {
  // This would integrate with PDF.js to extract text with positioning
  // For now, return a placeholder structure
  return {
    text: '',
    positions: []
  };
}

export function createDocxFromPdf(
  originalPdfBuffer: ArrayBuffer,
  modifications: PdfModification[]
): Promise<Uint8Array> {
  // Placeholder for DOCX export functionality
  // Would integrate with 'docx' library to create Word document
  return Promise.resolve(new Uint8Array());
}

export function validatePdfFile(file: File): {
  isValid: boolean;
  error?: string;
} {
  if (!file.type.includes('pdf')) {
    return { isValid: false, error: 'File must be a PDF' };
  }

  if (file.size > 50 * 1024 * 1024) {
    // 50MB limit
    return { isValid: false, error: 'File size must be less than 50MB' };
  }

  return { isValid: true };
}
