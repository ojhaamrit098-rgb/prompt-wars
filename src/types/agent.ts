import { EvidenceReference } from './evidence';
import { CandidateProfile, JobProfile } from './profile';

// ─── Agent Identity ───────────────────────────────────────────────────────────

export type AgentType = 'technical' | 'hr' | 'hiringManager' | 'skeptic';
export type ConfidenceLevel = 'high' | 'medium' | 'low';

/**
 * Concern severity classifications used by the Skeptic agent (and referenced
 * by other agents when noting issues). The Skeptic must use these carefully:
 * absence of evidence ≠ evidence of deception.
 */
export type ConcernSeverity =
  | 'confirmed_contradiction'
  | 'strong_concern'
  | 'possible_concern'
  | 'insufficient_evidence'
  | 'no_issue';

// ─── Report Sub-structures ────────────────────────────────────────────────────

export interface AgentScore {
  /** 0–10, or null when there is insufficient evidence to justify a score. */
  value: number | null;
  explanation: string;
  evidence: EvidenceReference[];
}

export interface AgentStrength {
  description: string;
  evidence: EvidenceReference[];
}

export interface AgentConcern {
  description: string;
  severity: ConcernSeverity;
  evidence: EvidenceReference[];
}

// ─── Agent Report ─────────────────────────────────────────────────────────────
// The shared output type for ALL four independent agents.

export interface AgentReport {
  agentType: AgentType;
  overallAssessment: string;
  score: AgentScore;
  confidence: ConfidenceLevel;
  strengths: AgentStrength[];
  concerns: AgentConcern[];
  evidence: EvidenceReference[];
  /** Things the agent could not determine from the supplied material. */
  unknowns: string[];
  /** Concise evidence-based reasoning, suitable for display in the UI. */
  reasoningSummary: string;
}

// ─── Panel Input ──────────────────────────────────────────────────────────────
// THIS IS THE ONLY DATA EACH AGENT RECEIVES.
// It MUST NOT contain any other agent's report, score, reasoning, or concerns.
// Enforcing this at the type level makes accidental contamination a compile error.

export interface PanelInput {
  readonly jobProfile: JobProfile;
  readonly candidateProfile: CandidateProfile;
  readonly evidence: EvidenceReference[];
  // ⛔ Do NOT add technical/hr/hiringManager/skeptic fields here.
}

// ─── Result / Failure Isolation ───────────────────────────────────────────────
// A discriminated union so one failing agent does not crash the panel.

export type AgentResult =
  | { success: true; report: AgentReport }
  | { success: false; agentType: AgentType; error: string };

export interface InitialPanelResult {
  technical: AgentResult;
  hr: AgentResult;
  hiringManager: AgentResult;
  skeptic: AgentResult;
}
