/**
 * Markdown Exporter
 * Converts DocumentModel to Markdown format
 */

import {
  DocumentModel,
  BlockModel,
  TableContent,
  ListContent,
  ImageContent
} from '../document-model';

export class MarkdownExporter {
  /**
   * Export DocumentModel to Markdown string
   */
  exportToMarkdown(documentModel: DocumentModel): string {
    const lines: string[] = [];

    // Add document title if available
    if (documentModel.metadata.title) {
      lines.push(`# ${documentModel.metadata.title}`);
      lines.push('');
    }

    // Add document metadata as comments
    lines.push('<!-- Document exported from PDF Editor V2 -->');
    if (documentModel.metadata.author) {
      lines.push(`<!-- Author: ${documentModel.metadata.author} -->`);
    }
    lines.push(`<!-- Generated: ${new Date().toISOString()} -->`);
    lines.push('');

    // Process each page
    documentModel.pages.forEach((page, pageIndex) => {
      if (documentModel.pages.length > 1) {
        lines.push(`<!-- Page ${page.pageNumber} -->`);
        lines.push('');
      }

      // Sort blocks by position (top to bottom, left to right)
      const sortedBlocks = page.blocks.sort((a, b) => {
        const yDiff = a.position.y - b.position.y;
        if (Math.abs(yDiff) > 10) return yDiff;
        return a.position.x - b.position.x;
      });

      // Convert each block
      sortedBlocks.forEach((block, blockIndex) => {
        const markdown = this.blockToMarkdown(block);
        if (markdown.trim()) {
          lines.push(markdown);

          // Add spacing between blocks
          if (blockIndex < sortedBlocks.length - 1) {
            lines.push('');
          }
        }
      });

      // Add page break for multi-page documents
      if (pageIndex < documentModel.pages.length - 1) {
        lines.push('');
        lines.push('---'); // Horizontal rule as page break
        lines.push('');
      }
    });

    return lines.join('\n').trim();
  }

  /**
   * Convert a single block to Markdown
   */
  private blockToMarkdown(block: BlockModel): string {
    switch (block.type) {
      case 'heading':
        return this.headingToMarkdown(block);
      case 'paragraph':
        return this.paragraphToMarkdown(block);
      case 'list':
        return this.listToMarkdown(block);
      case 'table':
        return this.tableToMarkdown(block);
      case 'quote':
        return this.quoteToMarkdown(block);
      case 'code':
        return this.codeToMarkdown(block);
      case 'image':
        return this.imageToMarkdown(block);
      default:
        return this.paragraphToMarkdown(block);
    }
  }

  /**
   * Convert heading block to Markdown
   */
  private headingToMarkdown(block: BlockModel): string {
    const level = block.style.headingLevel || 1;
    const headingPrefix = '#'.repeat(Math.min(level, 6));
    const content = typeof block.content === 'string' ? block.content : '';

    return `${headingPrefix} ${content.trim()}`;
  }

  /**
   * Convert paragraph block to Markdown
   */
  private paragraphToMarkdown(block: BlockModel): string {
    const content = typeof block.content === 'string' ? block.content : '';
    let text = content.trim();

    // Apply formatting based on style
    if (block.style.fontWeight === 'bold') {
      text = `**${text}**`;
    }

    if (block.style.fontStyle === 'italic') {
      text = `*${text}*`;
    }

    return text;
  }

  /**
   * Convert list block to Markdown
   */
  private listToMarkdown(block: BlockModel): string {
    const listContent = block.content as ListContent;
    const lines: string[] = [];

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
          marker = '-'; // bullet
      }

      const indent = '  '.repeat(Math.max(0, item.level - 1));
      lines.push(`${indent}${marker} ${item.content}`);
    });

    return lines.join('\n');
  }

  /**
   * Convert table block to Markdown
   */
  private tableToMarkdown(block: BlockModel): string {
    const tableContent = block.content as TableContent;
    const lines: string[] = [];

    if (tableContent.rows.length === 0) {
      return '';
    }

    // Process each row
    tableContent.rows.forEach((row, rowIndex) => {
      // Build table row
      const cells = row.cells.map((cell) => {
        return cell.content.replace(/\|/g, '\\|').trim() || ' ';
      });

      // Pad cells to column count
      while (cells.length < tableContent.columnCount) {
        cells.push(' ');
      }

      lines.push(`| ${cells.join(' | ')} |`);

      // Add header separator after first row
      if (rowIndex === 0 && tableContent.hasHeader) {
        const separator = Array(tableContent.columnCount)
          .fill('---')
          .join(' | ');
        lines.push(`| ${separator} |`);
      }
    });

    return lines.join('\n');
  }

  /**
   * Convert quote block to Markdown
   */
  private quoteToMarkdown(block: BlockModel): string {
    const content = typeof block.content === 'string' ? block.content : '';
    const lines = content.split('\n');

    return lines.map((line) => `> ${line.trim()}`).join('\n');
  }

  /**
   * Convert code block to Markdown
   */
  private codeToMarkdown(block: BlockModel): string {
    const content = typeof block.content === 'string' ? block.content : '';

    // Use fenced code blocks
    return `\`\`\`\n${content}\n\`\`\``;
  }

  /**
   * Convert image block to Markdown
   */
  private imageToMarkdown(block: BlockModel): string {
    const imageContent = block.content as ImageContent;
    const alt = imageContent.alt || 'Image';
    const src = imageContent.src || '';

    let markdown = `![${alt}](${src})`;

    if (imageContent.caption) {
      markdown += `\n\n*${imageContent.caption}*`;
    }

    return markdown;
  }

  /**
   * Convert number to Roman numeral (for lists)
   */
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
    const markdown = this.exportToMarkdown(documentModel);
    const filename = `${documentModel.metadata.title || 'document'}.md`;

    this.downloadAsFile(markdown, filename, 'text/markdown');
  }

  /**
   * Helper to download content as file
   */
  private downloadAsFile(
    content: string,
    filename: string,
    mimeType: string
  ): void {
    const blob = new Blob([content], { type: mimeType });
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
