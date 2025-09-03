/**
 * Document Model for PDF Editor V2
 * Clean, structured representation of PDF content for editing and export
 */

export interface DocumentModel {
  id: string;
  metadata: DocumentMetadata;
  pages: PageModel[];
  createdAt: Date;
  updatedAt: Date;
}

export interface DocumentMetadata {
  title?: string;
  author?: string;
  pageCount: number;
  originalFileName?: string;
  originalFileSize?: number;
  language?: string;
  originalPdfBytes?: ArrayBuffer; // Store original PDF data for modification
}

export interface PageModel {
  pageNumber: number;
  blocks: BlockModel[];
  dimensions: PageDimensions;
  metadata: PageMetadata;
}

export interface PageDimensions {
  width: number;
  height: number;
  scale: number;
}

export interface PageMetadata {
  rotation: number;
  originalDimensions: { width: number; height: number };
}

export interface BlockModel {
  id: string;
  type: BlockType;
  content: BlockContent;
  position: BlockPosition;
  style: StyleModel;
  metadata: BlockMetadata;
}

export type BlockType =
  | 'paragraph'
  | 'heading'
  | 'table'
  | 'list'
  | 'image'
  | 'quote'
  | 'code';

export type BlockContent =
  | string // For paragraph, heading, quote, code
  | TableContent // For table
  | ListContent // For list
  | ImageContent; // For image

export interface BlockPosition {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface StyleModel {
  fontSize: number;
  fontWeight: FontWeight;
  fontStyle: FontStyle;
  fontFamily: string;
  textAlign: TextAlign;
  color: string;
  backgroundColor?: string;
  lineHeight: number;
  letterSpacing?: number;
  headingLevel?: HeadingLevel;
  listType?: ListType;
}

export type FontWeight =
  | 'normal'
  | 'bold'
  | '100'
  | '200'
  | '300'
  | '400'
  | '500'
  | '600'
  | '700'
  | '800'
  | '900';
export type FontStyle = 'normal' | 'italic' | 'oblique';
export type TextAlign = 'left' | 'center' | 'right' | 'justify';
export type HeadingLevel = 1 | 2 | 3 | 4 | 5 | 6;
export type ListType = 'bullet' | 'numbered' | 'alpha' | 'roman';

export interface BlockMetadata {
  confidence: number; // 0-1, how confident we are in block type detection
  originalFontSize: number;
  originalColor: string;
  originalBounds: BlockPosition;
  textRuns: TextRun[]; // Individual text segments that make up this block
  isEdited: boolean;
  editedAt?: Date;
}

export interface TextRun {
  text: string;
  fontSize: number;
  fontWeight: FontWeight;
  fontStyle: FontStyle;
  color: string;
  position: { x: number; y: number };
}

// Table-specific types
export interface TableContent {
  rows: TableRow[];
  columnCount: number;
  hasHeader: boolean;
}

export interface TableRow {
  cells: TableCell[];
  isHeader?: boolean;
}

export interface TableCell {
  content: string;
  colspan: number;
  rowspan: number;
  style?: Partial<StyleModel>;
}

// List-specific types
export interface ListContent {
  items: ListItem[];
  type: ListType;
  isOrdered: boolean;
}

export interface ListItem {
  content: string;
  level: number; // For nested lists
  marker: string; // The bullet point or number
}

// Image-specific types
export interface ImageContent {
  src: string; // Base64 or URL
  alt: string;
  caption?: string;
  originalFormat: string; // 'jpg', 'png', etc.
}

// Utility types for parsing and processing
export interface ParsedTextItem {
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fontSize: number;
  fontWeight: FontWeight;
  fontStyle: FontStyle;
  color: string;
  fontFamily: string;
}

export interface TextLine {
  items: ParsedTextItem[];
  text: string;
  y: number;
  height: number;
  averageFontSize: number;
  bounds: { left: number; right: number; top: number; bottom: number };
}

// Export format types
export interface ExportOptions {
  format: 'pdf' | 'docx' | 'markdown';
  includeImages: boolean;
  preserveFormatting: boolean;
  customStyles?: Partial<StyleModel>;
}

export interface ExportResult {
  data: Blob | string;
  filename: string;
  mimeType: string;
  size?: number;
}

// Utility functions
export class DocumentModelUtils {
  static generateId(): string {
    return `${Date.now()}_${Math.random().toString(36).substring(7)}`;
  }

  static createEmptyDocument(): DocumentModel {
    return {
      id: this.generateId(),
      metadata: {
        pageCount: 0
      },
      pages: [],
      createdAt: new Date(),
      updatedAt: new Date()
    };
  }

  static createEmptyBlock(
    type: BlockType,
    position: BlockPosition
  ): BlockModel {
    return {
      id: this.generateId(),
      type,
      content: '',
      position,
      style: this.getDefaultStyle(type),
      metadata: {
        confidence: 1.0,
        originalFontSize: 12,
        originalColor: '#000000',
        originalBounds: position,
        textRuns: [],
        isEdited: false
      }
    };
  }

  static getDefaultStyle(blockType: BlockType): StyleModel {
    const baseStyle: StyleModel = {
      fontSize: 12,
      fontWeight: 'normal',
      fontStyle: 'normal',
      fontFamily: 'Arial, sans-serif',
      textAlign: 'left',
      color: '#000000',
      lineHeight: 1.4
    };

    switch (blockType) {
      case 'heading':
        return {
          ...baseStyle,
          fontSize: 18,
          fontWeight: 'bold',
          headingLevel: 2
        };
      case 'quote':
        return {
          ...baseStyle,
          fontStyle: 'italic',
          color: '#666666'
        };
      case 'code':
        return {
          ...baseStyle,
          fontFamily: 'Monaco, Consolas, monospace',
          backgroundColor: '#f5f5f5'
        };
      case 'list':
        return {
          ...baseStyle,
          listType: 'bullet'
        };
      default:
        return baseStyle;
    }
  }

  static updateBlockContent(
    block: BlockModel,
    newContent: BlockContent
  ): BlockModel {
    return {
      ...block,
      content: newContent,
      metadata: {
        ...block.metadata,
        isEdited: true,
        editedAt: new Date()
      }
    };
  }

  static getBlockPreviewText(block: BlockModel): string {
    if (typeof block.content === 'string') {
      return (
        block.content.substring(0, 100) +
        (block.content.length > 100 ? '...' : '')
      );
    }

    switch (block.type) {
      case 'table':
        const table = block.content as TableContent;
        return `Table (${table.rows.length} rows, ${table.columnCount} cols)`;
      case 'list':
        const list = block.content as ListContent;
        return `${list.type} list (${list.items.length} items)`;
      case 'image':
        const image = block.content as ImageContent;
        return `Image: ${image.alt || 'Untitled'}`;
      default:
        return 'Unknown block type';
    }
  }

  static validateDocumentModel(doc: DocumentModel): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if (!doc.id) errors.push('Document ID is required');
    if (!doc.metadata) errors.push('Document metadata is required');
    if (!Array.isArray(doc.pages)) errors.push('Pages must be an array');

    // Validate pages
    doc.pages.forEach((page, index) => {
      if (!page.pageNumber || page.pageNumber !== index + 1) {
        errors.push(`Page ${index + 1}: Invalid page number`);
      }
      if (!Array.isArray(page.blocks)) {
        errors.push(`Page ${index + 1}: Blocks must be an array`);
      }
    });

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}
