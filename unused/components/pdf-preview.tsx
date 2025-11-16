'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Loader2,
  AlertCircle
} from 'lucide-react';

interface PdfPreviewProps {
  fileUrl?: string;
  currentPage?: number;
  onPageChange?: (page: number) => void;
}

export function PdfPreview({
  fileUrl,
  currentPage = 1,
  onPageChange
}: PdfPreviewProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pdfDocument, setPdfDocument] = useState<any | null>(null);
  const [totalPages, setTotalPages] = useState(0);
  const [scale, setScale] = useState(1.2);
  const [pdfjsReady, setPdfjsReady] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Initialize PDF.js
  useEffect(() => {
    let pdfjsLib: any = null;

    const initPdfJs = async () => {
      if (typeof window !== 'undefined') {
        try {
          const module = await import('pdfjs-dist');
          pdfjsLib = module;

          // Configure PDF.js worker
          if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
            pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';
          }

          setPdfjsReady(true);
          console.log('PDF.js initialized successfully');
        } catch (error) {
          console.error('Failed to load PDF.js:', error);
          setError('Failed to load PDF viewer');
        }
      }
    };

    initPdfJs();
  }, []);

  // Load PDF when URL changes
  useEffect(() => {
    if (fileUrl && pdfjsReady) {
      loadPdf(fileUrl);
    }
  }, [fileUrl, pdfjsReady]);

  // Render page when document or page changes
  useEffect(() => {
    if (pdfDocument && currentPage) {
      renderPage(currentPage);
    }
  }, [pdfDocument, currentPage, scale]);

  const loadPdf = async (url: string) => {
    setLoading(true);
    setError(null);

    try {
      const pdfjsLib = await import('pdfjs-dist');
      console.log('Loading PDF preview from:', url);

      const pdf = await pdfjsLib.getDocument(url).promise;
      setPdfDocument(pdf);
      setTotalPages(pdf.numPages);

      console.log(
        `PDF preview loaded successfully. Total pages: ${pdf.numPages}`
      );
    } catch (err) {
      console.error('Failed to load PDF preview:', err);
      setError('Failed to load PDF preview');
    } finally {
      setLoading(false);
    }
  };

  const renderPage = async (pageNumber: number) => {
    if (!pdfDocument || !canvasRef.current) return;

    try {
      const page = await pdfDocument.getPage(pageNumber);
      const canvas = canvasRef.current;

      if (!canvas || !canvas.getContext) {
        setTimeout(() => renderPage(pageNumber), 100);
        return;
      }

      const context = canvas.getContext('2d');
      if (!context) {
        console.error('Could not get 2d context from canvas');
        return;
      }

      const viewport = page.getViewport({ scale });
      canvas.height = viewport.height;
      canvas.width = viewport.width;

      const renderContext = {
        canvasContext: context,
        viewport: viewport
      };

      await page.render(renderContext).promise;
      console.log(`Rendered preview page ${pageNumber} at scale ${scale}`);
    } catch (err) {
      console.error(`Failed to render preview page ${pageNumber}:`, err);
    }
  };

  const handlePreviousPage = () => {
    const newPage = Math.max(currentPage - 1, 1);
    onPageChange?.(newPage);
  };

  const handleNextPage = () => {
    const newPage = Math.min(currentPage + 1, totalPages);
    onPageChange?.(newPage);
  };

  const handleZoomIn = () => setScale((prev) => Math.min(prev + 0.25, 3));
  const handleZoomOut = () => setScale((prev) => Math.max(prev - 0.25, 0.5));

  if (loading) {
    return (
      <div className='flex h-full items-center justify-center'>
        <div className='flex flex-col items-center space-y-4'>
          <Loader2 className='h-8 w-8 animate-spin' />
          <p className='text-muted-foreground text-sm'>
            Loading PDF preview...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className='flex h-full items-center justify-center'>
        <div className='flex flex-col items-center space-y-4'>
          <AlertCircle className='text-destructive h-8 w-8' />
          <p className='text-destructive text-sm'>{error}</p>
          <Button
            variant='outline'
            size='sm'
            onClick={() => fileUrl && loadPdf(fileUrl)}
          >
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  if (!pdfDocument) {
    return (
      <div className='flex h-full items-center justify-center'>
        <p className='text-muted-foreground text-sm'>No PDF loaded</p>
      </div>
    );
  }

  return (
    <div className='flex h-full flex-col'>
      {/* Controls */}
      <div className='flex items-center justify-between border-b p-4'>
        <div className='flex items-center space-x-2'>
          <Button
            variant='outline'
            size='sm'
            onClick={handlePreviousPage}
            disabled={currentPage === 1}
          >
            <ChevronLeft className='h-4 w-4' />
          </Button>
          <span className='text-muted-foreground text-sm'>
            {currentPage} / {totalPages}
          </span>
          <Button
            variant='outline'
            size='sm'
            onClick={handleNextPage}
            disabled={currentPage === totalPages}
          >
            <ChevronRight className='h-4 w-4' />
          </Button>
        </div>

        <div className='flex items-center space-x-2'>
          <Button variant='outline' size='sm' onClick={handleZoomOut}>
            <ZoomOut className='h-4 w-4' />
          </Button>
          <span className='text-muted-foreground min-w-12 text-center text-sm'>
            {Math.round(scale * 100)}%
          </span>
          <Button variant='outline' size='sm' onClick={handleZoomIn}>
            <ZoomIn className='h-4 w-4' />
          </Button>
        </div>
      </div>

      {/* Canvas */}
      <ScrollArea className='flex-1 p-4'>
        <div className='flex justify-center'>
          <canvas
            ref={canvasRef}
            className='border border-gray-300 shadow-md'
          />
        </div>
      </ScrollArea>
    </div>
  );
}
