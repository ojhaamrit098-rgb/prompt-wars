export type DocumentType = 'job_description' | 'resume' | 'transcript';
export type CandidateAssociation = 'candidate_a' | 'candidate_b' | 'none';

export interface ExtractedPage {
  pageNumber: number;
  text: string;
  characterCount: number;
  extractionStatus: 'success' | 'empty' | 'error';
  ocrRequired: boolean;
}

export interface ExtractedDocument {
  id: string; // Stable identifier based on filename
  filename: string;
  documentType: DocumentType;
  candidate: CandidateAssociation;
  totalPages: number;
  pages: ExtractedPage[];
  status: 'success' | 'partial' | 'failed';
}
