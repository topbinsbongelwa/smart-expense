/**
 * AI assistant — the app's spending and general-question assistant.
 *
 * Sends the question plus a compact snapshot of the user's own spending to a
 * Manus-style chat-completions endpoint, so answers can go beyond the local
 * rules. Any missing config, network failure or timeout falls back to the
 * on-device engine (`answerSimuQuestion`) — the chat never breaks.
 */

import { isManusConfigured, manusConfig } from '@/lib/manus-config';
import { askGemini, isGeminiConfigured } from '@/lib/gemini';
import { formatMoney } from '@/lib/money';
import { answerSimuQuestion, type SimuContext, type SimuMessage } from '@/lib/simu';
import { safeToSpendToday } from '@/lib/smart';

export type AskSource = 'gemini' | 'manus' | 'local';

export type AskResult = {
  text: string;
  source: AskSource;
};

export const MANUS_INTRO = (name: string) =>
  `Hi ${name}! I am your AI assistant. Ask me about your spending or anything else — I can use your entries for money questions and Google Gemini for broader answers.`;

export const MANUS_SUGGESTIONS = [
  'How much have I spent this month?',
  'What is my biggest category?',
  'How much can I safely spend today?',
  'What was my largest expense?',
  'How many expenses did I log this week?',
  'Give me a money tip',
];

const REQUEST_TIMEOUT_MS = 12_000;

/**
 * Every answer takes at least this long, so the chat shows its thinking state
 * instead of flashing an instant reply (fast local fallbacks used to land in
 * under 100ms, which felt fake).
 */
const MIN_THINKING_MS = 2_200;

const RECENT_ENTRIES_SHOWN = 15;

function percentOf(part: number, total: number): number {
  return total > 0 ? Math.round((part / total) * 100) : 0;
}

function totalInMonth(ctx: SimuContext, offsetMonths: number): { total: number; count: number } {
  const now = new Date();
  const target = new Date(now.getFullYear(), now.getMonth() + offsetMonths, 1);
  const year = target.getFullYear();
  const month = target.getMonth() + 1;
  let total = 0;
  let count = 0;
  for (const expense of ctx.expenses) {
    const [expenseYear, expenseMonth] = expense.date.split('-').map(Number);
    if (expenseYear === year && expenseMonth === month) {
      total += expense.amount;
      count += 1;
    }
  }
  return { total, count };
}

/**
 * Full financial snapshot handed to the model: raw numbers, derived analytics
 * and the transaction log, so it can reason instead of guessing.
 */
function buildDataSection(ctx: SimuContext): string {
  const projection =
    ctx.daysElapsed > 0
      ? Math.round((ctx.monthTotal / ctx.daysElapsed) * ctx.daysInMonth)
      : ctx.monthTotal;
  const goalPercent = percentOf(ctx.monthTotal, ctx.goal);
  const safe =
    ctx.goal > 0
      ? safeToSpendToday({
          goal: ctx.goal,
          spent: ctx.monthTotal,
          daysElapsed: ctx.daysElapsed,
          daysInMonth: ctx.daysInMonth,
        })
      : null;
  const lastMonth = totalInMonth(ctx, -1);
  const weekChange =
    ctx.weekChange === null ? 'not enough history' : `${Math.round(ctx.weekChange * 100)}%`;

  const busiestWeekday = ctx.weekdays.reduce(
    (best, day) => (day.total > best.total ? day : best),
    ctx.weekdays[0]
  );

  const categories =
    ctx.breakdown.length > 0
      ? ctx.breakdown
          .map(
            (item) =>
              `- ${item.label}: ${formatMoney(item.total)} (${percentOf(
                item.total,
                ctx.monthTotal
              )}% of month)`
          )
          .join('\n')
      : '- none logged this month';

  const recent = ctx.expenses
    .slice(0, RECENT_ENTRIES_SHOWN)
    .map(
      (expense) =>
        `- ${expense.date} · ${expense.categoryId} · ${formatMoney(expense.amount)}${
          expense.note ? ` · ${expense.note}` : ''
        }`
    )
    .join('\n');

  return [
    '## Live data (the only source of truth about this user)',
    `Today: ${new Date().toISOString().slice(0, 10)} (day ${ctx.daysElapsed} of ${ctx.daysInMonth})`,
    `This month: ${formatMoney(ctx.monthTotal)} across ${ctx.monthCount} entries (${formatMoney(
      ctx.todayTotal
    )} today)`,
    `Last month: ${formatMoney(lastMonth.total)} over ${lastMonth.count} entries`,
    `Last 7 days: ${formatMoney(ctx.weekTotal)} (${weekChange} vs the prior 7 days)`,
    `Daily average this month: ${formatMoney(ctx.averagePerDay)}`,
    `Projected month-end at this pace: ${formatMoney(projection)}`,
    `Monthly target: ${
      ctx.goal > 0
        ? `${formatMoney(ctx.goal)} — ${goalPercent}% used, ${formatMoney(
            Math.max(0, ctx.goal - ctx.monthTotal)
          )} left`
        : 'not set'
    }`,
    safe
      ? safe.remaining > 0
        ? `Safe to spend today: ${formatMoney(safe.amount)} (${formatMoney(
            safe.remaining
          )} remains over the last ${safe.daysLeft} days)`
        : `Budget exhausted: ${formatMoney(
            ctx.monthTotal - ctx.goal
          )} over target with ${ctx.daysInMonth - ctx.daysElapsed} days to go`
      : 'Safe-to-spend: unknown (no target set)',
    `Category breakdown:\n${categories}`,
    `Biggest category: ${
      ctx.breakdown[0]
        ? `${ctx.breakdown[0].label} (${percentOf(ctx.breakdown[0].total, ctx.monthTotal)}%)`
        : 'none yet'
    }`,
    `Largest single expense: ${
      ctx.largest
        ? `${formatMoney(ctx.largest.amount)}${
            ctx.largest.note ? ` "${ctx.largest.note}"` : ''
          } on ${ctx.largest.date}`
        : 'none yet'
    }`,
    busiestWeekday && busiestWeekday.total > 0
      ? `Heaviest weekday: ${busiestWeekday.label}s (${formatMoney(busiestWeekday.total)})`
      : 'Heaviest weekday: unknown',
    `Entries total: ${ctx.expenses.length}`,
    '',
    `## Recent transactions (newest first, ${Math.min(
      RECENT_ENTRIES_SHOWN,
      ctx.expenses.length
    )} of ${ctx.expenses.length})`,
    recent || '- none yet',
  ].join('\n');
}

/**
 * The system prompt: persona, hard reasoning rules, then the live data
 * snapshot. Kept in one place so cloud answers and the UI never disagree.
 */
function isExpenseQuestion(question: string): boolean {
  return /\b(expense|expenses|spend|spent|spending|budget|money|save|saving|transaction|transactions|purchase|purchases|income|goal|afford|bill|bills|rent|cash|financial|finance|category|categories|safe to spend)\b/i.test(
    question
  );
}

function buildSystemPrompt(ctx: SimuContext, includeExpenseData: boolean): string {
  const instructions = [
    '# Role',
    'You are the helpful AI assistant inside Iskhwama, an expense-tracking app.',
    'Answer general questions across topics as well as personal finance questions. Be warm, practical, and accurate.',
    '',
    '# Non-negotiable rules',
    '1. Claims about this user’s spending must come only from live expense data included below. Never invent transactions, totals or trends.',
    '2. For questions unrelated to this user’s finances, answer normally and use Google Search when current or verifiable facts are needed.',
    '3. If the live expense data cannot answer a money question, say what is missing instead of guessing.',
    '4. Use conversation history: refer back to earlier turns, resolve pronouns, and avoid repeating yourself.',
    '',
    '# Reasoning',
    '- Compare: this month vs last month, this week vs last week, pace vs target, category vs category.',
    '- Forecast: project month-end, flag overspend early, compute what is safe to spend.',
    '- Detect: unusual spikes, dominant categories, weekday patterns, creeping averages.',
    '- Think through the question carefully, then share only the useful conclusion and a brief explanation.',
    '',
    '# Output style',
    '- Answer the actual question first. Keep replies concise unless the user asks for detail.',
    '- Use a short list or citations when they make the answer clearer.',
    '- Do not reveal private chain-of-thought.',
    '',
    '# Currency',
    'Use the currency formatting shown in the live expense data; do not assume another currency.',
    '',
  ];
  if (includeExpenseData) instructions.push(buildDataSection(ctx));
  return instructions.join('\n');
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
 * cloud reply, `local` when it fell back to the on-device engine). The reply
 * is held until {@link MIN_THINKING_MS} has passed, so the UI's thinking
 * state is always visible and the assistant never answers suspiciously fast.
 */
export async function askManus(input: {
  question: string;
  context: SimuContext;
  history?: SimuMessage[];
}): Promise<AskResult> {
  const startedAt = Date.now();
  const result = await performAsk(input);
  const remaining = MIN_THINKING_MS - (Date.now() - startedAt);
  if (remaining > 0) {
    await new Promise((resolve) => setTimeout(resolve, remaining));
  }
  return result;
}

async function performAsk(input: {
  question: string;
  context: SimuContext;
  history?: SimuMessage[];
}): Promise<AskResult> {
  const { question, context, history = [] } = input;
  const previousQuestion = [...history].reverse().find((message) => message.role === 'user');
  const includeExpenseData =
    isExpenseQuestion(question) ||
    (previousQuestion !== undefined && isExpenseQuestion(previousQuestion.text));
  const isSmallTalk =
    /^(hi|hello|hey|yo|hiya|how are you|good (morning|afternoon|evening))\b/i.test(question) ||
    /\b(what can you do|what do you do|who are you|your name|how does this work|features)\b/i.test(
      question
    );
  const fallback = (): AskResult => ({
    text:
      !isExpenseQuestion(question) && !isSmallTalk
        ? 'I need Gemini connected to answer questions beyond your expense data. Add EXPO_PUBLIC_GEMINI_API_KEY to .env and restart the app.'
        : answerSimuQuestion(question, context),
    source: 'local',
  });

  if (isGeminiConfigured) {
    const text = await askGemini({
      question,
      systemPrompt: buildSystemPrompt(context, includeExpenseData),
      history,
    });
    return { text, source: 'gemini' };
  }

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
          { role: 'system', content: buildSystemPrompt(context, includeExpenseData) },
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
  } catch (error) {
    console.error('Manus AI request failed; using the offline assistant.', error);
    return fallback();
  } finally {
    clearTimeout(timer);
  }
}

export { isManusConfigured, MANUS_SETUP_MESSAGE } from '@/lib/manus-config';
