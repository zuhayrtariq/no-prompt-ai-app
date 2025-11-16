'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import {
  ZoomIn,
  ZoomOut,
  Download,
  Save,
  Type,
  Highlighter,
  FileText,
  Loader2,
  AlertCircle,
  Eraser,
  Square,
  Circle,
  MousePointer,
  Undo,
  Redo,
  Trash2
} from 'lucide-react';
import { PdfTextOverlay } from '@/components/pdf-text-overlay';
import { PdfModification } from '@/lib/pdf-editor-utils';

// Dynamically import PDF.js only on client side
let pdfjsLib: any = null;
let pdfjsLoaded = false;

if (typeof window !== 'undefined') {
  import('pdfjs-dist')
    .then((module) => {
      pdfjsLib = module;
      pdfjsLoaded = true;
      // Configure PDF.js worker
      pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';
      console.log('PDF.js loaded successfully');
    })
    .catch((error) => {
      console.error('Failed to load PDF.js:', error);
    });
}

interface PdfEditorClientProps {
  jobId?: string;
  fileUrl?: string;
  fileName?: string;
}

export function PdfEditorClient({
  jobId,
  fileUrl,
  fileName
}: PdfEditorClientProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pdfDocument, setPdfDocument] = useState<any | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [scale, setScale] = useState(1.5);
  const [editMode, setEditMode] = useState<
    'view' | 'text' | 'highlight' | 'erase' | 'shape'
  >('view');
  const [modifications, setModifications] = useState<PdfModification[]>([]);
  const [history, setHistory] = useState<PdfModification[][]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [selectedColor, setSelectedColor] = useState('#000000');
  const [selectedFontSize, setSelectedFontSize] = useState(12);
  const [pdfjsReady, setPdfjsReady] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Wait for PDF.js to be ready
  useEffect(() => {
    const checkPdfjsReady = () => {
      if (pdfjsLoaded && pdfjsLib) {
        setPdfjsReady(true);
        setLoading(false);
      } else {
        setTimeout(checkPdfjsReady, 100);
      }
    };
    checkPdfjsReady();
  }, []);

  useEffect(() => {
    if (fileUrl && pdfjsReady) {
      setLoading(true);
      loadPdf(fileUrl);
    }
  }, [fileUrl, pdfjsReady]);

  useEffect(() => {
    if (pdfDocument) {
      renderPage(currentPage);
    }
  }, [pdfDocument, currentPage, scale]);

  const loadPdf = async (url: string) => {
    if (!pdfjsLib || !pdfjsLoaded) {
      setError('PDF.js not loaded yet. Please wait a moment and try again.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      console.log('Loading PDF from:', url);
      const pdf = await pdfjsLib.getDocument(url).promise;
      setPdfDocument(pdf);
      setTotalPages(pdf.numPages);
      console.log(`PDF loaded successfully. Total pages: ${pdf.numPages}`);
    } catch (err) {
      console.error('Failed to load PDF:', err);
      setError('Failed to load PDF. Please try uploading again.');
    } finally {
      setLoading(false);
    }
  };

  const renderPage = async (pageNumber: number) => {
    if (!pdfDocument || !canvasRef.current) return;

    try {
      const page = await pdfDocument.getPage(pageNumber);
      const canvas = canvasRef.current;

      // Ensure canvas is properly mounted
      if (!canvas || !canvas.getContext) {
        console.warn('Canvas not ready, retrying...');
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

      // Always render the full PDF
      await page.render(renderContext).promise;
      console.log(`Rendered page ${pageNumber} at scale ${scale}`);
    } catch (err) {
      console.error(`Failed to render page ${pageNumber}:`, err);
      setError(`Failed to render page ${pageNumber}`);
    }
  };

  const handleZoomIn = () => setScale((prev) => Math.min(prev + 0.25, 3));
  const handleZoomOut = () => setScale((prev) => Math.max(prev - 0.25, 0.5));
  const handlePreviousPage = () =>
    setCurrentPage((prev) => Math.max(prev - 1, 1));
  const handleNextPage = () =>
    setCurrentPage((prev) => Math.min(prev + 1, totalPages));

  const handleModificationAdded = (
    modification: Omit<PdfModification, 'timestamp'>
  ) => {
    const newModification: PdfModification = {
      ...modification,
      timestamp: new Date()
    };

    const newModifications = [...modifications, newModification];
    setModifications(newModifications);

    // Add to history for undo/redo
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push([...newModifications]);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);

    console.log('Added modification:', newModification);
  };

  const handleUndo = () => {
    if (historyIndex > 0) {
      setHistoryIndex(historyIndex - 1);
      setModifications(history[historyIndex - 1] || []);
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(historyIndex + 1);
      setModifications(history[historyIndex + 1]);
    }
  };

  const handleClearAll = () => {
    setModifications([]);
    const newHistory = [...history, []];
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  };

  const handleSave = async () => {
    try {
      if (!fileUrl) {
        throw new Error('No file URL available');
      }

      const response = await fetch('/api/pdf/edit', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: `session_${Date.now()}`,
          modifications
        })
      });

      if (!response.ok) throw new Error('Failed to save modifications');

      alert(`Successfully saved ${modifications.length} modifications!`);
    } catch (error) {
      console.error('Save failed:', error);
      alert('Failed to save modifications');
    }
  };

  const handleExport = async (format: 'pdf' | 'docx') => {
    try {
      if (!fileUrl) {
        throw new Error('No file URL available');
      }

      const response = await fetch('/api/pdf/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: `session_${Date.now()}`,
          storage_path: fileUrl.split('/').pop(),
          modifications,
          format
        })
      });

      if (!response.ok)
        throw new Error(`Failed to export as ${format.toUpperCase()}`);

      const result = await response.json();

      // Open PDF in new tab, or download other formats
      if (format === 'pdf') {
        window.open(result.download_url, '_blank');
        alert(`Successfully exported as PDF! Opening in new tab.`);
      } else {
        // For non-PDF formats, still download
        const a = document.createElement('a');
        a.href = result.download_url;
        a.download = result.filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        alert(`Successfully exported as ${format.toUpperCase()}!`);
      }
    } catch (error) {
      console.error('Export failed:', error);
      alert(`Failed to export as ${format.toUpperCase()}`);
    }
  };

  if (loading) {
    return (
      <Card className='w-full'>
        <CardContent className='flex items-center justify-center py-12'>
          <div className='flex flex-col items-center space-y-4'>
            <Loader2 className='h-8 w-8 animate-spin' />
            <p className='text-muted-foreground'>Loading PDF for editing...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className='w-full'>
        <CardContent className='flex items-center justify-center py-12'>
          <div className='flex flex-col items-center space-y-4'>
            <AlertCircle className='text-destructive h-8 w-8' />
            <p className='text-destructive'>{error}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className='w-full space-y-4'>
      {/* Enhanced Toolbar */}
      <Card>
        <CardHeader className='pb-3'>
          <CardTitle className='flex items-center justify-between'>
            <div className='flex items-center gap-2'>
              <FileText className='h-5 w-5' />
              {fileName || 'PDF Document'}
            </div>
            <Badge variant='outline'>
              Page {currentPage} of {totalPages}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className='space-y-4'>
          {/* Page Navigation */}
          <div className='flex items-center justify-center space-x-2'>
            <Button
              variant='outline'
              size='sm'
              onClick={handlePreviousPage}
              disabled={currentPage === 1}
            >
              Previous
            </Button>
            <span className='text-muted-foreground px-4 text-sm'>
              {currentPage} / {totalPages}
            </span>
            <Button
              variant='outline'
              size='sm'
              onClick={handleNextPage}
              disabled={currentPage === totalPages}
            >
              Next
            </Button>
          </div>

          <Separator />

          {/* Zoom Controls */}
          <div className='flex items-center justify-center space-x-2'>
            <Button variant='outline' size='sm' onClick={handleZoomOut}>
              <ZoomOut className='h-4 w-4' />
            </Button>
            <span className='text-muted-foreground px-4 text-sm'>
              {Math.round(scale * 100)}%
            </span>
            <Button variant='outline' size='sm' onClick={handleZoomIn}>
              <ZoomIn className='h-4 w-4' />
            </Button>
          </div>

          <Separator />

          {/* Enhanced Edit Tools */}
          <div className='flex flex-wrap items-center justify-center gap-2 space-x-2'>
            <Button
              variant={editMode === 'view' ? 'default' : 'outline'}
              size='sm'
              onClick={() => setEditMode('view')}
            >
              <MousePointer className='mr-1 h-4 w-4' />
              View
            </Button>
            <Button
              variant={editMode === 'text' ? 'default' : 'outline'}
              size='sm'
              onClick={() => setEditMode('text')}
            >
              <Type className='mr-1 h-4 w-4' />
              Text
            </Button>
            <Button
              variant={editMode === 'highlight' ? 'default' : 'outline'}
              size='sm'
              onClick={() => setEditMode('highlight')}
            >
              <Highlighter className='mr-1 h-4 w-4' />
              Highlight
            </Button>
            <Button
              variant={editMode === 'erase' ? 'default' : 'outline'}
              size='sm'
              onClick={() => setEditMode('erase')}
            >
              <Eraser className='mr-1 h-4 w-4' />
              Erase
            </Button>
            <Button
              variant={editMode === 'shape' ? 'default' : 'outline'}
              size='sm'
              onClick={() => setEditMode('shape')}
            >
              <Square className='mr-1 h-4 w-4' />
              Shape
            </Button>
          </div>

          {/* Edit Controls */}
          {editMode === 'text' && (
            <div className='flex items-center justify-center space-x-2'>
              <Input
                type='number'
                value={selectedFontSize}
                onChange={(e) =>
                  setSelectedFontSize(parseInt(e.target.value) || 12)
                }
                className='w-16'
                min='8'
                max='48'
              />
              <input
                type='color'
                value={selectedColor}
                onChange={(e) => setSelectedColor(e.target.value)}
                className='h-8 w-8 cursor-pointer rounded border'
              />
            </div>
          )}

          <Separator />

          {/* History Controls */}
          <div className='flex items-center justify-center space-x-2'>
            <Button
              variant='outline'
              size='sm'
              onClick={handleUndo}
              disabled={historyIndex <= 0}
            >
              <Undo className='h-4 w-4' />
            </Button>
            <Button
              variant='outline'
              size='sm'
              onClick={handleRedo}
              disabled={historyIndex >= history.length - 1}
            >
              <Redo className='h-4 w-4' />
            </Button>
            <Button
              variant='outline'
              size='sm'
              onClick={handleClearAll}
              disabled={modifications.length === 0}
            >
              <Trash2 className='h-4 w-4' />
            </Button>
          </div>

          <Separator />

          {/* Action Buttons */}
          <div className='flex flex-wrap items-center justify-center gap-2 space-x-2'>
            <Button
              onClick={handleSave}
              className='flex items-center gap-2'
              disabled={modifications.length === 0}
            >
              <Save className='h-4 w-4' />
              Save Changes ({modifications.length})
            </Button>
            <Button
              variant='outline'
              onClick={() => handleExport('pdf')}
              className='flex items-center gap-2'
            >
              <Download className='h-4 w-4' />
              Export PDF
            </Button>
            <Button
              variant='outline'
              onClick={() => handleExport('docx')}
              className='flex items-center gap-2'
            >
              <Download className='h-4 w-4' />
              Export DOCX
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* PDF Viewer */}
      <Card className='flex-1'>
        <CardContent className='p-0'>
          <ScrollArea className='h-[800px] w-full'>
            <div className='relative flex justify-center p-4'>
              <div className='relative'>
                <canvas
                  ref={canvasRef}
                  className={`border border-gray-300 ${
                    editMode !== 'view' ? 'cursor-crosshair' : 'cursor-default'
                  }`}
                />
                {canvasRef.current && (
                  <PdfTextOverlay
                    canvasRef={canvasRef as React.RefObject<HTMLCanvasElement>}
                    editMode={editMode}
                    onModificationAdded={handleModificationAdded}
                    currentPage={currentPage}
                    scale={scale}
                    pdfDocument={pdfDocument}
                  />
                )}
              </div>
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Modifications Panel */}
      {modifications.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Modifications ({modifications.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className='h-32'>
              {modifications.map((mod, index) => (
                <div
                  key={index}
                  className='flex items-center justify-between border-b p-2 text-sm'
                >
                  <span>
                    Page {mod.pageNumber}: {mod.type} -{' '}
                    {typeof mod.content === 'string'
                      ? mod.content
                      : mod.content?.text || 'Annotation'}
                  </span>
                  <Button
                    variant='ghost'
                    size='sm'
                    onClick={() => {
                      const newMods = modifications.filter(
                        (_, i) => i !== index
                      );
                      setModifications(newMods);
                    }}
                  >
                    <Trash2 className='h-3 w-3' />
                  </Button>
                </div>
              ))}
            </ScrollArea>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
