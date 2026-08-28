import { DocumentType, CandidateAssociation } from '@/types/document';

export function classifyDocument(filename: string): { documentType: DocumentType, candidate: CandidateAssociation } {
  const normalized = filename.toLowerCase();
  
  if (normalized.includes('job_description')) {
    return { documentType: 'job_description', candidate: 'none' };
  }
  
  if (normalized.includes('resume_a')) {
    return { documentType: 'resume', candidate: 'candidate_a' };
  }
  
  if (normalized.includes('resume_b')) {
    return { documentType: 'resume', candidate: 'candidate_b' };
  }
  
  if (normalized.includes('transcript_a')) {
    return { documentType: 'transcript', candidate: 'candidate_a' };
  }
  
  if (normalized.includes('transcript_b')) {
    return { documentType: 'transcript', candidate: 'candidate_b' };
  }
  
  throw new Error(`Unrecognized document filename: ${filename}`);
}
