import { generateText } from '@/lib/ai/gemini';
import { extractJson } from '@/lib/utils/json-parser';
import { AgentReport, AgentType, InitialPanelResult } from '@/types/agent';
import {
    DebateChallenge,
    DebateResponse,
    DebateResult,
    DebateTurn,
    OpinionChange,
} from '@/types/debate';
import { CandidateProfile, JobProfile } from '@/types/profile';
import { EvidenceReference } from '@/types/evidence';

interface DebateInput {
    jobProfile: JobProfile;
    candidateProfile: CandidateProfile;
    evidence: EvidenceReference[];
    initialPanel: InitialPanelResult;
}

interface ChallengeOutput {
    shouldChallenge: boolean;
    targetAgent: AgentType;
    challenge: string;
    evidence: EvidenceReference[];
}

interface ResponseOutput {
    response: string;
    changedOpinion: boolean;
    finalScore: number | null;
    reason: string;
    evidence: EvidenceReference[];
}

const AGENTS: AgentType[] = [
    'technical',
    'hr',
    'hiringManager',
    'skeptic',
];

function getSuccessfulReports(
    panel: InitialPanelResult,
): AgentReport[] {
    return Object.values(panel)
        .filter(
            (
                result,
            ): result is { success: true; report: AgentReport } =>
                result.success,
        )
        .map(result => result.report);
}

function formatReport(report: AgentReport): string {
    return JSON.stringify(
        {
            agentType: report.agentType,
            overallAssessment: report.overallAssessment,
            score: report.score,
            confidence: report.confidence,
            strengths: report.strengths,
            concerns: report.concerns,
            unknowns: report.unknowns,
            reasoningSummary: report.reasoningSummary,
        },
        null,
        2,
    );
}



/**
 * Runs one evidence-driven challenge.
 *
 * The challenger is deliberately selected by the engine rather than
 * allowing the model to create arbitrary agent-to-agent conversations.
 */
async function generateChallenge(
    challenger: AgentReport,
    reports: AgentReport[],
    evidence: EvidenceReference[],
): Promise<ChallengeOutput> {
    const otherReports = reports
        .filter(report => report.agentType !== challenger.agentType)
        .map(formatReport)
        .join('\n\n');

    const prompt = `
You are the ${challenger.agentType} agent in a structured candidate-evaluation debate.

Your task is to identify ONE meaningful, evidence-based weakness or disagreement
in another agent's assessment.

IMPORTANT RULES:
- Do not manufacture disagreement.
- Challenge only claims that are unsupported, overstated, contradicted,
  or meaningfully incomplete.
- Every factual challenge must be grounded in the supplied evidence.
- Absence of evidence is NOT evidence of deception.
- Do not make personality, culture-fit, or demographic judgments.
- Do not challenge simply because another agent has a different opinion.
- If there is no legitimate challenge, set shouldChallenge to false.
- Return ONLY valid JSON.

YOUR REPORT:
${formatReport(challenger)}

OTHER AGENT REPORTS:
${otherReports}

AVAILABLE EVIDENCE:
${JSON.stringify(evidence, null, 2)}

Return exactly:

{
  "shouldChallenge": true,
  "targetAgent": "technical | hr | hiringManager | skeptic",
  "challenge": "Specific evidence-based challenge",
  "evidence": []
}

If no legitimate challenge exists:

{
  "shouldChallenge": false,
  "targetAgent": "${challenger.agentType}",
  "challenge": "",
  "evidence": []
}
`;

    const raw = await generateText(prompt, undefined, true);
    const parseResult = extractJson<ChallengeOutput>(raw, 'DebateChallenge');
    
    if (!parseResult.success) {
        return {
            shouldChallenge: false,
            targetAgent: challenger.agentType,
            challenge: '',
            evidence: []
        };
    }
    
    return parseResult.data;
}

/**
 * Gives the challenged agent an opportunity to defend or revise its position.
 */
async function generateResponse(
    target: AgentReport,
    challenge: DebateChallenge,
    evidence: EvidenceReference[],
): Promise<ResponseOutput> {
    const prompt = `
You are the ${target.agentType} agent participating in a candidate-evaluation debate.

Your original assessment was:

${formatReport(target)}

Another agent has challenged your assessment:

${JSON.stringify(challenge, null, 2)}

AVAILABLE EVIDENCE:
${JSON.stringify(evidence, null, 2)}

Reconsider your original position carefully.

RULES:
- Defend your original assessment if the evidence still supports it.
- Change your position if the challenge reveals a genuine weakness.
- Never invent evidence.
- Never invent quotes or facts.
- A disagreement alone does not require changing your score.
- If evidence is insufficient, acknowledge the uncertainty.
- Your final score must be between 0 and 10, or null if evidence is insufficient.
- Explain exactly why you changed or maintained your position.
- Return ONLY valid JSON.

Return exactly:

{
  "response": "Evidence-based response to the challenge",
  "changedOpinion": true,
  "finalScore": 7.5,
  "reason": "Why the position changed or remained the same",
  "evidence": []
}
`;

    const raw = await generateText(prompt, undefined, true);
    const parseResult = extractJson<ResponseOutput>(raw, 'DebateResponse');

    if (!parseResult.success) {
        return {
            response: "Failed to generate valid response.",
            changedOpinion: false,
            finalScore: target.score.value,
            reason: "LLM JSON parse error during response.",
            evidence: []
        };
    }

    return parseResult.data;
}

/**
 * Runs the structured multi-agent debate.
 *
 * The initial reports remain independent.
 * Only after those reports exist are agents allowed to see each other's
 * positions.
 */
export async function runDebate(
    input: DebateInput,
): Promise<DebateResult> {
    const reports = getSuccessfulReports(input.initialPanel);

    const turns: DebateTurn[] = [];
    const opinionChanges: OpinionChange[] = [];
    const finalReports = [...reports];

    let turnNumber = 1;

    /*
     * Each agent gets one opportunity to identify a meaningful challenge.
     * We stop after the first valid challenge for each challenger.
     *
     * This keeps API usage bounded and predictable.
     */
    for (const challenger of reports) {
        if (!AGENTS.includes(challenger.agentType)) {
            continue;
        }

        try {
            const challengeOutput = await generateChallenge(
                challenger,
                reports,
                input.evidence,
            );

            if (!challengeOutput.shouldChallenge) {
                continue;
            }

            if (
                challengeOutput.targetAgent === challenger.agentType ||
                !AGENTS.includes(challengeOutput.targetAgent)
            ) {
                continue;
            }

            const targetIndex = finalReports.findIndex(
                report => report.agentType === challengeOutput.targetAgent,
            );

            if (targetIndex === -1) {
                continue;
            }

            const target = finalReports[targetIndex];

            const challenge: DebateChallenge = {
                fromAgent: challenger.agentType,
                toAgent: target.agentType,
                challenge: challengeOutput.challenge,
                evidence: challengeOutput.evidence,
            };

            const responseOutput = await generateResponse(
                target,
                challenge,
                input.evidence,
            );

            const response: DebateResponse = {
                fromAgent: target.agentType,
                toAgent: challenger.agentType,
                response: responseOutput.response,
                evidence: responseOutput.evidence,
            };

            turns.push({
                turnNumber,
                challenge,
                response,
            });

            const initialScore = target.score.value;
            const finalScore = responseOutput.finalScore;

            opinionChanges.push({
                agent: target.agentType,
                initialScore,
                finalScore,
                changed: responseOutput.changedOpinion,
                reason: responseOutput.reason,
            });

            /*
             * Update the report's score after debate.
             *
             * We preserve the original explanation and append the debate
             * reconsideration rather than destroying the original reasoning.
             */
            finalReports[targetIndex] = {
                ...target,
                score: {
                    ...target.score,
                    value: finalScore,
                    explanation: `${target.score.explanation}\n\nDebate reconsideration: ${responseOutput.reason}`,
                    evidence: [
                        ...target.score.evidence,
                        ...responseOutput.evidence,
                    ],
                },
                reasoningSummary:
                    `${target.reasoningSummary} ` +
                    `After debate: ${responseOutput.reason}`,
            };

            turnNumber += 1;
        } catch (error: unknown) {
            /*
             * One failed debate turn must not destroy the entire evaluation.
             * The initial panel remains usable.
             */
            console.error(
                `[DebateEngine] Debate turn failed for ${challenger.agentType}:`,
                error,
            );
        }
    }

    return {
        turns,
        opinionChanges,
        finalReports,
    };
}