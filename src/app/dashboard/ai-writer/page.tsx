'use client';

import { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Icons } from '@/components/icons';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import DocumentGenerationForm from '@/components/document-generation-form';
import { toast } from 'sonner';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';

interface Message {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: Date;
}

interface DocumentData {
  id?: string;
  title?: string;
  kind?: string;
  plan?: string;
  draft?: string;
  critique?: string;
  refined?: string;
}

interface DocumentStage {
  type: 'plan' | 'draft' | 'critique' | 'refined';
  content: string;
  timestamp: Date;
}

interface DocumentFormData {
  title: string;
  documentType:
    | 'email'
    | 'legal-letter'
    | 'essay'
    | 'article'
    | 'report'
    | 'blog';
  audience: 'internal' | 'external';
  seniority: 'junior' | 'mid' | 'senior' | 'executive';
  knowledgeLevel: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  goal: string;
  goalTags: string[];
  keyPoints: string[];
  constraints: {
    mustInclude: string[];
    mustAvoid: string[];
    legalCompliance: string[];
  };
  evidence: string[];
  evidenceMode: 'summary' | 'verbatim';
  length: {
    target: number;
    type: 'words' | 'characters';
    style: 'tight' | 'medium' | 'long';
  };
  tone:
    | 'plain'
    | 'formal'
    | 'friendly'
    | 'punchy'
    | 'neutral'
    | 'aussie'
    | 'us'
    | 'uk'
    | 'custom';
  customTone: string;
  styleGuides: {
    oxfordComma: boolean;
    spelling: 'au' | 'us' | 'uk';
    dateFormat: 'dd/mm/yyyy' | 'mm/dd/yyyy' | 'yyyy-mm-dd';
    emojiPolicy: 'none' | 'minimal' | 'moderate' | 'liberal';
  };
  privacyMode: boolean;
  reviewTargets: {
    readabilityGrade: number;
    clarityThreshold: number;
    flowThreshold: number;
  };
}

export default function AIWriterPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      content:
        "Hello! I'm your AI writing assistant. I can help you create, edit, and improve documents. What would you like to write about today?",
      role: 'assistant',
      timestamp: new Date()
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [document, setDocument] = useState(
    'Start writing your document here...'
  );
  const [isLoading, setIsLoading] = useState(false);
  const [isGeneratingDocument, setIsGeneratingDocument] = useState(false);
  const [documentData, setDocumentData] = useState<DocumentData>({});
  const [documentStages, setDocumentStages] = useState<DocumentStage[]>([]);
  const [currentStage, setCurrentStage] = useState<string>('');
  const [wordCount, setWordCount] = useState<number>(0);
  const [targetWordCount, setTargetWordCount] = useState<number>(0);
  const [showDocumentDialog, setShowDocumentDialog] = useState(true);
  const [isFormReadOnly, setIsFormReadOnly] = useState(false);
  const [generatedFormData, setGeneratedFormData] =
    useState<DocumentFormData | null>(null);
  const [isEditingDocument, setIsEditingDocument] = useState(false);
  const [isPreview, setIsPreview] = useState(false);
  const [history, setHistory] = useState<string[]>([]);
  const [future, setFuture] = useState<string[]>([]);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector(
        '[data-radix-scroll-area-viewport]'
      );
      if (scrollContainer) {
        // Use setTimeout to ensure the DOM has updated
        setTimeout(() => {
          scrollContainer.scrollTop = scrollContainer.scrollHeight;
        }, 100);
      }
    }
  }, [messages]);

  const handleSendMessage = async () => {
    if (!inputMessage.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      content: inputMessage,
      role: 'user',
      timestamp: new Date()
    };

    setMessages((prev) => [...prev, userMessage]);
    const currentInput = inputMessage;
    setInputMessage('');
    setIsLoading(true);

    try {
      // Check if the message is asking to update the document
      const isDocumentUpdate =
        currentInput.toLowerCase().includes('update') ||
        currentInput.toLowerCase().includes('change') ||
        currentInput.toLowerCase().includes('modify') ||
        currentInput.toLowerCase().includes('edit') ||
        currentInput.toLowerCase().includes('add') ||
        currentInput.toLowerCase().includes('remove') ||
        currentInput.toLowerCase().includes('delete') ||
        currentInput.toLowerCase().includes('insert') ||
        currentInput.toLowerCase().includes('append') ||
        currentInput.toLowerCase().includes('doc') ||
        currentInput.toLowerCase().includes('document') ||
        currentInput.toLowerCase().includes('text') ||
        currentInput.toLowerCase().includes('content');

      // Undo / Redo via chat keywords
      const lower = currentInput.toLowerCase();
      const wantsUndo = /(undo|revert|rollback|go back)/.test(lower);
      const wantsRedo = /(redo|forward|restore)/.test(lower);

      if (wantsUndo) {
        handleUndo();
        const aiResponse: Message = {
          id: (Date.now() + 1).toString(),
          content: 'Reverted to the previous version of the document.',
          role: 'assistant',
          timestamp: new Date()
        };
        setMessages((prev) => [...prev, aiResponse]);
        return;
      }

      if (wantsRedo) {
        handleRedo();
        const aiResponse: Message = {
          id: (Date.now() + 1).toString(),
          content: 'Restored the next version of the document.',
          role: 'assistant',
          timestamp: new Date()
        };
        setMessages((prev) => [...prev, aiResponse]);
        return;
      }

      if (isDocumentUpdate && document.trim()) {
        // Use the document update API
        const response = await fetch('/api/ai-writer/update-document', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            message: currentInput,
            currentDocument: document,
            conversationHistory: messages
          })
        });

        if (!response.ok) {
          throw new Error('Failed to update document');
        }

        const data = await response.json();

        if (data.success) {
          const aiResponse: Message = {
            id: (Date.now() + 1).toString(),
            content: data.response,
            role: 'assistant',
            timestamp: new Date()
          };
          setMessages((prev) => [...prev, aiResponse]);

          // Update the document if provided
          if (data.updatedDocument) {
            pushHistory(document);
            setDocument(data.updatedDocument);
            const newWordCount = data.updatedDocument.split(/\s+/).length;
            setWordCount(newWordCount);
          }
        } else {
          throw new Error(data.error || 'Failed to update document');
        }
      } else {
        // Regular chat
        const response = await fetch('/api/ai-writer/chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            message: currentInput,
            conversationHistory: messages
          })
        });

        const data = await response.json();

        if (data.success) {
          const aiResponse: Message = {
            id: (Date.now() + 1).toString(),
            content: data.response,
            role: 'assistant',
            timestamp: new Date()
          };
          setMessages((prev) => [...prev, aiResponse]);
        } else {
          throw new Error(data.error || 'Failed to get AI response');
        }
      }
    } catch (error: any) {
      toast.error('Failed to get AI response. Please try again.');

      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: 'Sorry, I encountered an error. Please try again.',
        role: 'assistant',
        timestamp: new Date()
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleDocumentChange = (value: string) => {
    setDocument(value);
  };

  const pushHistory = (snapshot: string) => {
    setHistory((prev) => [...prev, snapshot]);
    setFuture([]);
  };

  const handleUndo = () => {
    setHistory((prev) => {
      if (prev.length === 0) return prev;
      const last = prev[prev.length - 1];
      setFuture((f) => [document, ...f]);
      setDocument(last);
      return prev.slice(0, -1);
    });
  };

  const handleRedo = () => {
    setFuture((prev) => {
      if (prev.length === 0) return prev;
      const next = prev[0];
      setHistory((h) => [...h, document]);
      setDocument(next);
      return prev.slice(1);
    });
  };

  const generateDocument = async (formData: DocumentFormData) => {
    setIsGeneratingDocument(true);
    setDocumentData({});
    setDocumentStages([]);
    setCurrentStage('Starting document generation...');
    setWordCount(0);
    setTargetWordCount(formData.length.target);
    setDocument(
      'Generating your document...\n\nPlease wait while we create your content.'
    );

    // Save form data and make form read-only
    setGeneratedFormData(formData);
    setIsFormReadOnly(true);

    try {
      const response = await fetch('/api/create-document', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        throw new Error('Failed to generate document');
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response body');
      }

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.trim()) {
            try {
              const data = JSON.parse(line);
              handleStreamData(data);
            } catch (e) {
              // Failed to parse stream data, continue processing
            }
          }
        }
      }
    } catch (error: any) {
      toast.error('Failed to generate document. Please try again.');
      setDocument('Error generating document. Please try again.');
    } finally {
      setIsGeneratingDocument(false);
      setCurrentStage('');
    }
  };

  const handleStreamData = (data: any) => {
    switch (data.type) {
      case 'data-title':
        setDocumentData((prev) => ({ ...prev, title: data.data }));
        setCurrentStage(`Generating: ${data.data}`);
        break;
      case 'data-id':
        setDocumentData((prev) => ({ ...prev, id: data.data }));
        break;
      case 'data-plan':
        setDocumentData((prev) => ({ ...prev, plan: data.data }));
        setCurrentStage('Creating outline...');
        setDocumentStages((prev) => [
          ...prev,
          { type: 'plan', content: data.data, timestamp: new Date() }
        ]);
        setDocument(`📋 OUTLINE\n\n${data.data}\n\n---\n\nGenerating draft...`);
        console.log('📋 Plan received:', data.data.substring(0, 100) + '...');
        break;
      case 'data-draft':
        setDocumentData((prev) => ({ ...prev, draft: data.data }));
        setCurrentStage('Writing draft...');
        setDocumentStages((prev) => [
          ...prev,
          { type: 'draft', content: data.data, timestamp: new Date() }
        ]);
        setDocument(
          `📋 OUTLINE\n\n${documentData.plan || ''}\n\n---\n\n📝 DRAFT\n\n${data.data}\n\n---\n\nAnalyzing and refining...`
        );
        const draftWordCount = data.data.split(/\s+/).length;
        setWordCount(draftWordCount);
        console.log('📝 Draft received:', data.data.substring(0, 100) + '...');
        console.log(`📊 Draft word count: ${draftWordCount} words`);
        break;
      case 'data-critique':
        setDocumentData((prev) => ({ ...prev, critique: data.data }));
        setCurrentStage('Analyzing content...');
        setDocumentStages((prev) => [
          ...prev,
          { type: 'critique', content: data.data, timestamp: new Date() }
        ]);
        console.log(
          '🔍 Critique received:',
          data.data.substring(0, 100) + '...'
        );
        break;
      case 'data-refined':
        setDocumentData((prev) => ({ ...prev, refined: data.data }));
        setCurrentStage('Finalizing document...');
        setDocumentStages((prev) => [
          ...prev,
          { type: 'refined', content: data.data, timestamp: new Date() }
        ]);
        pushHistory(document);
        setDocument(data.data);
        const refinedWordCount = data.data.split(/\s+/).length;
        setWordCount(refinedWordCount);
        console.log(
          '✨ Refined document received:',
          data.data.substring(0, 100) + '...'
        );
        console.log(`📊 Final word count: ${refinedWordCount} words`);
        toast.success('Document generated successfully!');
        break;
      case 'error':
        toast.error(`Error: ${data.data}`);
        setDocument(`Error: ${data.data}`);
        break;
      case 'data-finish':
        setCurrentStage('Document generation completed!');
        console.log('✅ Document generation completed!');
        break;
    }
  };

  const handleGenerateDocument = () => {
    setShowDocumentDialog(true);
  };

  const handleFormSubmit = (formData: DocumentFormData) => {
    setShowDocumentDialog(false);
    generateDocument(formData);
  };

  const handleViewForm = () => {
    setShowDocumentDialog(true);
  };

  const handleEditDocument = () => {
    setIsEditingDocument(true);
  };

  const handleSaveDocument = () => {
    setIsEditingDocument(false);
    // Here you could save the document to a backend if needed
  };

  return (
    <div className='flex h-[calc(100vh-4rem)] gap-4 p-6'>
      {/* Chat Section - Left Side */}
      <div className='flex w-1/3 flex-col'>
        <Card className='flex h-full flex-col'>
          <CardHeader className='flex-shrink-0 pb-3'>
            <CardTitle className='flex items-center gap-2'>
              <Icons.aiWriter className='h-5 w-5' />
              AI Writing Assistant
            </CardTitle>
          </CardHeader>
          <CardContent className='flex min-h-0 flex-1 flex-col p-0'>
            <ScrollArea ref={scrollAreaRef} className='flex-1 px-6'>
              <div className='space-y-4 py-4'>
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-lg p-3 ${
                        message.role === 'user'
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted'
                      }`}
                    >
                      <p className='text-sm whitespace-pre-wrap'>
                        {message.content}
                      </p>
                      <p className='mt-1 text-xs opacity-70'>
                        {message.timestamp.toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                ))}
                {isLoading && (
                  <div className='flex justify-start'>
                    <div className='bg-muted rounded-lg p-3'>
                      <div className='flex items-center gap-2'>
                        <Icons.spinner className='h-4 w-4 animate-spin' />
                        <span className='text-sm'>AI is thinking...</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>
            <Separator className='flex-shrink-0' />
            <div className='flex-shrink-0 p-4'>
              <div className='flex gap-2'>
                <Input
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder={
                    isFormReadOnly
                      ? 'Ask me to update your document or chat about it...'
                      : 'Ask me to help with your writing...'
                  }
                  className='flex-1'
                />
                <Button
                  onClick={handleSendMessage}
                  disabled={!inputMessage.trim() || isLoading}
                  size='sm'
                >
                  <Icons.arrowRight className='h-4 w-4' />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Document Section - Right Side */}
      <div className='flex w-2/3 flex-col'>
        <Card className='flex h-full flex-col'>
          <CardHeader className='flex-shrink-0 pb-3'>
            <div className='flex items-center justify-between'>
              <div className='flex flex-col'>
                <CardTitle className='flex items-center gap-2'>
                  <Icons.fileEdit className='h-5 w-5' />
                  {documentData.title
                    ? `Document: ${documentData.title}`
                    : 'Document Editor'}
                </CardTitle>
                {currentStage && (
                  <p className='text-muted-foreground mt-1 text-sm'>
                    {currentStage}
                  </p>
                )}
                {targetWordCount > 0 && (
                  <div className='text-muted-foreground mt-1 text-sm'>
                    Word count: {wordCount} / {targetWordCount}
                    {wordCount > targetWordCount && (
                      <span className='ml-2 text-orange-500'>
                        (Exceeds target by {wordCount - targetWordCount})
                      </span>
                    )}
                    {wordCount < targetWordCount && (
                      <span className='ml-2 text-blue-500'>
                        (Under target by {targetWordCount - wordCount})
                      </span>
                    )}
                    {wordCount === targetWordCount && (
                      <span className='ml-2 text-green-500'>
                        ✓ Perfect length
                      </span>
                    )}
                  </div>
                )}
              </div>
              <div className='flex gap-2'>
                {!isFormReadOnly ? (
                  <Button
                    onClick={handleGenerateDocument}
                    disabled={isGeneratingDocument}
                    size='sm'
                    variant='outline'
                  >
                    {isGeneratingDocument ? (
                      <>
                        <Icons.spinner className='mr-2 h-4 w-4 animate-spin' />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Icons.aiWriter className='mr-2 h-4 w-4' />
                        Generate Document
                      </>
                    )}
                  </Button>
                ) : (
                  <>
                    <Button
                      onClick={() => setIsPreview((p) => !p)}
                      size='sm'
                      variant='outline'
                    >
                      {isPreview ? 'Edit' : 'Preview'}
                    </Button>
                    <Button
                      onClick={handleUndo}
                      size='sm'
                      variant='outline'
                      disabled={history.length === 0}
                    >
                      Undo
                    </Button>
                    <Button
                      onClick={handleRedo}
                      size='sm'
                      variant='outline'
                      disabled={future.length === 0}
                    >
                      Redo
                    </Button>
                    <Button
                      onClick={handleViewForm}
                      size='sm'
                      variant='outline'
                    >
                      <Icons.fileEdit className='mr-2 h-4 w-4' />
                      View Form
                    </Button>
                    <Button
                      onClick={
                        isEditingDocument
                          ? handleSaveDocument
                          : handleEditDocument
                      }
                      size='sm'
                      variant='outline'
                    >
                      <Icons.fileEdit className='mr-2 h-4 w-4' />
                      {isEditingDocument ? 'Save Document' : 'Edit Document'}
                    </Button>
                  </>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className='min-h-0 flex-1 p-0'>
            <div className='h-full overflow-scroll p-6'>
              {isGeneratingDocument && documentStages.length > 0 && (
                <div className='bg-muted mb-4 rounded-lg p-3'>
                  <div className='mb-2 flex items-center gap-2'>
                    <Icons.spinner className='h-4 w-4 animate-spin' />
                    <span className='text-sm font-medium'>
                      Generation Progress
                    </span>
                  </div>
                  <div className='space-y-1'>
                    {documentStages.map((stage, index) => (
                      <div
                        key={index}
                        className='text-muted-foreground flex items-center gap-2 text-xs'
                      >
                        <div className='h-2 w-2 rounded-full bg-green-500' />
                        <span className='capitalize'>{stage.type}</span>
                        <span className='text-xs opacity-70'>
                          {stage.timestamp.toLocaleTimeString()}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {isPreview ? (
                <div className='prose prose-neutral prose-headings:font-semibold prose-h1:mt-0 prose-h1:mb-2 prose-h2:mt-6 prose-h2:mb-2 prose-h3:mt-4 prose-h3:mb-1 prose-p:my-2 prose-li:my-1 prose-code:px-1 prose-code:py-[1px] prose-code:rounded-md prose-code:bg-muted/60 dark:prose-invert max-w-none'>
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm, remarkBreaks]}
                    components={{
                      h1: (props) => (
                        <h1
                          className='text-2xl leading-tight tracking-tight'
                          {...props}
                        />
                      ),
                      h2: (props) => (
                        <h2
                          className='text-xl leading-tight tracking-tight'
                          {...props}
                        />
                      ),
                      h3: (props) => (
                        <h3
                          className='text-lg leading-tight tracking-tight'
                          {...props}
                        />
                      ),
                      code: (p: any) => {
                        const { inline, className, children, ...props } = p;
                        const isInline =
                          inline ?? !String(children).includes('\n');
                        return isInline ? (
                          <code
                            className='bg-muted/60 rounded px-1 py-[1px] text-[0.9em]'
                            {...props}
                          >
                            {children}
                          </code>
                        ) : (
                          <code className={className} {...props}>
                            {children}
                          </code>
                        );
                      }
                    }}
                  >
                    {document}
                  </ReactMarkdown>
                </div>
              ) : (
                <Textarea
                  value={document}
                  onChange={(e) => handleDocumentChange(e.target.value)}
                  className='h-full min-h-0 resize-none border-0 text-sm leading-relaxed focus-visible:ring-0'
                  placeholder='Start writing your document here...'
                  disabled={isGeneratingDocument}
                  readOnly={!isEditingDocument}
                />
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Document Generation Dialog */}
      <Dialog
        open={showDocumentDialog}
        onOpenChange={setShowDocumentDialog}

        // defaultOpen={true}
      >
        <DialogContent className='max-h-[95vh] w-[95vw]! max-w-7xl overflow-y-auto sm:min-w-[90vw]! md:min-w-[85vw]! lg:min-w-[80vw]! xl:min-w-[75vw]!'>
          <DialogHeader>
            <DialogTitle>Advanced Document Generation</DialogTitle>
          </DialogHeader>
          <DocumentGenerationForm
            onSubmit={handleFormSubmit}
            onCancel={() => setShowDocumentDialog(false)}
            isLoading={isGeneratingDocument}
            isReadOnly={isFormReadOnly}
            formData={generatedFormData}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
