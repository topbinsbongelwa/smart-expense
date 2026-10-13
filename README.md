# Welcome to your Expo app 👋

This is an [Expo](https://expo.dev) project created with [`create-expo-app`](https://www.npmjs.com/package/create-expo-app).

## Get started

1. Install dependencies

   ```bash
   npm install
   ```

2. Start the app

   ```bash
   npx expo start
   ```

In the output, you'll find options to open the app in a

- [development build](https://docs.expo.dev/develop/development-builds/introduction/)
- [Android emulator](https://docs.expo.dev/workflow/android-studio-emulator/)
- [iOS simulator](https://docs.expo.dev/workflow/ios-simulator/)
- [Expo Go](https://expo.dev/go), a limited sandbox for trying out app development with Expo

You can start developing by editing the files inside the **app** directory. This project uses [file-based routing](https://docs.expo.dev/router/introduction).

## Get a fresh project

When you're ready, run:

```bash
npm run reset-project
```

This command will move the starter code to the **app-example** directory and create a blank **app** directory where you can start developing.

### Other setup steps

- To set up ESLint for linting, run `npx expo lint`, or follow our guide on ["Using ESLint and Prettier"](https://docs.expo.dev/guides/using-eslint/)
- If you'd like to set up unit testing, follow our guide on ["Unit Testing with Jest"](https://docs.expo.dev/develop/unit-testing/)
- Learn more about the TypeScript setup in this template in our guide on ["Using TypeScript"](https://docs.expo.dev/guides/typescript/)

## Learn more

To learn more about developing your project with Expo, look at the following resources:

- [Expo documentation](https://docs.expo.dev/): Learn fundamentals, or go into advanced topics with our [guides](https://docs.expo.dev/guides).
- [Learn Expo tutorial](https://docs.expo.dev/tutorial/introduction/): Follow a step-by-step tutorial where you'll create a project that runs on Android, iOS, and the web.

## Join the community

Join our community of developers creating universal apps.

- [Expo on GitHub](https://github.com/expo/expo): View our open source platform and contribute.
- [Discord community](https://chat.expo.dev): Chat with Expo users and ask questions.

## Deploy to Vercel

This project exports its Expo Router web app as a static site. The Vercel
configuration runs `npm run build:web` and publishes the generated `dist`
directory.

1. Import this repository into Vercel and leave the project root set to the
   repository root. Select **Other** as the framework preset; this Expo web
   export is configured by `vercel.json`.
2. In Vercel project settings, add these Firebase web configuration variables
   for Production and Preview:
   `EXPO_PUBLIC_FIREBASE_API_KEY`, `EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN`,
   `EXPO_PUBLIC_FIREBASE_PROJECT_ID`, `EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET`,
   `EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`, and `EXPO_PUBLIC_FIREBASE_APP_ID`.
   Copy their values from Firebase Console → Project settings → Your apps.
3. Add your Vercel domain under Firebase Console → Authentication → Settings →
   Authorized domains, then redeploy from Vercel.

Firebase configuration values are public client identifiers and are embedded
in the web app at build time. Without them, the site can build but account
sign-in and cloud sync will not be configured.

## AI assistant and voice input

To enable open-ended AI answers, current web-backed answers, and voice transcription:

1. Create a Gemini API key in [Google AI Studio](https://aistudio.google.com/app/apikey).
2. Copy `.env.example` to `.env` and set `EXPO_PUBLIC_GEMINI_API_KEY`.
3. Restart the Expo development server after changing environment variables.

The AI sends the question and recent chat context to Gemini. When a question uses
expense data, it also sends the expense summary and recent entries needed to answer
it; unrelated questions do not include expense records. Voice recordings are sent to
Gemini for transcription and removed from the device cache afterward. Google Search
grounding is enabled for current or verifiable questions.

Gemini requests use Google's Interactions API with the `gemini-3.8-flash`
model by default. You can override the model using `EXPO_PUBLIC_GEMINI_MODEL`
and `EXPO_PUBLIC_GEMINI_AUDIO_MODEL` in `.env`.

`EXPO_PUBLIC_*` values are bundled into client apps, so a Gemini key must be
restricted to the Gemini API. For a production app, proxy Gemini requests through
a trusted backend rather than embedding an unrestricted key in the app.
