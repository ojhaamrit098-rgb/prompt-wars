import { z } from 'zod';

export const DocumentTypeSchema = z.enum(['job_description', 'resume', 'transcript']);
export const CandidateAssociationSchema = z.enum(['candidate_a', 'candidate_b', 'none']);

export const ExtractedPageSchema = z.object({
  pageNumber: z.number().int().positive(),
  text: z.string(),
  characterCount: z.number().int().nonnegative(),
  extractionStatus: z.enum(['success', 'empty', 'error']),
  ocrRequired: z.boolean(),
});

export const ExtractedDocumentSchema = z.object({
  id: z.string(),
  filename: z.string(),
  documentType: DocumentTypeSchema,
  candidate: CandidateAssociationSchema,
  totalPages: z.number().int().nonnegative(),
  pages: z.array(ExtractedPageSchema),
  status: z.enum(['success', 'partial', 'failed']),
});

export const IngestionResultSchema = z.object({
  success: z.boolean(),
  documents: z.array(ExtractedDocumentSchema),
  errors: z.array(z.string()),
});
