'use client';

import React, { useState, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Upload,
  FileText,
  Download,
  Save,
  Eye,
  Edit3,
  Trash2,
  Plus,
  Settings,
  RefreshCw
} from 'lucide-react';
import {
  DocumentModel,
  BlockModel,
  DocumentModelUtils
} from '@/lib/document-model';
import { exportManager, ExportFormat } from '@/lib/export-manager';
import { PdfEditorV2Preview } from './pdf-editor-v2-preview';
import { BlockEditor } from './block-editor';
import { PdfPreviewPanel } from './pdf-preview-panel';

interface PdfEditorV2Props {
  className?: string;
}

export function PdfEditorV2({ className = '' }: PdfEditorV2Props) {
  // Core state
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [documentModel, setDocumentModel] = useState<DocumentModel | null>(
    null
  );
  const [selectedBlock, setSelectedBlock] = useState<BlockModel | null>(null);

  // UI state
  const [isBlockEditorOpen, setIsBlockEditorOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [showSidebar, setShowSidebar] = useState(true);
  const [showPreview, setShowPreview] = useState(true); // Always show by default
  const [isAddingTextBox, setIsAddingTextBox] = useState(false);

  // Preview state
  const [shouldUpdatePreview, setShouldUpdatePreview] = useState(false);

  // File input ref
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle file upload
  const handleFileSelect = useCallback((file: File) => {
    console.log('🔥 handleFileSelect called with:', file);

    if (file.type !== 'application/pdf') {
      alert('Please select a PDF file');
      return;
    }

    console.log('📁 Selected PDF file:', file.name, file.size, 'bytes');
    setPdfFile(file);
    setDocumentModel(null);
    setSelectedBlock(null);
  }, []);

  // Handle drag and drop
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files);
    const pdfFile = files.find((file) => file.type === 'application/pdf');
    if (pdfFile) {
      handleFileSelect(pdfFile);
    }
  };

  // Handle document model ready
  const handleDocumentModelReady = useCallback((model: DocumentModel) => {
    setDocumentModel(model);
    console.log('📋 Document model ready:', {
      pages: model.pages.length,
      blocks: model.pages.reduce((sum, page) => sum + page.blocks.length, 0)
    });
  }, []);

  // Block selection handlers
  const handleBlockSelect = useCallback((block: BlockModel | null) => {
    setSelectedBlock(block);
  }, []);

  const handleBlockEdit = () => {
    if (selectedBlock) {
      setIsBlockEditorOpen(true);
    }
  };

  const handleBlockSave = (updatedBlock: BlockModel) => {
    if (!documentModel) return;

    // Update the block in the document model
    const updatedModel: DocumentModel = {
      ...documentModel,
      pages: documentModel.pages.map((page) => ({
        ...page,
        blocks: page.blocks.map((block) =>
          block.id === updatedBlock.id ? updatedBlock : block
        )
      })),
      updatedAt: new Date()
    };

    setDocumentModel(updatedModel);
    setSelectedBlock(updatedBlock);
    setIsBlockEditorOpen(false);

    // Always trigger preview update
    setShouldUpdatePreview(true);

    console.log('💾 Block updated:', updatedBlock.id);
  };

  const handleBlockDelete = (blockId: string) => {
    if (!documentModel) return;

    const updatedModel: DocumentModel = {
      ...documentModel,
      pages: documentModel.pages.map((page) => ({
        ...page,
        blocks: page.blocks.filter((block) => block.id !== blockId)
      })),
      updatedAt: new Date()
    };

    setDocumentModel(updatedModel);
    setSelectedBlock(null);
    setIsBlockEditorOpen(false);

    console.log('🗑️ Block deleted:', blockId);
  };

  // Handle block position/size updates (for drag and resize)
  const handleBlockUpdate = (updatedBlock: BlockModel) => {
    if (!documentModel) return;

    const updatedModel: DocumentModel = {
      ...documentModel,
      pages: documentModel.pages.map((page) => ({
        ...page,
        blocks: page.blocks.map((block) =>
          block.id === updatedBlock.id ? updatedBlock : block
        )
      })),
      updatedAt: new Date()
    };

    setDocumentModel(updatedModel);
    setSelectedBlock(updatedBlock);

    console.log('📐 Block updated:', updatedBlock.id, {
      x: updatedBlock.position.x,
      y: updatedBlock.position.y,
      width: updatedBlock.position.width,
      height: updatedBlock.position.height
    });
  };

  // Export handlers
  const handleExport = async (format: ExportFormat) => {
    if (!documentModel) return;

    setIsExporting(true);
    try {
      const result = await exportManager.exportDocument(documentModel, format, {
        download: true
      });

      if (!result.success) {
        alert(`Export failed: ${result.error}`);
      }
    } catch (error) {
      console.error('❌ Export failed:', error);
      alert(
        `Export failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    } finally {
      setIsExporting(false);
    }
  };

  // Handle preview update completion
  const handlePreviewUpdateComplete = () => {
    setShouldUpdatePreview(false);
  };

  // Handle adding a new text box at clicked position
  const handleAddTextBox = (x: number, y: number, pageNumber: number) => {
    console.log('📝 handleAddTextBox called:', {
      x,
      y,
      pageNumber,
      hasDocumentModel: !!documentModel
    });

    if (!documentModel) {
      console.log('❌ No document model available');
      return;
    }

    // Create a new text block at the clicked position
    const newBlock: BlockModel = {
      id: DocumentModelUtils.generateId(),
      type: 'paragraph',
      content: 'New text box - double click to edit',
      position: {
        x: x,
        y: y,
        width: 200, // Default width
        height: 30 // Default height
      },
      style: {
        ...DocumentModelUtils.getDefaultStyle('paragraph'),
        fontSize: 12,
        fontFamily: 'Arial',
        fontWeight: 'normal',
        fontStyle: 'normal',
        color: '#000000'
      },
      metadata: {
        confidence: 1.0, // User-created, so 100% confidence
        originalFontSize: 12,
        originalColor: '#000000',
        originalBounds: { x, y, width: 200, height: 30 },
        textRuns: [],
        isEdited: true // Mark as edited since it's user-created
      }
    };

    // Add the new block to the appropriate page
    const updatedModel: DocumentModel = {
      ...documentModel,
      pages: documentModel.pages.map((page) =>
        page.pageNumber === pageNumber
          ? { ...page, blocks: [...page.blocks, newBlock] }
          : page
      ),
      updatedAt: new Date()
    };

    setDocumentModel(updatedModel);
    setSelectedBlock(newBlock);
    setIsAddingTextBox(false);
    setShouldUpdatePreview(true);

    console.log('📝 Added new text box:', newBlock);
  };

  // Get statistics
  const stats = documentModel
    ? {
        pages: documentModel.pages.length,
        blocks: documentModel.pages.reduce(
          (sum, page) => sum + page.blocks.length,
          0
        ),
        headings: documentModel.pages.reduce(
          (sum, page) =>
            sum +
            page.blocks.filter((block) => block.type === 'heading').length,
          0
        ),
        paragraphs: documentModel.pages.reduce(
          (sum, page) =>
            sum +
            page.blocks.filter((block) => block.type === 'paragraph').length,
          0
        ),
        tables: documentModel.pages.reduce(
          (sum, page) =>
            sum + page.blocks.filter((block) => block.type === 'table').length,
          0
        ),
        lists: documentModel.pages.reduce(
          (sum, page) =>
            sum + page.blocks.filter((block) => block.type === 'list').length,
          0
        )
      }
    : null;

  return (
    <div className={`flex h-screen overflow-hidden bg-gray-50 ${className}`}>
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type='file'
        accept='.pdf'
        onChange={(e) =>
          e.target.files?.[0] && handleFileSelect(e.target.files[0])
        }
        className='hidden'
      />

      {/* Sidebar */}
      {showSidebar && (
        <div className='w-80 border-r bg-white shadow-sm'>
          <div className='h-screen overflow-y-auto p-4'>
            <h2 className='mb-4 text-lg font-semibold'>PDF Editor V2</h2>

            {/* File Upload */}
            {!pdfFile && (
              <Card
                className='cursor-pointer border-2 border-dashed border-gray-300 transition-colors hover:border-gray-400'
                onClick={() => {
                  console.log(
                    '🔥 Upload card clicked, fileInputRef:',
                    fileInputRef.current
                  );
                  fileInputRef.current?.click();
                }}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
              >
                <CardContent className='p-8 text-center'>
                  <Upload className='mx-auto mb-4 h-12 w-12 text-gray-400' />
                  <p className='mb-2 text-sm text-gray-600'>
                    Drop a PDF file here or click to browse
                  </p>
                  <p className='text-xs text-gray-400'>Supported format: PDF</p>
                </CardContent>
              </Card>
            )}

            {/* File Info */}
            {pdfFile && (
              <Card className='mb-4'>
                <CardHeader>
                  <CardTitle className='flex items-center text-sm'>
                    <FileText className='mr-2 h-4 w-4' />
                    Current File
                  </CardTitle>
                </CardHeader>
                <CardContent className='pt-0'>
                  <p className='truncate text-sm font-medium'>{pdfFile.name}</p>
                  <p className='text-xs text-gray-500'>
                    {(pdfFile.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                  <Button
                    size='sm'
                    variant='outline'
                    className='mt-2 w-full'
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload className='mr-1 h-4 w-4' />
                    Change File
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Document Statistics */}
            {stats && (
              <Card className='mb-4'>
                <CardHeader>
                  <CardTitle className='text-sm'>Document Overview</CardTitle>
                </CardHeader>
                <CardContent className='space-y-2 pt-0'>
                  <div className='flex justify-between text-sm'>
                    <span>Pages</span>
                    <Badge variant='secondary'>{stats.pages}</Badge>
                  </div>
                  <div className='flex justify-between text-sm'>
                    <span>Total Blocks</span>
                    <Badge variant='secondary'>{stats.blocks}</Badge>
                  </div>
                  <Separator />
                  <div className='flex justify-between text-sm'>
                    <span>Headings</span>
                    <Badge variant='outline'>{stats.headings}</Badge>
                  </div>
                  <div className='flex justify-between text-sm'>
                    <span>Paragraphs</span>
                    <Badge variant='outline'>{stats.paragraphs}</Badge>
                  </div>
                  <div className='flex justify-between text-sm'>
                    <span>Tables</span>
                    <Badge variant='outline'>{stats.tables}</Badge>
                  </div>
                  <div className='flex justify-between text-sm'>
                    <span>Lists</span>
                    <Badge variant='outline'>{stats.lists}</Badge>
                  </div>
                  {documentModel && documentModel.pages.length > 0 && (
                    <div className='pt-2 text-xs text-gray-500'>
                      Page 1: {documentModel.pages[0]?.blocks.length || 0}{' '}
                      blocks detected
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Selected Block Info */}
            {selectedBlock && (
              <Card className='mb-4'>
                <CardHeader>
                  <CardTitle className='flex items-center justify-between text-sm'>
                    <span>Selected Block</span>
                    <Badge variant='secondary'>{selectedBlock.type}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className='pt-0'>
                  <p className='mb-2 text-sm'>
                    {DocumentModelUtils.getBlockPreviewText(selectedBlock)}
                  </p>
                  <div className='flex space-x-1'>
                    <Button size='sm' onClick={handleBlockEdit}>
                      <Edit3 className='mr-1 h-4 w-4' />
                      Edit
                    </Button>
                    <Button
                      size='sm'
                      variant='outline'
                      onClick={() => handleBlockDelete(selectedBlock.id)}
                    >
                      <Trash2 className='h-4 w-4' />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Export Options */}
            {documentModel && (
              <Card className='mb-4 border-2 border-green-500'>
                <CardHeader>
                  <CardTitle className='text-sm text-green-600'>
                    📤 Export Document
                  </CardTitle>
                </CardHeader>
                <CardContent className='space-y-2 pt-0'>
                  <Button
                    size='sm'
                    className='w-full'
                    onClick={() => handleExport('docx')}
                    disabled={isExporting}
                  >
                    {isExporting ? (
                      <RefreshCw className='mr-2 h-4 w-4 animate-spin' />
                    ) : (
                      <Download className='mr-2 h-4 w-4' />
                    )}
                    Export to DOCX
                  </Button>
                  <Button
                    size='sm'
                    variant='outline'
                    className='w-full'
                    onClick={() => handleExport('markdown')}
                    disabled={isExporting}
                  >
                    <Download className='mr-2 h-4 w-4' />
                    Export to Markdown
                  </Button>
                  <Button
                    size='sm'
                    variant='outline'
                    className='w-full'
                    onClick={() => handleExport('pdf')}
                    disabled={isExporting}
                  >
                    <Download className='mr-2 h-4 w-4' />
                    Export to PDF
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className='flex flex-1 flex-col'>
        {/* Toolbar */}
        <div className='flex items-center justify-between border-b bg-white p-4'>
          <div className='flex items-center space-x-2'>
            <Button
              variant='outline'
              size='sm'
              onClick={() => setShowSidebar(!showSidebar)}
            >
              <Settings className='h-4 w-4' />
            </Button>
            {documentModel && (
              <Button
                variant={showPreview ? 'default' : 'outline'}
                size='sm'
                onClick={() => setShowPreview(!showPreview)}
              >
                <Eye className='mr-1 h-4 w-4' />
                {showPreview ? 'Hide Preview' : 'Show Preview'}
              </Button>
            )}
            {documentModel && (
              <Button
                variant={isAddingTextBox ? 'default' : 'outline'}
                size='sm'
                onClick={() => {
                  console.log(
                    '🔘 Add Text Box button clicked, current state:',
                    isAddingTextBox
                  );
                  setIsAddingTextBox(!isAddingTextBox);
                  console.log('🔘 New state will be:', !isAddingTextBox);
                }}
              >
                <Plus className='mr-1 h-4 w-4' />
                {isAddingTextBox ? 'Cancel' : 'Add Text Box'}
              </Button>
            )}
            <h1 className='font-semibold'>
              {documentModel?.metadata.title ||
                pdfFile?.name ||
                'PDF Editor V2'}
            </h1>
          </div>

          {documentModel && (
            <div className='flex items-center space-x-2 text-sm text-gray-600'>
              <span>
                Last updated: {documentModel.updatedAt.toLocaleTimeString()}
              </span>
            </div>
          )}
        </div>

        {/* PDF Preview */}
        <div className='flex-1 overflow-hidden'>
          {pdfFile ? (
            <PdfEditorV2Preview
              pdfFile={pdfFile}
              onBlockSelect={handleBlockSelect}
              onDocumentModelReady={handleDocumentModelReady}
              onBlockUpdate={handleBlockUpdate}
              className='h-full'
              isAddingTextBox={isAddingTextBox}
              onAddTextBox={handleAddTextBox}
              documentModel={documentModel}
            />
          ) : (
            <div className='flex h-full items-center justify-center bg-gray-100'>
              <div className='text-center'>
                <FileText className='mx-auto mb-4 h-16 w-16 text-gray-400' />
                <h3 className='mb-2 text-lg font-medium text-gray-900'>
                  Welcome to PDF Editor V2
                </h3>
                <p className='mb-4 text-gray-600'>
                  Upload a PDF file to start editing with intelligent block
                  detection
                </p>
                <Button onClick={() => fileInputRef.current?.click()}>
                  <Upload className='mr-2 h-4 w-4' />
                  Select PDF File
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Preview Panel Modal/Overlay */}
      {showPreview && documentModel && (
        <div className='fixed inset-y-0 right-0 z-50 w-1/2 border-l bg-white shadow-2xl'>
          <div className='flex h-full flex-col'>
            <div className='flex h-12 items-center justify-between border-b bg-gray-50 px-4'>
              <span className='text-sm font-medium text-gray-700'>
                Edited Preview
              </span>
              <Button
                variant='outline'
                size='sm'
                onClick={() => setShowPreview(false)}
              >
                ×
              </Button>
            </div>
            <div className='flex-1 p-4'>
              <PdfPreviewPanel
                documentModel={documentModel}
                shouldUpdate={shouldUpdatePreview}
                onUpdateComplete={handlePreviewUpdateComplete}
                className='h-full'
              />
            </div>
          </div>
        </div>
      )}

      {/* Block Editor Modal */}
      {selectedBlock && (
        <BlockEditor
          block={selectedBlock}
          isOpen={isBlockEditorOpen}
          onSave={handleBlockSave}
          onCancel={() => setIsBlockEditorOpen(false)}
          onDelete={handleBlockDelete}
        />
      )}
    </div>
  );
}
