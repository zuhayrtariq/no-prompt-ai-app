/**
 * Export Manager
 * Central manager for all export formats
 */

import { DocumentModel } from './document-model';
import { MarkdownExporter } from './exporters/markdown-exporter';
import { DocxExporter } from './exporters/docx-exporter';
import { PdfExporter } from './exporters/pdf-exporter';
import { PdfLibExporter } from './exporters/pdf-lib-exporter';

export type ExportFormat = 'markdown' | 'docx' | 'pdf';

export interface ExportResult {
  success: boolean;
  filename?: string;
  error?: string;
  blob?: Blob;
  downloadUrl?: string;
}

export class ExportManager {
  private markdownExporter: MarkdownExporter;
  private docxExporter: DocxExporter;
  private pdfExporter: PdfExporter;
  private pdfLibExporter: PdfLibExporter;

  constructor() {
    this.markdownExporter = new MarkdownExporter();
    this.docxExporter = new DocxExporter();
    this.pdfExporter = new PdfExporter();
    this.pdfLibExporter = new PdfLibExporter();
  }

  /**
   * Export document to specified format
   */
  async exportDocument(
    documentModel: DocumentModel,
    format: ExportFormat,
    options?: {
      download?: boolean;
      customFilename?: string;
    }
  ): Promise<ExportResult> {
    const { download = true, customFilename } = options || {};

    try {
      console.log(`📤 Starting export to ${format.toUpperCase()}...`);

      const filename = this.generateFilename(
        documentModel,
        format,
        customFilename
      );
      let result: ExportResult;

      switch (format) {
        case 'markdown':
          result = await this.exportToMarkdown(
            documentModel,
            filename,
            download
          );
          break;
        case 'docx':
          result = await this.exportToDocx(documentModel, filename, download);
          break;
        case 'pdf':
          result = await this.exportToPdf(documentModel, filename, download);
          break;
        default:
          throw new Error(`Unsupported export format: ${format}`);
      }

      if (result.success) {
        console.log(
          `✅ Export to ${format.toUpperCase()} completed: ${filename}`
        );
      } else {
        console.error(
          `❌ Export to ${format.toUpperCase()} failed:`,
          result.error
        );
      }

      return result;
    } catch (error) {
      console.error(`❌ Export to ${format.toUpperCase()} failed:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown export error'
      };
    }
  }

  /**
   * Export to Markdown
   */
  private async exportToMarkdown(
    documentModel: DocumentModel,
    filename: string,
    download: boolean
  ): Promise<ExportResult> {
    try {
      const content = this.markdownExporter.exportToMarkdown(documentModel);
      const blob = new Blob([content], { type: 'text/markdown' });

      if (download) {
        this.downloadBlob(blob, filename);
      }

      return {
        success: true,
        filename,
        blob,
        downloadUrl: download ? undefined : URL.createObjectURL(blob)
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Markdown export failed'
      };
    }
  }

  /**
   * Export to DOCX
   */
  private async exportToDocx(
    documentModel: DocumentModel,
    filename: string,
    download: boolean
  ): Promise<ExportResult> {
    try {
      const blob = await this.docxExporter.exportToDocx(documentModel);

      if (download) {
        this.downloadBlob(blob, filename);
      }

      return {
        success: true,
        filename,
        blob,
        downloadUrl: download ? undefined : URL.createObjectURL(blob)
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'DOCX export failed'
      };
    }
  }

  /**
   * Export to PDF
   */
  private async exportToPdf(
    documentModel: DocumentModel,
    filename: string,
    download: boolean
  ): Promise<ExportResult> {
    try {
      let blob: Blob;

      // Use PDF-lib approach for high-quality export with images preserved
      if (documentModel.metadata.originalPdfBytes) {
        console.log('📄 Using PDF-lib to preserve images and layout');
        blob = await this.pdfLibExporter.exportModifiedPdf(
          documentModel.metadata.originalPdfBytes,
          documentModel
        );
      } else {
        console.log(
          '📄 Using jsPDF fallback (original PDF bytes not available)'
        );
        blob = await this.pdfExporter.exportToPdf(documentModel);
      }

      if (download) {
        this.downloadBlob(blob, filename);
      }

      return {
        success: true,
        filename,
        blob,
        downloadUrl: download ? undefined : URL.createObjectURL(blob)
      };
    } catch (error) {
      console.error('❌ PDF export failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'PDF export failed'
      };
    }
  }

  /**
   * Generate filename for export
   */
  private generateFilename(
    documentModel: DocumentModel,
    format: ExportFormat,
    customFilename?: string
  ): string {
    // Map format to file extension
    const getExtension = (format: ExportFormat): string => {
      switch (format) {
        case 'markdown':
          return 'md';
        case 'docx':
          return 'docx';
        case 'pdf':
          return 'pdf';
        default:
          return format;
      }
    };

    const extension = getExtension(format);

    if (customFilename) {
      return customFilename.endsWith(`.${extension}`)
        ? customFilename
        : `${customFilename}.${extension}`;
    }

    const baseFilename =
      documentModel.metadata.title ||
      documentModel.metadata.originalFileName?.replace(/\.pdf$/i, '') ||
      'document';

    // Clean filename - remove invalid characters
    const cleanFilename = baseFilename.replace(/[^a-z0-9\s\-_]/gi, '').trim();

    // Add timestamp if no original filename
    const timestamp = new Date().toISOString().slice(0, 16).replace(/:/g, '-');
    const finalFilename = cleanFilename || `document_${timestamp}`;

    return `${finalFilename}.${extension}`;
  }

  /**
   * Download blob as file
   */
  private downloadBlob(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.style.display = 'none';

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Clean up the URL after a short delay
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  /**
   * Get supported export formats
   */
  static getSupportedFormats(): {
    format: ExportFormat;
    label: string;
    description: string;
  }[] {
    return [
      {
        format: 'markdown',
        label: 'Markdown',
        description: 'Plain text with markup syntax for formatting'
      },
      {
        format: 'docx',
        label: 'Microsoft Word',
        description: 'Standard Word document format with full formatting'
      },
      {
        format: 'pdf',
        label: 'PDF',
        description: 'Clean PDF export with edited text content'
      }
    ];
  }

  /**
   * Validate document before export
   */
  static validateDocumentForExport(documentModel: DocumentModel): {
    isValid: boolean;
    warnings: string[];
    errors: string[];
  } {
    const warnings: string[] = [];
    const errors: string[] = [];

    // Check for empty document
    if (!documentModel.pages.length) {
      errors.push('Document has no pages');
    }

    // Check for pages with no content
    const emptyPages = documentModel.pages.filter(
      (page) => page.blocks.length === 0
    );
    if (emptyPages.length > 0) {
      warnings.push(`${emptyPages.length} page(s) have no content blocks`);
    }

    // Check for blocks with empty content
    let emptyBlocks = 0;
    documentModel.pages.forEach((page) => {
      page.blocks.forEach((block) => {
        if (typeof block.content === 'string' && !block.content.trim()) {
          emptyBlocks++;
        }
      });
    });

    if (emptyBlocks > 0) {
      warnings.push(`${emptyBlocks} block(s) have empty content`);
    }

    // Check for low-confidence blocks
    let lowConfidenceBlocks = 0;
    documentModel.pages.forEach((page) => {
      page.blocks.forEach((block) => {
        if (block.metadata.confidence < 0.7) {
          lowConfidenceBlocks++;
        }
      });
    });

    if (lowConfidenceBlocks > 0) {
      warnings.push(
        `${lowConfidenceBlocks} block(s) have low detection confidence (<70%)`
      );
    }

    return {
      isValid: errors.length === 0,
      warnings,
      errors
    };
  }
}

// Create a singleton instance for easy use
export const exportManager = new ExportManager();
