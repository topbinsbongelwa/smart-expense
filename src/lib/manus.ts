/**
 * Manus AI — the app's money assistant.
 *
 * Sends the question plus a compact snapshot of the user's own spending to a
 * Manus-style chat-completions endpoint, so answers can go beyond the local
 * rules. Any missing config, network failure or timeout falls back to the
 * on-device engine (`answerSimuQuestion`) — the chat never breaks.
 */

import { isManusConfigured, manusConfig } from '@/lib/manus-config';
import { formatMoney } from '@/lib/money';
import { answerSimuQuestion, type SimuContext, type SimuMessage } from '@/lib/simu';

export type AskSource = 'manus' | 'local';

export type AskResult = {
  text: string;
  source: AskSource;
};

export const MANUS_INTRO = (name: string) =>
  `Hi ${name}! I am Manus AI, your money assistant. Ask me anything about your spending — totals, categories, goals or tips. I answer from your own entries.`;

export const MANUS_SUGGESTIONS = [
  'How much have I spent this month?',
  'What is my biggest category?',
  'How much can I safely spend today?',
  'What was my largest expense?',
  'How many expenses did I log this week?',
  'Give me a money tip',
];

const REQUEST_TIMEOUT_MS = 12_000;

/** A compact, plain-text snapshot of the user's numbers for the system prompt. */
function buildSystemPrompt(ctx: SimuContext): string {
  const breakdown = ctx.breakdown
    .map((item) => `${item.label}: ${formatMoney(item.total)}`)
    .join(', ');

  return [
    'You are Manus AI, the in-app money assistant for Iskhwama, a personal expense tracker.',
    'Answer only about the user spending data below. Amounts are South African Rand.',
    'Be concise, friendly and specific: quote real numbers, never invent entries.',
    'If the answer is not covered by the data, say so and suggest what to log.',
    '',
    `Monthly target: ${ctx.goal > 0 ? formatMoney(ctx.goal) : 'not set'}`,
    `Spent this month: ${formatMoney(ctx.monthTotal)} across ${ctx.monthCount} entries`,
    `Spent today: ${formatMoney(ctx.todayTotal)}`,
    `Average per day: ${formatMoney(ctx.averagePerDay)}`,
    `Days elapsed: ${ctx.daysElapsed} of ${ctx.daysInMonth}`,
    `Last 7 days: ${formatMoney(ctx.weekTotal)}`,
    `Category breakdown: ${breakdown || 'none yet'}`,
    `Largest expense: ${
      ctx.largest
        ? `${formatMoney(ctx.largest.amount)}${ctx.largest.note ? ` (${ctx.largest.note})` : ''}`
        : 'none yet'
    }`,
    `Total entries: ${ctx.expenses.length}`,
  ].join('\n');
}

function toApiHistory(history: SimuMessage[]) {
  return history.map((message) => ({
    role: message.role === 'user' ? 'user' : 'assistant',
    content: message.text,
  }));
}

type ManusResponse = {
  choices?: { message?: { content?: string } }[];
  output_text?: string;
  text?: string;
  message?: { content?: string } | string;
};

function readReply(data: ManusResponse): string | null {
  const direct =
    data.choices?.[0]?.message?.content ?? data.output_text ?? data.text ?? undefined;
  if (typeof direct === 'string' && direct.trim().length > 0) return direct.trim();
  const message = data.message;
  if (typeof message === 'string') return message.trim().length > 0 ? message.trim() : null;
  if (message && typeof message.content === 'string' && message.content.trim().length > 0) {
    return message.content.trim();
  }
  return null;
}

/**
 * Ask Manus AI. Resolves with the answer plus its origin (`manus` for the
 * cloud reply, `local` when it fell back to the on-device engine).
 */
export async function askManus(input: {
  question: string;
  context: SimuContext;
  history?: SimuMessage[];
}): Promise<AskResult> {
  const { question, context, history = [] } = input;
  const fallback = (): AskResult => ({ text: answerSimuQuestion(question, context), source: 'local' });

  if (!isManusConfigured || !manusConfig.apiUrl || !manusConfig.apiKey) return fallback();

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(manusConfig.apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${manusConfig.apiKey}`,
      },
      body: JSON.stringify({
        model: manusConfig.model,
        temperature: 0.4,
        messages: [
          { role: 'system', content: buildSystemPrompt(context) },
          ...toApiHistory(history),
          { role: 'user', content: question },
        ],
      }),
      signal: controller.signal,
    });

    if (!response.ok) throw new Error(`Manus request failed with ${response.status}`);
    const reply = readReply((await response.json()) as ManusResponse);
    if (!reply) throw new Error('Manus returned an empty reply');
    return { text: reply, source: 'manus' };
  } catch {
    return fallback();
  } finally {
    clearTimeout(timer);
  }
}

export { isManusConfigured, MANUS_SETUP_MESSAGE } from '@/lib/manus-config';
