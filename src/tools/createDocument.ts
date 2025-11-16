// tools/createDocument.ts
import { generateUUID } from '@/lib/utils';
import { tool, type UIMessageStreamWriter } from 'ai';
import { z } from 'zod';
import { runPipeline } from '@/lib/pipeline';
// import type { ChatMessage } from '@/lib/types';

interface CreateDocumentProps {
  //   session: Session;
  dataStream: UIMessageStreamWriter<any>;
  requestState: { createdDocumentId: string | null };
}

export const createDocument = ({
  //   session,
  dataStream,
  requestState
}: CreateDocumentProps) =>
  tool({
    description:
      'Create a document with Claude+GPT pipeline (Plan → Draft → Critique → Refine).',
    inputSchema: z.object({
      title: z.string(),
      kind: z.string() // simplified – can reintroduce enum if needed
    }),
    execute: async ({ title, kind }) => {
      if (requestState.createdDocumentId) {
        throw new Error('A document has already been created in this request.');
      }

      const id = generateUUID();
      requestState.createdDocumentId = id;

      // Document creation started

      // 🔔 Stream metadata so frontend knows a doc exists
      dataStream.write({ type: 'data-kind', data: kind, transient: true });
      dataStream.write({ type: 'data-id', data: id, transient: true });
      dataStream.write({ type: 'data-title', data: title, transient: true });
      dataStream.write({ type: 'data-clear', data: null, transient: true });

      // 🚀 Run pipeline
      const { plan, draft, critique, refined } = await runPipeline(title);

      // 📡 Optionally stream intermediate stages
      dataStream.write({ type: 'data-plan', data: plan, transient: false });
      dataStream.write({ type: 'data-draft', data: draft, transient: false });
      dataStream.write({
        type: 'data-critique',
        data: critique,
        transient: false
      });
      dataStream.write({
        type: 'data-refined',
        data: refined,
        transient: false
      });

      dataStream.write({ type: 'data-finish', data: null, transient: true });

      return {
        id,
        title,
        kind,
        content: refined
      };
    }
  });
