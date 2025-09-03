/**
 * PDF Parser for Document Model approach
 * Parses PDFs into structured DocumentModel using PDF.js
 */

import {
  DocumentModel,
  PageModel,
  ParsedTextItem,
  TextLine,
  DocumentModelUtils,
  DocumentMetadata,
  PageDimensions,
  PageMetadata,
  FontWeight,
  FontStyle
} from './document-model';
import { BlockDetector } from './block-detector';

export class PdfParser {
  private blockDetector: BlockDetector;

  constructor() {
    this.blockDetector = new BlockDetector();
  }

  /**
   * Main entry point: Parse a PDF from URL into DocumentModel
   */
  async parsePdfToModel(
    fileUrl: string,
    fileName?: string
  ): Promise<DocumentModel> {
    try {
      console.log('🚀 Starting PDF parsing for:', fileName || fileUrl);

      // Fetch original PDF bytes for later modification
      const originalPdfBytes = await fetch(fileUrl).then((response) =>
        response.arrayBuffer()
      );

      // Load PDF document
      const pdfDocument = await this.loadPdfDocument(fileUrl);
      console.log(`📄 PDF loaded: ${pdfDocument.numPages} pages`);

      // Extract metadata
      const metadata = await this.extractDocumentMetadata(
        pdfDocument,
        fileName
      );
      // Store original PDF bytes for modification export
      metadata.originalPdfBytes = originalPdfBytes;

      // Parse each page
      const pages: PageModel[] = [];
      for (
        let pageNumber = 1;
        pageNumber <= pdfDocument.numPages;
        pageNumber++
      ) {
        console.log(`📝 Parsing page ${pageNumber}/${pdfDocument.numPages}`);
        const pageModel = await this.parsePage(pdfDocument, pageNumber);
        pages.push(pageModel);
      }

      const documentModel: DocumentModel = {
        id: DocumentModelUtils.generateId(),
        metadata: {
          ...metadata,
          pageCount: pages.length
        },
        pages,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      console.log('✅ PDF parsing complete:', {
        pages: pages.length,
        totalBlocks: pages.reduce((sum, page) => sum + page.blocks.length, 0)
      });

      return documentModel;
    } catch (error) {
      console.error('❌ PDF parsing failed:', error);
      throw new Error(
        `Failed to parse PDF: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Load PDF document using PDF.js
   */
  private async loadPdfDocument(fileUrl: string): Promise<any> {
    try {
      // Dynamic import to avoid SSR issues
      const pdfjsLib = await import('pdfjs-dist');

      // Configure worker if not already set
      if (
        typeof window !== 'undefined' &&
        !pdfjsLib.GlobalWorkerOptions.workerSrc
      ) {
        pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';
      }

      // Load the PDF
      const loadingTask = pdfjsLib.getDocument(fileUrl);
      return await loadingTask.promise;
    } catch (error) {
      throw new Error(`Failed to load PDF document: ${error}`);
    }
  }

  /**
   * Extract document-level metadata
   */
  private async extractDocumentMetadata(
    pdfDocument: any,
    fileName?: string
  ): Promise<DocumentMetadata> {
    try {
      const pdfMetadata = await pdfDocument.getMetadata();

      return {
        title:
          pdfMetadata.info?.Title ||
          fileName?.replace(/\\.pdf$/i, '') ||
          'Untitled Document',
        author: pdfMetadata.info?.Author || undefined,
        originalFileName: fileName,
        language: pdfMetadata.info?.Language || 'en',
        pageCount: pdfDocument.numPages
      };
    } catch (error) {
      console.warn('⚠️ Failed to extract PDF metadata:', error);
      return {
        title: fileName?.replace(/\\.pdf$/i, '') || 'Untitled Document',
        pageCount: pdfDocument.numPages
      };
    }
  }

  /**
   * Parse a single page into PageModel
   */
  private async parsePage(
    pdfDocument: any,
    pageNumber: number
  ): Promise<PageModel> {
    try {
      const page = await pdfDocument.getPage(pageNumber);
      const viewport = page.getViewport({ scale: 1.0 });

      // Extract text content with positioning
      const textContent = await page.getTextContent();
      console.log(
        `🔤 Extracted ${textContent.items.length} text items from page ${pageNumber}`,
        textContent
      );
      const parsedTextItems = this.parseTextContent(textContent, viewport);

      // Group text items into lines
      const textLines = this.groupTextIntoLines(parsedTextItems);

      // Detect blocks using block detector
      const blocks = this.blockDetector.detectBlocks(textLines, pageNumber);

      console.log(
        `📄 Page ${pageNumber}: ${parsedTextItems.length} text items → ${textLines.length} lines → ${blocks.length} blocks`
      );

      return {
        pageNumber,
        blocks,
        dimensions: {
          width: viewport.width,
          height: viewport.height,
          scale: 1.0
        },
        metadata: {
          rotation: page.rotate || 0,
          originalDimensions: {
            width: viewport.width,
            height: viewport.height
          }
        }
      };
    } catch (error) {
      console.error(`❌ Failed to parse page ${pageNumber}:`, error);
      throw new Error(`Failed to parse page ${pageNumber}: ${error}`);
    }
  }

  /**
   * Parse PDF.js textContent into structured text items
   */
  private parseTextContent(textContent: any, viewport: any): ParsedTextItem[] {
    const parsedItems: ParsedTextItem[] = [];

    textContent.items.forEach((item: any, index: number) => {
      if (!item.str || !item.str.trim()) return;

      try {
        // Get transformation matrix
        const transform = item.transform;
        const fontSize = Math.abs(transform[3]) || 12;
        const fontWeight = this.determineFontWeight(item, fontSize);
        const fontStyle = this.determineFontStyle(item);

        // Calculate position and dimensions
        const x = transform[4];
        const y = viewport.height - transform[5]; // Convert to top-left origin
        const width = item.width || item.str.length * fontSize * 0.6;
        const height = fontSize;

        const parsedItem: ParsedTextItem = {
          text: item.str,
          x,
          y: y - fontSize, // Adjust for baseline
          width,
          height,
          fontSize,
          fontWeight,
          fontStyle,
          color: this.parseColor(item) || '#000000',
          fontFamily: item.fontName || 'Arial'
        };

        parsedItems.push(parsedItem);
      } catch (error) {
        console.warn(`⚠️ Failed to parse text item ${index}:`, error);
      }
    });

    return parsedItems.sort((a, b) => a.y - b.y || a.x - b.x);
  }

  /**
   * Group individual text items into logical lines
   */
  private groupTextIntoLines(textItems: ParsedTextItem[]): TextLine[] {
    if (textItems.length === 0) return [];

    const lines: TextLine[] = [];
    const tolerance = 5; // Y-position tolerance for same line

    let currentLine: ParsedTextItem[] = [];
    let currentY = textItems[0].y;
    console.log({ currentY });
    for (const item of textItems) {
      if (Math.abs(item.y - currentY) <= tolerance) {
        // Same line - add to current line
        currentLine.push(item);
      } else {
        // New line - process current line and start new one
        if (currentLine.length > 0) {
          lines.push(this.createTextLine(currentLine));
        }
        currentLine = [item];
        currentY = item.y;
      }
    }

    // Don't forget the last line
    if (currentLine.length > 0) {
      lines.push(this.createTextLine(currentLine));
    }

    return lines;
  }

  /**
   * Create a TextLine from a group of text items
   */
  private createTextLine(items: ParsedTextItem[]): TextLine {
    // Sort items by X position for correct reading order
    const sortedItems = items.sort((a, b) => a.x - b.x);

    // Smart text joining - only add spaces where needed
    const text = this.joinTextItemsIntelligently(sortedItems);
    const y = Math.min(...sortedItems.map((item) => item.y));
    const height = Math.max(...sortedItems.map((item) => item.height));
    const averageFontSize =
      sortedItems.reduce((sum, item) => sum + item.fontSize, 0) /
      sortedItems.length;

    const bounds = {
      left: Math.min(...sortedItems.map((item) => item.x)),
      right: Math.max(...sortedItems.map((item) => item.x + item.width)),
      top: Math.min(...sortedItems.map((item) => item.y)),
      bottom: Math.max(...sortedItems.map((item) => item.y + item.height))
    };

    return {
      items: sortedItems,
      text: text.trim(),
      y,
      height,
      averageFontSize,
      bounds
    };
  }

  /**
   * Intelligently join text items, avoiding unnecessary spaces
   */
  private joinTextItemsIntelligently(items: ParsedTextItem[]): string {
    if (items.length === 0) return '';
    if (items.length === 1) return items[0].text;

    let result = '';
    for (let i = 0; i < items.length; i++) {
      const currentItem = items[i];
      const nextItem = items[i + 1];

      result += currentItem.text;

      // Only add space if we should separate these items
      if (nextItem && this.shouldAddSpaceBetween(currentItem, nextItem)) {
        result += ' ';
      }
    }

    return result.trim();
  }

  /**
   * Determine if we should add a space between two text items
   */
  private shouldAddSpaceBetween(
    current: ParsedTextItem,
    next: ParsedTextItem
  ): boolean {
    const gap = next.x - (current.x + current.width);
    const avgFontSize = (current.fontSize + next.fontSize) / 2;

    // Smarter gap detection
    const smallGapThreshold = avgFontSize * 0.15; // Very close = no space (for spaced letters)
    const largeGapThreshold = avgFontSize * 0.4; // Normal gap = add space (between words)

    console.log(
      `Gap analysis: gap=${gap.toFixed(1)}, fontSize=${avgFontSize.toFixed(1)}, small=${smallGapThreshold.toFixed(1)}, large=${largeGapThreshold.toFixed(1)}`
    );

    // If gap is tiny, definitely no space (spaced letters like "m i x e d")
    if (gap <= smallGapThreshold) return false;

    // If gap is reasonable, add space (between words)
    if (gap >= largeGapThreshold) return true;

    // For medium gaps, check if we have word boundaries
    const currentEndsWithAlphanumeric = /[a-zA-Z0-9]$/.test(
      current.text.trim()
    );
    const nextStartsWithAlphanumeric = /^[a-zA-Z0-9]/.test(next.text.trim());

    // If both are alphanumeric with medium gap, probably separate words/tokens
    return currentEndsWithAlphanumeric && nextStartsWithAlphanumeric;
  }

  /**
   * Determine font weight from PDF text item
   */
  private determineFontWeight(item: any, fontSize: number): FontWeight {
    const fontName = (item.fontName || '').toLowerCase();

    // Check for common bold indicators
    if (
      fontName.includes('bold') ||
      fontName.includes('heavy') ||
      fontName.includes('black')
    ) {
      return 'bold';
    }

    // Check for light/thin indicators
    if (fontName.includes('light') || fontName.includes('thin')) {
      return '300';
    }

    // Check if font size suggests a heading (heuristic)
    if (fontSize > 16) {
      return 'bold';
    }

    return 'normal';
  }

  /**
   * Determine font style from PDF text item
   */
  private determineFontStyle(item: any): FontStyle {
    const fontName = (item.fontName || '').toLowerCase();

    if (fontName.includes('italic') || fontName.includes('oblique')) {
      return 'italic';
    }

    return 'normal';
  }

  /**
   * Parse color from PDF text item
   */
  private parseColor(item: any): string | undefined {
    // PDF.js sometimes provides color information
    // This is a simplified implementation - real PDFs can have complex color spaces
    if (item.color && Array.isArray(item.color)) {
      const [r, g, b] = item.color;
      return `rgb(${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(b * 255)})`;
    }

    return undefined; // Will use default black
  }

  /**
   * Clean up resources
   */
  dispose(): void {
    // Clean up any resources if needed
    console.log('🧹 PDF parser resources cleaned up');
  }
}

/**
 * Utility functions for PDF parsing
 */
export class PdfParserUtils {
  /**
   * Estimate reading order confidence based on text layout
   */
  static estimateReadingOrder(lines: TextLine[]): number {
    if (lines.length < 2) return 1.0;

    let verticallyAligned = 0;
    let totalComparisons = 0;

    for (let i = 0; i < lines.length - 1; i++) {
      const line1 = lines[i];
      const line2 = lines[i + 1];

      // Check if lines are roughly left-aligned
      if (Math.abs(line1.bounds.left - line2.bounds.left) < 10) {
        verticallyAligned++;
      }
      totalComparisons++;
    }

    return totalComparisons > 0 ? verticallyAligned / totalComparisons : 1.0;
  }

  /**
   * Detect likely language based on text content
   */
  static detectLanguage(textLines: TextLine[]): string {
    const allText = textLines
      .map((line) => line.text)
      .join(' ')
      .toLowerCase();

    // Simple language detection heuristics
    const commonEnglishWords = [
      'the',
      'and',
      'or',
      'but',
      'in',
      'on',
      'at',
      'to',
      'for',
      'of',
      'with',
      'by'
    ];
    const englishMatches = commonEnglishWords.filter((word) =>
      allText.includes(word)
    ).length;

    if (englishMatches >= 3) return 'en';

    // Add more language detection logic as needed
    return 'unknown';
  }

  /**
   * Calculate text density for layout analysis
   */
  static calculateTextDensity(
    lines: TextLine[],
    pageWidth: number,
    pageHeight: number
  ): number {
    const totalTextArea = lines.reduce((sum, line) => {
      const area = (line.bounds.right - line.bounds.left) * line.height;
      return sum + area;
    }, 0);

    const pageArea = pageWidth * pageHeight;
    return pageArea > 0 ? totalTextArea / pageArea : 0;
  }
}
