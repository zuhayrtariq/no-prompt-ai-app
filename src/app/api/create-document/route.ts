// app/api/create-document/route.ts
import { NextRequest } from 'next/server';
import { runPipeline } from '@/lib/pipeline';

export async function POST(req: NextRequest) {
  const formData = await req.json();
  const { title, documentType } = formData;

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();

      try {
        // Stream metadata
        controller.enqueue(
          encoder.encode(
            JSON.stringify({
              type: 'data-kind',
              data: documentType,
              transient: true
            }) + '\n'
          )
        );
        controller.enqueue(
          encoder.encode(
            JSON.stringify({
              type: 'data-id',
              data: Date.now().toString(),
              transient: true
            }) + '\n'
          )
        );
        controller.enqueue(
          encoder.encode(
            JSON.stringify({
              type: 'data-title',
              data: title,
              transient: true
            }) + '\n'
          )
        );
        controller.enqueue(
          encoder.encode(
            JSON.stringify({
              type: 'data-clear',
              data: null,
              transient: true
            }) + '\n'
          )
        );

        // Run pipeline with streaming progress
        await runPipeline(title, formData, (stage, content) => {
          console.log(`📡 Streaming ${stage} stage...`);

          // Stream each stage as it completes
          if (stage === 'plan') {
            controller.enqueue(
              encoder.encode(
                JSON.stringify({
                  type: 'data-plan',
                  data: content,
                  transient: false
                }) + '\n'
              )
            );
          } else if (stage === 'draft') {
            controller.enqueue(
              encoder.encode(
                JSON.stringify({
                  type: 'data-draft',
                  data: content,
                  transient: false
                }) + '\n'
              )
            );
          } else if (stage === 'critique') {
            controller.enqueue(
              encoder.encode(
                JSON.stringify({
                  type: 'data-critique',
                  data: content,
                  transient: false
                }) + '\n'
              )
            );
          } else if (stage === 'refined') {
            controller.enqueue(
              encoder.encode(
                JSON.stringify({
                  type: 'data-refined',
                  data: content,
                  transient: false
                }) + '\n'
              )
            );
          }
        });
        controller.enqueue(
          encoder.encode(
            JSON.stringify({
              type: 'data-finish',
              data: null,
              transient: true
            }) + '\n'
          )
        );

        controller.close();
      } catch (err: any) {
        controller.enqueue(
          encoder.encode(
            JSON.stringify({ type: 'error', data: err.message }) + '\n'
          )
        );
        controller.close();
      }
    }
  });
  return new Response(stream, {
    headers: { 'Content-Type': 'application/json; charset=utf-8' }
  });
}
