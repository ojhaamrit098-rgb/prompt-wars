import { runTechnicalAgent } from '@/agents/technical.agent';
import { runHRAgent } from '@/agents/hr.agent';
import { runHiringManagerAgent } from '@/agents/hiring-manager.agent';
import { runSkepticAgent } from '@/agents/skeptic.agent';
import { PanelInput, InitialPanelResult } from '@/types/agent';

/**
 * Runs all four independent agents in parallel against the same PanelInput.
 *
 * INDEPENDENCE GUARANTEE:
 *   - Each agent receives the identical, unmodified `input` object.
 *   - `input` contains ONLY: JobProfile, CandidateProfile, Evidence.
 *   - No agent output is passed to any other agent.
 *   - Promise.all ensures concurrent, independent execution.
 *
 * FAILURE ISOLATION:
 *   - Each agent call is wrapped independently.
 *   - One agent failing returns a structured failure state.
 *   - The other three results are preserved.
 *
 * NO debate logic, opinion changes, or final judge here.
 * Those are separate pipeline stages.
 */
export async function runInitialPanel(input: PanelInput): Promise<InitialPanelResult> {
  // All four agents receive the SAME input. No cross-contamination is possible
  // because PanelInput does not have fields for agent reports.
  const [technical, hr, hiringManager, skeptic] = await Promise.all([
    runTechnicalAgent(input).catch((err: unknown) => ({
      success: false as const,
      agentType: 'technical' as const,
      error: err instanceof Error ? err.message : 'Technical Agent threw unexpectedly',
    })),
    runHRAgent(input).catch((err: unknown) => ({
      success: false as const,
      agentType: 'hr' as const,
      error: err instanceof Error ? err.message : 'HR Agent threw unexpectedly',
    })),
    runHiringManagerAgent(input).catch((err: unknown) => ({
      success: false as const,
      agentType: 'hiringManager' as const,
      error: err instanceof Error ? err.message : 'Hiring Manager Agent threw unexpectedly',
    })),
    runSkepticAgent(input).catch((err: unknown) => ({
      success: false as const,
      agentType: 'skeptic' as const,
      error: err instanceof Error ? err.message : 'Skeptic Agent threw unexpectedly',
    })),
  ]);

  return { technical, hr, hiringManager, skeptic };
}
