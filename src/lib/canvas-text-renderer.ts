/**
 * Canvas Text Renderer
 * Utility for rendering text blocks directly on PDF canvas
 *
 * Features:
 * - Renders text blocks with proper styling
 * - Handles font sizing and positioning
 * - Non-destructive (can be toggled on/off)
 */

import { BlockModel } from './document-model';

interface CanvasRenderOptions {
  scale?: number;
  debug?: boolean;
}

export class CanvasTextRenderer {
  private context: CanvasRenderingContext2D;
  private options: CanvasRenderOptions;

  constructor(
    context: CanvasRenderingContext2D,
    options: CanvasRenderOptions = {}
  ) {
    this.context = context;
    this.options = {
      scale: 1.0,
      debug: false,
      ...options
    };
  }

  /**
   * Render all text blocks on the canvas
   */
  renderTextBlocks(blocks: BlockModel[]): void {
    const textBlocks = blocks.filter(
      (block) => block.type === 'paragraph' || block.type === 'heading'
    );

    for (const block of textBlocks) {
      this.renderTextBlock(block);
    }

    if (this.options.debug) {
      console.log(`🎨 Rendered ${textBlocks.length} text blocks on canvas`);
    }
  }

  /**
   * Render a single text block
   */
  private renderTextBlock(block: BlockModel): void {
    const { context } = this;
    const scale = this.options.scale || 1.0;

    // Get text content
    const text =
      typeof block.content === 'string' ? block.content : 'Text Block';

    // Calculate scaled position and size
    const x = block.position.x * scale;
    const y = block.position.y * scale;
    const width = block.position.width * scale;
    const height = block.position.height * scale;

    // Set font styling
    const fontSize = (block.style?.fontSize || 12) * scale;
    const fontFamily = block.style?.fontFamily || 'Arial';
    const fontWeight = block.style?.fontWeight || 'normal';
    const color = block.style?.color || '#000000';

    context.save();

    try {
      // Set font
      context.font = `${fontWeight} ${fontSize}px ${fontFamily}`;
      context.fillStyle = color;
      context.textBaseline = 'top';

      // Draw background if in debug mode
      if (this.options.debug) {
        context.fillStyle = 'rgba(255, 255, 0, 0.2)';
        context.fillRect(x, y, width, height);
        context.fillStyle = color; // Reset color
      }

      // Handle text wrapping
      this.drawWrappedText(text, x, y, width, fontSize);
    } finally {
      context.restore();
    }
  }

  /**
   * Draw text with word wrapping
   */
  private drawWrappedText(
    text: string,
    x: number,
    y: number,
    maxWidth: number,
    lineHeight: number
  ): void {
    const { context } = this;
    const words = text.split(' ');
    let line = '';
    let currentY = y;
    const padding = 4; // Small padding from edges

    for (let i = 0; i < words.length; i++) {
      const testLine = line + words[i] + ' ';
      const metrics = context.measureText(testLine);
      const testWidth = metrics.width;

      if (testWidth > maxWidth - padding * 2 && i > 0) {
        // Draw current line and start new one
        context.fillText(line.trim(), x + padding, currentY + padding);
        line = words[i] + ' ';
        currentY += lineHeight + 2; // Small line spacing
      } else {
        line = testLine;
      }
    }

    // Draw remaining text
    if (line.trim()) {
      context.fillText(line.trim(), x + padding, currentY + padding);
    }
  }

  /**
   * Clear the entire canvas (for re-rendering)
   */
  clear(width: number, height: number): void {
    this.context.clearRect(0, 0, width, height);
  }

  /**
   * Update rendering options
   */
  updateOptions(options: Partial<CanvasRenderOptions>): void {
    this.options = { ...this.options, ...options };
  }
}

/**
 * Helper function to create and manage canvas text rendering
 */
export function createCanvasTextRenderer(
  canvas: HTMLCanvasElement,
  options?: CanvasRenderOptions
): CanvasTextRenderer | null {
  const context = canvas.getContext('2d');
  if (!context) {
    console.error('❌ Failed to get 2D context from canvas');
    return null;
  }

  return new CanvasTextRenderer(context, options);
}
