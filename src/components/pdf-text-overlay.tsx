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
}

interface PdfTextOverlayProps {
  canvasRef: React.RefObject<HTMLCanvasElement>;
  editMode: 'view' | 'text' | 'highlight' | 'erase' | 'shape';
  onModificationAdded: (
    modification: Omit<PdfModification, 'timestamp'>
  ) => void;
  currentPage: number;
  scale: number;
}

export function PdfTextOverlay({
  canvasRef,
  editMode,
  onModificationAdded,
  currentPage,
  scale
}: PdfTextOverlayProps) {
  const [textElements, setTextElements] = useState<TextElement[]>([]);
  const [selectedColor, setSelectedColor] = useState('#000000');
  const [selectedFontSize, setSelectedFontSize] = useState(12);
  const overlayRef = useRef<HTMLDivElement>(null);

  const handleCanvasClick = (e: React.MouseEvent) => {
    if (editMode !== 'text' || !canvasRef.current || !overlayRef.current)
      return;

    const canvas = canvasRef.current;
    const overlay = overlayRef.current;
    const canvasRect = canvas.getBoundingClientRect();
    const overlayRect = overlay.getBoundingClientRect();

    const x = (e.clientX - canvasRect.left) / scale;
    const y = (e.clientY - canvasRect.top) / scale;

    // Create new text element
    const newElement: TextElement = {
      id: `text_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      x: e.clientX - overlayRect.left,
      y: e.clientY - overlayRect.top,
      text: 'Click to edit',
      fontSize: selectedFontSize,
      color: selectedColor,
      isEditing: true
    };

    setTextElements((prev) => [...prev, newElement]);
  };

  const handleTextChange = (id: string, newText: string) => {
    setTextElements((prev) =>
      prev.map((el) => (el.id === id ? { ...el, text: newText } : el))
    );
  };

  const handleTextSave = (element: TextElement) => {
    if (!element.text.trim()) {
      // Remove empty text elements
      setTextElements((prev) => prev.filter((el) => el.id !== element.id));
      return;
    }

    // Save to modifications
    onModificationAdded({
      type: 'text',
      pageNumber: currentPage,
      x: element.x / scale,
      y: element.y / scale,
      content: {
        text: element.text,
        fontSize: element.fontSize,
        color: hexToRgb(element.color)
      }
    });

    // Mark as not editing
    setTextElements((prev) =>
      prev.map((el) =>
        el.id === element.id ? { ...el, isEditing: false } : el
      )
    );
  };

  const handleTextCancel = (id: string) => {
    setTextElements((prev) => prev.filter((el) => el.id !== id));
  };

  const handleTextEdit = (id: string) => {
    setTextElements((prev) =>
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
  }, [currentPage]);

  if (editMode !== 'text') {
    return null;
  }

  return (
    <>
      {/* Text Editing Controls */}
      <Card className='absolute top-4 left-4 z-20 flex items-center space-x-2 p-4'>
        <Type className='h-4 w-4' />
        <Input
          type='number'
          value={selectedFontSize}
          onChange={(e) => setSelectedFontSize(parseInt(e.target.value) || 12)}
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

      {/* Text Overlay */}
      <div
        ref={overlayRef}
        className='pointer-events-none absolute inset-0 z-10'
        style={{
          width: canvasRef.current?.width || '100%',
          height: canvasRef.current?.height || '100%'
        }}
      >
        {textElements.map((element) => (
          <div
            key={element.id}
            className='pointer-events-auto absolute'
            style={{
              left: element.x,
              top: element.y,
              fontSize: element.fontSize * scale,
              color: element.color,
              transform: 'translate(-50%, -50%)'
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
                className='hover:bg-opacity-50 cursor-pointer rounded px-1 hover:bg-blue-100'
                title='Click to edit'
              >
                {element.text}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Click handler overlay */}
      <div
        className='absolute inset-0 z-5'
        onClick={handleCanvasClick}
        style={{
          width: canvasRef.current?.width || '100%',
          height: canvasRef.current?.height || '100%'
        }}
      />
    </>
  );
}
