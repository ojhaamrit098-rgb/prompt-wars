import { DocumentType, CandidateAssociation } from './document';

export type EvidenceConfidence = 'high' | 'medium' | 'low';

export interface EvidenceReference {
  candidate: CandidateAssociation;
  sourceDocument: string;
  documentType: DocumentType;
  pageNumber: number;
  quote: string;
  context?: string;
  category: string;
  confidence?: EvidenceConfidence;
}
