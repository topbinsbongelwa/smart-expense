import Ionicons from '@expo/vector-icons/Ionicons';
import {
  AudioModule,
  RecordingPresets,
  setAudioModeAsync,
  useAudioRecorder,
  useAudioRecorderState,
} from 'expo-audio';
import * as FileSystem from 'expo-file-system/legacy';
import * as Speech from 'expo-speech';
import { useMemo, useRef, useState, useEffect } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppButton } from '@/components/app-button';
import { Card } from '@/components/card';
import { getCategory } from '@/constants/categories';
import { Brand, MaxContentWidth, Radius } from '@/constants/theme';
import { useManusChat } from '@/hooks/use-manus-chat';
import {
  useLargestExpense,
  useMonthBreakdown,
  useWeekdayTotals,
  useWeekTrend,
} from '@/hooks/use-expense-analytics';
import { useExpenses, useExpenseSummary } from '@/hooks/use-expenses';
import { useProfile } from '@/hooks/use-profile';
import { useTheme } from '@/hooks/use-theme';
import { isGeminiConfigured, transcribeWithGemini } from '@/lib/gemini';
import { buildInsights, buildWeeklySummary, type InsightTone } from '@/lib/insights';
import { tapFeedback } from '@/lib/haptics';
import { formatMoney } from '@/lib/money';
import { MANUS_INTRO, MANUS_SUGGESTIONS } from '@/lib/manus';

export default function InsightsScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { expenses, hydrated } = useExpenses();
  const { profile } = useProfile();
  const summary = useExpenseSummary(expenses);
  const breakdown = useMonthBreakdown(expenses);
  const trend = useWeekTrend(expenses);
  const weekdays = useWeekdayTotals(expenses);
  const largest = useLargestExpense(expenses);
  const [showSummary, setShowSummary] = useState(false);
  const [voiceBusy, setVoiceBusy] = useState(false);
  const [voiceSpeaking, setVoiceSpeaking] = useState(false);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const chat = useManusChat();
  const audioRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recorderState = useAudioRecorderState(audioRecorder);
  const voiceTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scrollRef = useRef<ScrollView>(null);

  useEffect(
    () => () => {
      if (voiceTimeout.current) clearTimeout(voiceTimeout.current);
      void Speech.stop().catch((error: unknown) => {
        console.error('Unable to stop voice transcript playback.', error);
      });
    },
    []
  );

  async function readRecording(uri: string) {
    if (Platform.OS !== 'web') {
      return {
        audioBase64: await FileSystem.readAsStringAsync(uri, {
          encoding: FileSystem.EncodingType.Base64,
        }),
        mimeType: 'audio/mp4',
      };
    }

    const blob = await (await fetch(uri)).blob();
    const audioBase64 = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(reader.error ?? new Error('Unable to read the voice recording.'));
      reader.onloadend = () => {
        if (typeof reader.result !== 'string') {
          reject(new Error('Unable to read the voice recording.'));
          return;
        }
        resolve(reader.result.slice(reader.result.indexOf(',') + 1));
      };
      reader.readAsDataURL(blob);
    });
    return { audioBase64, mimeType: blob.type || 'audio/webm' };
  }

  async function finishRecording() {
    if (voiceTimeout.current) {
      clearTimeout(voiceTimeout.current);
      voiceTimeout.current = null;
    }
    setVoiceBusy(true);
    setVoiceError(null);
    let recordingUri: string | null = null;

    try {
      await audioRecorder.stop();
      await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true });
      recordingUri = audioRecorder.uri;
      if (!recordingUri) throw new Error('The recording was not saved. Please try again.');
      const audio = await readRecording(recordingUri);
      const transcript = await transcribeWithGemini(audio);
      chat.setDraft(`${chat.draft}${chat.draft.trim() ? ' ' : ''}${transcript}`);
      await Speech.stop();
      setVoiceSpeaking(true);
      Speech.speak(transcript, {
        rate: 0.95,
        onDone: () => setVoiceSpeaking(false),
        onStopped: () => setVoiceSpeaking(false),
        onError: (error) => {
          console.error('Voice transcript could not be read aloud.', error);
          setVoiceSpeaking(false);
          setVoiceError('Your transcript is ready, but it could not be read aloud.');
        },
      });
    } catch (error) {
      setVoiceSpeaking(false);
      console.error('Voice recording could not be transcribed or read aloud.', error);
      setVoiceError(
        error instanceof Error ? error.message : 'Voice input failed. Please try again.'
      );
    } finally {
      if (recordingUri) {
        try {
          if (Platform.OS === 'web') URL.revokeObjectURL(recordingUri);
          else await FileSystem.deleteAsync(recordingUri, { idempotent: true });
        } catch (cleanupError) {
          console.error('Unable to remove the temporary voice recording.', cleanupError);
        }
      }
      setVoiceBusy(false);
    }
  }

  async function handleVoiceInput() {
    if (voiceBusy) return;
    setVoiceError(null);

    if (recorderState.isRecording) {
      await finishRecording();
      return;
    }

    if (!isGeminiConfigured) {
      setVoiceError('Voice input needs a Gemini API key. Add it to .env and restart the app.');
      return;
    }

    setVoiceBusy(true);
    try {
      const permission = await AudioModule.requestRecordingPermissionsAsync();
      if (!permission.granted) {
        throw new Error('Microphone access was denied. Allow microphone access to use voice input.');
      }
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      await audioRecorder.prepareToRecordAsync();
      audioRecorder.record();
      voiceTimeout.current = setTimeout(() => {
        void finishRecording();
      }, 60_000);
    } catch (error) {
      console.error('Unable to start voice recording.', error);
      setVoiceError(
        error instanceof Error ? error.message : 'Unable to start recording. Please try again.'
      );
    } finally {
      setVoiceBusy(false);
    }
  }

  useEffect(() => {
    if (chat.messages.length === 0 && !chat.thinking) return;
    const frame = requestAnimationFrame(() => scrollRef.current?.scrollToEnd({ animated: true }));
    return () => cancelAnimationFrame(frame);
  }, [chat.messages.length, chat.thinking]);

  const busiest = useMemo(
    () => weekdays.reduce((best, day) => (day.total > best.total ? day : best), weekdays[0]),
    [weekdays]
  );

  const insights = useMemo(
    () =>
      buildInsights({
        expenses,
        monthTotal: summary.monthTotal,
        monthCount: summary.monthCount,
        daysElapsed: summary.daysElapsed,
        daysInMonth: summary.daysInMonth,
        weeklyChange: trend.change,
        topCategory: breakdown[0] ? { label: breakdown[0].label, total: breakdown[0].total } : null,
        largest,
        busiestDay: busiest.total > 0 ? { label: busiest.label, total: busiest.total } : null,
        topCategoryId: summary.topCategoryId,
      }),
    [expenses, summary, trend, breakdown, largest, busiest]
  );

  const toneColors: Record<InsightTone, { background: string; accent: string }> = {
    positive: { background: theme.primarySoft, accent: theme.primary },
    warning: { background: theme.dangerSoft, accent: theme.danger },
    neutral: { background: theme.backgroundElement, accent: theme.textSecondary },
  };

  const progress = profile.monthlyGoal > 0 ? Math.min(1, summary.monthTotal / profile.monthlyGoal) : 0;

  const avatar = (
    <View style={[styles.avatar, { backgroundColor: theme.primarySoft }]}>
      <Ionicons name="sparkles" size={13} color={theme.primary} />
    </View>
  );

  return (
    <KeyboardAvoidingView
      style={[styles.screen, { backgroundColor: theme.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        ref={scrollRef}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: 28, paddingTop: insets.top + 12 },
        ]}>
        <View style={styles.header}>
          <Text style={[styles.eyebrow, { color: theme.textMuted }]}>AI ASSISTANT</Text>
          <Text style={[styles.title, { color: theme.text }]}>Your money coach</Text>
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
            Ask about your spending or any other topic. Gemini can search the web for current
            answers, and uses your entries when you ask about your money.
          </Text>
        </View>

        {chat.messages.length === 0 ? (
          <>
            <View style={styles.messageRow}>
              {avatar}
              <View style={[styles.bubble, styles.bubbleSimu, { backgroundColor: theme.backgroundElement }]}>
                <Text style={[styles.bubbleText, { color: theme.text }]}>{MANUS_INTRO(profile.name)}</Text>
              </View>
            </View>

            <View style={styles.chipWrap}>
              {MANUS_SUGGESTIONS.map((suggestion) => (
                <Pressable
                  key={suggestion}
                  accessibilityRole="button"
                  onPress={() => chat.send(suggestion)}
                  style={({ pressed }) => [
                    styles.chip,
                    {
                      backgroundColor: theme.backgroundElement,
                      borderColor: theme.border,
                      opacity: pressed ? 0.65 : 1,
                    },
                  ]}>
                  <Text style={[styles.chipText, { color: theme.textSecondary }]}>{suggestion}</Text>
                </Pressable>
              ))}
            </View>

            <View style={styles.goalCard}>
              <View style={styles.goalGlow} />
              <View style={styles.goalTop}>
                <View>
                  <Text style={styles.goalLabel}>Monthly target</Text>
                  <Text style={styles.goalValue}>{formatMoney(profile.monthlyGoal)}</Text>
                </View>
                <View style={styles.goalChip}>
                  <Ionicons
                    name={progress >= 1 ? 'alert' : 'flag'}
                    size={13}
                    color="rgba(255,255,255,0.95)"
                  />
                  <Text style={styles.goalChipLabel}>{Math.round(progress * 100)}% used</Text>
                </View>
              </View>

              <View style={styles.goalTrack}>
                <View style={[styles.goalFill, { width: `${Math.max(3, progress * 100)}%` }]} />
              </View>

              <Text style={styles.goalMeta}>
                {summary.monthTotal >= profile.monthlyGoal
                  ? `You are ${formatMoney(summary.monthTotal - profile.monthlyGoal)} over your target with ${summary.daysInMonth - summary.daysElapsed} days to go.`
                  : `${formatMoney(Math.max(0, profile.monthlyGoal - summary.monthTotal))} left before you hit your target.`}
              </Text>
            </View>

            {insights.map((insight) => {
              const colors = toneColors[insight.tone];
              return (
                <Card key={insight.id} style={styles.insightCard}>
                  <View style={styles.insightRow}>
                    <View style={[styles.insightIcon, { backgroundColor: colors.background }]}>
                      <Ionicons name={insight.icon} size={19} color={colors.accent} />
                    </View>
                    <View style={styles.insightBody}>
                      <Text style={[styles.insightTitle, { color: theme.text }]}>{insight.title}</Text>
                      <Text style={[styles.insightText, { color: theme.textSecondary }]}>
                        {insight.body}
                      </Text>
                    </View>
                  </View>
                </Card>
              );
            })}

            <Card style={styles.summaryCard}>
              <View style={styles.summaryHeader}>
                <Text style={[styles.cardTitle, { color: theme.text }]}>Weekly briefing</Text>
                <Ionicons name="reader" size={18} color={theme.textMuted} />
              </View>

              {showSummary ? (
                <Text style={[styles.summaryText, { color: theme.textSecondary }]}>
                  {buildWeeklySummary({
                    expenses,
                    monthTotal: summary.monthTotal,
                    weeklyTotal: trend.thisWeekTotal,
                    topCategory: breakdown[0] ? { label: breakdown[0].label } : null,
                  })}
                </Text>
              ) : (
                <Text style={[styles.summaryText, { color: theme.textMuted }]}>
                  Tap below for a plain-language summary of your week.
                </Text>
              )}

              <AppButton
                label={showSummary ? 'Refresh briefing' : 'Generate my briefing'}
                icon="sparkles"
                variant={showSummary ? 'secondary' : 'primary'}
                disabled={!hydrated}
                onPress={() => {
                  tapFeedback();
                  setShowSummary(true);
                }}
              />
            </Card>

            {summary.topCategoryId ? (
              <Card style={styles.footerCard}>
                <Text style={[styles.footerTitle, { color: theme.text }]}>Coach&apos;s note</Text>
                <Text style={[styles.footerText, { color: theme.textSecondary }]}>
                  Right now {getCategory(summary.topCategoryId).label.toLowerCase()} is your biggest
                  bucket. Ask the AI assistant above to compare your pace against your target.
                </Text>
              </Card>
            ) : null}
          </>
        ) : (
          <>
            {chat.messages.map((message) =>
              message.role === 'user' ? (
                <View key={message.id} style={[styles.messageRow, styles.messageRowUser]}>
                  <View style={[styles.bubble, styles.bubbleUser, { backgroundColor: theme.primary }]}>
                    <Text style={[styles.bubbleText, { color: theme.onBrand }]}>{message.text}</Text>
                  </View>
                </View>
              ) : (
                <View key={message.id} style={styles.messageRow}>
                  {avatar}
                  <View
                    style={[styles.bubble, styles.bubbleSimu, { backgroundColor: theme.backgroundElement }]}>
                    <Text style={[styles.bubbleText, { color: theme.text }]}>{message.text}</Text>
                  </View>
                </View>
              )
            )}

            {chat.thinking ? (
              <View style={styles.messageRow}>
                {avatar}
                <View
                  style={[
                    styles.bubble,
                    styles.bubbleSimu,
                    styles.thinkingBubble,
                    { backgroundColor: theme.backgroundElement },
                  ]}>
                  <ActivityIndicator size="small" color={theme.primary} />
                  <Text style={[styles.thinkingText, { color: theme.textMuted }]}>
                    {chat.thinkingLabel}
                  </Text>
                </View>
              </View>
            ) : null}

            <AppButton
              label="Clear chat"
              icon="refresh"
              variant="ghost"
              style={styles.clearButton}
              onPress={chat.clear}
            />
          </>
        )}
      </ScrollView>

      <View
        style={[styles.composer, { backgroundColor: theme.background, borderTopColor: theme.border }]}>
        <TextInput
          value={chat.draft}
          onChangeText={chat.setDraft}
          placeholder="Ask anything…"
          placeholderTextColor={theme.textMuted}
          returnKeyType="send"
          onSubmitEditing={() => chat.send()}
          blurOnSubmit={false}
          style={[
            styles.composerInput,
            { backgroundColor: theme.backgroundElement, color: theme.text },
          ]}
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={
            voiceSpeaking
              ? 'Reading your voice transcript aloud'
              : recorderState.isRecording
                ? 'Stop voice recording, maximum 60 seconds'
              : 'Record a voice question'
          }
          accessibilityState={{ disabled: voiceBusy || voiceSpeaking }}
          disabled={voiceBusy || voiceSpeaking}
          onPress={() => void handleVoiceInput()}
          style={({ pressed }) => [
            styles.voiceButton,
            {
              backgroundColor: recorderState.isRecording ? theme.dangerSoft : theme.backgroundElement,
              opacity: voiceBusy || voiceSpeaking ? 0.55 : pressed ? 0.75 : 1,
            },
          ]}>
          {voiceBusy ? (
            <ActivityIndicator size="small" color={theme.primary} />
          ) : (
            <Ionicons
              name={recorderState.isRecording ? 'stop' : 'mic'}
              size={20}
              color={recorderState.isRecording ? theme.danger : theme.textSecondary}
            />
          )}
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Send question"
          disabled={!chat.canSend}
          onPress={() => chat.send()}
          style={({ pressed }) => [
            styles.sendButton,
            {
              backgroundColor: theme.primary,
              opacity: !chat.canSend ? 0.4 : pressed ? 0.85 : 1,
            },
          ]}>
          <Ionicons name="arrow-up" size={20} color={theme.onBrand} />
        </Pressable>
      </View>
      {voiceError || chat.error || voiceBusy || voiceSpeaking || recorderState.isRecording ? (
        <Text
          accessibilityRole={voiceError || chat.error ? 'alert' : undefined}
          style={[
            styles.errorText,
            {
              color: voiceError || chat.error ? theme.danger : theme.textMuted,
              backgroundColor: theme.background,
            },
          ]}>
          {voiceError ??
            chat.error ??
            (voiceSpeaking
              ? 'Reading your recorded message aloud…'
              : voiceBusy
                ? 'Transcribing your recording…'
                : 'Recording — tap the mic to stop (60 seconds max).')}
        </Text>
      ) : null}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: 20,
    gap: 14,
  },
  header: { gap: 4 },
  eyebrow: { fontSize: 11, fontWeight: '800', letterSpacing: 1.2, textTransform: 'uppercase' },
  title: { fontSize: 30, fontWeight: '800', letterSpacing: -0.8 },
  subtitle: { fontSize: 13.5, fontWeight: '500', lineHeight: 19 },
  messageRow: { flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
  messageRowUser: { justifyContent: 'flex-end' },
  avatar: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bubble: {
    flexShrink: 1,
    maxWidth: '86%',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  bubbleSimu: { borderTopLeftRadius: 6 },
  bubbleUser: { borderTopRightRadius: 6 },
  bubbleText: { fontSize: 14, fontWeight: '500', lineHeight: 20 },
  thinkingBubble: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  thinkingText: { fontSize: 13, fontWeight: '600' },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    borderRadius: Radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 13,
    paddingVertical: 8,
  },
  chipText: { fontSize: 12.5, fontWeight: '600' },
  clearButton: { alignSelf: 'flex-start' },
  composer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  composerInput: {
    flex: 1,
    borderRadius: Radius.pill,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    fontWeight: '600',
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  voiceButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: {
    paddingHorizontal: 20,
    paddingBottom: 8,
    fontSize: 12,
    fontWeight: '600',
  },
  goalCard: {
    borderRadius: Radius.xl,
    padding: 20,
    gap: 12,
    overflow: 'hidden',
    experimental_backgroundImage: Brand.gradientCard,
    shadowColor: Brand.greenDark,
    shadowOpacity: 0.28,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 6,
  },
  goalGlow: {
    position: 'absolute',
    top: -60,
    right: -40,
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  goalTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  goalLabel: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  goalValue: { color: '#FFFFFF', fontSize: 30, fontWeight: '800', letterSpacing: -1 },
  goalChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: Radius.pill,
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  goalChipLabel: { color: '#FFFFFF', fontSize: 12, fontWeight: '700' },
  goalTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.22)',
    overflow: 'hidden',
  },
  goalFill: { height: '100%', borderRadius: 4, backgroundColor: '#FFFFFF' },
  goalMeta: { color: 'rgba(255,255,255,0.88)', fontSize: 12.5, fontWeight: '500', lineHeight: 18 },
  insightCard: { paddingVertical: 16 },
  insightRow: { flexDirection: 'row', gap: 12 },
  insightIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  insightBody: { flex: 1, gap: 4 },
  insightTitle: { fontSize: 15, fontWeight: '800', letterSpacing: -0.2 },
  insightText: { fontSize: 13.5, fontWeight: '500', lineHeight: 19 },
  summaryCard: { gap: 12 },
  summaryHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardTitle: { fontSize: 16, fontWeight: '800', letterSpacing: -0.3 },
  summaryText: { fontSize: 14, fontWeight: '500', lineHeight: 21 },
  footerCard: { gap: 6 },
  footerTitle: { fontSize: 15, fontWeight: '800' },
  footerText: { fontSize: 13.5, fontWeight: '500', lineHeight: 20 },
});
