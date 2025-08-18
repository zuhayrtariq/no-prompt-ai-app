import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import {
  supabase,
  type Document,
  type Job,
  type DocumentMeta,
  type JobInput
} from '@/lib/supabase';
import { extractTextFromPDF } from '@/lib/ocr-utils';
export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { storage_path, filename } = body;

    if (!storage_path || !filename) {
      return NextResponse.json(
        {
          error: 'Missing required fields: storage_path and filename'
        },
        { status: 400 }
      );
    }

    console.log('Creating document for user:', userId);

    // Create document record
    const documentMeta: DocumentMeta = {
      original_filename: filename,
      status: 'pending'
    };

    console.log('Attempting to insert document:', {
      user_id: userId,
      type: 'pdf',
      storage_path,
      meta_json: documentMeta
    });

    const { data: document, error: documentError } = await supabase
      .from('documents')
      .insert({
        user_id: userId,
        type: 'pdf',
        storage_path,
        meta_json: documentMeta
      })
      .select()
      .single();

    if (documentError || !document) {
      console.error('Error creating document:', documentError);
      return NextResponse.json(
        {
          error: `Failed to create document record: ${documentError?.message || 'Unknown error'}`
        },
        { status: 500 }
      );
    }

    console.log('Document created successfully:', document.id);

    // Create job record
    const jobInput: JobInput = {
      document_id: document.id,
      storage_path,
      original_filename: filename,
      options: {
        language: 'eng',
        quality: 'balanced'
      }
    };

    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .insert({
        user_id: userId,
        kind: 'pdf_ocr',
        status: 'pending',
        progress: 0,
        input_json: jobInput,
        result_json: {},
        error_json: {}
      })
      .select()
      .single();

    if (jobError || !job) {
      console.error('Error creating job:', jobError);
      return NextResponse.json(
        {
          error: 'Failed to create job record'
        },
        { status: 500 }
      );
    }

    // Update document with job_id
    await supabase
      .from('documents')
      .update({
        meta_json: { ...documentMeta, job_id: job.id }
      })
      .eq('id', document.id);

    // Start background processing
    processOcrJob(job.id, document.id, storage_path, userId);

    return NextResponse.json({ job_id: job.id, document_id: document.id });
  } catch (error) {
    console.error('Error in /api/pdf/parse:', error);
    return NextResponse.json(
      {
        error: 'Internal server error'
      },
      { status: 500 }
    );
  }
}

// Background job processing function
async function processOcrJob(
  jobId: string,
  documentId: string,
  storagePath: string,
  userId: string
) {
  const startTime = Date.now();

  try {
    // Update job status to processing
    await supabase
      .from('jobs')
      .update({
        status: 'processing',
        progress: 10,
        updated_at: new Date().toISOString()
      })
      .eq('id', jobId);

    // Update document status
    const { data: currentDoc } = await supabase
      .from('documents')
      .select('meta_json')
      .eq('id', documentId)
      .single();

    await supabase
      .from('documents')
      .update({
        meta_json: { ...currentDoc?.meta_json, status: 'processing' }
      })
      .eq('id', documentId);

    // Get public URL for the file
    const { data: urlData } = supabase.storage
      .from('pdf-uploads')
      .getPublicUrl(storagePath);

    // Download file from Supabase storage
    const response = await fetch(urlData.publicUrl);
    if (!response.ok) {
      throw new Error('Failed to download file from storage');
    }

    const buffer = Buffer.from(await response.arrayBuffer());

    // Update progress
    await supabase
      .from('jobs')
      .update({
        progress: 30,
        updated_at: new Date().toISOString()
      })
      .eq('id', jobId);

    // Extract text using smart detection
    const extractionResult = await extractTextFromPDF(buffer, storagePath);
    const extractedText = extractionResult.text;
    const methodUsed = extractionResult.method;
    const textLength = extractedText.length;
    const ocrRatio = textLength > 0 ? 1.0 : 0.0;

    // Update progress
    await supabase
      .from('jobs')
      .update({
        progress: 80,
        updated_at: new Date().toISOString()
      })
      .eq('id', jobId);

    // Save extracted text to storage as a .txt file
    const textBlob = new Blob([extractedText], { type: 'text/plain' });
    const textBuffer = Buffer.from(await textBlob.arrayBuffer());

    const resultFileName = `results/${jobId}-extracted.txt`;
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('pdf-results')
      .upload(resultFileName, textBuffer, {
        contentType: 'text/plain',
        upsert: true
      });

    if (uploadError) {
      throw new Error(`Failed to upload result: ${uploadError.message}`);
    }

    const { data: resultUrlData } = supabase.storage
      .from('pdf-results')
      .getPublicUrl(resultFileName);

    const processingTime = Date.now() - startTime;

    // Update job as complete
    const resultJson = {
      extracted_text: extractedText,
      result_storage_path: resultFileName,
      result_url: resultUrlData.publicUrl,
      ocr_ratio: ocrRatio,
      pages_processed: 1, // TODO: Count actual pages
      processing_time_ms: processingTime,
      method_used: methodUsed
    };

    await supabase
      .from('jobs')
      .update({
        status: 'complete',
        progress: 100,
        result_json: resultJson,
        updated_at: new Date().toISOString()
      })
      .eq('id', jobId);

    // Update document status and metadata
    const { data: currentDoc2 } = await supabase
      .from('documents')
      .select('meta_json')
      .eq('id', documentId)
      .single();

    await supabase
      .from('documents')
      .update({
        meta_json: {
          ...currentDoc2?.meta_json,
          status: 'complete',
          ocr_ratio: ocrRatio,
          pages: 1
        }
      })
      .eq('id', documentId);

    console.log(
      `OCR job ${jobId} completed successfully in ${processingTime}ms`
    );
  } catch (error) {
    console.error(`Error processing OCR job ${jobId}:`, error);

    const errorJson = {
      message: error instanceof Error ? error.message : 'Unknown error',
      code: 'PROCESSING_ERROR',
      stage: 'ocr',
      details: error
    };

    // Update job as failed
    await supabase
      .from('jobs')
      .update({
        status: 'error',
        error_json: errorJson,
        updated_at: new Date().toISOString()
      })
      .eq('id', jobId);

    // Update document status
    const { data: currentDoc3 } = await supabase
      .from('documents')
      .select('meta_json')
      .eq('id', documentId)
      .single();

    await supabase
      .from('documents')
      .update({
        meta_json: {
          ...currentDoc3?.meta_json,
          status: 'error',
          errors: [error instanceof Error ? error.message : 'Unknown error']
        }
      })
      .eq('id', documentId);
  }
}

// TODO: Move background processing to a proper queue system (Vercel Queue, Bull, etc.)
// TODO: Add retry logic for failed jobs
// TODO: Add timeout handling for long-running jobs
// TODO: Add webhook notifications when jobs complete
// TODO: Add file size validation before processing
