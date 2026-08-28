import fs from 'fs/promises';
import path from 'path';
import { ExtractedDocument } from '@/types/document';
import { extractPdfText } from './extractor';
import { classifyDocument } from './classifier';
import { IngestionResultSchema } from '@/validation/document.schema';

const EXPECTED_FILES = [
  'job_description.pdf',
  'resume_a.pdf',
  'resume_b.pdf',
  'transcript_a.pdf',
  'transcript_b.pdf'
];

export async function ingestTestDocuments(): Promise<{ success: boolean, documents: ExtractedDocument[], errors: string[] }> {
  const inputDir = path.join(process.cwd(), 'data', 'input');
  const documents: ExtractedDocument[] = [];
  const errors: string[] = [];

  for (const filename of EXPECTED_FILES) {
    const filePath = path.join(inputDir, filename);
    
    try {
      await fs.access(filePath);
    } catch {
      errors.push(`Missing required file: ${filename}`);
      continue;
    }

    try {
      const classification = classifyDocument(filename);
      const { totalPages, pages } = await extractPdfText(filePath);
      
      const hasErrors = pages.some(p => p.extractionStatus === 'error');
      const allEmpty = pages.length > 0 && pages.every(p => p.extractionStatus === 'empty');
      
      let status: 'success' | 'partial' | 'failed' = 'success';
      if (allEmpty || hasErrors) {
        status = hasErrors ? 'failed' : 'partial';
      }

      const doc: ExtractedDocument = {
        id: filename.replace('.pdf', ''),
        filename,
        documentType: classification.documentType,
        candidate: classification.candidate,
        totalPages,
        pages,
        status
      };

      documents.push(doc);
    } catch (err: any) {
      errors.push(`Failed to process ${filename}: ${err.message}`);
    }
  }

  const result = {
    success: errors.length === 0,
    documents,
    errors
  };

  return IngestionResultSchema.parse(result);
}
