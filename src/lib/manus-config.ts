/**
 * Manus AI cloud assistant config.
 *
 * Credentials come from `EXPO_PUBLIC_MANUS_*` env vars (see `.env.example`).
 * The endpoint is an OpenAI-compatible chat-completions URL. When the key is
 * missing the assistant silently falls back to the on-device engine in
 * `src/lib/simu.ts`, so the app works with no cloud setup at all.
 */

export const manusConfig = {
  apiKey: process.env.EXPO_PUBLIC_MANUS_API_KEY,
  apiUrl: process.env.EXPO_PUBLIC_MANUS_API_URL,
  model: process.env.EXPO_PUBLIC_MANUS_MODEL || 'manus-1',
};

/** Call sites check this before attempting a network round trip. */
export const isManusConfigured = Boolean(manusConfig.apiKey && manusConfig.apiUrl);

export const MANUS_SETUP_MESSAGE =
  'Manus AI is answering in offline mode. Add EXPO_PUBLIC_MANUS_API_KEY and EXPO_PUBLIC_MANUS_API_URL to .env to connect the cloud assistant, then restart the dev server.';
