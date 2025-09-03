'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { DocumentModel, BlockModel } from '@/lib/document-model';

interface PdfPreviewWithBlocksProps {
  documentModel: DocumentModel;
  pdfDocument: any; // PDF.js document
  currentPage: number;
  scale: number;
  onBlockSelect: (block: BlockModel) => void;
  selectedBlockId?: string;
  className?: string;
}

export function PdfPreviewWithBlocks({
  documentModel,
  pdfDocument,
  currentPage,
  scale,
  onBlockSelect,
  selectedBlockId,
  className = ''
}: PdfPreviewWithBlocksProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [canvasDimensions, setCanvasDimensions] = useState({
    width: 0,
    height: 0
  });

  // Render PDF page to canvas
  const renderPdfPage = useCallback(async () => {
    if (!pdfDocument || !canvasRef.current || currentPage < 1) return;

    setIsLoading(true);
    try {
      const page = await pdfDocument.getPage(currentPage);
      const viewport = page.getViewport({ scale });

      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');

      if (!context) {
        throw new Error('Failed to get canvas context');
      }

      // Set canvas dimensions
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      setCanvasDimensions({ width: viewport.width, height: viewport.height });

      // Clear canvas
      context.clearRect(0, 0, canvas.width, canvas.height);

      // Render PDF page
      const renderContext = {
        canvasContext: context,
        viewport: viewport
      };

      console.log(`📄 Rendering PDF page ${currentPage} at scale ${scale}`);
      await page.render(renderContext).promise;
      console.log('✅ PDF page rendered successfully');
    } catch (error) {
      console.error('❌ Failed to render PDF page:', error);
    } finally {
      setIsLoading(false);
    }
  }, [pdfDocument, currentPage, scale]);

  // Re-render when dependencies change
  useEffect(() => {
    renderPdfPage();
  }, [renderPdfPage]);

  // Get blocks for current page
  const currentPageModel = documentModel.pages.find(
    (p) => p.pageNumber === currentPage
  );
  const blocks = currentPageModel?.blocks || [];

  const handleBlockClick = (block: BlockModel, event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    onBlockSelect(block);
  };

  return (
    <div
      ref={containerRef}
      className={`relative inline-block ${className}`}
      style={{
        width: canvasDimensions.width,
        height: canvasDimensions.height
      }}
    >
      {/* PDF Canvas */}
      <canvas
        ref={canvasRef}
        className='block border border-gray-300 shadow-sm'
        style={{
          maxWidth: '100%',
          height: 'auto'
        }}
      />

      {/* Loading Overlay */}
      {isLoading && (
        <div className='absolute inset-0 flex items-center justify-center bg-white/80'>
          <div className='flex items-center space-x-2'>
            <div className='h-4 w-4 animate-spin rounded-full border-2 border-blue-600 border-t-transparent' />
            <span className='text-sm text-gray-600'>
              Rendering page {currentPage}...
            </span>
          </div>
        </div>
      )}

      {/* Block Overlay */}
      {!isLoading && (
        <BlockOverlay
          blocks={blocks}
          canvasDimensions={canvasDimensions}
          selectedBlockId={selectedBlockId}
          onBlockClick={handleBlockClick}
          scale={scale}
        />
      )}

      {/* Page Info */}
      <div className='absolute top-2 left-2 rounded bg-black/70 px-2 py-1 text-xs text-white'>
        Page {currentPage} • {blocks.length} blocks • Scale{' '}
        {Math.round(scale * 100)}%
      </div>
    </div>
  );
}

interface BlockOverlayProps {
  blocks: BlockModel[];
  canvasDimensions: { width: number; height: number };
  selectedBlockId?: string;
  onBlockClick: (block: BlockModel, event: React.MouseEvent) => void;
  scale: number;
}

function BlockOverlay({
  blocks,
  canvasDimensions,
  selectedBlockId,
  onBlockClick,
  scale
}: BlockOverlayProps) {
  return (
    <div
      className='pointer-events-none absolute inset-0'
      style={{
        width: canvasDimensions.width,
        height: canvasDimensions.height
      }}
    >
      {blocks.map((block) => {
        const isSelected = block.id === selectedBlockId;

        return (
          <div
            key={block.id}
            className={`pointer-events-auto absolute cursor-pointer transition-all duration-200 ${getBlockTypeStyles(block.type)} ${isSelected ? 'bg-blue-100/30 ring-2 ring-blue-500 ring-offset-1' : 'hover:bg-blue-50/20'} `}
            style={{
              left: block.position.x,
              top: block.position.y,
              width: block.position.width,
              height: block.position.height
            }}
            onClick={(e) => onBlockClick(block, e)}
            title={getBlockTooltip(block)}
          >
            {/* Block Type Indicator */}
            <div
              className={`absolute -top-1 -left-1 rounded-sm px-1 text-xs font-medium text-white opacity-0 transition-opacity ${isSelected ? 'opacity-100' : 'group-hover:opacity-100 hover:opacity-100'} ${getBlockTypeIndicatorColor(block.type)} `}
            >
              {block.type}
            </div>

            {/* Block Content Preview (for debugging) */}
            {isSelected && (
              <div className='absolute -bottom-6 left-0 max-w-48 truncate rounded bg-black/80 px-2 py-1 text-xs whitespace-nowrap text-white'>
                {getBlockPreview(block)}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// Helper functions for styling and content
function getBlockTypeStyles(blockType: string): string {
  switch (blockType) {
    case 'heading':
      return 'border-2 border-purple-400/60 bg-purple-100/20';
    case 'paragraph':
      return 'border border-blue-400/60 bg-blue-100/10';
    case 'table':
      return 'border-2 border-green-400/60 bg-green-100/20';
    case 'list':
      return 'border-2 border-orange-400/60 bg-orange-100/20';
    case 'image':
      return 'border-2 border-pink-400/60 bg-pink-100/20';
    case 'quote':
      return 'border-2 border-gray-400/60 bg-gray-100/20';
    case 'code':
      return 'border-2 border-indigo-400/60 bg-indigo-100/20';
    default:
      return 'border border-gray-400/60 bg-gray-100/10';
  }
}

function getBlockTypeIndicatorColor(blockType: string): string {
  switch (blockType) {
    case 'heading':
      return 'bg-purple-600';
    case 'paragraph':
      return 'bg-blue-600';
    case 'table':
      return 'bg-green-600';
    case 'list':
      return 'bg-orange-600';
    case 'image':
      return 'bg-pink-600';
    case 'quote':
      return 'bg-gray-600';
    case 'code':
      return 'bg-indigo-600';
    default:
      return 'bg-gray-600';
  }
}

function getBlockTooltip(block: BlockModel): string {
  const confidence = Math.round(block.metadata.confidence * 100);
  const preview = getBlockPreview(block);
  return `${block.type.toUpperCase()} (${confidence}% confidence)\n${preview}`;
}

function getBlockPreview(block: BlockModel): string {
  if (typeof block.content === 'string') {
    return block.content.length > 60
      ? block.content.substring(0, 60) + '...'
      : block.content;
  }

  switch (block.type) {
    case 'table':
      const table = block.content as any;
      return `Table: ${table.rows?.length || 0} rows × ${table.columnCount || 0} cols`;
    case 'list':
      const list = block.content as any;
      return `List: ${list.items?.length || 0} items (${list.type})`;
    case 'image':
      const image = block.content as any;
      return `Image: ${image.alt || 'Untitled'}`;
    default:
      return 'Unknown content';
  }
}
