import dynamic from 'next/dynamic';
import { Loader2 } from 'lucide-react';

// Dynamically import the PDF editor client component to avoid SSR issues
const PdfEditorClient = dynamic(
  () =>
    import('./pdf-editor-client').then((mod) => ({
      default: mod.PdfEditorClient
    })),
  {
    ssr: false,
    loading: () => (
      <div className='flex h-96 w-full items-center justify-center'>
        <div className='flex flex-col items-center space-y-4'>
          <Loader2 className='h-8 w-8 animate-spin' />
          <p className='text-muted-foreground'>Loading PDF Editor...</p>
        </div>
      </div>
    )
  }
);

interface PdfEditorProps {
  jobId?: string;
  fileUrl?: string;
  fileName?: string;
}

export function PdfEditor(props: PdfEditorProps) {
  return <PdfEditorClient {...props} />;
}
