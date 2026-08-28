import { generateText } from '@/lib/ai/gemini';
import { buildHiringManagerPrompt } from '@/prompts/hiring-manager.prompt';
import { extractJson } from '@/lib/utils/json-parser';
import { AgentReportSchema } from '@/validation/agent.schema';
import { PanelInput, AgentResult } from '@/types/agent';

/**
 * Runs the Hiring Manager Agent against the supplied panel input.
 *
 * Receives ONLY: JobProfile + CandidateProfile + Evidence.
 * Makes exactly ONE LLM call with its dedicated hiring-manager persona.
 * Returns a validated AgentReport or a structured failure.
 */
export async function runHiringManagerAgent(input: PanelInput): Promise<AgentResult> {
  const prompt = buildHiringManagerPrompt(input);

  let rawText: string;
  try {
    rawText = await generateText(prompt, undefined, true);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'LLM call failed';
    return { success: false, agentType: 'hiringManager', error: message };
  }

  const parseResult = extractJson<unknown>(rawText, 'HiringManagerAgent');
  if (!parseResult.success) {
    return {
      success: false,
      agentType: 'hiringManager',
      error: parseResult.error,
    };
  }

  let parsed = parseResult.data;

  if (typeof parsed === 'object' && parsed !== null) {
    (parsed as Record<string, unknown>).agentType = 'hiringManager';
  }

  const validation = AgentReportSchema.safeParse(parsed);
  if (!validation.success) {
    console.error('[HiringManagerAgent] Schema validation failed:', validation.error.format());
    return {
      success: false,
      agentType: 'hiringManager',
      error: 'Hiring Manager Agent output did not match the expected report schema.',
    };
  }

  return { success: true, report: validation.data };
}
