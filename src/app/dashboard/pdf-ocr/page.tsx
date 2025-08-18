'use client';

import React, { useState } from 'react';
import { PdfUpload } from '@/components/pdf-upload';
import { JobStatus } from '@/components/job-status';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, ArrowLeft } from 'lucide-react';

export default function PdfOcrPage() {
  const [currentJobId, setCurrentJobId] = useState<string | null>(null);

  const handleJobCreated = (jobId: string) => {
    setCurrentJobId(jobId);
  };

  const handleBackToUpload = () => {
    setCurrentJobId(null);
  };

  return (
    <div className='h-screen overflow-y-auto'>
      <div className='container mx-auto max-w-6xl p-6 pb-24'>
        <div className='mb-8'>
          <div className='mb-2 flex items-center gap-3'>
            <FileText className='text-primary h-8 w-8' />
            <h1 className='text-3xl font-bold'>PDF OCR Tool</h1>
          </div>
          <p className='text-muted-foreground'>
            Upload PDF files and extract text using OCR technology. Works with
            both text-based and scanned PDFs.
          </p>
        </div>

        {!currentJobId ? (
          <div className='flex flex-col items-center space-y-6'>
            <PdfUpload onJobCreated={handleJobCreated} />

            {/* Instructions Card */}
            <Card className='w-full max-w-lg'>
              <CardHeader>
                <CardTitle className='text-lg'>How it works</CardTitle>
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
                    We'll automatically detect if it's text-based or scanned
                  </p>
                </div>
                <div className='flex items-start gap-3'>
                  <div className='bg-primary text-primary-foreground flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold'>
                    3
                  </div>
                  <p>Extract text and download as .txt file</p>
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

            <JobStatus jobId={currentJobId} />
          </div>
        )}
      </div>
    </div>
  );
}
