'use client';

import React from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  FileText,
  Edit3,
  ArrowRight,
  Scan,
  Type,
  Download,
  CheckCircle
} from 'lucide-react';

export default function PdfToolsPage() {
  return (
    <div className='h-screen overflow-y-auto'>
      <div className='container mx-auto max-w-6xl p-6 pb-24'>
        <div className='mb-8 text-center'>
          <h1 className='mb-4 text-4xl font-bold'>PDF Tools</h1>
          <p className='text-muted-foreground mx-auto max-w-2xl text-lg'>
            Choose the right tool for your PDF needs. Extract text from scanned
            documents or edit existing PDFs while preserving their formatting.
          </p>
        </div>

        <div className='grid gap-8 md:grid-cols-2'>
          {/* PDF OCR Tool */}
          <Card className='h-full transition-shadow hover:shadow-lg'>
            <CardHeader className='pb-4'>
              <div className='flex items-center justify-between'>
                <div className='flex items-center gap-3'>
                  <div className='rounded-lg bg-blue-500 p-2 text-white'>
                    <Scan className='h-6 w-6' />
                  </div>
                  <CardTitle className='text-xl'>
                    PDF OCR (Text Extraction)
                  </CardTitle>
                </div>
                <Badge variant='secondary'>Ready</Badge>
              </div>
            </CardHeader>
            <CardContent className='space-y-6'>
              <p className='text-muted-foreground'>
                Extract text from scanned PDFs and image-based documents using
                advanced OCR technology.
              </p>

              <div className='space-y-3'>
                <h4 className='text-sm font-semibold'>Perfect for:</h4>
                <ul className='text-muted-foreground space-y-2 text-sm'>
                  <li className='flex items-center gap-2'>
                    <CheckCircle className='h-4 w-4 text-green-500' />
                    Scanned documents and images
                  </li>
                  <li className='flex items-center gap-2'>
                    <CheckCircle className='h-4 w-4 text-green-500' />
                    Converting PDFs to searchable text
                  </li>
                  <li className='flex items-center gap-2'>
                    <CheckCircle className='h-4 w-4 text-green-500' />
                    Extracting content from old documents
                  </li>
                  <li className='flex items-center gap-2'>
                    <CheckCircle className='h-4 w-4 text-green-500' />
                    Multi-language text recognition
                  </li>
                </ul>
              </div>

              <div className='rounded-lg bg-gray-50 p-4'>
                <div className='mb-2 flex items-center gap-2'>
                  <Download className='h-4 w-4' />
                  <span className='text-sm font-medium'>Output:</span>
                </div>
                <p className='text-muted-foreground text-sm'>
                  Plain text file (.txt) with all extracted content
                </p>
              </div>

              <Link href='/dashboard/pdf-ocr'>
                <Button className='flex w-full items-center gap-2'>
                  Start OCR Extraction
                  <ArrowRight className='h-4 w-4' />
                </Button>
              </Link>
            </CardContent>
          </Card>

          {/* PDF Editor Tool */}
          <Card className='h-full transition-shadow hover:shadow-lg'>
            <CardHeader className='pb-4'>
              <div className='flex items-center justify-between'>
                <div className='flex items-center gap-3'>
                  <div className='rounded-lg bg-emerald-500 p-2 text-white'>
                    <Edit3 className='h-6 w-6' />
                  </div>
                  <CardTitle className='text-xl'>PDF Editor</CardTitle>
                </div>
                <Badge variant='secondary'>New</Badge>
              </div>
            </CardHeader>
            <CardContent className='space-y-6'>
              <p className='text-muted-foreground'>
                Edit PDF files while preserving original formatting. Add text,
                fill forms, and export as PDF or Word.
              </p>

              <div className='space-y-3'>
                <h4 className='text-sm font-semibold'>Perfect for:</h4>
                <ul className='text-muted-foreground space-y-2 text-sm'>
                  <li className='flex items-center gap-2'>
                    <CheckCircle className='h-4 w-4 text-green-500' />
                    Editing existing PDF documents
                  </li>
                  <li className='flex items-center gap-2'>
                    <CheckCircle className='h-4 w-4 text-green-500' />
                    Filling out forms and applications
                  </li>
                  <li className='flex items-center gap-2'>
                    <CheckCircle className='h-4 w-4 text-green-500' />
                    Adding annotations and comments
                  </li>
                  <li className='flex items-center gap-2'>
                    <CheckCircle className='h-4 w-4 text-green-500' />
                    Preserving document formatting
                  </li>
                </ul>
              </div>

              <div className='rounded-lg bg-gray-50 p-4'>
                <div className='mb-2 flex items-center gap-2'>
                  <Download className='h-4 w-4' />
                  <span className='text-sm font-medium'>Output:</span>
                </div>
                <p className='text-muted-foreground text-sm'>
                  Editable PDF or Word document (.docx) with your changes
                </p>
              </div>

              <Link href='/dashboard/pdf-editor'>
                <Button className='flex w-full items-center gap-2'>
                  Start PDF Editing
                  <ArrowRight className='h-4 w-4' />
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>

        {/* Comparison Table */}
        <div className='mt-12'>
          <h2 className='mb-6 text-center text-2xl font-bold'>
            Feature Comparison
          </h2>
          <Card>
            <CardContent className='p-0'>
              <div className='overflow-x-auto'>
                <table className='w-full'>
                  <thead className='border-b bg-gray-50'>
                    <tr>
                      <th className='p-4 text-left font-semibold'>Feature</th>
                      <th className='p-4 text-center font-semibold'>PDF OCR</th>
                      <th className='p-4 text-center font-semibold'>
                        PDF Editor
                      </th>
                    </tr>
                  </thead>
                  <tbody className='divide-y'>
                    <tr>
                      <td className='p-4'>Text Extraction</td>
                      <td className='p-4 text-center'>
                        <CheckCircle className='mx-auto h-5 w-5 text-green-500' />
                      </td>
                      <td className='text-muted-foreground p-4 text-center'>
                        -
                      </td>
                    </tr>
                    <tr className='bg-gray-50'>
                      <td className='p-4'>Text Editing</td>
                      <td className='text-muted-foreground p-4 text-center'>
                        -
                      </td>
                      <td className='p-4 text-center'>
                        <CheckCircle className='mx-auto h-5 w-5 text-green-500' />
                      </td>
                    </tr>
                    <tr>
                      <td className='p-4'>Preserve Formatting</td>
                      <td className='text-muted-foreground p-4 text-center'>
                        -
                      </td>
                      <td className='p-4 text-center'>
                        <CheckCircle className='mx-auto h-5 w-5 text-green-500' />
                      </td>
                    </tr>
                    <tr className='bg-gray-50'>
                      <td className='p-4'>Form Filling</td>
                      <td className='text-muted-foreground p-4 text-center'>
                        -
                      </td>
                      <td className='p-4 text-center'>
                        <CheckCircle className='mx-auto h-5 w-5 text-green-500' />
                      </td>
                    </tr>
                    <tr>
                      <td className='p-4'>Scanned Document Support</td>
                      <td className='p-4 text-center'>
                        <CheckCircle className='mx-auto h-5 w-5 text-green-500' />
                      </td>
                      <td className='text-muted-foreground p-4 text-center'>
                        Limited
                      </td>
                    </tr>
                    <tr className='bg-gray-50'>
                      <td className='p-4'>Export Options</td>
                      <td className='p-4 text-center text-sm'>TXT</td>
                      <td className='p-4 text-center text-sm'>PDF, DOCX</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
