'use client';

import React, { useState } from 'react';
import { PdfUpload } from '@/components/pdf-upload';
import { PdfEditor } from '@/components/pdf-editor';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, FileEdit } from 'lucide-react';

export default function PdfEditorPage() {
  const [currentFile, setCurrentFile] = useState<{
    jobId?: string;
    fileUrl?: string;
    fileName?: string;
  } | null>(null);

  const handleFileUploaded = (
    jobId: string,
    fileUrl?: string,
    fileName?: string
  ) => {
    setCurrentFile({ jobId, fileUrl, fileName });
  };

  const handleBackToUpload = () => {
    setCurrentFile(null);
  };

  return (
    <div className='h-screen overflow-y-auto'>
      <div className='container mx-auto max-w-7xl p-6 pb-24'>
        <div className='mb-8'>
          <div className='mb-2 flex items-center gap-3'>
            <FileEdit className='text-primary h-8 w-8' />
            <h1 className='text-3xl font-bold'>PDF Editor</h1>
          </div>
          <p className='text-muted-foreground'>
            Edit PDF files while preserving formatting. Add text, fill forms,
            and export as PDF or DOCX.
          </p>
        </div>

        {!currentFile ? (
          <div className='flex flex-col items-center space-y-6'>
            <PdfUpload onJobCreated={handleFileUploaded} mode='editor' />

            {/* Instructions Card */}
            <Card className='w-full max-w-lg'>
              <CardHeader>
                <CardTitle className='text-lg'>How PDF Editing Works</CardTitle>
              </CardHeader>
              <CardContent className='space-y-3 text-sm'>
                <div className='flex items-start gap-3'>
                  <div className='bg-primary text-primary-foreground flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold'>
                    1
                  </div>
                  <p>Upload your PDF file (up to 50MB)</p>
                </div>
                <div className='flex items-start gap-3'>
                  <div className='bg-primary text-primary-foreground flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold'>
                    2
                  </div>
                  <p>
                    Click on text to edit it in-place while preserving
                    formatting
                  </p>
                </div>
                <div className='flex items-start gap-3'>
                  <div className='bg-primary text-primary-foreground flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold'>
                    3
                  </div>
                  <p>Fill forms, add annotations, and modify content</p>
                </div>
                <div className='flex items-start gap-3'>
                  <div className='bg-primary text-primary-foreground flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold'>
                    4
                  </div>
                  <p>Export as editable PDF or Word document</p>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className='space-y-6'>
            <Button
              variant='outline'
              onClick={handleBackToUpload}
              className='flex items-center gap-2'
            >
              <ArrowLeft className='h-4 w-4' />
              Upload Another File
            </Button>

            <PdfEditor
              jobId={currentFile.jobId}
              fileUrl={currentFile.fileUrl}
              fileName={currentFile.fileName}
            />
          </div>
        )}
      </div>
    </div>
  );
}
