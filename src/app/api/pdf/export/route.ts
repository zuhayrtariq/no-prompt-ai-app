import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { supabase } from '@/lib/supabase';
import { PdfEditor } from '@/lib/pdf-editor-utils';

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { session_id, storage_path, modifications, format = 'pdf' } = body;

    if (!session_id || !storage_path || !Array.isArray(modifications)) {
      return NextResponse.json(
        {
          error:
            'Missing required fields: session_id, storage_path, modifications'
        },
        { status: 400 }
      );
    }

    if (!['pdf', 'docx'].includes(format)) {
      return NextResponse.json(
        { error: 'Invalid format. Must be "pdf" or "docx"' },
        { status: 400 }
      );
    }

    // Download the original PDF from Supabase
    const { data: originalPdf, error: downloadError } = await supabase.storage
      .from('pdf-uploads')
      .download(storage_path);

    if (downloadError) {
      console.error('Failed to download original PDF:', downloadError);
      return NextResponse.json(
        { error: 'Failed to download original PDF' },
        { status: 500 }
      );
    }

    // Convert to ArrayBuffer
    const pdfBuffer = await originalPdf.arrayBuffer();

    // Apply modifications using PdfEditor
    const editor = new PdfEditor();
    modifications.forEach((mod: any) => editor.addModification(mod));

    let exportBuffer: Uint8Array;
    let contentType: string;
    let fileExtension: string;

    if (format === 'pdf') {
      exportBuffer = await editor.applyModificationsToPdf(pdfBuffer);
      contentType = 'application/pdf';
      fileExtension = 'pdf';
    } else {
      // DOCX export (placeholder implementation)
      exportBuffer = new Uint8Array(); // TODO: Implement DOCX export
      contentType =
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
      fileExtension = 'docx';
    }

    // Upload the modified file to Supabase
    const exportFileName = `${session_id}_export.${fileExtension}`;

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('pdf-uploads')
      .upload(exportFileName, exportBuffer, {
        contentType,
        cacheControl: '3600',
        upsert: true
      });

    if (uploadError) {
      console.error('Failed to upload exported file:', uploadError);
      return NextResponse.json(
        { error: 'Failed to upload exported file' },
        { status: 500 }
      );
    }

    // Get public URL for download
    const { data: urlData } = supabase.storage
      .from('pdf-uploads')
      .getPublicUrl(exportFileName);

    return NextResponse.json({
      session_id,
      format,
      download_url: urlData.publicUrl,
      filename: exportFileName,
      modifications_applied: modifications.length,
      exported_at: new Date().toISOString()
    });
  } catch (error) {
    console.error('PDF export error:', error);
    return NextResponse.json(
      { error: 'Failed to export PDF' },
      { status: 500 }
    );
  }
}
