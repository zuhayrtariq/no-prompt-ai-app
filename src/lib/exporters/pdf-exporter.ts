/**
 * PDF Exporter
 * Converts DocumentModel to PDF format using jsPDF
 */

import { jsPDF } from 'jspdf';
import {
  DocumentModel,
  BlockModel,
  TableContent,
  ListContent,
  ImageContent
} from '../document-model';

export class PdfExporter {
  private doc: jsPDF;
  private currentY: number;
  private pageHeight: number;
  private pageWidth: number;
  private margins: {
    top: number;
    bottom: number;
    left: number;
    right: number;
  };

  constructor() {
    this.doc = new jsPDF();
    this.pageHeight = this.doc.internal.pageSize.height;
    this.pageWidth = this.doc.internal.pageSize.width;
    this.margins = {
      top: 20,
      bottom: 20,
      left: 20,
      right: 20
    };
    this.currentY = this.margins.top;
  }

  /**
   * Export DocumentModel to PDF blob
   */
  async exportToPdf(documentModel: DocumentModel): Promise<Blob> {
    this.doc = new jsPDF();
    this.currentY = this.margins.top;

    // Add document title
    if (documentModel.metadata.title) {
      this.addTitle(documentModel.metadata.title);
    }

    // Add author if available
    if (documentModel.metadata.author) {
      this.addAuthor(documentModel.metadata.author);
    }

    // Add some spacing
    this.currentY += 10;

    // Process each page
    documentModel.pages.forEach((page, pageIndex) => {
      if (pageIndex > 0) {
        this.addPage();
      }

      // Sort blocks by position
      const sortedBlocks = page.blocks.sort((a, b) => {
        const yDiff = a.position.y - b.position.y;
        if (Math.abs(yDiff) > 10) return yDiff;
        return a.position.x - b.position.x;
      });

      // Convert each block
      sortedBlocks.forEach((block) => {
        this.addBlock(block);
      });
    });

    return this.doc.output('blob');
  }

  /**
   * Add document title
   */
  private addTitle(title: string): void {
    this.doc.setFontSize(18);
    this.doc.setFont('helvetica', 'bold');

    const textWidth = this.doc.getTextWidth(title);
    const x = (this.pageWidth - textWidth) / 2;

    this.doc.text(title, x, this.currentY);
    this.currentY += 15;
  }

  /**
   * Add author
   */
  private addAuthor(author: string): void {
    this.doc.setFontSize(12);
    this.doc.setFont('helvetica', 'italic');

    const authorText = `By ${author}`;
    const textWidth = this.doc.getTextWidth(authorText);
    const x = (this.pageWidth - textWidth) / 2;

    this.doc.text(authorText, x, this.currentY);
    this.currentY += 10;
  }

  /**
   * Add a new page
   */
  private addPage(): void {
    this.doc.addPage();
    this.currentY = this.margins.top;
  }

  /**
   * Check if we need a new page and add one if necessary
   */
  private checkPageBreak(neededHeight: number): void {
    if (this.currentY + neededHeight > this.pageHeight - this.margins.bottom) {
      this.addPage();
    }
  }

  /**
   * Add a block to the PDF
   */
  private addBlock(block: BlockModel): void {
    switch (block.type) {
      case 'heading':
        this.addHeading(block);
        break;
      case 'paragraph':
        this.addParagraph(block);
        break;
      case 'list':
        this.addList(block);
        break;
      case 'table':
        this.addTable(block);
        break;
      case 'quote':
        this.addQuote(block);
        break;
      case 'code':
        this.addCode(block);
        break;
      default:
        this.addParagraph(block);
    }

    // Add spacing after each block
    this.currentY += 5;
  }

  /**
   * Add heading to PDF
   */
  private addHeading(block: BlockModel): void {
    const content = typeof block.content === 'string' ? block.content : '';
    const level = block.style.headingLevel || 1;

    // Calculate font size based on heading level
    const fontSize = Math.max(16 - (level - 1) * 2, 12);

    this.checkPageBreak(fontSize + 5);

    this.doc.setFontSize(fontSize);
    this.doc.setFont('helvetica', 'bold');
    const [r, g, b] = this.hexToRgb(block.style.color);
    this.doc.setTextColor(r, g, b);

    const lines = this.doc.splitTextToSize(
      content,
      this.pageWidth - this.margins.left - this.margins.right
    );

    lines.forEach((line: string) => {
      this.doc.text(line, this.margins.left, this.currentY);
      this.currentY += fontSize * 0.6;
    });

    this.currentY += 5; // Extra spacing after heading
  }

  /**
   * Add paragraph to PDF
   */
  private addParagraph(block: BlockModel): void {
    const content = typeof block.content === 'string' ? block.content : '';

    this.doc.setFontSize(block.style.fontSize || 12);
    this.doc.setFont(
      'helvetica',
      block.style.fontWeight === 'bold'
        ? 'bold'
        : block.style.fontStyle === 'italic'
          ? 'italic'
          : 'normal'
    );
    const [r, g, b] = this.hexToRgb(block.style.color);
    this.doc.setTextColor(r, g, b);

    const lines = this.doc.splitTextToSize(
      content,
      this.pageWidth - this.margins.left - this.margins.right
    );
    const lineHeight =
      (block.style.fontSize || 12) * (block.style.lineHeight || 1.2);

    this.checkPageBreak(lines.length * lineHeight);

    lines.forEach((line: string) => {
      this.doc.text(line, this.margins.left, this.currentY);
      this.currentY += lineHeight;
    });
  }

  /**
   * Add list to PDF
   */
  private addList(block: BlockModel): void {
    const listContent = block.content as ListContent;
    const fontSize = block.style.fontSize || 12;

    this.doc.setFontSize(fontSize);
    this.doc.setFont('helvetica', 'normal');
    const [r, g, b] = this.hexToRgb(block.style.color);
    this.doc.setTextColor(r, g, b);

    listContent.items.forEach((item, index) => {
      let marker: string;

      switch (listContent.type) {
        case 'numbered':
          marker = `${index + 1}.`;
          break;
        case 'alpha':
          marker = `${String.fromCharCode(97 + index)}.`;
          break;
        case 'roman':
          marker = `${this.toRoman(index + 1)}.`;
          break;
        default:
          marker = '•';
      }

      const indent = this.margins.left + (item.level - 1) * 15;
      const textWidth = this.pageWidth - indent - this.margins.right - 15;

      this.checkPageBreak(fontSize + 2);

      // Add marker
      this.doc.text(marker, indent, this.currentY);

      // Add content
      const lines = this.doc.splitTextToSize(item.content, textWidth);
      lines.forEach((line: string, lineIndex: number) => {
        this.doc.text(
          line,
          indent + 15,
          this.currentY + lineIndex * fontSize * 1.2
        );
      });

      this.currentY += lines.length * fontSize * 1.2 + 2;
    });
  }

  /**
   * Add table to PDF
   */
  private addTable(block: BlockModel): void {
    const tableContent = block.content as TableContent;
    const fontSize = (block.style.fontSize || 12) * 0.9; // Slightly smaller for tables

    if (tableContent.rows.length === 0) return;

    this.doc.setFontSize(fontSize);
    const [r, g, b] = this.hexToRgb(block.style.color);
    this.doc.setTextColor(r, g, b);

    const columnWidth =
      (this.pageWidth - this.margins.left - this.margins.right) /
      tableContent.columnCount;
    const rowHeight = fontSize * 1.5;

    this.checkPageBreak(tableContent.rows.length * rowHeight + 10);

    // Draw table
    tableContent.rows.forEach((row, rowIndex) => {
      const y = this.currentY + rowIndex * rowHeight;

      // Draw row background for header
      if (rowIndex === 0 && tableContent.hasHeader) {
        this.doc.setFillColor(240, 240, 240);
        this.doc.rect(
          this.margins.left,
          y - fontSize,
          this.pageWidth - this.margins.left - this.margins.right,
          rowHeight,
          'F'
        );
      }

      // Draw cells
      row.cells.forEach((cell, cellIndex) => {
        const x = this.margins.left + cellIndex * columnWidth;

        // Set font weight for header
        this.doc.setFont(
          'helvetica',
          rowIndex === 0 && tableContent.hasHeader ? 'bold' : 'normal'
        );

        // Draw cell border
        this.doc.rect(x, y - fontSize, columnWidth, rowHeight, 'S');

        // Add cell content
        const cellLines = this.doc.splitTextToSize(
          cell.content,
          columnWidth - 4
        );
        cellLines.forEach((line: string, lineIndex: number) => {
          this.doc.text(line, x + 2, y - fontSize * 0.3 + lineIndex * fontSize);
        });
      });
    });

    this.currentY += tableContent.rows.length * rowHeight + 5;
  }

  /**
   * Add quote to PDF
   */
  private addQuote(block: BlockModel): void {
    const content = typeof block.content === 'string' ? block.content : '';

    this.doc.setFontSize(block.style.fontSize || 12);
    this.doc.setFont('helvetica', 'italic');
    const [r, g, b] = this.hexToRgb(block.style.color);
    this.doc.setTextColor(r, g, b);

    // Add left border for quote
    this.doc.setDrawColor(200, 200, 200);
    this.doc.setLineWidth(2);

    const quoteIndent = this.margins.left + 10;
    const lines = this.doc.splitTextToSize(
      content,
      this.pageWidth - quoteIndent - this.margins.right - 10
    );
    const totalHeight = lines.length * (block.style.fontSize || 12) * 1.2;

    this.checkPageBreak(totalHeight);

    // Draw quote border
    this.doc.line(
      quoteIndent - 5,
      this.currentY - 5,
      quoteIndent - 5,
      this.currentY + totalHeight
    );

    lines.forEach((line: string) => {
      this.doc.text(line, quoteIndent, this.currentY);
      this.currentY += (block.style.fontSize || 12) * 1.2;
    });
  }

  /**
   * Add code to PDF
   */
  private addCode(block: BlockModel): void {
    const content = typeof block.content === 'string' ? block.content : '';

    // Use monospace font
    this.doc.setFont('courier', 'normal');
    this.doc.setFontSize((block.style.fontSize || 12) * 0.9);
    const [r, g, b] = this.hexToRgb(block.style.color);
    this.doc.setTextColor(r, g, b);

    const lines = content.split('\n');
    const lineHeight = (block.style.fontSize || 12) * 1.1;

    this.checkPageBreak(lines.length * lineHeight + 10);

    // Add background
    this.doc.setFillColor(245, 245, 245);
    this.doc.rect(
      this.margins.left,
      this.currentY - 5,
      this.pageWidth - this.margins.left - this.margins.right,
      lines.length * lineHeight + 10,
      'F'
    );

    // Add code content
    lines.forEach((line) => {
      this.doc.text(line, this.margins.left + 5, this.currentY + 5);
      this.currentY += lineHeight;
    });

    this.currentY += 5;
  }

  /**
   * Helper functions
   */

  private hexToRgb(hex: string): [number, number, number] {
    if (!hex || typeof hex !== 'string') {
      return [0, 0, 0];
    }

    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? [
          parseInt(result[1], 16),
          parseInt(result[2], 16),
          parseInt(result[3], 16)
        ]
      : [0, 0, 0];
  }

  private toRoman(num: number): string {
    const values = [1000, 900, 500, 400, 100, 90, 50, 40, 10, 9, 5, 4, 1];
    const numerals = [
      'M',
      'CM',
      'D',
      'CD',
      'C',
      'XC',
      'L',
      'XL',
      'X',
      'IX',
      'V',
      'IV',
      'I'
    ];

    let result = '';
    for (let i = 0; i < values.length; i++) {
      while (num >= values[i]) {
        result += numerals[i];
        num -= values[i];
      }
    }
    return result.toLowerCase();
  }

  /**
   * Export with file download
   */
  async exportToFile(documentModel: DocumentModel): Promise<void> {
    const blob = await this.exportToPdf(documentModel);
    const filename = `${documentModel.metadata.title || 'document'}.pdf`;

    this.downloadBlob(blob, filename);
  }

  /**
   * Helper to download blob as file
   */
  private downloadBlob(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);
  }
}
