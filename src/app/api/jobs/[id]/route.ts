import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { supabase, type Job, type Document } from '@/lib/supabase';
import { getUserSupabaseId } from '@/lib/supabaseServer';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Check authentication
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: jobId } = await params;

    if (!jobId) {
      return NextResponse.json(
        {
          error: 'Job ID is required'
        },
        { status: 400 }
      );
    }

    const id = await getUserSupabaseId({ clerkId: userId });
    // Fetch job from database
    const { data: job, error } = await supabase
      .from('jobs')
      .select('*')
      .eq('id', jobId)
      .eq('user_id', id)
      .single();

    if (error) {
      console.error('Error fetching job:', error);
      return NextResponse.json(
        {
          error: error.message
        },
        { status: 404 }
      );
    }
    if (!job) {
      console.error('Error fetching job:', error);
      return NextResponse.json(
        {
          error: 'Job not found'
        },
        { status: 404 }
      );
    }

    // Fetch related document if document_id exists
    let document = null;
    if (job.input_json?.document_id) {
      const { data: docData } = await supabase
        .from('documents')
        .select('*')
        .eq('id', job.input_json.document_id)
        .single();
      document = docData;
    }

    // Extract relevant data for response
    const response = {
      id: job.id,
      kind: job.kind,
      status: job.status,
      progress: job.progress,
      created_at: job.created_at,
      updated_at: job.updated_at,

      // Input data
      input: job.input_json,

      // Results
      result: job.result_json,

      // Errors
      error: job.error_json,

      // Document info (if available)
      document: document
        ? {
            id: document.id,
            type: document.type,
            storage_path: document.storage_path,
            meta: document.meta_json,
            created_at: document.created_at
          }
        : null,

      // Legacy fields for backward compatibility
      extracted_text: job.result_json?.extracted_text,
      result_url: job.result_json?.result_url,
      error_message: job.error_json?.message,
      original_filename: job.input_json?.original_filename
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error in /api/jobs/[id]:', error);
    return NextResponse.json(
      {
        error: 'Internal server error'
      },
      { status: 500 }
    );
  }
}
