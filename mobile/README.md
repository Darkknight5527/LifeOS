# LifeOS — Android app

The whole LifeOS website (every domain) inside an Android app. It's an Expo
(SDK 57) shell around a WebView that loads https://lifeos-web-qjrj.onrender.com,
so **every website update shows up in the app automatically** — a new APK is
only needed when the shell itself changes.

What the shell adds:
- stays signed in (the site's localStorage persists);
- Android back button goes back inside LifeOS;
- links to other sites (YouTube, Google Calendar, news) open in the phone's
  browser/apps;
- status and navigation bars take the colour of the page you're on;
- loading screen and an offline "Try again" screen;
- saves exports/backups to a folder you pick once, and opens the reference
  books in a built-in PDF reader;
- **smart scale sync**: reads Weight and Body fat from Health Connect
  (`src/health.js`, react-native-health-connect). FitDays → Google Fit /
  Samsung Health → Health Connect → LifeOS. Runs when the app opens or comes
  back (at most every 10 min) and from the Body tab's "Smart scale" card; the
  website saves readings as body-logs (`web/src/components/HealthSync.jsx`)
  and confirms, and only then does the app remember the sync point. First
  sync reads up to a year back.

The page gets an `in-app` class on `<html>` and `LifeOSApp/1.0` in its user
agent, in case the website ever needs to behave differently inside the app.

## Install on your phone

Open **https://github.com/Darkknight5527/LifeOS/releases/download/android-latest/LifeOS.apk**
on the phone, download it, open it and allow "install unknown apps" for your
browser once. New versions install over the old one (same signature).

## How it's built

Every push to `mobile/**` runs `.github/workflows/android.yml`: `expo prebuild`
→ `gradlew assembleRelease` → replaces the `android-latest` release. The
`android/` folder is generated and not committed.

```bash
cd mobile && npm install && npx expo start   # local development
```

Native modules are pinned to the versions in `expo/bundledNativeModules.json`.

## Signing (your own key)

Release APKs are signed with your own key when these four repository secrets
exist (Settings → Secrets and variables → Actions):
`ANDROID_KEYSTORE_BASE64`, `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`,
`ANDROID_KEY_PASSWORD`. Without them the build falls back to the shared debug
key. Switching keys once means uninstalling the old app before installing the
new one (your data lives on the server, so nothing is lost — just log in again).
Never commit the keystore file.
