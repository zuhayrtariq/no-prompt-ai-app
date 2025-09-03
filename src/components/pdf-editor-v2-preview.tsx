'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Eye,
  EyeOff,
  Info,
  FileText
} from 'lucide-react';
import { DocumentModel, BlockModel } from '@/lib/document-model';
import { PdfParser } from '@/lib/pdf-parser';
import { BlockOverlay } from './block-overlay';

interface PdfEditorV2PreviewProps {
  pdfFile: File;
  onBlockSelect?: (block: BlockModel | null) => void;
  onDocumentModelReady?: (documentModel: DocumentModel) => void;
  onBlockUpdate?: (block: BlockModel) => void;
  className?: string;
  enableScaling?: boolean;
  isAddingTextBox?: boolean;
  onAddTextBox?: (x: number, y: number, pageNumber: number) => void;
  documentModel?: DocumentModel | null; // Accept document model from parent
}

export function PdfEditorV2Preview({
  pdfFile,
  onBlockSelect,
  onDocumentModelReady,
  onBlockUpdate,
  className = '',
  enableScaling = false,
  isAddingTextBox = false,
  onAddTextBox,
  documentModel: parentDocumentModel
}: PdfEditorV2PreviewProps) {
  // Core state
  const [documentModel, setDocumentModel] = useState<DocumentModel | null>(
    null
  );
  const [pdfDocument, setPdfDocument] = useState<any>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [scale, setScale] = useState(1.0);
  const [rotation, setRotation] = useState(0);

  // UI state
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [showBlockOverlay, setShowBlockOverlay] = useState(true);
  const [showDebugInfo, setShowDebugInfo] = useState(false);
  const [isParsingPdf, setIsParsingPdf] = useState(false);

  // Canvas and rendering
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [canvasDimensions, setCanvasDimensions] = useState({
    width: 0,
    height: 0
  });

  // PDF parser instance
  const pdfParserRef = useRef<PdfParser>(new PdfParser());

  // Initialize PDF document and parse to model
  useEffect(() => {
    const initializePdf = async () => {
      if (!pdfFile) return;

      setIsLoading(true);
      setError(null);
      setDocumentModel(null);

      try {
        console.log('🚀 Initializing PDF Editor V2 with file:', pdfFile.name);

        // Create object URL for the file
        const fileUrl = URL.createObjectURL(pdfFile);

        // Parse PDF to DocumentModel
        setIsParsingPdf(true);
        console.log('📋 Parsing PDF to DocumentModel...');
        const model = await pdfParserRef.current.parsePdfToModel(
          fileUrl,
          pdfFile.name
        );

        // Load PDF.js document for rendering
        console.log('📄 Loading PDF.js document...');
        const pdfjsLib = await import('pdfjs-dist');
        if (
          typeof window !== 'undefined' &&
          !pdfjsLib.GlobalWorkerOptions.workerSrc
        ) {
          pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';
        }

        const loadingTask = pdfjsLib.getDocument(fileUrl);
        const pdfDoc = await loadingTask.promise;

        // Set state
        setDocumentModel(model);
        setPdfDocument(pdfDoc);
        setCurrentPage(1);

        // Notify parent component
        if (onDocumentModelReady) {
          onDocumentModelReady(model);
        }

        console.log('✅ PDF Editor V2 initialized successfully:', {
          pages: model.pages.length,
          totalBlocks: model.pages.reduce(
            (sum, page) => sum + page.blocks.length,
            0
          )
        });

        // Clean up object URL
        URL.revokeObjectURL(fileUrl);
      } catch (err) {
        console.error('❌ Failed to initialize PDF:', err);
        setError(err instanceof Error ? err.message : 'Failed to load PDF');
      } finally {
        setIsLoading(false);
        setIsParsingPdf(false);
      }
    };

    initializePdf();
  }, [pdfFile, onDocumentModelReady]);

  // Track render task to prevent multiple renders
  const renderTaskRef = useRef<any>(null);

  // Render PDF page to canvas
  const renderPdfPage = useCallback(async () => {
    if (!pdfDocument || !canvasRef.current || currentPage < 1) return;

    // Cancel previous render if still running
    if (renderTaskRef.current) {
      renderTaskRef.current.cancel();
      renderTaskRef.current = null;
    }

    try {
      const page = await pdfDocument.getPage(currentPage);
      const viewport = page.getViewport({ scale, rotation });

      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');

      if (!context) {
        throw new Error('Failed to get canvas context');
      }

      // Set canvas dimensions
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      setCanvasDimensions({ width: viewport.width, height: viewport.height });

      // Clear and render
      context.clearRect(0, 0, canvas.width, canvas.height);

      const renderContext = {
        canvasContext: context,
        viewport: viewport
      };

      // Store render task reference and await completion
      renderTaskRef.current = page.render(renderContext);
      await renderTaskRef.current.promise;
      renderTaskRef.current = null;

      console.log(`✅ Rendered page ${currentPage} at scale ${scale}`);
    } catch (error) {
      if (error.name !== 'RenderingCancelledException') {
        console.error('❌ Failed to render PDF page:', error);
      }
    }
  }, [pdfDocument, currentPage, scale, rotation]);

  // Re-render when dependencies change
  useEffect(() => {
    renderPdfPage();
  }, [renderPdfPage]);

  // Navigation handlers
  const goToPrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
      setSelectedBlockId(null);
    }
  };

  const goToNextPage = () => {
    if (documentModel && currentPage < documentModel.metadata.pageCount) {
      setCurrentPage(currentPage + 1);
      setSelectedBlockId(null);
    }
  };

  // Zoom handlers
  const zoomIn = () => setScale((prev) => Math.min(prev * 1.2, 3.0));
  const zoomOut = () => setScale((prev) => Math.max(prev / 1.2, 0.3));
  const resetZoom = () => setScale(1.0);

  // Rotation handler
  const rotate = () => setRotation((prev) => (prev + 90) % 360);

  // Block selection handlers
  const handleBlockSelect = (block: BlockModel) => {
    setSelectedBlockId(block.id);
    if (onBlockSelect) {
      onBlockSelect(block);
    }
  };

  const clearBlockSelection = () => {
    setSelectedBlockId(null);
    if (onBlockSelect) {
      onBlockSelect(null);
    }
  };

  // Handle clicks on PDF container
  const handleContainerClick = (event: React.MouseEvent<HTMLDivElement>) => {
    console.log('🖱️ Container clicked, isAddingTextBox:', isAddingTextBox);

    if (isAddingTextBox && onAddTextBox) {
      event.preventDefault();
      event.stopPropagation();

      // Calculate position relative to PDF canvas
      const rect = event.currentTarget.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;

      console.log('📍 Adding text box at position:', {
        x,
        y,
        page: currentPage
      });

      // Call the add text box handler with the position and current page
      onAddTextBox(x, y, currentPage);
    } else {
      // Only clear selection if we're clicking directly on the container (not on a block)
      // Check if the click target is the container itself
      if (event.target === event.currentTarget) {
        clearBlockSelection();
      }
    }
  };

  // Use parent document model if available, otherwise use internal state
  const activeDocumentModel = parentDocumentModel || documentModel;

  // Get current page data
  const currentPageModel = activeDocumentModel?.pages.find(
    (p) => p.pageNumber === currentPage
  );
  const blocks = currentPageModel?.blocks || [];
  const selectedBlock = blocks.find((b) => b.id === selectedBlockId);

  if (error) {
    return (
      <Card className={`p-6 ${className}`}>
        <div className='text-center'>
          <FileText className='mx-auto mb-4 h-12 w-12 text-red-500' />
          <h3 className='mb-2 text-lg font-semibold text-red-700'>
            Failed to Load PDF
          </h3>
          <p className='text-red-600'>{error}</p>
        </div>
      </Card>
    );
  }

  return (
    <div className={`flex h-full flex-col ${className}`}>
      {/* Toolbar */}
      <div className='flex items-center justify-between border-b bg-gray-50 p-4'>
        <div className='flex items-center space-x-2'>
          {/* Navigation */}
          <Button
            variant='outline'
            size='sm'
            onClick={goToPrevPage}
            disabled={currentPage <= 1}
          >
            <ChevronLeft className='h-4 w-4' />
          </Button>

          <span className='text-sm font-medium'>
            Page {currentPage} of{' '}
            {activeDocumentModel?.metadata.pageCount || '...'}
          </span>

          <Button
            variant='outline'
            size='sm'
            onClick={goToNextPage}
            disabled={
              !activeDocumentModel ||
              currentPage >= activeDocumentModel.metadata.pageCount
            }
          >
            <ChevronRight className='h-4 w-4' />
          </Button>
        </div>

        <div className='flex items-center space-x-2'>
          {/* Zoom Controls */}
          <Button variant='outline' size='sm' onClick={zoomOut}>
            <ZoomOut className='h-4 w-4' />
          </Button>

          <Button variant='outline' size='sm' onClick={resetZoom}>
            {Math.round(scale * 100)}%
          </Button>

          <Button variant='outline' size='sm' onClick={zoomIn}>
            <ZoomIn className='h-4 w-4' />
          </Button>

          {/* Rotate */}
          <Button variant='outline' size='sm' onClick={rotate}>
            <RotateCw className='h-4 w-4' />
          </Button>

          {/* Toggle Overlay */}
          <Button
            variant={showBlockOverlay ? 'default' : 'outline'}
            size='sm'
            onClick={() => setShowBlockOverlay(!showBlockOverlay)}
          >
            {showBlockOverlay ? (
              <Eye className='h-4 w-4' />
            ) : (
              <EyeOff className='h-4 w-4' />
            )}
          </Button>

          {/* Debug Info */}
          <Button
            variant={showDebugInfo ? 'default' : 'outline'}
            size='sm'
            onClick={() => setShowDebugInfo(!showDebugInfo)}
          >
            <Info className='h-4 w-4' />
          </Button>
        </div>
      </div>

      {/* Content Area */}
      <div
        className='flex-1 overflow-auto bg-gray-100 p-4'
        style={{ maxHeight: 'calc(100vh - 120px)' }}
      >
        {isLoading || isParsingPdf ? (
          <div className='flex h-full items-center justify-center'>
            <div className='text-center'>
              <div className='mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent' />
              <p className='text-gray-600'>
                {isParsingPdf
                  ? 'Parsing PDF and detecting blocks...'
                  : 'Loading PDF...'}
              </p>
            </div>
          </div>
        ) : (
          <div className='flex justify-center'>
            <div
              ref={containerRef}
              className={`relative inline-block ${isAddingTextBox ? 'cursor-crosshair' : 'cursor-default'}`}
              onClick={handleContainerClick}
              style={{
                width: canvasDimensions.width || 'auto',
                height: canvasDimensions.height || 'auto'
              }}
            >
              {/* PDF Canvas */}
              <canvas
                ref={canvasRef}
                className='block border border-gray-300 bg-white shadow-lg'
                style={{
                  maxWidth: '100%',
                  height: 'auto'
                }}
              />

              {/* Block Overlay */}
              {showBlockOverlay && activeDocumentModel && (
                <BlockOverlay
                  blocks={blocks}
                  selectedBlockId={selectedBlockId}
                  onBlockSelect={handleBlockSelect}
                  onBlockUpdate={onBlockUpdate}
                  containerDimensions={canvasDimensions}
                  scale={scale}
                  showDebugInfo={showDebugInfo}
                  isAddingTextBox={isAddingTextBox}
                />
              )}
            </div>
          </div>
        )}
      </div>

      {/* Status Bar */}
      <div className='flex items-center justify-between border-t bg-gray-50 p-2 text-xs text-gray-600'>
        <div className='flex items-center space-x-4'>
          {activeDocumentModel && (
            <>
              <span>{blocks.length} blocks detected</span>
              <span>•</span>
              <span>Scale: {Math.round(scale * 100)}%</span>
              {rotation > 0 && (
                <>
                  <span>•</span>
                  <span>Rotated: {rotation}°</span>
                </>
              )}
            </>
          )}
        </div>

        <div className='flex items-center space-x-2'>
          {selectedBlock && (
            <Badge variant='secondary'>{selectedBlock.type} selected</Badge>
          )}
        </div>
      </div>
    </div>
  );
}
