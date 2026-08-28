import { generateText } from '@/lib/ai/gemini';
import { buildHRPrompt } from '@/prompts/hr.prompt';
import { extractJson } from '@/lib/utils/json-parser';
import { AgentReportSchema } from '@/validation/agent.schema';
import { PanelInput, AgentResult } from '@/types/agent';

/**
 * Runs the HR / Culture Agent against the supplied panel input.
 *
 * Receives ONLY: JobProfile + CandidateProfile + Evidence.
 * Makes exactly ONE LLM call with its dedicated HR persona.
 * Returns a validated AgentReport or a structured failure.
 */
export async function runHRAgent(input: PanelInput): Promise<AgentResult> {
  const prompt = buildHRPrompt(input);

  let rawText: string;
  try {
    rawText = await generateText(prompt, undefined, true);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'LLM call failed';
    return { success: false, agentType: 'hr', error: message };
  }

  const parseResult = extractJson<unknown>(rawText, 'HRAgent');
  if (!parseResult.success) {
    return {
      success: false,
      agentType: 'hr',
      error: parseResult.error,
    };
  }

  let parsed = parseResult.data;

  if (typeof parsed === 'object' && parsed !== null) {
    (parsed as Record<string, unknown>).agentType = 'hr';
  }

  const validation = AgentReportSchema.safeParse(parsed);
  if (!validation.success) {
    console.error('[HRAgent] Schema validation failed:', validation.error.format());
    return {
      success: false,
      agentType: 'hr',
      error: 'HR Agent output did not match the expected report schema.',
    };
  }

  return { success: true, report: validation.data };
}
