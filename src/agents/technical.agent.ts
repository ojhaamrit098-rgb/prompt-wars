import { generateText } from '@/lib/ai/gemini';
import { buildTechnicalPrompt } from '@/prompts/technical.prompt';
import { extractJson } from '@/lib/utils/json-parser';
import { AgentReportSchema } from '@/validation/agent.schema';
import { PanelInput, AgentResult } from '@/types/agent';

/**
 * Runs the Technical Agent against the supplied panel input.
 *
 * Receives ONLY: JobProfile + CandidateProfile + Evidence.
 * Makes exactly ONE LLM call with its dedicated technical persona.
 * Returns a validated AgentReport or a structured failure.
 */
export async function runTechnicalAgent(input: PanelInput): Promise<AgentResult> {
  const prompt = buildTechnicalPrompt(input);

  let rawText: string;
  try {
    rawText = await generateText(prompt, undefined, true);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'LLM call failed';
    return { success: false, agentType: 'technical', error: message };
  }

  const parseResult = extractJson<unknown>(rawText, 'TechnicalAgent');
  if (!parseResult.success) {
    return {
      success: false,
      agentType: 'technical',
      error: parseResult.error,
    };
  }

  let parsed = parseResult.data;

  // Force the correct agentType regardless of what the LLM returned
  if (typeof parsed === 'object' && parsed !== null) {
    (parsed as Record<string, unknown>).agentType = 'technical';
  }

  const validation = AgentReportSchema.safeParse(parsed);
  if (!validation.success) {
    console.error('[TechnicalAgent] Schema validation failed:', validation.error.format());
    return {
      success: false,
      agentType: 'technical',
      error: 'Technical Agent output did not match the expected report schema.',
    };
  }

  return { success: true, report: validation.data };
}
