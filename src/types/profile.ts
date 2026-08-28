import { EvidenceReference } from './evidence';
import { CandidateAssociation } from './document';

// ─── Job Profile ─────────────────────────────────────────────────────────────
// Represents the structured content extracted from a Job Description PDF.
// All fields are optional arrays so that missing information is represented
// as an empty array rather than an invented value.

export interface JobProfile {
  title?: string;
  responsibilities: string[];
  requiredSkills: string[];
  preferredSkills: string[];
  requiredExperience?: string;  // optional string to match schema
  preferredExperience?: string; // optional string to match schema
  educationRequirements: string[];
  certifications: string[];
  otherRequirements: string[];
}

// ─── Candidate Claim ─────────────────────────────────────────────────────────
// A single verifiable claim made by the candidate, linked to source evidence.
// The `source` field distinguishes whether the claim came from the resume or
// the interview transcript, without conflating the two.

export type ClaimSource = 'resume' | 'interview';

export interface CandidateClaim {
  id: string;
  text: string;
  source: ClaimSource;
  category: string;
  evidenceReferences: EvidenceReference[];
}

// ─── Candidate Profile ───────────────────────────────────────────────────────
// Refined to use CandidateClaim[] for traceable claims instead of raw strings.

export interface CandidateProfile {
  candidateId: CandidateAssociation;
  identity: {
    name?: string;
    email?: string;
  };
  skills: string[];
  education: string[];
  experience: string[];
  projects: string[];
  certifications: string[];
  resumeClaims: CandidateClaim[];
  interviewClaims: CandidateClaim[];
  relevantFacts: string[];
  evidenceReferences: EvidenceReference[];
}
