# PDF Editor Implementation Plan

## Overview
Adding PDF editing functionality to complement existing OCR text extraction. Users will be able to edit PDFs while preserving formatting, then export as editable PDF/DOCX files.

## Current Architecture Analysis
- **Framework**: Next.js 15 + TypeScript + Tailwind + React 19
- **Existing PDF Libraries**: `pdf-lib` ✅, `pdfjs-dist` ✅ (perfect for editing!)
- **Storage**: Supabase (reusable for editor workflow)
- **UI Components**: Complete shadcn/ui setup
- **OCR Flow**: Upload → Storage → API → Job Tracking (reusable pattern)

## Implementation Phases

### Phase 1: Foundation & Routing
**Goal**: Set up separate PDF editor route and workflow selection

#### Tasks:
1. **Create PDF Editor Route**
   - `src/app/dashboard/pdf-editor/page.tsx`
   - Separate from OCR but similar structure
   - Reuse existing upload components

2. **Add Workflow Selection**
   - Update main dashboard to show both options
   - "Extract Text (OCR)" vs "Edit PDF"
   - Or add toggle in pdf-ocr page

3. **Update Navigation**
   - Add "PDF Editor" to sidebar navigation
   - Update `src/components/layout/app-sidebar.tsx`

### Phase 2: PDF Viewer Component
**Goal**: Create interactive PDF viewer for editing

#### Tasks:
1. **Install Additional Dependencies**
   ```bash
   npm install react-pdf@latest docx html2canvas
   npm install @types/react-pdf
   ```

2. **Create PdfViewer Component**
   - `src/components/pdf-viewer.tsx`
   - Use `pdfjs-dist` for rendering
   - Zoom controls, page navigation
   - Text selection capabilities

3. **Add PDF Loading**
   - Load PDF from Supabase storage
   - Display pages with proper scaling
   - Handle loading states and errors

### Phase 3: Core Editing Features
**Goal**: Implement text editing while preserving formatting

#### Tasks:
1. **Text Detection & Overlay**
   - Extract text positions using `pdfjs-dist`
   - Create editable text overlays
   - Match original fonts and positioning

2. **Click-to-Edit Interface**
   - Text click handlers
   - Inline editing with proper styling
   - Real-time preview of changes

3. **Form Field Support**
   - Detect and populate existing form fields
   - Add new form elements if needed
   - Preserve form functionality

4. **Basic Annotations**
   - Highlight text capability
   - Add comments/notes
   - Simple drawing tools

### Phase 4: PDF Modification & Export
**Goal**: Save changes and export in multiple formats

#### Tasks:
1. **PDF Modification with pdf-lib**
   - Apply text changes to PDF
   - Preserve original formatting
   - Handle font embedding

2. **Export Options**
   - Modified PDF export
   - DOCX conversion using `docx` library
   - Maintain layout and formatting

3. **Save to Storage**
   - Upload modified files to Supabase
   - Reuse existing job tracking system
   - Download links for users

### Phase 5: UI/UX Integration
**Goal**: Seamless user experience with professional editing interface

#### Tasks:
1. **Editing Toolbar**
   - Text formatting options
   - Font, size, color controls
   - Undo/redo functionality

2. **Enhanced PDF Upload**
   - Extend existing `src/components/pdf-upload.tsx`
   - Support editor workflow
   - Preview before editing

3. **Job Tracking Integration**
   - Reuse `src/components/job-status.tsx`
   - Track editing and export progress
   - Show preview of modified PDF

### Phase 6: Advanced Features (Future)
**Goal**: Professional-grade PDF editing capabilities

#### Tasks:
1. **Advanced Text Editing**
   - Rich text formatting
   - Paragraph editing
   - Table editing

2. **Layout Management**
   - Move/resize text blocks
   - Image handling
   - Page layout adjustments

3. **Collaborative Features**
   - Version history
   - Comments and reviews
   - Share edited PDFs

## Technical Implementation Details

### Key Libraries Usage:
- **`pdfjs-dist`**: PDF parsing, text extraction, rendering
- **`pdf-lib`**: PDF modification, form filling, export
- **`docx`**: Word document export
- **`react-pdf`**: React components for PDF display
- **`html2canvas`**: Generate preview thumbnails

### API Endpoints to Create:
- `POST /api/pdf/edit` - Initialize editing session
- `PUT /api/pdf/edit/:id` - Save editing changes
- `POST /api/pdf/export` - Export modified PDF/DOCX

### Component Architecture:
```
src/
├── app/dashboard/pdf-editor/
│   └── page.tsx                 # Main PDF editor page
├── components/
│   ├── pdf-viewer.tsx           # Interactive PDF viewer
│   ├── pdf-editor-toolbar.tsx   # Editing controls
│   ├── pdf-text-overlay.tsx     # Editable text layer
│   └── pdf-export-options.tsx   # Export dialog
├── lib/
│   ├── pdf-editor-utils.ts      # PDF editing utilities
│   └── docx-export.ts          # DOCX conversion
```

### State Management:
- PDF document state
- Current page and zoom level
- Text modifications tracking
- Undo/redo history
- Export progress

## Integration with Existing System

### Reusing Current Infrastructure:
1. **Supabase Storage**: Store original and modified PDFs
2. **Job System**: Track editing and export operations
3. **Authentication**: Use existing Clerk integration
4. **UI Components**: Leverage existing shadcn/ui components
5. **API Pattern**: Follow existing API route structure

### Combined Workflow Options:
1. **Separate Tools**: Keep OCR and Editor as distinct features
2. **Combined Interface**: Single upload with workflow selection
3. **Progressive Enhancement**: Start with OCR, offer editing if suitable

## Success Metrics
- Users can edit PDFs while preserving formatting
- Export maintains original document structure
- Seamless integration with existing OCR workflow
- Professional editing experience comparable to desktop tools

## Timeline Estimate
- **Phase 1-2**: 1-2 days (Foundation + Viewer)
- **Phase 3**: 2-3 days (Core editing features)
- **Phase 4**: 1-2 days (Export functionality)
- **Phase 5**: 1 day (UI/UX integration)
- **Total**: ~1 week for MVP

## Next Steps
1. Start with Phase 1: Create PDF editor route and workflow selection
2. Install additional dependencies
3. Build PDF viewer component
4. Implement core editing features
5. Add export functionality
6. Polish UI and integrate with existing system