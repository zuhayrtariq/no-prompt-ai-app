import { Metadata } from 'next';
import { PdfEditorV2 } from '@/components/pdf-editor-v2';

export const metadata: Metadata = {
  title: 'PDF Editor V2 | No-Prompt AI',
  description:
    'Advanced PDF editor with intelligent block detection and multi-format export'
};

export default function PdfEditorV2Page() {
  return (
    <div className='h-screen overflow-hidden'>
      <PdfEditorV2 />
    </div>
  );
}
