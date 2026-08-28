import { generateText } from '@/lib/ai/gemini';
import { extractJson } from '@/lib/utils/json-parser';
import { AgentReport } from '@/types/agent';
import { DebateResult } from '@/types/debate';
import { CandidateProfile, JobProfile } from '@/types/profile';
import { EvidenceReference } from '@/types/evidence';

export interface FinalJudgeInput {
    jobProfile: JobProfile;
    candidateProfile: CandidateProfile;
    initialReports: AgentReport[];
    debate: DebateResult;
    evidence: EvidenceReference[];
}

export interface FinalDecision {
    decision:
    | 'strong_hire'
    | 'hire'
    | 'borderline'
    | 'no_hire'
    | 'insufficient_evidence';

    score: number | null;
    confidence: 'high' | 'medium' | 'low';

    summary: string;
    keyStrengths: string[];
    keyConcerns: string[];

    evidence: EvidenceReference[];

    opinionChanges: DebateResult['opinionChanges'];
}



function formatReports(reports: AgentReport[]): string {
    return reports
        .map(
            report => `
=== ${report.agentType.toUpperCase()} ===
Assessment: ${report.overallAssessment}
Score: ${report.score.value}
Confidence: ${report.confidence}

Strengths:
${report.strengths.map(s => `- ${s.description}`).join('\n')}

Concerns:
${report.concerns.map(c => `- [${c.severity}] ${c.description}`).join('\n')}

Unknowns:
${report.unknowns.map(u => `- ${u}`).join('\n')}

Reasoning:
${report.reasoningSummary}
`,
        )
        .join('\n');
}

export async function runFinalJudge(
    input: FinalJudgeInput,
): Promise<FinalDecision> {
    const prompt = `
You are the FINAL JUDGE in a multi-agent candidate evaluation system.

Your job is to synthesize the supplied job requirements, candidate evidence,
independent agent assessments, and debate results into ONE final,
evidence-grounded hiring recommendation.

You are NOT allowed to invent information.

RULES:

1. Evidence takes priority over unsupported opinions.
2. Never invent quotes, page numbers, skills, experience, or achievements.
3. A resume claim is not automatically proof of proficiency.
4. Interview evidence may support, weaken, or contradict resume claims.
5. Absence of evidence is NOT evidence of deception.
6. Do not use demographic or protected characteristics.
7. Do not blindly average agent scores.
8. Consider why agents disagreed.
9. Pay special attention to genuine opinion changes during debate.
10. If evidence is insufficient, explicitly acknowledge uncertainty.
11. Every important conclusion should be traceable to supplied evidence.
12. The final decision must be explainable to a human hiring manager.

=== JOB PROFILE ===
${JSON.stringify(input.jobProfile, null, 2)}

=== CANDIDATE PROFILE ===
${JSON.stringify(input.candidateProfile, null, 2)}

=== INITIAL INDEPENDENT REPORTS ===
${formatReports(input.initialReports)}

=== DEBATE TURNS ===
${JSON.stringify(input.debate.turns, null, 2)}

=== OPINION CHANGES ===
${JSON.stringify(input.debate.opinionChanges, null, 2)}

=== POST-DEBATE REPORTS ===
${JSON.stringify(input.debate.finalReports, null, 2)}

=== AVAILABLE EVIDENCE ===
${JSON.stringify(input.evidence, null, 2)}

Return ONLY valid JSON.

Use exactly this structure:

{
  "decision": "strong_hire | hire | borderline | no_hire | insufficient_evidence",
  "score": 0,
  "confidence": "high | medium | low",
  "summary": "Evidence-based final assessment.",
  "keyStrengths": [
    "Specific evidence-supported strength."
  ],
  "keyConcerns": [
    "Specific evidence-supported concern."
  ],
  "evidence": [],
  "opinionChanges": []
}

SCORING GUIDANCE:

9–10: exceptional match with strong supporting evidence
8–8.9: very strong match
7–7.9: good match
5–6.9: mixed or borderline match
0–4.9: weak match

Use null for score if the available evidence is genuinely insufficient.

Do not treat the numerical score as the sole basis for the decision.
Consider requirements, evidence quality, contradictions, uncertainty,
and debate outcomes together.
`;

    const raw = await generateText(prompt, undefined, true);

    const parseResult = extractJson<FinalDecision>(raw, 'FinalJudge');

    if (!parseResult.success) {
        throw new Error(`Final Judge returned invalid JSON: ${parseResult.error}`);
    }

    const parsed = parseResult.data;

    return {
        ...parsed,
        opinionChanges: input.debate.opinionChanges,
    };
}