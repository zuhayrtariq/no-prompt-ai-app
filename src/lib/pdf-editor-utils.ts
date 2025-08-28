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
    const pdfDoc = await PDFDocument.load(pdfBuffer);
    const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);

    // Group modifications by page for efficient processing
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

    // Apply modifications page by page
    for (const [pageNum, pageMods] of Object.entries(modsByPage)) {
      const pageIndex = parseInt(pageNum) - 1; // Convert to 0-based index
      const page = pdfDoc.getPages()[pageIndex];

      if (!page) continue;

      for (const mod of pageMods) {
        switch (mod.type) {
          case 'text':
            await this.applyTextModification(page, mod, helveticaFont);
            break;
          case 'highlight':
            await this.applyHighlightModification(page, mod);
            break;
          // Add more modification types as needed
        }
      }
    }

    return await pdfDoc.save();
  }

  private async applyTextModification(
    page: any,
    mod: PdfModification,
    font: any
  ) {
    const { x, y, content } = mod;
    const { text, fontSize = 12, color = { r: 0, g: 0, b: 0 } } = content;

    page.drawText(text, {
      x,
      y: page.getHeight() - y, // Convert coordinate system
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
