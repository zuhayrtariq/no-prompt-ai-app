/**
 * DOCX Exporter
 * Converts DocumentModel to DOCX format using docx library
 */

import {
  Document,
  Packer,
  Paragraph,
  Table,
  TableRow,
  TableCell,
  TextRun,
  HeadingLevel,
  AlignmentType,
  WidthType
} from 'docx';

import {
  DocumentModel,
  BlockModel,
  TableContent,
  ListContent,
  ImageContent,
  TextAlign
} from '../document-model';

export class DocxExporter {
  /**
   * Export DocumentModel to DOCX blob
   */
  async exportToDocx(documentModel: DocumentModel): Promise<Blob> {
    const doc = new Document({
      sections: [
        {
          properties: {},
          children: this.convertDocumentToElements(documentModel)
        }
      ]
    });

    return await Packer.toBlob(doc);
  }

  /**
   * Convert entire document to DOCX elements
   */
  private convertDocumentToElements(
    documentModel: DocumentModel
  ): (Paragraph | Table)[] {
    const elements: (Paragraph | Table)[] = [];

    // Add document title
    if (documentModel.metadata.title) {
      elements.push(
        new Paragraph({
          children: [
            new TextRun({
              text: documentModel.metadata.title,
              bold: true,
              size: 28 // 14pt
            })
          ],
          alignment: AlignmentType.CENTER,
          spacing: {
            after: 400 // 20pt spacing after
          }
        })
      );
    }

    // Add metadata
    if (documentModel.metadata.author) {
      elements.push(
        new Paragraph({
          children: [
            new TextRun({
              text: `By ${documentModel.metadata.author}`,
              italics: true,
              size: 22 // 11pt
            })
          ],
          alignment: AlignmentType.CENTER,
          spacing: {
            after: 600 // 30pt spacing after
          }
        })
      );
    }

    // Process each page
    documentModel.pages.forEach((page, pageIndex) => {
      // Add page break for subsequent pages
      if (pageIndex > 0) {
        elements.push(
          new Paragraph({
            children: [new TextRun({ text: '', break: 1 })],
            pageBreakBefore: true
          })
        );
      }

      // Sort blocks by position
      const sortedBlocks = page.blocks.sort((a, b) => {
        const yDiff = a.position.y - b.position.y;
        if (Math.abs(yDiff) > 10) return yDiff;
        return a.position.x - b.position.x;
      });

      // Convert each block
      sortedBlocks.forEach((block) => {
        const blockElements = this.blockToDocxElements(block);
        elements.push(...blockElements);
      });
    });

    return elements;
  }

  /**
   * Convert a single block to DOCX elements
   */
  private blockToDocxElements(block: BlockModel): (Paragraph | Table)[] {
    switch (block.type) {
      case 'heading':
        return [this.headingToDocx(block)];
      case 'paragraph':
        return [this.paragraphToDocx(block)];
      case 'list':
        return this.listToDocx(block);
      case 'table':
        return [this.tableToDocx(block)];
      case 'quote':
        return [this.quoteToDocx(block)];
      case 'code':
        return [this.codeToDocx(block)];
      default:
        return [this.paragraphToDocx(block)];
    }
  }

  /**
   * Convert heading block to DOCX paragraph
   */
  private headingToDocx(block: BlockModel): Paragraph {
    const content = typeof block.content === 'string' ? block.content : '';
    const level = block.style.headingLevel || 1;

    // Map heading levels to DOCX heading levels
    const headingLevelMap: Record<number, HeadingLevel> = {
      1: HeadingLevel.HEADING_1,
      2: HeadingLevel.HEADING_2,
      3: HeadingLevel.HEADING_3,
      4: HeadingLevel.HEADING_4,
      5: HeadingLevel.HEADING_5,
      6: HeadingLevel.HEADING_6
    };

    return new Paragraph({
      children: [
        new TextRun({
          text: content,
          bold: true,
          size: this.getFontSizeInHalfPoints(block.style.fontSize),
          color: this.hexToDocxColor(block.style.color)
        })
      ],
      heading: headingLevelMap[level] || HeadingLevel.HEADING_2,
      alignment: this.convertAlignment(block.style.textAlign),
      spacing: {
        before: 240, // 12pt before
        after: 120 // 6pt after
      }
    });
  }

  /**
   * Convert paragraph block to DOCX paragraph
   */
  private paragraphToDocx(block: BlockModel): Paragraph {
    const content = typeof block.content === 'string' ? block.content : '';

    return new Paragraph({
      children: [
        new TextRun({
          text: content,
          bold: block.style.fontWeight === 'bold',
          italics: block.style.fontStyle === 'italic',
          size: this.getFontSizeInHalfPoints(block.style.fontSize),
          color: this.hexToDocxColor(block.style.color),
          font: this.cleanFontFamily(block.style.fontFamily)
        })
      ],
      alignment: this.convertAlignment(block.style.textAlign),
      spacing: {
        after: 120, // 6pt after
        line: Math.round(block.style.lineHeight * 240) // Convert to twentieths of a point
      }
    });
  }

  /**
   * Convert list block to DOCX paragraphs
   */
  private listToDocx(block: BlockModel): Paragraph[] {
    const listContent = block.content as ListContent;
    const paragraphs: Paragraph[] = [];

    listContent.items.forEach((item, index) => {
      let bulletText: string;

      switch (listContent.type) {
        case 'numbered':
          bulletText = `${index + 1}. `;
          break;
        case 'alpha':
          bulletText = `${String.fromCharCode(97 + index)}. `;
          break;
        case 'roman':
          bulletText = `${this.toRoman(index + 1)}. `;
          break;
        default:
          bulletText = '• ';
      }

      paragraphs.push(
        new Paragraph({
          children: [
            new TextRun({
              text: bulletText + item.content,
              size: this.getFontSizeInHalfPoints(block.style.fontSize),
              color: this.hexToDocxColor(block.style.color)
            })
          ],
          indent: {
            left: item.level * 720 // 0.5 inch per level
          },
          spacing: {
            after: 60 // 3pt after
          }
        })
      );
    });

    return paragraphs;
  }

  /**
   * Convert table block to DOCX table
   */
  private tableToDocx(block: BlockModel): Table {
    const tableContent = block.content as TableContent;

    const rows: TableRow[] = tableContent.rows.map((row, rowIndex) => {
      const cells: TableCell[] = row.cells.map((cell) => {
        return new TableCell({
          children: [
            new Paragraph({
              children: [
                new TextRun({
                  text: cell.content,
                  bold: rowIndex === 0 && tableContent.hasHeader,
                  size: this.getFontSizeInHalfPoints(block.style.fontSize)
                })
              ]
            })
          ],
          width: {
            size: 100 / tableContent.columnCount,
            type: WidthType.PERCENTAGE
          }
        });
      });

      return new TableRow({
        children: cells
      });
    });

    return new Table({
      rows,
      width: {
        size: 100,
        type: WidthType.PERCENTAGE
      }
    });
  }

  /**
   * Convert quote block to DOCX paragraph
   */
  private quoteToDocx(block: BlockModel): Paragraph {
    const content = typeof block.content === 'string' ? block.content : '';

    return new Paragraph({
      children: [
        new TextRun({
          text: content,
          italics: true,
          size: this.getFontSizeInHalfPoints(block.style.fontSize),
          color: this.hexToDocxColor(block.style.color)
        })
      ],
      indent: {
        left: 720, // 0.5 inch indent
        right: 720
      },
      spacing: {
        before: 120,
        after: 120
      },
      border: {
        left: {
          style: 'single',
          size: 6,
          color: 'CCCCCC'
        }
      }
    });
  }

  /**
   * Convert code block to DOCX paragraph
   */
  private codeToDocx(block: BlockModel): Paragraph {
    const content = typeof block.content === 'string' ? block.content : '';

    return new Paragraph({
      children: [
        new TextRun({
          text: content,
          font: 'Consolas',
          size: this.getFontSizeInHalfPoints(block.style.fontSize),
          color: this.hexToDocxColor(block.style.color)
        })
      ],
      shading: {
        type: 'clear',
        color: 'F5F5F5'
      },
      spacing: {
        before: 120,
        after: 120
      }
    });
  }

  /**
   * Helper functions
   */

  private getFontSizeInHalfPoints(fontSize: number): number {
    return fontSize * 2; // Convert to half-points
  }

  private hexToDocxColor(hex: string): string {
    return hex.replace('#', '').toUpperCase();
  }

  private convertAlignment(textAlign: TextAlign): AlignmentType {
    switch (textAlign) {
      case 'left':
        return AlignmentType.LEFT;
      case 'center':
        return AlignmentType.CENTER;
      case 'right':
        return AlignmentType.RIGHT;
      case 'justify':
        return AlignmentType.JUSTIFIED;
      default:
        return AlignmentType.LEFT;
    }
  }

  private cleanFontFamily(fontFamily: string): string {
    // Extract first font family name, remove fallbacks
    return fontFamily.split(',')[0].trim().replace(/['"]/g, '');
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
    const blob = await this.exportToDocx(documentModel);
    const filename = `${documentModel.metadata.title || 'document'}.docx`;

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
