import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ProfileBuilderOutputSchema } from '../../src/validation/profile.schema';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const minimalEvidence = {
  candidate: 'candidate_a',
  sourceDocument: 'resume',
  documentType: 'resume',
  pageNumber: 1,
  quote: 'Sample quote from the document.',
  category: 'skills',
};

const minimalClaim = {
  id: 'claim-1',
  text: 'Candidate claims proficiency in TypeScript.',
  source: 'resume' as const,
  category: 'skills',
  evidenceReferences: [minimalEvidence],
};

const validOutput = {
  jobProfile: {
    responsibilities: ['Build scalable systems'],
    requiredSkills: ['TypeScript', 'Node.js'],
    preferredSkills: ['GraphQL'],
    educationRequirements: ['Bachelor\'s in Computer Science'],
    certifications: [],
    otherRequirements: [],
  },
  candidateProfile: {
    candidateId: 'candidate_a',
    identity: { name: 'Jane Doe' },
    skills: ['TypeScript', 'React'],
    education: ['BSc Computer Science, MIT'],
    experience: ['3 years at Acme Corp'],
    projects: ['Built an open-source CLI tool'],
    certifications: [],
    resumeClaims: [minimalClaim],
    interviewClaims: [],
    relevantFacts: [],
    evidenceReferences: [],
  },
  evidence: [minimalEvidence],
};

// ─── ProfileBuilderOutputSchema Validation Tests ─────────────────────────────

describe('ProfileBuilderOutputSchema', () => {
  it('accepts valid Gemini output', () => {
    const result = ProfileBuilderOutputSchema.safeParse(validOutput);
    expect(result.success).toBe(true);
  });

  it('rejects output missing the jobProfile field', () => {
    const { jobProfile: _omitted, ...withoutJob } = validOutput;
    const result = ProfileBuilderOutputSchema.safeParse(withoutJob);
    expect(result.success).toBe(false);
  });

  it('rejects output missing the candidateProfile field', () => {
    const { candidateProfile: _omitted, ...withoutCandidate } = validOutput;
    const result = ProfileBuilderOutputSchema.safeParse(withoutCandidate);
    expect(result.success).toBe(false);
  });

  it('rejects a claim with an empty quote in evidence', () => {
    const badEvidence = { ...minimalEvidence, quote: '' };
    const badClaim = { ...minimalClaim, evidenceReferences: [badEvidence] };
    const result = ProfileBuilderOutputSchema.safeParse({
      ...validOutput,
      candidateProfile: { ...validOutput.candidateProfile, resumeClaims: [badClaim] },
    });
    expect(result.success).toBe(false);
  });

  it('accepts an output with empty arrays for optional collections', () => {
    const minimalValid = {
      jobProfile: {
        responsibilities: [],
        requiredSkills: [],
        preferredSkills: [],
        educationRequirements: [],
        certifications: [],
        otherRequirements: [],
      },
      candidateProfile: {
        candidateId: 'candidate_a',
        identity: {},
        skills: [],
        education: [],
        experience: [],
        projects: [],
        certifications: [],
        resumeClaims: [],
        interviewClaims: [],
        relevantFacts: [],
        evidenceReferences: [],
      },
      evidence: [],
    };
    const result = ProfileBuilderOutputSchema.safeParse(minimalValid);
    expect(result.success).toBe(true);
  });

  it('allows contradictory claims to coexist in resume and interview', () => {
    const resumeClaim = {
      ...minimalClaim,
      id: 'c-1',
      text: 'Candidate says they have 5 years of React experience.',
      source: 'resume' as const,
    };
    const interviewClaim = {
      ...minimalClaim,
      id: 'c-2',
      text: 'Candidate says they have 2 years of React experience.',
      source: 'interview' as const,
      evidenceReferences: [{ ...minimalEvidence, documentType: 'transcript', sourceDocument: 'transcript' }],
    };
    const result = ProfileBuilderOutputSchema.safeParse({
      ...validOutput,
      candidateProfile: {
        ...validOutput.candidateProfile,
        resumeClaims: [resumeClaim],
        interviewClaims: [interviewClaim],
      },
    });
    expect(result.success).toBe(true);
  });

  it('accepts evidence without optional confidence field', () => {
    const { confidence: _omitted, ...evidenceWithoutConfidence } = { ...minimalEvidence, confidence: 'high' as const };
    const result = ProfileBuilderOutputSchema.safeParse({
      ...validOutput,
      evidence: [evidenceWithoutConfidence],
    });
    expect(result.success).toBe(true);
  });

  it('rejects evidence with an invalid confidence value', () => {
    const badEvidence = { ...minimalEvidence, confidence: 'very_high' };
    const result = ProfileBuilderOutputSchema.safeParse({
      ...validOutput,
      evidence: [badEvidence],
    });
    expect(result.success).toBe(false);
  });
});

// ─── buildCandidateProfile (mocked) ──────────────────────────────────────────

describe('buildCandidateProfile (mocked Gemini)', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('returns success when Gemini returns valid JSON', async () => {
    vi.doMock('../../src/lib/ai/gemini', () => ({
      generateText: vi.fn().mockResolvedValue(JSON.stringify(validOutput)),
    }));

    const { buildCandidateProfile } = await import('../../src/services/profile/profile-builder');
    
    const fakeDoc = (type: 'job_description' | 'resume' | 'transcript') => ({
      id: type,
      filename: `${type}.pdf`,
      documentType: type,
      candidate: 'candidate_a' as const,
      totalPages: 1,
      pages: [{ pageNumber: 1, text: 'Sample text', characterCount: 11, extractionStatus: 'success' as const, ocrRequired: false }],
      status: 'success' as const,
    });

    const result = await buildCandidateProfile({
      jobDescription: fakeDoc('job_description'),
      resume: fakeDoc('resume'),
      transcript: fakeDoc('transcript'),
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.candidateProfile.candidateId).toBe('candidate_a');
    }
  });

  it('returns error when Gemini returns malformed JSON', async () => {
    vi.doMock('../../src/lib/ai/gemini', () => ({
      generateText: vi.fn().mockResolvedValue('this is not json at all'),
    }));

    const { buildCandidateProfile } = await import('../../src/services/profile/profile-builder');

    const fakeDoc = (type: 'job_description' | 'resume' | 'transcript') => ({
      id: type,
      filename: `${type}.pdf`,
      documentType: type,
      candidate: 'candidate_a' as const,
      totalPages: 1,
      pages: [{ pageNumber: 1, text: 'x', characterCount: 1, extractionStatus: 'success' as const, ocrRequired: false }],
      status: 'success' as const,
    });

    const result = await buildCandidateProfile({
      jobDescription: fakeDoc('job_description'),
      resume: fakeDoc('resume'),
      transcript: fakeDoc('transcript'),
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain('parsed as JSON');
    }
  });

  it('returns error when Gemini call throws', async () => {
    vi.doMock('../../src/lib/ai/gemini', () => ({
      generateText: vi.fn().mockRejectedValue(new Error('Network error')),
    }));

    const { buildCandidateProfile } = await import('../../src/services/profile/profile-builder');

    const fakeDoc = (type: 'job_description' | 'resume' | 'transcript') => ({
      id: type,
      filename: `${type}.pdf`,
      documentType: type,
      candidate: 'candidate_a' as const,
      totalPages: 1,
      pages: [{ pageNumber: 1, text: 'x', characterCount: 1, extractionStatus: 'success' as const, ocrRequired: false }],
      status: 'success' as const,
    });

    const result = await buildCandidateProfile({
      jobDescription: fakeDoc('job_description'),
      resume: fakeDoc('resume'),
      transcript: fakeDoc('transcript'),
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBeTruthy();
    }
  });
});
