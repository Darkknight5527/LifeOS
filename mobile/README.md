# LifeOS — Android app

Expo (SDK 57) app that talks to the same backend as the website.

**First feature: water.** Log glasses (works offline, syncs to the website's
food log), see today vs your target, and get reminders scheduled on the phone
itself — every 1–3 h within your active hours, skipped right after you drink,
stopped once you hit your target. The notification's **+250 ml** button logs a
glass without opening the app (`src/reminders.js`, background task in `index.js`).

## Install on your phone

Open **https://github.com/Darkknight5527/LifeOS/releases/tag/android-latest**
on the phone, download `LifeOS.apk`, open it and allow "install unknown apps"
for your browser once. New versions install over the old one (same signature).

## How it's built

Every push to `mobile/**` runs `.github/workflows/android.yml`: `expo prebuild`
→ `gradlew assembleRelease` → replaces the `android-latest` release. The
`android/` folder is generated and not committed.

The backend address is `expo.extra.apiUrl` in `app.json`; when it's empty the
sign-in screen asks for it.

## Develop

```bash
cd mobile
npm install
npx expo start          # needs a dev build for notifications (Expo Go lacks them)
```

Native modules are installed at the versions in `expo/bundledNativeModules.json`
(`npx expo install` does this when Expo's API is reachable).
