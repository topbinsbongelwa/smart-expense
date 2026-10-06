import type { CategoryId, Expense } from '@/constants/categories';
import { formatRelativeDay } from '@/lib/date';
import { formatMoney } from '@/lib/money';
import { safeToSpendToday } from '@/lib/smart';

export type SimuRole = 'user' | 'simu';

export type SimuMessage = {
  id: string;
  role: SimuRole;
  text: string;
};

export type SimuContext = {
  expenses: Expense[];
  monthTotal: number;
  monthCount: number;
  todayTotal: number;
  averagePerDay: number;
  breakdown: { categoryId: CategoryId; label: string; total: number }[];
  weekTotal: number;
  weekChange: number | null;
  largest: Expense | null;
  goal: number;
  daysElapsed: number;
  daysInMonth: number;
  weekdays: { label: string; short: string; total: number }[];
};

export const SIMU_SUGGESTIONS = [
  'How much have I spent this month?',
  'What is my biggest category?',
  'How much can I safely spend today?',
  'What was my largest expense?',
  'How many expenses did I log this week?',
  'Give me a money tip',
];

export const SIMU_INTRO = (name: string) =>
  `Hi ${name}! I am Simu, your money assistant. Ask me anything about your expenses — totals, categories, goals or tips — and I will answer from your own entries.`;

const CATEGORY_TERMS: Record<CategoryId, string[]> = {
  food: ['food', 'grocer', 'eating', 'restaurant', 'lunch', 'dinner', 'meals'],
  transport: ['transport', 'taxi', 'uber', 'fuel', 'petrol', 'diesel', 'bus', 'car'],
  housing: ['housing', 'rent', 'bond', 'mortgage', 'house', 'flat'],
  bills: ['bills', 'bill', 'electricity', 'electric', 'water', 'internet', 'wifi', 'phone', 'subscription'],
  health: ['health', 'medical', 'pharmacy', 'doctor', 'medicine', 'gym'],
  fun: ['fun', 'entertainment', 'cinema', 'movies', 'games', 'night out'],
  shopping: ['shopping', 'clothes', 'mall', 'shoes', 'fashion'],
  other: ['other', 'misc'],
};

function plural(count: number, word: string) {
  if (word === 'entry') return `${count} ${count === 1 ? 'entry' : 'entries'}`;
  return `${count} ${word}${count === 1 ? '' : 's'}`;
}

function includes(question: string, ...terms: string[]) {
  return terms.some((term) => question.includes(term));
}

function findCategory(question: string): { id: CategoryId; label: string } | null {
  for (const [id, terms] of Object.entries(CATEGORY_TERMS)) {
    if (terms.some((term) => question.includes(term))) {
      const label = id.charAt(0).toUpperCase() + id.slice(1);
      return { id: id as CategoryId, label };
    }
  }
  return null;
}

function categoryTotal(ctx: SimuContext, id: CategoryId, allTime: boolean): number {
  const source = allTime ? ctx.expenses : ctx.expenses.filter((expense) => isThisMonth(expense.date));
  return source
    .filter((expense) => expense.categoryId === id)
    .reduce((total, expense) => total + expense.amount, 0);
}

function isThisMonth(dateKey: string): boolean {
  const now = new Date();
  const [year, month] = dateKey.split('-').map(Number);
  return year === now.getFullYear() && month === now.getMonth() + 1;
}

function tipFor(ctx: SimuContext): string {
  const { goal, monthTotal, breakdown, weekChange, averagePerDay, daysElapsed, daysInMonth } = ctx;

  if (goal > 0 && monthTotal > goal) {
    return `You are ${formatMoney(monthTotal - goal)} over your monthly target with ${
      daysInMonth - daysElapsed
    } days left. Try pausing non-essential spending and I will keep watching the pace for you.`;
  }

  if (breakdown[0]) {
    const share = monthTotal > 0 ? Math.round((breakdown[0].total / monthTotal) * 100) : 0;
    if (share >= 40) {
      return `${breakdown[0].label} takes ${share}% of everything you spent this month. Cap it with a small weekly limit and the rest of your budget breathes easier.`;
    }
  }

  if (weekChange !== null && weekChange > 0.15) {
    return `Your last 7 days are ${Math.round(weekChange * 100)}% higher than the week before. Pick one habit to trim this week — small cuts beat big regrets.`;
  }

  if (goal > 0 && daysElapsed > 0) {
    const safe = safeToSpendToday({ goal, spent: monthTotal, daysElapsed, daysInMonth });
    return `You are averaging ${formatMoney(averagePerDay)} a day. Staying under ${formatMoney(
      safe.amount
    )} today keeps you comfortably inside your target.`;
  }

  return `Set a monthly target on your Profile and I can tell you exactly what is safe to spend each day.`;
}

/**
 * Simu AI — an on-device assistant that answers questions about the user's own
 * expense entries. No network, no cloud: every answer comes from local data.
 */
export function answerSimuQuestion(question: string, ctx: SimuContext): string {
  const q = question.toLowerCase().replace(/[^a-z0-9\s']/g, ' ').replace(/\s+/g, ' ').trim();

  if (q.length === 0) {
    return 'Ask me something like "How much did I spend on food this month?"';
  }

  if (
    includes(q, 'what can you do', 'what do you do', 'who are you', 'your name', 'how do you work', 'features', 'how does this work')
  ) {
    return 'I am Simu, your on-device money assistant. Ask me about totals for this month or week, spending by category, your biggest expense, your goal progress, how much is safe to spend today, or just say "give me a tip".';
  }

  if (/^(hi|hello|hey|yo|hiya|how are you|good (morning|afternoon|evening))\b/.test(q)) {
    return 'Hi there! Ask me a question or tap one of the suggestions below.';
  }

  if (includes(q, 'thank', 'cheers', 'appreciate')) {
    return 'Any time. Keep logging entries and I will keep the answers sharp.';
  }

  if (ctx.expenses.length === 0) {
    return 'You have not logged any expenses yet. Add your first entry and I will start answering with your real numbers.';
  }

  if (
    includes(q, 'safe to spend', 'can i afford', 'can i spend', 'how much can i', 'left to spend', 'allowance')
  ) {
    if (ctx.goal <= 0) {
      return 'Set a monthly target on your Profile first — then I can work out what is safe to spend each day.';
    }
    const safe = safeToSpendToday({
      goal: ctx.goal,
      spent: ctx.monthTotal,
      daysElapsed: ctx.daysElapsed,
      daysInMonth: ctx.daysInMonth,
    });
    const remaining = safe.remaining;
    if (remaining <= 0) {
      return `Your target of ${formatMoney(ctx.goal)} is fully used — ${formatMoney(
        ctx.monthTotal - ctx.goal
      )} over. Ease off until next month to stay on plan.`;
    }
    return `You have ${formatMoney(remaining)} left for the ${plural(
      safe.daysLeft,
      'day'
    )} remaining, so about ${formatMoney(safe.amount)} is safe to spend today.`;
  }

  if (includes(q, 'goal', 'target', 'budget')) {
    if (ctx.goal <= 0) {
      return 'You have not set a monthly target yet. Set one on your Profile and I will track your progress against it.';
    }
    const percent = Math.round((ctx.monthTotal / ctx.goal) * 100);
    const left = ctx.goal - ctx.monthTotal;
    if (left >= 0) {
      return `You have spent ${formatMoney(ctx.monthTotal)} of your ${formatMoney(
        ctx.goal
      )} target — ${percent}% used, with ${formatMoney(left)} still available.`;
    }
    return `You are ${formatMoney(-left)} over your ${formatMoney(ctx.goal)} target (${percent}% used) with ${
      ctx.daysInMonth - ctx.daysElapsed
    } days to go.`;
  }

  const category = findCategory(q);
  if (category) {
    const allTime = includes(q, 'all time', 'alltime', 'ever', 'lifetime', 'in total', 'overall');
    const total = categoryTotal(ctx, category.id, allTime);
    const share =
      !allTime && ctx.monthTotal > 0 ? Math.round((total / ctx.monthTotal) * 100) : null;
    const scope = allTime ? 'all time' : 'this month';

    if (total === 0) {
      return `No ${category.label.toLowerCase()} spending logged ${scope} yet.`;
    }
    const shareLine = share !== null ? ` — ${share}% of this month's spend` : '';
    return `You spent ${formatMoney(total)} on ${category.label.toLowerCase()} ${scope}${shareLine}.`;
  }

  if (includes(q, 'how many', 'number of', 'count')) {
    const total = ctx.expenses.length;
    const todayCount = ctx.expenses.filter(
      (expense) => formatRelativeDay(expense.date) === 'Today'
    ).length;
    const weekCount = ctx.expenses.filter((expense) => {
      const days = (Date.now() - new Date(expense.date).getTime()) / 86_400_000;
      return days >= 0 && days < 7;
    }).length;
    return `You have logged ${plural(todayCount, 'entry')} today, ${plural(
      ctx.monthCount,
      'entry'
    )} this month and ${plural(total, 'entry')} in total — ${plural(
      weekCount,
      'entry'
    )} in the last 7 days.`;
  }

  if (includes(q, 'today')) {
    const count = ctx.expenses.filter((expense) => formatRelativeDay(expense.date) === 'Today').length;
    return `Today you have logged ${formatMoney(ctx.todayTotal)} across ${plural(count, 'entry')}.`;
  }

  if (includes(q, 'yesterday', 'recent', 'latest', 'last expense', 'last spent', 'last entry', 'newest')) {
    const recent = ctx.expenses.slice(0, 3);
    const lines = recent.map(
      (expense) =>
        `• ${formatRelativeDay(expense.date)} — ${formatMoney(expense.amount)}${
          expense.note ? ` · ${expense.note}` : ''
        }`
    );
    return `Here are your latest entries:\n${lines.join('\n')}`;
  }

  if (includes(q, 'which day', 'busiest', 'day of the week', 'weekday', 'weekend')) {
    const busiest = ctx.weekdays.reduce((best, day) => (day.total > best.total ? day : best), ctx.weekdays[0]);
    if (!busiest || busiest.total === 0) return 'There is not enough weekday history to name a money day yet.';
    return `${busiest.label}s are your money day — ${formatMoney(busiest.total)} has gone out on ${busiest.label}s so far.`;
  }

  if (includes(q, 'this week', 'last 7 days', 'past week', 'the week', 'week')) {
    const change =
      ctx.weekChange === null
        ? 'Not enough history yet to compare with the week before.'
        : `That is ${Math.abs(Math.round(ctx.weekChange * 100))}% ${
            ctx.weekChange > 0 ? 'higher' : 'lower'
          } than the week before.`;
    return `You spent ${formatMoney(ctx.weekTotal)} in the last 7 days. ${change}`;
  }

  if (
    includes(q, 'where does my money', 'where is my money', 'breakdown', 'split', 'categories', 'category') ||
    (includes(q, 'top', 'most', 'biggest', 'highest') && includes(q, 'category', 'bucket', 'spending', 'money'))
  ) {
    if (ctx.breakdown.length === 0) {
      return 'Nothing logged this month yet, so there is no category split to read.';
    }
    const top = ctx.breakdown[0];
    const share = ctx.monthTotal > 0 ? Math.round((top.total / ctx.monthTotal) * 100) : 0;
    const runnerUp = ctx.breakdown[1];
    const lines = ctx.breakdown
      .slice(0, 3)
      .map((item) => `• ${item.label}: ${formatMoney(item.total)}`)
      .join('\n');
    return `${top.label} leads this month with ${formatMoney(top.total)} (${share}% of your spend)${
      runnerUp ? `, ahead of ${runnerUp.label.toLowerCase()} at ${formatMoney(runnerUp.total)}` : ''
    }.\n${lines}`;
  }

  if (includes(q, 'largest', 'biggest', 'most expensive', 'single biggest', 'highest expense')) {
    const largest = ctx.largest;
    if (!largest) return 'I could not find a largest expense yet — log a few entries first.';
    return `Your largest expense was ${formatMoney(largest.amount)}${
      largest.note ? ` on "${largest.note}"` : ''
    }, logged ${formatRelativeDay(largest.date)}.`;
  }

  if (includes(q, 'average', 'avg', 'typically', 'per day', 'a day')) {
    const perEntry = ctx.monthCount > 0 ? Math.round(ctx.monthTotal / ctx.monthCount) : 0;
    return `Your daily average this month is ${formatMoney(
      ctx.averagePerDay
    )}, and the average ticket per entry is ${formatMoney(perEntry)}.`;
  }

  if (includes(q, 'project', 'predict', 'end of month', 'pace', 'on track', 'forecast')) {
    const projection =
      ctx.daysElapsed > 0 ? Math.round((ctx.monthTotal / ctx.daysElapsed) * ctx.daysInMonth) : ctx.monthTotal;
    const verdict =
      ctx.goal > 0 && projection > ctx.goal
        ? `That is ${formatMoney(projection - ctx.goal)} above your target.`
        : ctx.goal > 0
          ? `That keeps you inside your ${formatMoney(ctx.goal)} target.`
          : 'Set a target on your Profile and I will score that projection.';
    return `At your current pace you will finish the month near ${formatMoney(projection)}. ${verdict}`;
  }

  if (includes(q, 'tip', 'advice', 'save', 'saving', 'cut back', 'reduce', 'improve', 'what should i do', 'help me')) {
    return tipFor(ctx);
  }

  if (includes(q, 'how much', 'total', 'spent', 'spend', 'spent so far')) {
    const goalLine =
      ctx.goal > 0
        ? ` That is ${Math.round((ctx.monthTotal / ctx.goal) * 100)}% of your ${formatMoney(ctx.goal)} target.`
        : '';
    return `You have spent ${formatMoney(ctx.monthTotal)} this month across ${plural(
      ctx.monthCount,
      'entry'
    )} — ${formatMoney(ctx.todayTotal)} of it today.${goalLine}`;
  }

  return `I can answer questions about your spending — try "How much have I spent this month?", "What is my biggest category?", or "How much can I safely spend today?"`;
}
