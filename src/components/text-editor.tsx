'use client';

import React, { useRef, useEffect } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import {
  Bold,
  Italic,
  Underline,
  List,
  ListOrdered,
  Heading1,
  Heading2,
  Quote
} from 'lucide-react';

interface TextEditorProps {
  content: string;
  onChange: (content: string) => void;
}

export function TextEditor({ content, onChange }: TextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== content) {
      editorRef.current.innerHTML = content;
    }
  }, [content]);

  const handleInput = () => {
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
  };

  const execCommand = (command: string, value?: string) => {
    document.execCommand(command, false, value);
    if (editorRef.current) {
      editorRef.current.focus();
      onChange(editorRef.current.innerHTML);
    }
  };

  const formatBlock = (tag: string) => {
    execCommand('formatBlock', `<${tag}>`);
  };

  return (
    <div className='flex h-full flex-col'>
      {/* Toolbar */}
      <div className='flex flex-wrap items-center gap-1 border-b p-2'>
        <Button
          variant='ghost'
          size='sm'
          onClick={() => formatBlock('h1')}
          title='Heading 1'
        >
          <Heading1 className='h-4 w-4' />
        </Button>
        <Button
          variant='ghost'
          size='sm'
          onClick={() => formatBlock('h2')}
          title='Heading 2'
        >
          <Heading2 className='h-4 w-4' />
        </Button>
        <Button
          variant='ghost'
          size='sm'
          onClick={() => formatBlock('blockquote')}
          title='Quote'
        >
          <Quote className='h-4 w-4' />
        </Button>

        <div className='bg-border mx-1 h-6 w-px' />

        <Button
          variant='ghost'
          size='sm'
          onClick={() => execCommand('bold')}
          title='Bold'
        >
          <Bold className='h-4 w-4' />
        </Button>
        <Button
          variant='ghost'
          size='sm'
          onClick={() => execCommand('italic')}
          title='Italic'
        >
          <Italic className='h-4 w-4' />
        </Button>
        <Button
          variant='ghost'
          size='sm'
          onClick={() => execCommand('underline')}
          title='Underline'
        >
          <Underline className='h-4 w-4' />
        </Button>

        <div className='bg-border mx-1 h-6 w-px' />

        <Button
          variant='ghost'
          size='sm'
          onClick={() => execCommand('insertUnorderedList')}
          title='Bullet List'
        >
          <List className='h-4 w-4' />
        </Button>
        <Button
          variant='ghost'
          size='sm'
          onClick={() => execCommand('insertOrderedList')}
          title='Numbered List'
        >
          <ListOrdered className='h-4 w-4' />
        </Button>
      </div>

      {/* Editor */}
      <ScrollArea className='flex-1'>
        <div
          ref={editorRef}
          contentEditable
          onInput={handleInput}
          className='min-h-full p-4 focus:outline-none'
          style={{
            lineHeight: '1.6',
            fontFamily: 'system-ui, -apple-system, sans-serif'
          }}
          dangerouslySetInnerHTML={{ __html: content }}
        />
      </ScrollArea>

      <style jsx>{`
        /* Editor styles */
        div[contenteditable] h1 {
          font-size: 1.875rem;
          font-weight: bold;
          margin: 1rem 0 0.5rem 0;
          line-height: 1.2;
        }

        div[contenteditable] h2 {
          font-size: 1.5rem;
          font-weight: bold;
          margin: 1rem 0 0.5rem 0;
          line-height: 1.2;
        }

        div[contenteditable] h3 {
          font-size: 1.25rem;
          font-weight: bold;
          margin: 1rem 0 0.5rem 0;
          line-height: 1.2;
        }

        div[contenteditable] p {
          margin: 0.5rem 0;
        }

        div[contenteditable] blockquote {
          border-left: 4px solid #e5e7eb;
          padding-left: 1rem;
          margin: 1rem 0;
          font-style: italic;
          color: #6b7280;
        }

        div[contenteditable] ul,
        div[contenteditable] ol {
          margin: 0.5rem 0;
          padding-left: 2rem;
        }

        div[contenteditable] li {
          margin: 0.25rem 0;
        }

        div[contenteditable] table {
          border-collapse: collapse;
          width: 100%;
          margin: 1rem 0;
        }

        div[contenteditable] table td {
          border: 1px solid #e5e7eb;
          padding: 0.5rem;
        }

        div[contenteditable] .page-header {
          color: #6b7280;
          font-size: 0.875rem;
          border-bottom: 1px solid #e5e7eb;
          padding-bottom: 0.5rem;
          margin-bottom: 1rem;
        }

        div[contenteditable] .page-break {
          border-top: 2px dashed #d1d5db;
          margin: 2rem 0;
          padding-top: 2rem;
        }
      `}</style>
    </div>
  );
}
