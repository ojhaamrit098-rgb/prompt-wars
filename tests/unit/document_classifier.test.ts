import { describe, it, expect } from 'vitest';
import { classifyDocument } from '../../src/services/document/classifier';

describe('Document Classifier', () => {
  it('correctly classifies a job description', () => {
    const result = classifyDocument('job_description.pdf');
    expect(result.documentType).toBe('job_description');
    expect(result.candidate).toBe('none');
  });

  it('correctly classifies candidate A resume', () => {
    const result = classifyDocument('resume_a.pdf');
    expect(result.documentType).toBe('resume');
    expect(result.candidate).toBe('candidate_a');
  });

  it('correctly classifies candidate A transcript', () => {
    const result = classifyDocument('transcript_a.pdf');
    expect(result.documentType).toBe('transcript');
    expect(result.candidate).toBe('candidate_a');
  });

  it('correctly classifies candidate B resume', () => {
    const result = classifyDocument('resume_b.pdf');
    expect(result.documentType).toBe('resume');
    expect(result.candidate).toBe('candidate_b');
  });

  it('correctly classifies candidate B transcript', () => {
    const result = classifyDocument('transcript_b.pdf');
    expect(result.documentType).toBe('transcript');
    expect(result.candidate).toBe('candidate_b');
  });

  it('throws error for unknown document', () => {
    expect(() => classifyDocument('unknown.pdf')).toThrow('Unrecognized document filename: unknown.pdf');
  });
});
