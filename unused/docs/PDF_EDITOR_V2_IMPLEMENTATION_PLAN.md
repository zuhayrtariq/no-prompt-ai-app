# PDF Editor V2 - Document Model Implementation Plan

## 🎯 Overview
Clean PDF editor that parses PDFs into a structured document model, allows editing via UI bound to the model, and exports to multiple formats (PDF, DOCX, MD).

## 📊 Architecture

```
PDF Upload → Parse to JSON Model → Edit Model → Export (PDF/DOCX/MD)
     ↓
PDF Preview (Read-only Canvas)
     ↓  
Block Overlay (Click to edit blocks)
```

## 🔧 Step 1: Document Model Design

### Core Data Structures:

```typescript
interface DocumentModel {
  id: string;
  metadata: {
    title?: string;
    author?: string;
    pageCount: number;
    createdAt: Date;
  };
  pages: PageModel[];
}

interface PageModel {
  pageNumber: number;
  blocks: BlockModel[];
  dimensions: { width: number; height: number };
}

interface BlockModel {
  id: string;
  type: 'paragraph' | 'heading' | 'table' | 'list' | 'image';
  content: string | TableContent | ImageContent;
  position: { x: number; y: number; width: number; height: number };
  style: StyleModel;
  metadata: {
    confidence: number; // How confident we are in the block type
    originalFontSize: number;
    originalColor: string;
  };
}

interface StyleModel {
  fontSize: number;
  fontWeight: 'normal' | 'bold';
  fontStyle: 'normal' | 'italic';
  textAlign: 'left' | 'center' | 'right';
  color: string;
  backgroundColor?: string;
  headingLevel?: 1 | 2 | 3 | 4 | 5 | 6;
}

interface TableContent {
  rows: TableRow[];
}

interface TableRow {
  cells: TableCell[];
}

interface TableCell {
  content: string;
  colspan?: number;
  rowspan?: number;
}
```

## 🔧 Step 2: PDF Parser Implementation

### Files to Create:
- `src/lib/pdf-parser.ts` - Main parser class
- `src/lib/block-detector.ts` - Logic to group text into blocks
- `src/lib/document-model.ts` - Type definitions and utilities

### PDF Parser Logic:

```typescript
export class PdfParser {
  async parsePdfToModel(fileUrl: string): Promise<DocumentModel> {
    const pdfDocument = await this.loadPdf(fileUrl);
    const pages: PageModel[] = [];
    
    for (let i = 1; i <= pdfDocument.numPages; i++) {
      const pageModel = await this.parsePage(pdfDocument, i);
      pages.push(pageModel);
    }
    
    return {
      id: generateId(),
      metadata: await this.extractMetadata(pdfDocument),
      pages
    };
  }
  
  private async parsePage(pdf: any, pageNumber: number): Promise<PageModel> {
    const page = await pdf.getPage(pageNumber);
    const textContent = await page.getTextContent();
    
    // Extract raw text items with positions
    const textItems = this.extractTextItems(textContent);
    
    // Group into logical blocks
    const blocks = this.detectBlocks(textItems);
    
    return {
      pageNumber,
      blocks,
      dimensions: this.getPageDimensions(page)
    };
  }
}
```

### Block Detection Strategy:

```typescript
export class BlockDetector {
  detectBlocks(textItems: TextItem[]): BlockModel[] {
    const blocks: BlockModel[] = [];
    
    // 1. Group by Y position (lines)
    const lines = this.groupIntoLines(textItems);
    
    // 2. Detect headings (large font, short lines)
    const headings = this.detectHeadings(lines);
    
    // 3. Group remaining lines into paragraphs
    const paragraphs = this.groupIntoParagraphs(lines);
    
    // 4. Detect tables (aligned columns)
    const tables = this.detectTables(paragraphs);
    
    // 5. Detect lists (bullet points, numbering)
    const lists = this.detectLists(paragraphs);
    
    return [...headings, ...paragraphs, ...tables, ...lists];
  }
  
  private detectHeadings(lines: TextLine[]): BlockModel[] {
    return lines
      .filter(line => this.isHeadingCandidate(line))
      .map(line => this.createHeadingBlock(line));
  }
  
  private isHeadingCandidate(line: TextLine): boolean {
    // Heuristics for heading detection
    const avgFontSize = this.getAverageFontSize(line);
    const lineLength = line.text.length;
    const hasCapitalization = /^[A-Z]/.test(line.text);
    
    return avgFontSize > 14 && lineLength < 100 && hasCapitalization;
  }
}
```

## 🔧 Step 3: Preview + Block Overlay

### Files to Create:
- `src/components/pdf-editor-v2.tsx` - Main editor component
- `src/components/pdf-preview-with-blocks.tsx` - Canvas + overlay
- `src/components/block-overlay.tsx` - Interactive block highlighting

### Block Overlay Implementation:

```typescript
export function BlockOverlay({ documentModel, onBlockSelect }: BlockOverlayProps) {
  return (
    <div className="absolute inset-0 pointer-events-none">
      {documentModel.pages.map(page => 
        page.blocks.map(block => (
          <div
            key={block.id}
            className="absolute border-2 border-blue-300 hover:bg-blue-100/20 pointer-events-auto cursor-pointer"
            style={{
              left: block.position.x,
              top: block.position.y,
              width: block.position.width,
              height: block.position.height,
            }}
            onClick={() => onBlockSelect(block)}
            title={`${block.type}: ${block.content.toString().substring(0, 50)}...`}
          />
        ))
      )}
    </div>
  );
}
```

## 🔧 Step 4: Block Editing UI

### Files to Create:
- `src/components/block-editor.tsx` - Modal/sidebar for editing blocks
- `src/components/block-editors/` - Specific editors for each block type
  - `paragraph-editor.tsx`
  - `heading-editor.tsx` 
  - `table-editor.tsx`
  - `list-editor.tsx`

### Block Editor Implementation:

```typescript
export function BlockEditor({ block, onSave, onCancel }: BlockEditorProps) {
  const [editedBlock, setEditedBlock] = useState<BlockModel>(block);
  
  const renderEditor = () => {
    switch (block.type) {
      case 'paragraph':
        return <ParagraphEditor block={editedBlock} onChange={setEditedBlock} />;
      case 'heading':
        return <HeadingEditor block={editedBlock} onChange={setEditedBlock} />;
      case 'table':
        return <TableEditor block={editedBlock} onChange={setEditedBlock} />;
      default:
        return <ParagraphEditor block={editedBlock} onChange={setEditedBlock} />;
    }
  };
  
  return (
    <Dialog open onOpenChange={onCancel}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Edit {block.type}</DialogTitle>
        </DialogHeader>
        {renderEditor()}
        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>Cancel</Button>
          <Button onClick={() => onSave(editedBlock)}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

## 🔧 Step 5: Export System

### Files to Create:
- `src/lib/exporters/pdf-exporter.ts` - Export to PDF
- `src/lib/exporters/docx-exporter.ts` - Export to DOCX  
- `src/lib/exporters/markdown-exporter.ts` - Export to Markdown

### Export Implementation:

```typescript
export class DocxExporter {
  async exportToDocx(documentModel: DocumentModel): Promise<Blob> {
    const doc = new Document({
      sections: documentModel.pages.map(page => ({
        children: page.blocks.map(block => this.blockToParagraph(block))
      }))
    });
    
    return await Packer.toBlob(doc);
  }
  
  private blockToParagraph(block: BlockModel): Paragraph {
    switch (block.type) {
      case 'heading':
        return new Paragraph({
          text: block.content as string,
          heading: `Heading${block.style.headingLevel || 1}` as HeadingLevel,
        });
      case 'paragraph':
        return new Paragraph({
          text: block.content as string,
          style: this.convertStyle(block.style)
        });
      default:
        return new Paragraph({ text: block.content as string });
    }
  }
}

export class MarkdownExporter {
  exportToMarkdown(documentModel: DocumentModel): string {
    let markdown = '';
    
    documentModel.pages.forEach(page => {
      page.blocks.forEach(block => {
        markdown += this.blockToMarkdown(block) + '\n\n';
      });
    });
    
    return markdown;
  }
  
  private blockToMarkdown(block: BlockModel): string {
    switch (block.type) {
      case 'heading':
        const level = block.style.headingLevel || 1;
        return '#'.repeat(level) + ' ' + block.content;
      case 'paragraph':
        return block.content as string;
      case 'table':
        return this.tableToMarkdown(block.content as TableContent);
      default:
        return block.content as string;
    }
  }
}
```

## 🗂️ File Structure

```
src/
├── components/
│   ├── pdf-editor-v2.tsx                 # Main editor component
│   ├── pdf-preview-with-blocks.tsx       # Canvas + block overlay
│   ├── block-overlay.tsx                 # Interactive block highlighting
│   ├── block-editor.tsx                  # Block editing modal
│   └── block-editors/
│       ├── paragraph-editor.tsx
│       ├── heading-editor.tsx
│       ├── table-editor.tsx
│       └── list-editor.tsx
├── lib/
│   ├── pdf-parser.ts                     # Main PDF parsing logic
│   ├── block-detector.ts                 # Block detection algorithms
│   ├── document-model.ts                 # Type definitions
│   └── exporters/
│       ├── pdf-exporter.ts
│       ├── docx-exporter.ts
│       └── markdown-exporter.ts
└── app/
    └── dashboard/
        └── pdf-editor-v2/
            └── page.tsx                   # New editor page route
```

## 📦 Required Dependencies

```bash
npm install docx html2canvas jspdf mammoth turndown
npm install @types/uuid uuid
```

## 🚀 Implementation Order

1. **Document Model Types** (`document-model.ts`)
2. **PDF Parser** (`pdf-parser.ts` + `block-detector.ts`) 
3. **Preview Component** (`pdf-preview-with-blocks.tsx`)
4. **Block Overlay** (`block-overlay.tsx`)
5. **Block Editors** (`block-editor.tsx` + specific editors)
6. **Export System** (DOCX first, then MD, then PDF)
7. **Main Component Integration** (`pdf-editor-v2.tsx`)
8. **Route Setup** (`page.tsx`)

## ✅ Benefits of This Approach

1. **No Coordinate Nightmares** - Block positions are stored in the model, overlay just renders them
2. **Clean Export Path** - JSON model easily converts to any format
3. **Maintainable** - Clear separation of concerns
4. **Testable** - Each component can be unit tested independently
5. **Extensible** - Easy to add new block types or export formats
6. **Robust** - Works with any PDF content without coordinate alignment issues

## 🎯 Success Criteria

- [ ] Parse PDF into structured document model
- [ ] Display PDF with clickable block overlays
- [ ] Edit blocks through intuitive UI
- [ ] Export to DOCX with proper formatting
- [ ] Export to Markdown with clean structure
- [ ] Export to PDF with modified content
- [ ] Handle different PDF types (text-heavy, mixed content, tables)

This approach is **much more sustainable** than trying to fix coordinate alignment issues!