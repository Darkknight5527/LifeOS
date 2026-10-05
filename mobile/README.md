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
- loading screen and an offline "Try again" screen.

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
