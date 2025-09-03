/**
 * PDF-lib Exporter
 * Modifies original PDF while preserving images, fonts, and layout
 */

import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { DocumentModel, BlockModel } from '../document-model';

export class PdfLibExporter {
  /**
   * Export DocumentModel by modifying the original PDF
   */
  async exportModifiedPdf(
    originalPdfBytes: ArrayBuffer,
    documentModel: DocumentModel
  ): Promise<Blob> {
    try {
      console.log('📄 Loading original PDF for modification...');

      // Load the original PDF
      const pdfDoc = await PDFDocument.load(originalPdfBytes);
      const pages = pdfDoc.getPages();

      console.log(`🔧 Modifying ${pages.length} pages with edited blocks...`);

      // Process each page
      for (
        let pageIndex = 0;
        pageIndex < documentModel.pages.length && pageIndex < pages.length;
        pageIndex++
      ) {
        const pageModel = documentModel.pages[pageIndex];
        const pdfPage = pages[pageIndex];

        // Get page dimensions
        const { width: pageWidth, height: pageHeight } = pdfPage.getSize();

        // Find edited blocks
        const editedBlocks = pageModel.blocks.filter(
          (block) => block.metadata.isEdited
        );

        if (editedBlocks.length > 0) {
          console.log(
            `✏️ Page ${pageIndex + 1}: Applying ${editedBlocks.length} edits`
          );

          // Apply each edited block
          for (const block of editedBlocks) {
            console.log(
              `📝 Editing block "${block.content?.toString().substring(0, 30)}..." at position (${block.position.x}, ${block.position.y}) size ${block.position.width}x${block.position.height}`
            );
            await this.applyBlockEdit(pdfPage, block, pageHeight);
          }
        }
      }

      // Save the modified PDF
      const pdfBytes = await pdfDoc.save();
      console.log('✅ PDF modification complete');

      return new Blob([pdfBytes], { type: 'application/pdf' });
    } catch (error) {
      console.error('❌ PDF modification failed:', error);
      throw new Error(
        `Failed to modify PDF: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Apply a single block edit to a PDF page
   */
  private async applyBlockEdit(
    pdfPage: any,
    block: BlockModel,
    pageHeight: number
  ): Promise<void> {
    try {
      console.log(`🔧 Applying block edit for block ${block.id}`);
      console.log(`📊 Page height: ${pageHeight}`);
      console.log(
        `📊 Block position: x=${block.position.x}, y=${block.position.y}, w=${block.position.width}, h=${block.position.height}`
      );

      const content =
        typeof block.content === 'string'
          ? block.content
          : this.getBlockTextContent(block);
      console.log(`📝 Content to draw: "${content}"`);

      if (!content.trim()) {
        console.log(`⚠️ Skipping empty content for block ${block.id}`);
        return;
      }

      // PDF coordinate system: (0,0) is bottom-left, Y increases upward
      // Block position from PDF.js: (0,0) is top-left, Y increases downward
      const pdfY = pageHeight - block.position.y - block.position.height;
      console.log(`🔄 Converted Y coordinate: ${block.position.y} → ${pdfY}`);

      // Step 1: Cover the original text with a white rectangle
      const padding = 2;
      pdfPage.drawRectangle({
        x: Math.max(0, block.position.x - padding),
        y: Math.max(0, pdfY - padding),
        width: block.position.width + padding * 2,
        height: block.position.height + padding * 2,
        color: rgb(1, 1, 1) // White background to cover original text
      });
      console.log(`✅ White cover rectangle drawn`);

      // Step 2: Get appropriate font
      const font = await this.getFont(pdfPage.doc, block);
      console.log(`✅ Font loaded: ${font.name || 'Unknown'}`);

      // Step 3: Calculate font size - use a more conservative approach
      let fontSize = Math.max(8, Math.min(block.position.height * 0.6, 14));
      if (block.type === 'heading') {
        fontSize = Math.max(10, Math.min(block.position.height * 0.7, 18));
      }
      console.log(`📏 Calculated font size: ${fontSize}`);

      // Step 4: Get text color
      const colorValues = this.getTextColor(block);
      const textColor = rgb(colorValues.r, colorValues.g, colorValues.b);
      console.log(
        `🎨 Text color: r=${colorValues.r}, g=${colorValues.g}, b=${colorValues.b}`
      );

      // Step 5: Handle intelligent text wrapping - only wrap if needed
      const lines = this.wrapTextIntelligently(
        content,
        block.position.width,
        fontSize
      );
      console.log(`📄 Text content: "${content}" -> ${lines.length} lines`);

      // Step 6: Draw text using the EXACT rectangle coordinates
      const lineHeight = fontSize * 1.2;

      // Rectangle coordinates (that work perfectly):
      const rectangleX = block.position.x;
      const rectangleY = pdfY; // Bottom edge of rectangle
      const rectangleHeight = block.position.height;

      // Calculate text position relative to rectangle
      const rectangleCenterY = rectangleY + rectangleHeight / 2;

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        // Place text at the center of the rectangle (accounting for text baseline)
        const textY = rectangleCenterY - fontSize / 3 - i * lineHeight; // Each additional line goes down

        console.log(
          `🖊️ Drawing line ${i + 1}: "${line}" at (${rectangleX + 5}, ${textY})`
        );

        pdfPage.drawText(line, {
          x: rectangleX + 5,
          y: textY,
          size: fontSize,
          font: font,
          color: textColor
        });

        // Make sure text stays within block bounds
        if (textY < pdfY) break;
      }

      console.log(`✅ Block edit applied successfully for block ${block.id}`);
    } catch (error) {
      console.error(`❌ Failed to apply edit for block ${block.id}:`, error);
      throw error;
    }
  }

  /**
   * Get appropriate font for the block based on original font characteristics
   */
  private async getFont(pdfDoc: any, block: BlockModel): Promise<any> {
    try {
      console.log(
        `🕰 Font selection for block: type=${block.type}, fontFamily=${block.style?.fontFamily}, weight=${block.style?.fontWeight}, style=${block.style?.fontStyle}`
      );

      // Try to match original font characteristics
      const originalFontFamily = block.style?.fontFamily?.toLowerCase() || '';
      const fontWeight = block.style?.fontWeight || 'normal';
      const fontStyle = block.style?.fontStyle || 'normal';

      // Map original font families to available standard fonts
      if (
        originalFontFamily.includes('courier') ||
        originalFontFamily.includes('mono') ||
        block.type === 'code'
      ) {
        if (fontWeight === 'bold') {
          return await pdfDoc.embedFont(StandardFonts.CourierBold);
        }
        return await pdfDoc.embedFont(StandardFonts.Courier);
      }

      if (
        originalFontFamily.includes('times') ||
        originalFontFamily.includes('serif')
      ) {
        if (fontWeight === 'bold' && fontStyle === 'italic') {
          return await pdfDoc.embedFont(StandardFonts.TimesRomanBoldItalic);
        }
        if (fontWeight === 'bold') {
          return await pdfDoc.embedFont(StandardFonts.TimesRomanBold);
        }
        if (fontStyle === 'italic') {
          return await pdfDoc.embedFont(StandardFonts.TimesRomanItalic);
        }
        return await pdfDoc.embedFont(StandardFonts.TimesRoman);
      }

      // Default to Helvetica family (sans-serif)
      if (fontWeight === 'bold' && fontStyle === 'italic') {
        return await pdfDoc.embedFont(StandardFonts.HelveticaBoldOblique);
      }
      if (fontWeight === 'bold') {
        return await pdfDoc.embedFont(StandardFonts.HelveticaBold);
      }
      if (fontStyle === 'italic') {
        return await pdfDoc.embedFont(StandardFonts.HelveticaOblique);
      }

      return await pdfDoc.embedFont(StandardFonts.Helvetica);
    } catch (error) {
      console.error('❌ Font selection failed, using Helvetica:', error);
      return await pdfDoc.embedFont(StandardFonts.Helvetica);
    }
  }

  /**
   * Get text color for the block
   */
  private getTextColor(block: BlockModel): { r: number; g: number; b: number } {
    // Use block's style color if available
    if (block.style?.color) {
      const color = this.hexToRgb(block.style.color);
      // Ensure text is visible - avoid white text
      if (color.r > 0.9 && color.g > 0.9 && color.b > 0.9) {
        return { r: 0, g: 0, b: 0 }; // Use black instead of white
      }
      return color;
    }

    // Default to black text
    return { r: 0, g: 0, b: 0 };
  }

  /**
   * Convert hex color to RGB values for pdf-lib
   */
  private hexToRgb(hex: string): { r: number; g: number; b: number } {
    if (!hex || typeof hex !== 'string') {
      return { r: 0, g: 0, b: 0 };
    }

    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (result) {
      return {
        r: parseInt(result[1], 16) / 255,
        g: parseInt(result[2], 16) / 255,
        b: parseInt(result[3], 16) / 255
      };
    }

    return { r: 0, g: 0, b: 0 };
  }

  /**
   * Extract text content from complex block types
   */
  private getBlockTextContent(block: BlockModel): string {
    switch (block.type) {
      case 'list':
        const listContent = block.content as any;
        return (
          listContent.items
            ?.map((item: any, index: number) => {
              const marker =
                listContent.type === 'numbered' ? `${index + 1}.` : '•';
              return `${marker} ${item.content}`;
            })
            .join('\n') || ''
        );

      case 'table':
        const tableContent = block.content as any;
        return (
          tableContent.rows
            ?.map((row: any) =>
              row.cells?.map((cell: any) => cell.content).join(' | ')
            )
            .join('\n') || ''
        );

      case 'image':
        const imageContent = block.content as any;
        return `[Image: ${imageContent.alt || 'Untitled'}]`;

      default:
        return typeof block.content === 'string' ? block.content : '';
    }
  }

  /**
   * Intelligent text wrapping - only wrap if text exceeds block width
   */
  private wrapTextIntelligently(
    text: string,
    blockWidth: number,
    fontSize: number
  ): string[] {
    // Estimate text width (rough approximation)
    const avgCharWidth = fontSize * 0.6;
    const estimatedTextWidth = text.length * avgCharWidth;

    // If text fits within block width, don't wrap
    if (estimatedTextWidth <= blockWidth) {
      return [text];
    }

    // Text is too long, wrap it intelligently
    return this.wrapText(text, blockWidth, fontSize);
  }

  /**
   * Smart text wrapping that respects word boundaries
   */
  private wrapText(text: string, maxWidth: number, fontSize: number): string[] {
    const lines: string[] = [];
    const words = text.split(/\s+/);
    let currentLine = '';

    // Estimate character width (more conservative)
    const avgCharWidth = fontSize * 0.55;
    const maxCharsPerLine = Math.floor(maxWidth / avgCharWidth);

    for (const word of words) {
      const testLine = currentLine + (currentLine ? ' ' : '') + word;

      // Check if adding this word would exceed the width
      if (testLine.length <= maxCharsPerLine || currentLine === '') {
        currentLine = testLine;
      } else {
        // Current line is full, start new line
        if (currentLine) {
          lines.push(currentLine.trim());
        }
        currentLine = word;

        // If single word is too long, we may need to break it
        if (word.length > maxCharsPerLine) {
          // Only break very long words (more than twice the line limit)
          if (word.length > maxCharsPerLine * 2) {
            const brokenWord = word.substring(0, maxCharsPerLine - 1) + '-';
            const remainder = word.substring(maxCharsPerLine - 1);
            lines.push(brokenWord);
            currentLine = remainder;
          }
          // Otherwise, just let it overflow slightly rather than break it
        }
      }
    }

    if (currentLine.trim()) {
      lines.push(currentLine.trim());
    }

    return lines.length > 0 ? lines : [text]; // Fallback to original text if something goes wrong
  }

  /**
   * Export with file download
   */
  async exportToFile(
    originalPdfBytes: ArrayBuffer,
    documentModel: DocumentModel
  ): Promise<void> {
    const blob = await this.exportModifiedPdf(originalPdfBytes, documentModel);
    const filename = `${documentModel.metadata.title || 'document'}_edited.pdf`;

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
