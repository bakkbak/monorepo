# Teevo Mobile (Capacitor)

The iOS and Android apps are the **same** Vite/React web app in `src/`, wrapped
in a native shell by [Capacitor](https://capacitorjs.com). There is no second
UI codebase — every web change ships to mobile after a rebuild + sync.

Capacitor is pinned to **v7** because this toolchain runs Node 20; Capacitor 8
requires Node ≥22. If you upgrade Node to 22+, you can bump all `@capacitor/*`
packages to v8 together — the plugin APIs used here are unchanged.

## One-time setup before shipping

1. **Set the production API URL.** Edit `.env.native` and replace the placeholder
   with your deployed Vercel domain:
   ```
   VITE_API_BASE=https://your-app.vercel.app/api
   ```
   The web build ignores this file and keeps calling `/api` same-origin; only
   native builds bake in the absolute URL (the WebView origin is
   `capacitor://localhost`, where a relative `/api` 404s).

2. **Generate app icons + splash.** No icon exists yet. Drop a 1024×1024 PNG at
   `assets/icon.png` and a splash source at `assets/splash.png`, then:
   ```
   npx @capacitor/assets generate
   ```

## Build & run

```bash
npm run build:native   # vite build with VITE_API_BASE baked in
npx cap sync           # copy web assets + native plugins into ios/ and android/

npm run open:android   # opens Android Studio → Run
npm run open:ios       # opens Xcode → Run   (see iOS note below)
```

`npm run sync` does `build:native` + `cap sync` in one step.

## iOS — requires a Mac with Xcode + CocoaPods

The `ios/` project is **not generated yet** because `cap add ios` runs
`pod install`, and CocoaPods needs Ruby ≥3 (this machine has the system Ruby
2.6). On a machine with a modern Ruby:

```bash
sudo gem install cocoapods      # or: brew install cocoapods
npx cap add ios
npm run sync
npm run open:ios
```

Then, in Xcode, add these usage strings to `ios/App/App/Info.plist` (missing any
one is an automatic App Store rejection):

```xml
<key>NSCameraUsageDescription</key>
<string>Teevo uses your camera to add photos to posts.</string>
<key>NSPhotoLibraryUsageDescription</key>
<string>Teevo lets you attach photos from your library to posts.</string>
<key>NSLocationWhenInUseUsageDescription</key>
<string>Teevo uses your location to show posts from around your campus.</string>
```

Set the signing team and confirm the bundle ID is `com.teevo.app`.

## Android — generated

`android/` is committed. Camera, photo-library, and coarse/fine location
permissions are declared in `android/app/src/main/AndroidManifest.xml`. Bundle ID
is `com.teevo.app`, app name **Teevo**.

## What changed vs. a plain web wrapper

- `src/app/api.ts` — env-driven API base + `resolveImageUrl()` (backend stores
  image URLs relative; they need the API origin prefixed on native).
- `src/app/storage.ts` — Preferences on native / localStorage on web.
- `src/app/device.ts` — persisted UUID identity instead of a browser fingerprint.
- `src/app/location.ts`, `src/app/components/PostComposer.tsx` — native
  Geolocation and Camera plugins, with the web paths kept intact.
- `src/main.tsx`, `src/app/App.tsx` — status-bar/splash bootstrap, Android back
  button, and `env(safe-area-inset-*)` padding on the fixed header/nav bars.
- Noto Sans is self-hosted (`public/fonts/`) so the app renders correctly offline.

## Known gap (deferred)

Device identity is still an unsigned `device_id` sent as a plain query param, so
a client can act as any device by guessing an ID — same exposure the web app has
today. Closing it means issuing a token at registration and checking it in
`app/routes/*.py`. Out of scope for the mobile wrapper.
