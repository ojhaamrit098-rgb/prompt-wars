import { generateText } from '@/lib/ai/gemini';
import { extractJson } from '@/lib/utils/json-parser';
import { buildProfileBuilderPrompt } from '@/prompts/profile-builder.prompt';
import {
  ProfileBuilderOutputSchema,
  ProfileBuilderOutput,
} from '@/validation/profile.schema';
import { ExtractedDocument } from '@/types/document';

export interface ProfileBuilderInput {
  jobDescription: ExtractedDocument;
  resume: ExtractedDocument;
  transcript: ExtractedDocument;
}

export interface ProfileBuilderResult {
  success: true;
  data: ProfileBuilderOutput;
}

export interface ProfileBuilderError {
  success: false;
  error: string;
}

export type ProfileBuilderResponse =
  | ProfileBuilderResult
  | ProfileBuilderError;

/**
 * Flattens page-level text from an ExtractedDocument into a single string,
 * inserting page markers so the LLM can reference page numbers.
 */
function flattenDocumentText(doc: ExtractedDocument): string {
  return doc.pages
    .map((p) => `[Page ${p.pageNumber}]\n${p.text}`)
    .join('\n\n');
}

/**
 * Runs the Profile Builder against the three extracted documents.
 * Makes exactly ONE Gemini request, validates the output with Zod,
 * and returns a typed result or a safe error.
 */
export async function buildCandidateProfile(
  input: ProfileBuilderInput
): Promise<ProfileBuilderResponse> {
  const jobDescriptionText = flattenDocumentText(input.jobDescription);
  const resumeText = flattenDocumentText(input.resume);
  const transcriptText = flattenDocumentText(input.transcript);

  const prompt = buildProfileBuilderPrompt(
    jobDescriptionText,
    resumeText,
    transcriptText
  );

  let rawText: string;

  try {
    rawText = await generateText(prompt, undefined, true);
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'Gemini request failed';

    return {
      success: false,
      error: message,
    };
  }

  const parseResult = extractJson<unknown>(rawText, 'ProfileBuilder');
  if (!parseResult.success) {
    return {
      success: false,
      error: parseResult.error,
    };
  }

  const parsed = parseResult.data;

  const validation = ProfileBuilderOutputSchema.safeParse(parsed);

  if (!validation.success) {
    console.error(
      '[ProfileBuilder] Zod validation failed:',
      validation.error.format()
    );

    return {
      success: false,
      error: 'Gemini output did not match the expected profile schema.',
    };
  }

  return {
    success: true,
    data: validation.data,
  };
}