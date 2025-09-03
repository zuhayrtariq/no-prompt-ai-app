'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Save, X, Type, Palette } from 'lucide-react';
import { PdfModification } from '@/lib/pdf-editor-utils';

interface TextElement {
  id: string;
  x: number;
  y: number;
  text: string;
  fontSize: number;
  color: string;
  isEditing: boolean;
  isOriginalPdfText?: boolean;
  width?: number;
  height?: number;
}

interface PdfTextOverlayProps {
  canvasRef: React.RefObject<HTMLCanvasElement>;
  editMode: 'view' | 'text' | 'highlight' | 'erase' | 'shape';
  onModificationAdded: (
    modification: Omit<PdfModification, 'timestamp'>
  ) => void;
  currentPage: number;
  scale: number;
  pdfDocument?: any;
}

export function PdfTextOverlay({
  canvasRef,
  editMode,
  onModificationAdded,
  currentPage,
  scale,
  pdfDocument
}: PdfTextOverlayProps) {
  const [textElements, setTextElements] = useState<TextElement[]>([]);
  const [originalTextElements, setOriginalTextElements] = useState<
    TextElement[]
  >([]);
  const [selectedColor, setSelectedColor] = useState('#000000');
  const [selectedFontSize, setSelectedFontSize] = useState(12);
  const [isLoadingText, setIsLoadingText] = useState(false);
  const overlayRef = useRef<HTMLDivElement>(null);

  // Extract text from PDF page
  const extractTextFromPage = async (pageNumber: number) => {
    if (!pdfDocument || !canvasRef.current) return;

    setIsLoadingText(true);
    try {
      const page = await pdfDocument.getPage(pageNumber);
      const textContent = await page.getTextContent();
      const viewport = page.getViewport({ scale });

      // Get the actual canvas size and position
      const canvas = canvasRef.current;
      const canvasRect = canvas.getBoundingClientRect();

      console.log(
        `Canvas dimensions: ${canvas.width}x${canvas.height}, viewport: ${viewport.width}x${viewport.height}, scale: ${scale}`
      );

      const extractedElements: TextElement[] = [];

      // Sort items by y position to get correct reading order
      const sortedItems = textContent.items.sort((a: any, b: any) => {
        const yDiff = b.transform[5] - a.transform[5]; // Reverse Y (PDF coordinates)
        if (Math.abs(yDiff) > 5) return yDiff; // Different lines
        return a.transform[4] - b.transform[4]; // Same line, sort by X
      });

      sortedItems.forEach((item: any, index: number) => {
        if (item.str && item.str.trim()) {
          // Get transform matrix [scaleX, skewY, skewX, scaleY, translateX, translateY]
          const transform = item.transform;
          const pdfX = transform[4]; // translateX in PDF coordinates
          const pdfY = transform[5]; // translateY in PDF coordinates
          const fontSize = Math.abs(transform[3]) || 12;

          // Convert PDF coordinates directly to canvas pixel coordinates
          // Use the same scale that was used to render the canvas
          const canvasX = pdfX;
          const canvasY = viewport.height - pdfY;

          console.log(
            `Text "${item.str}" at PDF(${pdfX}, ${pdfY}) -> Canvas(${canvasX}, ${canvasY}) fontSize=${fontSize}`
          );

          extractedElements.push({
            id: `original_${pageNumber}_${index}`,
            x: canvasX,
            y: canvasY,
            text: item.str,
            fontSize: fontSize,
            color: '#000000',
            isEditing: false,
            isOriginalPdfText: true,
            width: item.width || item.str.length * fontSize * 0.6,
            height: fontSize
          });
        }
      });

      setOriginalTextElements(extractedElements);
    } catch (error) {
      console.error('Failed to extract text:', error);
    } finally {
      setIsLoadingText(false);
    }
  };

  // Load text when page changes
  useEffect(() => {
    if (pdfDocument && (editMode === 'text' || editMode === 'erase')) {
      extractTextFromPage(currentPage);
    }
  }, [pdfDocument, currentPage, editMode]);

  const handleCanvasClick = (e: React.MouseEvent) => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    console.log(`Canvas click at (${clickX}, ${clickY})`);

    if (editMode === 'text') {
      // Check if we clicked on existing text first
      let clickedOnExistingText = false;

      for (const element of originalTextElements) {
        const elementLeft = element.x;
        const elementRight = element.x + (element.width || 100);
        const elementTop = element.y - element.fontSize;
        const elementBottom = element.y + 5;

        console.log(
          `Checking text "${element.text}" bounds: left=${elementLeft}, right=${elementRight}, top=${elementTop}, bottom=${elementBottom}`
        );

        if (
          clickX >= elementLeft &&
          clickX <= elementRight &&
          clickY >= elementTop &&
          clickY <= elementBottom
        ) {
          // Start editing this text
          setOriginalTextElements((prev) =>
            prev.map((el) =>
              el.id === element.id
                ? { ...el, isEditing: true }
                : { ...el, isEditing: false }
            )
          );
          clickedOnExistingText = true;
          console.log(`Starting edit of text: "${element.text}"`);
          break;
        }
      }

      // If we didn't click on existing text, create new text at click position
      if (!clickedOnExistingText) {
        const newElement: TextElement = {
          id: `text_${Date.now()}_${Math.random().toString(36).substring(7)}`,
          x: clickX,
          y: clickY,
          text: 'Click to edit',
          fontSize: selectedFontSize,
          color: selectedColor,
          isEditing: true
        };

        setTextElements((prev) => [...prev, newElement]);
        console.log(`Created new text at (${clickX}, ${clickY})`);
      }
    } else if (editMode === 'erase') {
      handleEraseClick(e);
    }
  };

  const handleEraseClick = (e: React.MouseEvent) => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const canvasRect = canvas.getBoundingClientRect();
    const clickX = e.clientX - canvasRect.left;
    const clickY = e.clientY - canvasRect.top;

    // Check if click is on any text element
    const allElements = [...textElements, ...originalTextElements];

    for (const element of allElements) {
      const elementX = element.x;
      const elementY = element.y;
      const elementWidth = element.width || 100;
      const elementHeight = element.height || element.fontSize * scale;

      // Check if click is within element bounds
      if (
        clickX >= elementX - 20 &&
        clickX <= elementX + elementWidth + 20 &&
        clickY >= elementY - 10 &&
        clickY <= elementY + elementHeight + 10
      ) {
        if (element.isOriginalPdfText) {
          // Mark original text as erased
          onModificationAdded({
            type: 'text',
            pageNumber: currentPage,
            x: element.x / scale,
            y: element.y / scale,
            content: {
              text: '',
              action: 'erase',
              originalText: element.text
            }
          });

          // Remove from original elements
          setOriginalTextElements((prev) =>
            prev.filter((el) => el.id !== element.id)
          );
        } else {
          // Remove added text element
          setTextElements((prev) => prev.filter((el) => el.id !== element.id));
        }
        break;
      }
    }
  };

  const handleTextChange = (id: string, newText: string) => {
    setTextElements((prev) =>
      prev.map((el) => (el.id === id ? { ...el, text: newText } : el))
    );
    setOriginalTextElements((prev) =>
      prev.map((el) => (el.id === id ? { ...el, text: newText } : el))
    );
  };

  const handleTextSave = (element: TextElement) => {
    if (!element.text.trim()) {
      // Remove empty text elements
      if (element.isOriginalPdfText) {
        setOriginalTextElements((prev) =>
          prev.filter((el) => el.id !== element.id)
        );
      } else {
        setTextElements((prev) => prev.filter((el) => el.id !== element.id));
      }
      return;
    }

    // Save to modifications - coordinates are already in PDF space via viewport.transform
    onModificationAdded({
      type: 'text',
      pageNumber: currentPage,
      x: element.isOriginalPdfText ? element.x / scale : element.x / scale,
      y: element.isOriginalPdfText ? element.y / scale : element.y / scale,
      content: {
        text: element.text,
        fontSize: element.isOriginalPdfText
          ? element.fontSize
          : element.fontSize,
        color: hexToRgb(element.color),
        isOriginalText: element.isOriginalPdfText,
        action: element.isOriginalPdfText ? 'replace' : 'add'
      }
    });

    // Mark as not editing
    if (element.isOriginalPdfText) {
      setOriginalTextElements((prev) =>
        prev.map((el) =>
          el.id === element.id ? { ...el, isEditing: false } : el
        )
      );
    } else {
      setTextElements((prev) =>
        prev.map((el) =>
          el.id === element.id ? { ...el, isEditing: false } : el
        )
      );
    }
  };

  const handleTextCancel = (id: string) => {
    setTextElements((prev) => prev.filter((el) => el.id !== id));
  };

  const handleTextEdit = (id: string) => {
    setTextElements((prev) =>
      prev.map((el) => (el.id === id ? { ...el, isEditing: true } : el))
    );
    setOriginalTextElements((prev) =>
      prev.map((el) => (el.id === id ? { ...el, isEditing: true } : el))
    );
  };

  const hexToRgb = (hex: string): { r: number; g: number; b: number } => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? {
          r: parseInt(result[1], 16),
          g: parseInt(result[2], 16),
          b: parseInt(result[3], 16)
        }
      : { r: 0, g: 0, b: 0 };
  };

  // Clear text elements when switching pages
  useEffect(() => {
    setTextElements([]);
    setOriginalTextElements([]);
  }, [currentPage]);

  if (editMode !== 'text' && editMode !== 'erase') {
    return null;
  }

  const allElements = [...textElements, ...originalTextElements];

  return (
    <>
      {/* Text Editing Controls */}
      {editMode === 'text' && (
        <Card className='absolute top-4 left-4 z-20 flex items-center space-x-2 p-4'>
          <Type className='h-4 w-4' />
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
          <div className='flex items-center space-x-1'>
            <Palette className='h-4 w-4' />
            <input
              type='color'
              value={selectedColor}
              onChange={(e) => setSelectedColor(e.target.value)}
              className='h-8 w-8 cursor-pointer rounded border'
            />
          </div>
        </Card>
      )}

      {/* Erase Mode Info */}
      {editMode === 'erase' && (
        <Card className='absolute top-4 left-4 z-20 p-4'>
          <p className='text-muted-foreground text-sm'>
            Click on any text to erase it
          </p>
        </Card>
      )}

      {/* Loading indicator */}
      {isLoadingText && (
        <Card className='absolute top-4 right-4 z-20 p-4'>
          <p className='text-muted-foreground text-sm'>Loading text...</p>
        </Card>
      )}

      {/* Text Overlay - positioned exactly over canvas */}
      <div
        ref={overlayRef}
        className='pointer-events-none absolute inset-0 z-15'
        style={{
          width: canvasRef.current?.width || '100%',
          height: canvasRef.current?.height || '100%'
        }}
      >
        {allElements.map((element) => (
          <div
            key={element.id}
            className={`pointer-events-auto absolute ${
              element.isOriginalPdfText
                ? editMode === 'erase'
                  ? 'border border-red-200 bg-red-100/50'
                  : 'border border-green-200 bg-green-100/50'
                : 'border border-blue-200 bg-blue-100/50'
            }`}
            style={{
              left: element.x,
              top: element.y,
              fontSize: element.fontSize,
              color: element.color,
              transform: element.isOriginalPdfText
                ? 'none'
                : 'translate(-50%, -50%)',
              fontFamily: element.isOriginalPdfText
                ? 'Arial, sans-serif'
                : 'inherit',
              lineHeight: element.isOriginalPdfText ? '1' : 'inherit',
              pointerEvents: 'auto',
              minWidth: element.isOriginalPdfText
                ? element.width || 'auto'
                : 'auto',
              minHeight: element.isOriginalPdfText
                ? element.height || 'auto'
                : 'auto'
            }}
          >
            {element.isEditing ? (
              <div className='flex items-center space-x-1 rounded bg-white p-1 shadow-lg'>
                <Input
                  value={element.text}
                  onChange={(e) => handleTextChange(element.id, e.target.value)}
                  className='min-w-32'
                  placeholder='Enter text...'
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleTextSave(element);
                    } else if (e.key === 'Escape') {
                      handleTextCancel(element.id);
                    }
                  }}
                  autoFocus
                />
                <Button
                  size='sm'
                  onClick={() => handleTextSave(element)}
                  className='h-6 w-6 p-0'
                >
                  <Save className='h-3 w-3' />
                </Button>
                <Button
                  size='sm'
                  variant='outline'
                  onClick={() => handleTextCancel(element.id)}
                  className='h-6 w-6 p-0'
                >
                  <X className='h-3 w-3' />
                </Button>
              </div>
            ) : (
              <div
                onClick={() => handleTextEdit(element.id)}
                className={`cursor-pointer rounded px-1 ${
                  element.isOriginalPdfText
                    ? editMode === 'erase'
                      ? 'border border-red-200 hover:bg-red-100'
                      : 'border border-green-200 hover:bg-green-100'
                    : 'hover:bg-blue-100'
                }`}
                title={
                  element.isOriginalPdfText
                    ? editMode === 'erase'
                      ? 'Click to erase this text'
                      : 'Original PDF text - Click to edit'
                    : 'Click to edit'
                }
              >
                {element.text}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Click handler overlay */}
      <div
        className='absolute inset-0 z-10'
        onClick={handleCanvasClick}
        style={{
          width: canvasRef.current?.width || '100%',
          height: canvasRef.current?.height || '100%'
        }}
      />
    </>
  );
}
