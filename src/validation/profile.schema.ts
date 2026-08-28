import { z } from 'zod';

export const EvidenceReferenceSchema = z.object({
    candidate: z.enum(['candidate_a', 'candidate_b', 'none']),
    sourceDocument: z.string().min(1),
    documentType: z.enum(['job_description', 'resume', 'transcript']),
    pageNumber: z.number().int().positive(),
    quote: z.string().min(1),
    context: z.string().optional(),
    category: z.string().min(1),
    confidence: z.enum(['high', 'medium', 'low']).optional(),
});

export const CandidateClaimSchema = z.object({
    id: z.string().min(1),
    text: z.string().min(1),
    source: z.enum(['resume', 'interview']),
    evidenceReferences: z.array(EvidenceReferenceSchema),
    category: z.string().min(1),
});

export const CandidateProfileSchema = z.object({
    candidateId: z.string(),

    identity: z.object({
        name: z.string().optional(),
        email: z.string().optional(),
    }),

    skills: z.array(z.string()),
    education: z.array(z.string()),
    experience: z.array(z.string()),
    projects: z.array(z.string()),
    certifications: z.array(z.string()),

    resumeClaims: z.array(CandidateClaimSchema),
    interviewClaims: z.array(CandidateClaimSchema),

    relevantFacts: z.array(z.string()),

    evidenceReferences: z.array(EvidenceReferenceSchema),
});

export const JobProfileSchema = z.object({
    title: z.string().optional(),

    responsibilities: z.array(z.string()),

    requiredSkills: z.array(z.string()),
    preferredSkills: z.array(z.string()),

    requiredExperience: z.string().optional(),
    preferredExperience: z.string().optional(),

    educationRequirements: z.array(z.string()),
    certifications: z.array(z.string()),

    otherRequirements: z.array(z.string()),
});

export const ProfileBuilderOutputSchema = z.object({
    jobProfile: JobProfileSchema,
    candidateProfile: CandidateProfileSchema,
    evidence: z.array(EvidenceReferenceSchema),
});

export type ProfileBuilderOutput = z.infer<
    typeof ProfileBuilderOutputSchema
>;