import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {
  useLargestExpense,
  useMonthBreakdown,
  useWeekdayTotals,
  useWeekTrend,
} from '@/hooks/use-expense-analytics';
import { useExpenses, useExpenseSummary } from '@/hooks/use-expenses';
import { useProfile } from '@/hooks/use-profile';
import { askManus, type AskSource } from '@/lib/manus';
import { tapFeedback, successFeedback } from '@/lib/haptics';
import type { SimuContext, SimuMessage } from '@/lib/simu';

export type ChatMessage = SimuMessage & { source?: AskSource };

/** Staged status lines shown while Manus works — advances every step. */
export const THINKING_LABELS = [
  'Manus is thinking…',
  'Reading your latest entries…',
  'Crunching the numbers…',
  'Comparing against your target…',
  'Almost there…',
];

const THINKING_STEP_MS = 900;

export type ManusChat = {
  messages: ChatMessage[];
  draft: string;
  setDraft: (value: string) => void;
  thinking: boolean;
  /** Current staged status line; only meaningful while `thinking` is true. */
  thinkingLabel: string;
  canSend: boolean;
  /** Sends the draft (or an explicit suggestion) to Manus AI. */
  send: (raw?: string) => void;
  clear: () => void;
};

function makeId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Chat state shared by the AI tab and the floating Manus overlay. Each call
 * site gets its own independent conversation.
 */
export function useManusChat(): ManusChat {
  const { expenses } = useExpenses();
  const { profile } = useProfile();
  const summary = useExpenseSummary(expenses);
  const breakdown = useMonthBreakdown(expenses);
  const trend = useWeekTrend(expenses);
  const weekdays = useWeekdayTotals(expenses);
  const largest = useLargestExpense(expenses);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [thinking, setThinking] = useState(false);
  const [thinkingStep, setThinkingStep] = useState(0);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!thinking) return;
    const timer = setInterval(() => setThinkingStep((step) => step + 1), THINKING_STEP_MS);
    return () => clearInterval(timer);
  }, [thinking]);

  const context = useMemo<SimuContext>(
    () => ({
      expenses,
      monthTotal: summary.monthTotal,
      monthCount: summary.monthCount,
      todayTotal: summary.todayTotal,
      averagePerDay: summary.averagePerDay,
      breakdown: breakdown.map((item) => ({
        categoryId: item.categoryId,
        label: item.label,
        total: item.total,
      })),
      weekTotal: trend.thisWeekTotal,
      weekChange: trend.change,
      largest,
      goal: profile.monthlyGoal,
      daysElapsed: summary.daysElapsed,
      daysInMonth: summary.daysInMonth,
      weekdays,
    }),
    [
      expenses,
      summary,
      breakdown,
      trend,
      largest,
      profile.monthlyGoal,
      weekdays,
    ]
  );

  const send = useCallback(
    (raw?: string) => {
      const text = (raw ?? draft).trim();
      if (text.length === 0 || thinking) return;
      tapFeedback();
      setDraft('');
      const userMessage: ChatMessage = { id: makeId(), role: 'user', text };
      setMessages((current) => [...current, userMessage]);
      setThinkingStep(0);
      setThinking(true);

      // `messages` here is the prior turns; askManus appends the new question itself.
      void askManus({ question: text, context, history: messages }).then(({ text: reply, source }) => {
        if (!mountedRef.current) return;
        setMessages((current) => [...current, { id: makeId(), role: 'simu', text: reply, source }]);
        setThinking(false);
        successFeedback();
      });
    },
    [draft, thinking, messages, context]
  );

  const clear = useCallback(() => {
    tapFeedback();
    setMessages([]);
    setThinkingStep(0);
    setThinking(false);
  }, []);

  return {
    messages,
    draft,
    setDraft,
    thinking,
    thinkingLabel: THINKING_LABELS[Math.min(thinkingStep, THINKING_LABELS.length - 1)],
    canSend: draft.trim().length > 0 && !thinking,
    send,
    clear,
  };
}
