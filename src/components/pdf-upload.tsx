'use client';

import React, { useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Upload, File, AlertCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@clerk/nextjs';

interface PdfUploadProps {
  onJobCreated: (jobId: string) => void;
}

export function PdfUpload({ onJobCreated }: PdfUploadProps) {
  const { userId } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      'application/pdf': ['.pdf']
    },
    maxFiles: 1,
    maxSize: 50 * 1024 * 1024, // 50MB
    onDrop: async (acceptedFiles) => {
      if (acceptedFiles.length === 0) return;

      const file = acceptedFiles[0];
      await handleFileUpload(file);
    },
    onDropRejected: (fileRejections) => {
      const rejection = fileRejections[0];
      if (rejection.errors[0]?.code === 'file-too-large') {
        setError('File too large. Maximum size is 50MB.');
      } else if (rejection.errors[0]?.code === 'file-invalid-type') {
        setError('Invalid file type. Only PDF files are allowed.');
      } else {
        setError('File rejected. Please try again.');
      }
    }
  });

  const handleFileUpload = async (file: File) => {
    if (!userId) {
      setError('Please sign in to upload files.');
      return;
    }

    setUploading(true);
    setUploadProgress(0);
    setError(null);

    try {
      console.log('Starting upload for user:', userId);

      // Upload to Supabase storage
      const fileName = `${Date.now()}-${file.name}`;
      console.log('Uploading file:', fileName);

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('pdf-uploads')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        console.error('Storage upload error:', uploadError);
        throw new Error(`Storage upload failed: ${uploadError.message}`);
      }

      console.log('Storage upload successful:', uploadData);

      setUploadProgress(50);

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('pdf-uploads')
        .getPublicUrl(fileName);

      setUploadProgress(70);

      // Create OCR job
      const response = await fetch('/api/pdf/parse', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          storage_path: fileName,
          filename: file.name
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create OCR job');
      }

      const { job_id } = await response.json();
      setUploadProgress(100);

      // Notify parent component
      onJobCreated(job_id);
    } catch (err) {
      console.error('Upload error:', err);
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  return (
    <Card className='w-full max-w-lg'>
      <CardHeader>
        <CardTitle className='flex items-center gap-2'>
          <Upload className='h-5 w-5' />
          Upload PDF for OCR
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div
          {...getRootProps()}
          className={`cursor-pointer rounded-lg border-2 border-dashed p-8 text-center transition-colors ${
            isDragActive
              ? 'border-primary bg-primary/5'
              : 'border-gray-300 hover:border-gray-400'
          } ${uploading ? 'pointer-events-none opacity-50' : ''}`}
        >
          <input {...getInputProps()} />

          {uploading ? (
            <div className='space-y-4'>
              <div className='border-primary mx-auto h-8 w-8 animate-spin border-b-2' />
              <p className='text-muted-foreground text-sm'>
                Processing... {uploadProgress}%
              </p>
              <Progress value={uploadProgress} className='w-full' />
            </div>
          ) : (
            <div className='space-y-4'>
              <File className='text-muted-foreground mx-auto h-12 w-12' />
              {isDragActive ? (
                <p className='text-muted-foreground text-sm'>
                  Drop your PDF here...
                </p>
              ) : (
                <div>
                  <p className='text-muted-foreground mb-2 text-sm'>
                    Drag & drop your PDF here, or click to select
                  </p>
                  <Button variant='outline' size='sm'>
                    Select PDF File
                  </Button>
                </div>
              )}
              <p className='text-muted-foreground text-xs'>
                Max file size: 50MB
              </p>
            </div>
          )}
        </div>

        {error && (
          <div className='bg-destructive/10 border-destructive/20 mt-4 flex items-start gap-2 rounded-md border p-3'>
            <AlertCircle className='text-destructive mt-0.5 h-4 w-4' />
            <div>
              <p className='text-destructive text-sm font-medium'>
                Upload Error
              </p>
              <p className='text-destructive/80 text-xs'>{error}</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
