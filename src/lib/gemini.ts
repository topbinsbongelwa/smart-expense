import type { SimuMessage } from '@/lib/simu';

const GEMINI_API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
const GEMINI_MODEL = process.env.EXPO_PUBLIC_GEMINI_MODEL || 'gemini-2.5-flash';
const GEMINI_AUDIO_MODEL = process.env.EXPO_PUBLIC_GEMINI_AUDIO_MODEL || GEMINI_MODEL;
const REQUEST_TIMEOUT_MS = 45_000;

export const isGeminiConfigured = Boolean(GEMINI_API_KEY);

type GeminiPart = {
  text?: string;
  thought?: boolean;
};

type GeminiResponse = {
  candidates?: {
    content?: { parts?: GeminiPart[] };
    groundingMetadata?: {
      groundingChunks?: { web?: { title?: string; uri?: string } }[];
    };
  }[];
};

function getObject(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : null;
}

async function requestGemini(
  model: string,
  contents: unknown[],
  options?: { search?: boolean }
): Promise<GeminiResponse> {
  if (!GEMINI_API_KEY) throw new Error('Gemini is not configured. Add EXPO_PUBLIC_GEMINI_API_KEY to .env.');

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': GEMINI_API_KEY,
        },
        body: JSON.stringify({
          contents,
          generationConfig: { thinkingConfig: { thinkingBudget: 1024 } },
          ...(options?.search ? { tools: [{ googleSearch: {} }] } : {}),
        }),
        signal: controller.signal,
      }
    );

    const payload: unknown = await response.json();
    if (!response.ok) {
      const error = getObject(getObject(payload)?.error)?.message;
      throw new Error(
        typeof error === 'string' ? `Gemini request failed: ${error}` : `Gemini request failed (${response.status}).`
      );
    }
    return payload as GeminiResponse;
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Gemini took too long to respond. Please try again.');
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

function readResponseText(response: GeminiResponse): string {
  const candidate = response.candidates?.[0];
  const answer = candidate?.content?.parts
    ?.filter((part) => !part.thought && typeof part.text === 'string')
    .map((part) => part.text?.trim() ?? '')
    .filter(Boolean)
    .join('\n');

  if (!answer) throw new Error('Gemini returned an empty response. Please try again.');

  const sources = candidate?.groundingMetadata?.groundingChunks
    ?.flatMap((chunk) => {
      const web = chunk.web;
      return web?.uri ? [`${web.title ?? 'Source'}: ${web.uri}`] : [];
    })
    .filter((source, index, all) => all.indexOf(source) === index);

  return sources?.length ? `${answer}\n\nSources:\n${sources.join('\n')}` : answer;
}

export async function askGemini(input: {
  question: string;
  systemPrompt: string;
  history: SimuMessage[];
}): Promise<string> {
  const conversation = input.history
    .slice(-12)
    .map((message) => `${message.role === 'user' ? 'User' : 'Assistant'}: ${message.text}`)
    .join('\n');
  const prompt = [
    input.systemPrompt,
    '',
    'Answer any reasonable question, including topics unrelated to expense tracking. For current or',
    'verifiable facts, use Google Search grounding and include source URLs when available. Think',
    'carefully before answering, but do not reveal private chain-of-thought; provide a concise answer',
    'with the useful conclusion and a brief explanation.',
    conversation ? `\nRecent conversation:\n${conversation}` : '',
    `\nUser: ${input.question}`,
  ].join('\n');

  const response = await requestGemini(
    GEMINI_MODEL,
    [{ role: 'user', parts: [{ text: prompt }] }],
    { search: true }
  );
  return readResponseText(response);
}

export async function transcribeWithGemini(input: {
  audioBase64: string;
  mimeType: string;
}): Promise<string> {
  const response = await requestGemini(GEMINI_AUDIO_MODEL, [
    {
      role: 'user',
      parts: [
        {
          text: 'Transcribe the speech in this audio exactly as spoken. Return only the transcript, without labels or commentary.',
        },
        { inline_data: { mime_type: input.mimeType, data: input.audioBase64 } },
      ],
    },
  ]);
  const transcript = readResponseText(response).trim();
  if (!transcript) throw new Error('No speech was detected. Please try recording again.');
  return transcript;
}
