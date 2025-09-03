'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, FileText, Download } from 'lucide-react';
import { DocumentModel } from '@/lib/document-model';
import { exportManager } from '@/lib/export-manager';

interface PdfPreviewPanelProps {
  documentModel: DocumentModel | null;
  shouldUpdate: boolean;
  onUpdateComplete: () => void;
  className?: string;
}

export function PdfPreviewPanel({
  documentModel,
  shouldUpdate,
  onUpdateComplete,
  className = ''
}: PdfPreviewPanelProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Generate preview when shouldUpdate changes
  useEffect(() => {
    if (shouldUpdate && documentModel) {
      generatePreview();
    }
  }, [shouldUpdate, documentModel]);

  // Cleanup preview URL when component unmounts
  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const generatePreview = async () => {
    if (!documentModel) return;

    setIsGenerating(true);
    try {
      console.log('🔄 Generating PDF preview...');

      // Export to PDF without downloading
      const result = await exportManager.exportDocument(documentModel, 'pdf', {
        download: false // Don't download, just get the blob
      });

      if (result.success && result.blob) {
        // Cleanup previous URL
        if (previewUrl) {
          URL.revokeObjectURL(previewUrl);
        }

        // Create new URL for the preview
        const newPreviewUrl = URL.createObjectURL(result.blob);
        setPreviewUrl(newPreviewUrl);
        setLastUpdated(new Date());

        console.log('✅ PDF preview generated successfully');
      } else {
        console.error('❌ Failed to generate preview:', result.error);
      }
    } catch (error) {
      console.error('❌ Preview generation error:', error);
    } finally {
      setIsGenerating(false);
      onUpdateComplete();
    }
  };

  const downloadPreview = () => {
    if (!previewUrl || !documentModel) return;

    // Create a temporary link to download the preview
    const link = document.createElement('a');
    link.href = previewUrl;
    link.download = `${documentModel.metadata.title || 'document'}_preview.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className={`flex h-full flex-col ${className}`}>
      {/* Header */}
      <Card className='mb-4'>
        <CardHeader className='pb-3'>
          <div className='flex items-center justify-between'>
            <CardTitle className='flex items-center text-sm'>
              <FileText className='mr-2 h-4 w-4' />
              Edited PDF Preview
            </CardTitle>
            <div className='flex items-center space-x-2'>
              {lastUpdated && (
                <Badge variant='outline' className='text-xs'>
                  {lastUpdated.toLocaleTimeString()}
                </Badge>
              )}
              <Button
                size='sm'
                variant='outline'
                onClick={generatePreview}
                disabled={!documentModel || isGenerating}
              >
                {isGenerating ? (
                  <RefreshCw className='h-4 w-4 animate-spin' />
                ) : (
                  <RefreshCw className='h-4 w-4' />
                )}
              </Button>
              {previewUrl && (
                <Button size='sm' variant='outline' onClick={downloadPreview}>
                  <Download className='h-4 w-4' />
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        {documentModel && (
          <CardContent className='pt-0'>
            <div className='flex items-center space-x-4 text-xs text-gray-600'>
              <span>
                {documentModel.pages.reduce(
                  (sum, page) =>
                    sum +
                    page.blocks.filter((block) => block.metadata.isEdited)
                      .length,
                  0
                )}{' '}
                edits
              </span>
              <span>•</span>
              <span>{documentModel.pages.length} pages</span>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Preview Area */}
      <div className='flex-1 overflow-hidden rounded-lg border bg-gray-100'>
        {isGenerating ? (
          <div className='flex h-full items-center justify-center'>
            <div className='text-center'>
              <RefreshCw className='mx-auto mb-4 h-8 w-8 animate-spin text-blue-600' />
              <p className='text-sm text-gray-600'>Generating preview...</p>
            </div>
          </div>
        ) : previewUrl ? (
          <iframe
            src={previewUrl}
            className='h-full w-full border-none'
            title='PDF Preview'
          />
        ) : (
          <div className='flex h-full items-center justify-center'>
            <div className='text-center'>
              <FileText className='mx-auto mb-4 h-12 w-12 text-gray-400' />
              <p className='mb-2 text-sm text-gray-600'>No preview available</p>
              <p className='text-xs text-gray-500'>
                {documentModel
                  ? 'Click refresh to generate preview'
                  : 'Load a document to see preview'}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
