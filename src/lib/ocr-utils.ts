import pdfParse from 'pdf-parse/lib/pdf-parse';
import Tesseract from 'tesseract.js';
import path from 'path';
import pdf2pic from 'pdf2pic';
import * as fs from 'fs';
// Types for progress tracking
export interface OCRProgress {
  stage: 'pdf-parse' | 'pdf-to-images' | 'ocr-processing' | 'complete';
  progress: number;
  message: string;
  pagesCurrent?: number;
  pagesTotal?: number;
}

export type ProgressCallback = (progress: OCRProgress) => void;

/**
 * Extracts text from a PDF using pdf-parse (and falls back to OCR if needed).
 */
export async function extractTextFromPDF(
  buffer: Buffer,
  filename: string,
  options: {
    progressCallback?: ProgressCallback;
    language?: string;
    forceOCR?: boolean;
  } = {}
): Promise<{
  text: string;
  method: 'pdf-parse' | 'tesseract' | 'error';
  pages?: number;
}> {
  // force ocr

  const { progressCallback, language = 'eng', forceOCR = true } = options;

  console.log(
    `Starting smart PDF extraction for: ${filename} (${buffer.length} bytes) OCR: ${forceOCR}`
  );

  // Ensure it's a real Node Buffer
  if (!(buffer instanceof Buffer)) {
    buffer = Buffer.from(buffer);
  }

  // Validate buffer
  if (!buffer || buffer.length === 0) {
    return { text: 'Invalid PDF file - empty buffer.', method: 'error' };
  }

  // Check PDF header
  const pdfHeader = buffer.subarray(0, 4).toString();
  if (pdfHeader !== '%PDF') {
    return { text: 'Invalid file format - not a PDF.', method: 'error' };
  }

  // Get page count for progress tracking
  let pageCount = 1;
  try {
    // Use pdf2pic to get page count
    const convert = pdf2pic.fromBuffer(buffer, {
      density: 100,
      format: 'png'
    });

    // Try to get the first page to determine if PDF is valid and get count
    const result = await convert(1, { responseType: 'buffer' });
    if (result.buffer) {
      // If we got page 1, try to get page count by attempting to convert all
      try {
        const allPages = await convert.bulk(-1, { responseType: 'buffer' });
        pageCount = Array.isArray(allPages) ? allPages.length : 1;
        console.log(`📄 PDF has ${pageCount} pages`);
      } catch (bulkError) {
        // If bulk fails, assume single page
        pageCount = 1;
        console.log(`📄 Assuming single page (bulk conversion failed)`);
      }
    }
  } catch (error) {
    console.warn('Could not determine page count with pdf2pic:', error);
    // Fallback: try to estimate from buffer (basic heuristic)
    try {
      const pdfContent = buffer.toString('utf8');
      const pageMatches = pdfContent.match(/\/Type\s*\/Page\b/g);
      if (pageMatches) {
        pageCount = pageMatches.length;
        console.log(`📄 Estimated ${pageCount} pages from PDF structure`);
      }
    } catch (fallbackError) {
      console.warn('Fallback page count detection failed:', fallbackError);
      pageCount = 1;
    }
  }

  // STEP 1: Try pdf-parse first (unless forced to use OCR)
  if (!forceOCR) {
    try {
      progressCallback?.({
        stage: 'pdf-parse',
        progress: 10,
        message: 'Trying pdf-parse for text extraction...',
        pagesTotal: pageCount
      });

      console.log('🔍 Trying pdf-parse first...');
      const pdfData = await pdfParse(buffer, { max: 0 });
      const text = pdfData.text ? pdfData.text.trim() : '';

      console.log(`📄 pdf-parse extracted ${text.length} characters`);

      // Decision logic: Is this meaningful text?
      if (text.length > 50) {
        console.log('✅ Good text found with pdf-parse');
        progressCallback?.({
          stage: 'complete',
          progress: 100,
          message: 'Text extraction completed with pdf-parse',
          pagesTotal: pageCount
        });
        return { text, method: 'pdf-parse', pages: pageCount };
      }

      if (text.replace(/\s+/g, ' ').trim().length > 20) {
        console.log('✅ Some meaningful text found with pdf-parse');
        progressCallback?.({
          stage: 'complete',
          progress: 100,
          message: 'Text extraction completed with pdf-parse',
          pagesTotal: pageCount
        });
        return { text, method: 'pdf-parse', pages: pageCount };
      }

      console.log('⚠️ pdf-parse found minimal text, falling back to OCR...');
    } catch (error) {
      console.error('❌ pdf-parse failed, trying OCR...', error);
    }
  }

  // STEP 2: Use Tesseract OCR for scanned PDFs
  try {
    progressCallback?.({
      stage: 'pdf-to-images',
      progress: 20,
      message: 'Converting PDF pages to images...',
      pagesTotal: pageCount
    });

    const ocrResult = await extractTextWithTesseract(
      buffer,
      language,
      progressCallback,
      pageCount
    );

    progressCallback?.({
      stage: 'complete',
      progress: 100,
      message: `OCR extraction completed. Found ${ocrResult.length} characters`,
      pagesTotal: pageCount
    });

    return { text: ocrResult, method: 'tesseract', pages: pageCount };
  } catch (error) {
    console.error('❌ Both pdf-parse and OCR failed:', error);
    return {
      text: `Could not extract text. Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      method: 'error',
      pages: pageCount
    };
  }
}

/**
 * Extracts text from PDF using Tesseract.js OCR
 */
export async function extractTextWithTesseract(
  buffer: Buffer,
  language: string = 'eng',
  progressCallback?: ProgressCallback,
  pageCount: number = 1
): Promise<string> {
  console.log(`🔍 Starting Tesseract OCR extraction (${language})...`);

  try {
    // Convert PDF to images using pdf2pic
    const images = await convertPdfToImages(
      buffer,
      progressCallback,
      pageCount
    );

    progressCallback?.({
      stage: 'ocr-processing',
      progress: 40,
      message: `Starting OCR on ${images.length} pages...`,
      pagesCurrent: 0,
      pagesTotal: images.length
    });

    const workerPath = cleanPath(
      path.resolve(
        require.resolve('tesseract.js/src/worker-script/node/index.js')
      )
    );
    const corePath = cleanPath(
      path.resolve(require.resolve('tesseract.js-core/tesseract-core.wasm.js'))
    );

    console.log({ workerPath, corePath });
    const worker = await Tesseract.createWorker(language, 1, {
      logger: (m) => {
        if (m.status === 'recognizing text') {
          const progress = Math.round((m.progress || 0) * 100);
          console.log(`OCR Progress: ${progress}%`);
        }
      },
      workerPath,
      corePath
    });

    let allText = '';

    // Process each page
    for (let i = 0; i < images.length; i++) {
      const pageProgress = 40 + (i / images.length) * 50;

      progressCallback?.({
        stage: 'ocr-processing',
        progress: pageProgress,
        message: `Processing page ${i + 1} of ${images.length}...`,
        pagesCurrent: i + 1,
        pagesTotal: images.length
      });

      console.log(`🔍 Processing page ${i + 1}/${images.length}...`);

      // Recognize text from image
      console.log(
        `🖼️ Processing image ${i + 1} (${images[i].length} bytes)...`
      );

      try {
        const {
          data: { text }
        } = await worker.recognize(images[i]);
        const pageText = text.trim();

        console.log(`✅ OCR completed for page ${i + 1}`);

        if (pageText) {
          allText += pageText + '\n\n';
          console.log(
            `📄 Page ${i + 1}: extracted ${pageText.length} characters`
          );
        } else {
          console.log(`📄 Page ${i + 1}: no text found`);
        }
      } catch (pageOcrError) {
        console.error(`❌ OCR failed for page ${i + 1}:`, pageOcrError);
        // Continue with other pages rather than failing completely
        continue;
      }
    }

    // Clean up worker
    await worker.terminate();

    const finalText = allText.trim();
    console.log(
      `✅ OCR complete: ${finalText.length} total characters from ${images.length} pages`
    );

    return finalText;
  } catch (error) {
    console.error('❌ Tesseract OCR failed:', error);
    throw new Error(
      `OCR processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Converts PDF buffer to array of image buffers using pdf2pic
 */
async function convertPdfToImages(
  buffer: Buffer,
  progressCallback?: ProgressCallback,
  totalPages: number = 1
): Promise<Buffer[]> {
  try {
    console.log('🔄 Converting PDF to images using pdf2pic...');

    progressCallback?.({
      stage: 'pdf-to-images',
      progress: 25,
      message: `Converting ${totalPages} pages to images...`,
      pagesTotal: totalPages
    });

    // Configure pdf2pic for optimal OCR compatibility
    const convert = pdf2pic.fromBuffer(buffer, {
      density: 200,
      saveFilename: 'page',
      savePath: './',
      format: 'jpeg',
      quality: 100,
      width: 3000,
      height: 3000
    });

    const images: Buffer[] = [];

    // Convert each page
    for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
      const progress = 25 + ((pageNum - 1) / totalPages) * 15;

      progressCallback?.({
        stage: 'pdf-to-images',
        progress,
        message: `Converting page ${pageNum} to image...`,
        pagesCurrent: pageNum,
        pagesTotal: totalPages
      });

      console.log(`🖼️ Converting page ${pageNum}/${totalPages}...`);

      try {
        const result = await convert(pageNum, { responseType: 'buffer' });
        console.log('🔍 Raw convert() result:', result);

        if (result.buffer) {
          console.log('📦 Buffer length:', result.buffer.length);
          console.log('📏 Size:', result.size);
          console.log('📄 Page:', result.page);

          // Save debug output
          if (result.buffer.length > 0) {
            await fs.promises.writeFile(
              `debug-page-${pageNum}.png`,
              result.buffer
            );
            console.log(`🖼️ Wrote debug-page-${pageNum}.png`);
          } else {
            console.warn('⚠️ Empty buffer returned!');
          }
          // Validate image buffer
          const header = result.buffer.subarray(0, 4);
          const isJpeg = header[0] === 0xff && header[1] === 0xd8;
          const isPng =
            header[0] === 0x89 &&
            header[1] === 0x50 &&
            header[2] === 0x4e &&
            header[3] === 0x47;

          if (isJpeg || isPng) {
            images.push(result.buffer);
            console.log(
              `✅ Page ${pageNum} converted (${result.buffer.length} bytes, ${isJpeg ? 'JPEG' : 'PNG'})`
            );
          } else {
            console.warn(
              `⚠️ Page ${pageNum} invalid image format: ${Array.from(header)
                .map((b) => b.toString(16))
                .join(' ')}`
            );
          }
        } else {
          console.warn(`⚠️ Page ${pageNum} conversion returned no buffer`);
        }
      } catch (pageError) {
        console.error(`❌ Failed to convert page ${pageNum}:`, pageError);
        continue;
      }
    }

    console.log(`✅ Converted ${images.length}/${totalPages} pages to images`);

    if (images.length === 0) {
      throw new Error(
        'No pages could be converted to images for OCR processing'
      );
    }

    return images;
  } catch (error) {
    console.error('❌ PDF to image conversion failed:', error);
    throw new Error(
      `PDF to image conversion failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

function cleanPath(p: string) {
  return (
    p
      // remove " [app-route] (ecmascript)" and anything similar at the end
      .replace(/\s\[.*$/, '')
      // remove stray "[project]" folder names injected by Next
      .replace(/[\\/]?\[project\]/g, '')
  );
}
