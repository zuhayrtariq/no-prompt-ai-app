// PDF Text Extractor for Quick Fixer approach
// Uses pdf-lib for text extraction and structure analysis

interface ExtractedPage {
  pageNumber: number;
  text: string;
  structure: {
    paragraphs: string[];
    headings: Array<{ level: number; text: string }>;
    tables: Array<{ rows: string[][] }>;
  };
}

interface ExtractedContent {
  pages: ExtractedPage[];
  metadata: {
    title?: string;
    author?: string;
    pageCount: number;
  };
}

interface ExportResult {
  data: Uint8Array | string;
  filename: string;
  mimeType: string;
}

export class PdfTextExtractor {
  private pdfDocument: any = null;

  async extractFromUrl(url: string): Promise<ExtractedContent> {
    try {
      // Dynamic import to avoid SSR issues
      const pdfjsLib = await import('pdfjs-dist');

      // Configure worker
      if (
        typeof window !== 'undefined' &&
        !pdfjsLib.GlobalWorkerOptions.workerSrc
      ) {
        pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';
      }

      console.log('Loading PDF from URL:', url);
      this.pdfDocument = await pdfjsLib.getDocument(url).promise;

      const pageCount = this.pdfDocument.numPages;
      console.log(`PDF loaded successfully. Total pages: ${pageCount}`);

      const pages: ExtractedPage[] = [];

      // Extract text from each page
      for (let pageNumber = 1; pageNumber <= pageCount; pageNumber++) {
        console.log(`Processing page ${pageNumber}/${pageCount}`);
        const pageData = await this.extractPageText(pageNumber);
        pages.push(pageData);
      }

      // Get metadata
      const metadata = await this.extractMetadata();

      return {
        pages,
        metadata: {
          ...metadata,
          pageCount
        }
      };
    } catch (error) {
      console.error('Failed to extract PDF text:', error);
      throw new Error(
        `PDF text extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  private async extractPageText(pageNumber: number): Promise<ExtractedPage> {
    try {
      const page = await this.pdfDocument.getPage(pageNumber);
      const textContent = await page.getTextContent();

      // Extract raw text
      const rawText = textContent.items
        .map((item: any) => item.str)
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim();

      // Analyze structure
      const structure = this.analyzeTextStructure(textContent.items, rawText);

      return {
        pageNumber,
        text: rawText,
        structure
      };
    } catch (error) {
      console.error(`Failed to extract text from page ${pageNumber}:`, error);
      return {
        pageNumber,
        text: '',
        structure: {
          paragraphs: [],
          headings: [],
          tables: []
        }
      };
    }
  }

  private analyzeTextStructure(textItems: any[], rawText: string) {
    const structure = {
      paragraphs: [] as string[],
      headings: [] as Array<{ level: number; text: string }>,
      tables: [] as Array<{ rows: string[][] }>
    };

    try {
      // Group text items by position to identify structure
      const lines = this.groupTextIntoLines(textItems);

      // Identify headings, paragraphs, and tables
      for (const line of lines) {
        const lineText = line.text.trim();
        if (!lineText) continue;

        if (this.isHeading(line)) {
          const level = this.getHeadingLevel(line);
          structure.headings.push({ level, text: lineText });
        } else if (this.isTableRow(line)) {
          // Handle table detection (basic implementation)
          const cells = lineText.split(/\s{3,}|\t/); // Split on multiple spaces or tabs
          if (cells.length > 1) {
            // Add to last table or create new one
            if (structure.tables.length > 0) {
              structure.tables[structure.tables.length - 1].rows.push(cells);
            } else {
              structure.tables.push({ rows: [cells] });
            }
          }
        } else {
          // Regular paragraph
          structure.paragraphs.push(lineText);
        }
      }

      // If no specific structure found, split raw text into paragraphs
      if (
        structure.paragraphs.length === 0 &&
        structure.headings.length === 0
      ) {
        structure.paragraphs = rawText
          .split(/\n\s*\n/) // Split on double line breaks
          .filter((p) => p.trim().length > 0)
          .map((p) => p.replace(/\s+/g, ' ').trim());
      }
    } catch (error) {
      console.warn(
        'Structure analysis failed, using simple paragraph split:',
        error
      );
      // Fallback: simple paragraph splitting
      structure.paragraphs = rawText
        .split(/[.!?]+\s+/)
        .filter((p) => p.trim().length > 10); // Only keep substantial paragraphs
    }

    return structure;
  }

  private groupTextIntoLines(textItems: any[]) {
    const lines: Array<{
      text: string;
      fontSize: number;
      y: number;
      items: any[];
    }> = [];

    // Sort items by Y position (top to bottom)
    const sortedItems = textItems.sort(
      (a, b) => b.transform[5] - a.transform[5]
    );

    let currentLine: any[] = [];
    let currentY = -1;
    const tolerance = 5; // Y-position tolerance for same line

    for (const item of sortedItems) {
      const itemY = Math.round(item.transform[5]);

      if (currentY === -1 || Math.abs(itemY - currentY) <= tolerance) {
        // Same line
        currentLine.push(item);
        currentY = itemY;
      } else {
        // New line
        if (currentLine.length > 0) {
          lines.push(this.processLine(currentLine));
        }
        currentLine = [item];
        currentY = itemY;
      }
    }

    // Don't forget the last line
    if (currentLine.length > 0) {
      lines.push(this.processLine(currentLine));
    }

    return lines;
  }

  private processLine(items: any[]) {
    // Sort items in line by X position (left to right)
    const sortedItems = items.sort((a, b) => a.transform[4] - b.transform[4]);

    const text = sortedItems.map((item) => item.str).join(' ');
    const fontSize = Math.max(
      ...sortedItems.map((item) => Math.abs(item.transform[3]) || 12)
    );
    const y = sortedItems[0].transform[5];

    return { text, fontSize, y, items: sortedItems };
  }

  private isHeading(line: any): boolean {
    // Simple heuristics for heading detection
    const text = line.text.trim();

    // Check font size (larger = more likely heading)
    const isLargeFont = line.fontSize > 14;

    // Check if line is short (typical for headings)
    const isShortLine = text.length < 100;

    // Check for heading patterns
    const hasHeadingPattern =
      /^(chapter|section|\d+\.|\d+\.\d+|[A-Z][A-Z\s]{10,})/i.test(text);

    // Check if all caps (common for headings)
    const isAllCaps = text === text.toUpperCase() && text.length > 3;

    return (isLargeFont && isShortLine) || hasHeadingPattern || isAllCaps;
  }

  private getHeadingLevel(line: any): number {
    // Determine heading level based on font size and patterns
    if (line.fontSize > 20) return 1;
    if (line.fontSize > 16) return 2;
    if (line.fontSize > 14) return 3;

    // Pattern-based level detection
    if (/^\d+\./.test(line.text)) return 2;
    if (/^\d+\.\d+/.test(line.text)) return 3;

    return 2; // Default to h2
  }

  private isTableRow(line: any): boolean {
    // Simple table detection heuristics
    const text = line.text.trim();

    // Check for multiple columns (separated by multiple spaces/tabs)
    const hasMulitpleColumns = /\s{3,}|\t/.test(text);

    // Check for numbers and short text (common in tables)
    const hasNumbers = /\d/.test(text);
    const hasShortSegments = text
      .split(/\s{3,}|\t/)
      .some((segment) => segment.length < 20);

    return hasMulitpleColumns && (hasNumbers || hasShortSegments);
  }

  private async extractMetadata() {
    try {
      const metadata = await this.pdfDocument.getMetadata();
      return {
        title: metadata.info?.Title || undefined,
        author: metadata.info?.Author || undefined
      };
    } catch (error) {
      console.warn('Failed to extract metadata:', error);
      return {};
    }
  }

  async exportContent(
    htmlContent: string,
    format: 'docx' | 'pdf' | 'markdown'
  ): Promise<ExportResult> {
    switch (format) {
      case 'docx':
        return this.exportToDocx(htmlContent);
      case 'pdf':
        return this.exportToPdf(htmlContent);
      case 'markdown':
        return this.exportToMarkdown(htmlContent);
      default:
        throw new Error(`Unsupported export format: ${format}`);
    }
  }

  private async exportToDocx(htmlContent: string): Promise<ExportResult> {
    // For now, return a simple text version
    // In a real implementation, you'd use libraries like 'docx' or 'html-docx-js'
    const textContent = this.htmlToText(htmlContent);
    const data = new TextEncoder().encode(textContent);

    return {
      data,
      filename: `edited-document-${Date.now()}.txt`, // Would be .docx with proper implementation
      mimeType: 'text/plain' // Would be 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    };
  }

  private async exportToPdf(htmlContent: string): Promise<ExportResult> {
    // For now, return HTML
    // In a real implementation, you'd use libraries like 'jspdf' with html2canvas
    const data = new TextEncoder().encode(htmlContent);

    return {
      data,
      filename: `edited-document-${Date.now()}.html`, // Would be .pdf with proper implementation
      mimeType: 'text/html' // Would be 'application/pdf'
    };
  }

  private async exportToMarkdown(htmlContent: string): Promise<ExportResult> {
    // Convert HTML to Markdown
    const markdown = this.htmlToMarkdown(htmlContent);
    const data = new TextEncoder().encode(markdown);

    return {
      data,
      filename: `edited-document-${Date.now()}.md`,
      mimeType: 'text/markdown'
    };
  }

  private htmlToText(html: string): string {
    // Simple HTML to text conversion
    return html
      .replace(/<[^>]*>/g, '') // Remove HTML tags
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private htmlToMarkdown(html: string): string {
    // Simple HTML to Markdown conversion
    let markdown = html;

    // Headers
    markdown = markdown.replace(/<h1[^>]*>(.*?)<\/h1>/gi, '# $1\n\n');
    markdown = markdown.replace(/<h2[^>]*>(.*?)<\/h2>/gi, '## $1\n\n');
    markdown = markdown.replace(/<h3[^>]*>(.*?)<\/h3>/gi, '### $1\n\n');

    // Paragraphs
    markdown = markdown.replace(/<p[^>]*>(.*?)<\/p>/gi, '$1\n\n');

    // Bold and italic
    markdown = markdown.replace(/<strong[^>]*>(.*?)<\/strong>/gi, '**$1**');
    markdown = markdown.replace(/<em[^>]*>(.*?)<\/em>/gi, '*$1*');

    // Remove remaining HTML tags
    markdown = markdown.replace(/<[^>]*>/g, '');

    // Clean up spacing
    markdown = markdown.replace(/\n{3,}/g, '\n\n');

    return markdown.trim();
  }
}
