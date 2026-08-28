import { GoogleGenerativeAI, GenerativeModel } from '@google/generative-ai';

// The model name is kept here so it can be changed in one place without
// touching the Profile Builder or any other consumer.
const GEMINI_MODEL = 'gemini-3.6-flash';

function getGeminiApiKey(): string {
  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    throw new Error('GEMINI_API_KEY environment variable is not set.');
  }
  return key;
}

let _client: GoogleGenerativeAI | null = null;

function getGeminiClient(): GoogleGenerativeAI {
  if (!_client) {
    _client = new GoogleGenerativeAI(getGeminiApiKey());
  }
  return _client;
}

export function getGeminiModel(model: string = GEMINI_MODEL): GenerativeModel {
  return getGeminiClient().getGenerativeModel({ model });
}

/**
 * Sends a single text prompt to Gemini and returns the raw text response.
 * Throws a sanitised error on failure — never leaks the API key.
 * If isJson is true, configures the model to output JSON (supported in recent versions).
 */
export async function generateText(prompt: string, model: string = GEMINI_MODEL, isJson: boolean = false): Promise<string> {
  try {
    const generativeModel = getGeminiModel(model);
    const result = await generativeModel.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: isJson ? { responseMimeType: 'application/json' } : undefined
    });
    const response = result.response;
    return response.text();
  } catch (error: unknown) {
    // Sanitise: do not forward the raw provider error which may contain key fragments.
    const message = error instanceof Error ? error.message : 'Unknown Gemini error';
    throw new Error(`Gemini generation failed: ${message}`);
  }
}
