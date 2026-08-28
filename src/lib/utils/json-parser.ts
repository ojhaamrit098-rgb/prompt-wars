export type JsonParseResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

/**
 * Safely extracts and parses JSON from a potentially messy LLM response.
 * Handles markdown fences, preamble/postamble text, and gracefully returns a structured result.
 */
export function extractJson<T = unknown>(
  rawText: string,
  context: string = 'Unknown'
): JsonParseResult<T> {
  console.log(`[${context}] Gemini response:`, rawText ? rawText.slice(0, 500) : '(empty)');

  if (!rawText || typeof rawText !== 'string') {
    return {
      success: false,
      error: `[${context}] LLM returned an empty response.`,
    };
  }

  let cleaned = rawText
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```\s*$/i, '')
    .trim();

  // Attempt standard parse first
  try {
    const parsed = JSON.parse(cleaned);
    return { success: true, data: parsed as T };
  } catch {
    // Continue to fallback boundary search
  }

  // Find boundaries of JSON object or array
  const objectStart = cleaned.indexOf('{');
  const arrayStart = cleaned.indexOf('[');

  let start = -1;
  if (objectStart === -1) {
    start = arrayStart;
  } else if (arrayStart === -1) {
    start = objectStart;
  } else {
    start = Math.min(objectStart, arrayStart);
  }

  const objectEnd = cleaned.lastIndexOf('}');
  const arrayEnd = cleaned.lastIndexOf(']');
  const end = Math.max(objectEnd, arrayEnd);

  if (start !== -1 && end > start) {
    const jsonCandidate = cleaned.slice(start, end + 1);
    try {
      const parsed = JSON.parse(jsonCandidate);
      return { success: true, data: parsed as T };
    } catch {
      console.error(`[${context}] Extracted JSON candidate was invalid. Preview:`, jsonCandidate.slice(0, 300));
    }
  } else {
    console.error(`[${context}] No valid JSON braces found. Preview:`, cleaned.slice(0, 300));
  }

  return {
    success: false,
    error: `[${context}] LLM response could not be parsed as JSON. Preview: ${cleaned.slice(0, 200)}`,
  };
}