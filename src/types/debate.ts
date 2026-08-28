import { AgentType, AgentReport } from './agent';
import { EvidenceReference } from './evidence';

/**
 * A challenge made by one agent against another agent's
 * initial position during the debate phase.
 *
 * IMPORTANT:
 * Agent independence applies to the INITIAL PANEL.
 * During debate, agents are intentionally allowed to
 * see and challenge other agents' positions.
 */
export interface DebateChallenge {
    fromAgent: AgentType;
    toAgent: AgentType;
    challenge: string;
    evidence: EvidenceReference[];
}

/**
 * The response of the challenged agent.
 */
export interface DebateResponse {
    fromAgent: AgentType;
    toAgent: AgentType;
    response: string;
    evidence: EvidenceReference[];
}

/**
 * Records whether an agent changed its position after
 * participating in the debate.
 */
export interface OpinionChange {
    agent: AgentType;

    initialScore: number | null;
    finalScore: number | null;

    changed: boolean;

    reason: string;
}

/**
 * One complete debate turn.
 *
 * A turn may contain a challenge followed by a response.
 */
export interface DebateTurn {
    turnNumber: number;

    challenge: DebateChallenge;

    response?: DebateResponse;
}

/**
 * Complete output of the debate phase.
 *
 * The four reports here are the post-debate reports,
 * NOT the original independent reports.
 */
export interface DebateResult {
    turns: DebateTurn[];

    opinionChanges: OpinionChange[];

    finalReports: AgentReport[];
}