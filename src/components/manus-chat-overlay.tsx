import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useRef } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useManusChat } from '@/hooks/use-manus-chat';
import { useProfile } from '@/hooks/use-profile';
import { useTheme } from '@/hooks/use-theme';
import { MaxContentWidth, Radius } from '@/constants/theme';
import { MANUS_INTRO, MANUS_SUGGESTIONS, isManusConfigured } from '@/lib/manus';

/**
 * Full-screen Manus AI chat, mounted once from the root layout so it can open
 * over any screen. Stays mounted while closed, so the conversation survives
 * opening and closing.
 */
export function ManusChatOverlay({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { profile } = useProfile();
  const chat = useManusChat();
  const scrollRef = useRef<ScrollView>(null);

  const { messages, thinking } = chat;

  useEffect(() => {
    if (messages.length === 0 && !thinking) return;
    const frame = requestAnimationFrame(() => scrollRef.current?.scrollToEnd({ animated: true }));
    return () => cancelAnimationFrame(frame);
  }, [messages.length, thinking]);

  const avatar = (
    <View style={[styles.avatar, { backgroundColor: theme.primarySoft }]}>
      <Ionicons name="sparkles" size={13} color={theme.onPrimarySoft} />
    </View>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      statusBarTranslucent
      onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={[styles.screen, { backgroundColor: theme.background }]}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View
          style={[
            styles.header,
            {
              paddingTop: insets.top + 10,
              backgroundColor: theme.background,
              borderBottomColor: theme.border,
            },
          ]}>
          <View style={[styles.headerAvatar, { backgroundColor: theme.primarySoft }]}>
            <Ionicons name="sparkles" size={18} color={theme.onPrimarySoft} />
          </View>
          <View style={styles.headerText}>
            <Text style={[styles.headerTitle, { color: theme.text }]}>Manus AI</Text>
            <Text style={[styles.headerSubtitle, { color: theme.textMuted }]}>
              {isManusConfigured ? 'Money coach · cloud' : 'Money coach · offline mode'}
            </Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close chat"
            onPress={onClose}
            hitSlop={8}
            style={({ pressed }) => [
              styles.closeButton,
              { backgroundColor: theme.backgroundElement, opacity: pressed ? 0.7 : 1 },
            ]}>
            <Ionicons name="close" size={20} color={theme.textSecondary} />
          </Pressable>
        </View>

        <ScrollView
          ref={scrollRef}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.content, { paddingBottom: 24 }]}>
          {messages.length === 0 ? (
            <>
              <View style={styles.messageRow}>
                {avatar}
                <View
                  style={[styles.bubble, styles.bubbleAssistant, { backgroundColor: theme.backgroundElement }]}>
                  <Text style={[styles.bubbleText, { color: theme.text }]}>
                    {MANUS_INTRO(profile.name)}
                  </Text>
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

              <Text style={[styles.hint, { color: theme.textMuted }]}>
                {isManusConfigured
                  ? 'Answers come from the Manus AI cloud using your own entries.'
                  : 'Offline mode: answers are generated on-device from your own entries. Add an API key to .env to connect Manus AI.'}
              </Text>
            </>
          ) : (
            <>
              {messages.map((message) =>
                message.role === 'user' ? (
                  <View key={message.id} style={[styles.messageRow, styles.messageRowUser]}>
                    <View
                      style={[styles.bubble, styles.bubbleUser, { backgroundColor: theme.primary }]}>
                      <Text style={[styles.bubbleText, { color: theme.onBrand }]}>{message.text}</Text>
                    </View>
                  </View>
                ) : (
                  <View key={message.id} style={styles.assistantBlock}>
                    <View style={styles.messageRow}>
                      {avatar}
                      <View
                        style={[
                          styles.bubble,
                          styles.bubbleAssistant,
                          { backgroundColor: theme.backgroundElement },
                        ]}>
                        <Text style={[styles.bubbleText, { color: theme.text }]}>{message.text}</Text>
                      </View>
                    </View>
                    {isManusConfigured && message.source === 'local' ? (
                      <Text style={[styles.fallbackNote, { color: theme.textMuted }]}>
                        Answered on-device — Manus cloud was unreachable.
                      </Text>
                    ) : null}
                  </View>
                )
              )}

              {thinking ? (
                <View style={styles.messageRow}>
                  {avatar}
                  <View
                    style={[
                      styles.bubble,
                      styles.bubbleAssistant,
                      styles.thinkingBubble,
                      { backgroundColor: theme.backgroundElement },
                    ]}>
                    <ActivityIndicator size="small" color={theme.primary} />
                    <Text style={[styles.thinkingText, { color: theme.textMuted }]}>
                      Manus is thinking…
                    </Text>
                  </View>
                </View>
              ) : null}

              <Pressable
                accessibilityRole="button"
                onPress={chat.clear}
                style={({ pressed }) => [styles.clearButton, { opacity: pressed ? 0.6 : 1 }]}>
                <Ionicons name="refresh" size={14} color={theme.textMuted} />
                <Text style={[styles.clearText, { color: theme.textMuted }]}>Clear chat</Text>
              </Pressable>
            </>
          )}
        </ScrollView>

        <View
          style={[
            styles.composer,
            {
              backgroundColor: theme.background,
              borderTopColor: theme.border,
              paddingBottom: Math.max(insets.bottom, 12),
            },
          ]}>
          <TextInput
            value={chat.draft}
            onChangeText={chat.setDraft}
            placeholder="Ask Manus about your money…"
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
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: { flex: 1, gap: 1 },
  headerTitle: { fontSize: 17, fontWeight: '800', letterSpacing: -0.3 },
  headerSubtitle: { fontSize: 12, fontWeight: '600' },
  closeButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: 20,
    paddingTop: 18,
    gap: 14,
  },
  messageRow: { flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
  messageRowUser: { justifyContent: 'flex-end' },
  assistantBlock: { gap: 4 },
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
  bubbleAssistant: { borderTopLeftRadius: 6 },
  bubbleUser: { borderTopRightRadius: 6 },
  bubbleText: { fontSize: 14, fontWeight: '500', lineHeight: 20 },
  thinkingBubble: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  thinkingText: { fontSize: 13, fontWeight: '600' },
  fallbackNote: { fontSize: 11, fontWeight: '600', marginLeft: 34 },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    borderRadius: Radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 13,
    paddingVertical: 8,
  },
  chipText: { fontSize: 12.5, fontWeight: '600' },
  hint: { fontSize: 12.5, fontWeight: '500', lineHeight: 18 },
  clearButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    paddingVertical: 4,
  },
  clearText: { fontSize: 13, fontWeight: '700' },
  composer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 20,
    paddingTop: 10,
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
});
