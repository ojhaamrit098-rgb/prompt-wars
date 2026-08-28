import { generateText } from '@/lib/ai/gemini';
import { buildSkepticPrompt } from '@/prompts/skeptic.prompt';
import { extractJson } from '@/lib/utils/json-parser';
import { AgentReportSchema } from '@/validation/agent.schema';
import { PanelInput, AgentResult } from '@/types/agent';

/**
 * Runs the Skeptic Agent against the supplied panel input.
 *
 * Receives ONLY: JobProfile + CandidateProfile + Evidence.
 * Makes exactly ONE LLM call with its dedicated skeptic persona.
 * Returns a validated AgentReport or a structured failure.
 */
export async function runSkepticAgent(input: PanelInput): Promise<AgentResult> {
  const prompt = buildSkepticPrompt(input);

  let rawText: string;
  try {
    rawText = await generateText(prompt, undefined, true);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'LLM call failed';
    return { success: false, agentType: 'skeptic', error: message };
  }

  const parseResult = extractJson<unknown>(rawText, 'SkepticAgent');
  if (!parseResult.success) {
    return {
      success: false,
      agentType: 'skeptic',
      error: parseResult.error,
    };
  }

  let parsed = parseResult.data;

  if (typeof parsed === 'object' && parsed !== null) {
    (parsed as Record<string, unknown>).agentType = 'skeptic';
  }

  const validation = AgentReportSchema.safeParse(parsed);
  if (!validation.success) {
    console.error('[SkepticAgent] Schema validation failed:', validation.error.format());
    return {
      success: false,
      agentType: 'skeptic',
      error: 'Skeptic Agent output did not match the expected report schema.',
    };
  }

  return { success: true, report: validation.data };
}
