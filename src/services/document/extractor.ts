// Import directly from lib to avoid top-level test file read in index.js during Next build
const pdfParse = require('pdf-parse/lib/pdf-parse.js');
import { ExtractedPage } from '@/types/document';
import fs from 'fs/promises';

export async function extractPdfTextFromBuffer(
  dataUint8: Uint8Array,
  sourceName: string = 'memory buffer'
): Promise<{ totalPages: number; pages: ExtractedPage[] }> {
  try {
    const buffer = Buffer.from(dataUint8);
    const extractedPageTexts: string[] = [];

    const data = await pdfParse(buffer, {
      pagerender: function (pageData: any) {
        return pageData.getTextContent().then(function (textContent: any) {
          const text = textContent.items.map((item: any) => item.str).join(' ');
          extractedPageTexts.push(text);
          return text;
        });
      },
    });

    const totalPages = Math.max(data.numpages || 1, extractedPageTexts.length, 1);
    const pages: ExtractedPage[] = [];

    if (extractedPageTexts.length > 0) {
      extractedPageTexts.forEach((text: string, index: number) => {
        const cleanedText = text.replace(/\s+/g, ' ').trim();
        pages.push({
          pageNumber: index + 1,
          text: cleanedText,
          characterCount: cleanedText.length,
          extractionStatus: cleanedText.length >= 15 ? 'success' : 'empty',
          ocrRequired: cleanedText.length < 15,
        });
      });
    } else {
      const rawText = (data.text || '').trim();
      const pageTexts = rawText ? rawText.split(/\f/) : [''];

      pageTexts.forEach((text: string, index: number) => {
        const cleanedText = text.replace(/\s+/g, ' ').trim();
        pages.push({
          pageNumber: index + 1,
          text: cleanedText,
          characterCount: cleanedText.length,
          extractionStatus: cleanedText.length >= 15 ? 'success' : 'empty',
          ocrRequired: cleanedText.length < 15,
        });
      });
    }

    return {
      totalPages,
      pages,
    };
  } catch (error: unknown) {
    const message =
      error instanceof Error
        ? error.message
        : 'Unknown PDF extraction error';

    throw new Error(
      `PDF extraction failed for ${sourceName}: ${message}`
    );
  }
}

export async function extractPdfText(
  filePath: string
): Promise<{ totalPages: number; pages: ExtractedPage[] }> {
  const data = await fs.readFile(filePath);

  return extractPdfTextFromBuffer(
    new Uint8Array(data),
    filePath
  );
}