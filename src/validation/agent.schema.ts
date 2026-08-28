import { z } from 'zod';
import { EvidenceReferenceSchema } from './profile.schema';

export const AgentTypeSchema = z.enum(['technical', 'hr', 'hiringManager', 'skeptic']);
export const ConfidenceLevelSchema = z.enum(['high', 'medium', 'low']);
export const ConcernSeveritySchema = z.enum([
  'confirmed_contradiction',
  'strong_concern',
  'possible_concern',
  'insufficient_evidence',
  'no_issue',
]);

export const AgentScoreSchema = z.object({
  value: z.number().min(0).max(10).nullable(),
  explanation: z.string().min(1),
  evidence: z.array(EvidenceReferenceSchema),
});

export const AgentStrengthSchema = z.object({
  description: z.string().min(1),
  evidence: z.array(EvidenceReferenceSchema),
});

export const AgentConcernSchema = z.object({
  description: z.string().min(1),
  severity: ConcernSeveritySchema,
  evidence: z.array(EvidenceReferenceSchema),
});

export const AgentReportSchema = z.object({
  agentType: AgentTypeSchema,
  overallAssessment: z.string().min(1),
  score: AgentScoreSchema,
  confidence: ConfidenceLevelSchema,
  strengths: z.array(AgentStrengthSchema),
  concerns: z.array(AgentConcernSchema),
  evidence: z.array(EvidenceReferenceSchema),
  unknowns: z.array(z.string()),
  reasoningSummary: z.string().min(1),
});

export type AgentReportOutput = z.infer<typeof AgentReportSchema>;
