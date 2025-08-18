'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle
} from '@/components/ui/resizable';
import {
  Clock,
  CheckCircle,
  XCircle,
  Loader2,
  Download,
  File,
  Eye
} from 'lucide-react';

interface JobStatusProps {
  jobId: string;
}

interface JobData {
  id: string;
  status: 'pending' | 'processing' | 'complete' | 'error';
  progress: number;
  result_url?: string;
  extracted_text?: string;
  error_message?: string;
  original_filename: string;
  created_at: string;
  updated_at: string;
}

export function JobStatus({ jobId }: JobStatusProps) {
  const [job, setJob] = useState<JobData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Poll job status
  useEffect(() => {
    let pollInterval: NodeJS.Timeout;

    const fetchJobStatus = async () => {
      try {
        const response = await fetch(`/api/jobs/${jobId}`);

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to fetch job status');
        }

        const jobData = await response.json();
        setJob(jobData);

        // Stop polling if job is complete or failed
        if (jobData.status === 'complete' || jobData.status === 'error') {
          setLoading(false);
          if (pollInterval) {
            console.log('✅ Job finished, stopping polling');
            clearInterval(pollInterval);
          }
          return; // Stop further polling
        }
      } catch (err) {
        console.error('Error fetching job status:', err);
        setError(
          err instanceof Error ? err.message : 'Failed to fetch job status'
        );
        setLoading(false);
        if (pollInterval) {
          clearInterval(pollInterval);
        }
      }
    };

    // Initial fetch
    fetchJobStatus();

    // Set up polling for incomplete jobs
    pollInterval = setInterval(fetchJobStatus, 2000);

    // Cleanup function
    return () => {
      if (pollInterval) {
        console.log('🔄 Component unmounting, clearing polling interval');
        clearInterval(pollInterval);
      }
    };
  }, [jobId]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className='h-4 w-4 text-yellow-500' />;
      case 'processing':
        return <Loader2 className='h-4 w-4 animate-spin text-blue-500' />;
      case 'complete':
        return <CheckCircle className='h-4 w-4 text-green-500' />;
      case 'error':
        return <XCircle className='h-4 w-4 text-red-500' />;
      default:
        return <Clock className='h-4 w-4' />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-500';
      case 'processing':
        return 'bg-blue-500';
      case 'complete':
        return 'bg-green-500';
      case 'error':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  const handleDownloadText = () => {
    if (!job?.extracted_text) return;

    const blob = new Blob([job.extracted_text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${job.original_filename}-extracted.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (error) {
    return (
      <Card className='w-full'>
        <CardContent className='pt-6'>
          <div className='text-center text-red-500'>
            <XCircle className='mx-auto mb-4 h-12 w-12' />
            <p className='text-lg font-semibold'>Error Loading Job</p>
            <p className='text-muted-foreground text-sm'>{error}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!job) {
    return (
      <Card className='w-full'>
        <CardContent className='pt-6'>
          <div className='text-center'>
            <Loader2 className='mx-auto mb-4 h-8 w-8 animate-spin' />
            <p className='text-muted-foreground text-sm'>
              Loading job details...
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className='w-full space-y-4'>
      {/* Job Status Card */}
      <Card>
        <CardHeader>
          <CardTitle className='flex items-center justify-between'>
            <div className='flex items-center gap-2'>
              <File className='h-5 w-5' />
              {job.original_filename}
            </div>
            <Badge variant='outline' className='flex items-center gap-1'>
              {getStatusIcon(job.status)}
              {job.status.toUpperCase()}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className='space-y-4'>
          {/* Progress Bar */}
          <div className='space-y-2'>
            <div className='flex justify-between text-sm'>
              <span>Progress</span>
              <span>{job.progress}%</span>
            </div>
            <Progress value={job.progress} className='w-full' />
          </div>

          {/* Error Message */}
          {job.status === 'error' && job.error_message && (
            <div className='rounded-md border border-red-200 bg-red-50 p-3'>
              <p className='text-sm text-red-600'>{job.error_message}</p>
            </div>
          )}

          {/* Action Buttons */}
          {job.status === 'complete' && (
            <div className='flex gap-2'>
              <Button
                onClick={handleDownloadText}
                className='flex items-center gap-2'
              >
                <Download className='h-4 w-4' />
                Download Text
              </Button>
              {job.result_url && (
                <Button
                  variant='outline'
                  onClick={() => window.open(job.result_url, '_blank')}
                  className='flex items-center gap-2'
                >
                  <Eye className='h-4 w-4' />
                  View File
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Results Panel */}
      {job.status === 'complete' && job.extracted_text && (
        <Card className='flex-1'>
          <CardHeader>
            <CardTitle>Extracted Text</CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className='h-96 w-full rounded-md border p-4'>
              <pre className='font-mono text-sm whitespace-pre-wrap'>
                {job.extracted_text}
              </pre>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* Job Metadata */}
      <Card>
        <CardHeader>
          <CardTitle>Job Details</CardTitle>
        </CardHeader>
        <CardContent className='space-y-2 text-sm'>
          <div className='flex justify-between'>
            <span className='font-medium'>Job ID:</span>
            <span className='font-mono text-xs'>{job.id}</span>
          </div>
          <div className='flex justify-between'>
            <span className='font-medium'>Created:</span>
            <span>{new Date(job.created_at).toLocaleString()}</span>
          </div>
          <div className='flex justify-between'>
            <span className='font-medium'>Last Updated:</span>
            <span>{new Date(job.updated_at).toLocaleString()}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
