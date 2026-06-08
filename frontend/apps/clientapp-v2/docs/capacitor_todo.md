# Capacitor TODO

Remaining items to make the native apps production-ready. None of these block local development or `cap sync`.

## App Identity

- [ ] Replace default app icon (ios/App/App/Assets.xcassets, android/app/src/main/res/mipmap-*)
- [ ] Replace default splash screen
- [ ] Set proper display name in Info.plist (iOS) and strings.xml (Android) — currently "CoachEasy"
- [ ] Confirm bundle ID `app.coacheasy.client` with team before store submission

## iOS

- [ ] Set development team in Xcode (Signing & Capabilities)
- [ ] Configure push notification entitlement (when push is implemented)
- [ ] Set minimum deployment target (currently Capacitor default ~iOS 16)
- [ ] Add NSCameraUsageDescription / NSPhotoLibraryUsageDescription if image upload is added
- [ ] Add associated domains for deep linking (e.g. `applinks:coacheasy.app`)

## Android

- [ ] Generate release keystore for Play Store signing
- [ ] Set minSdkVersion / targetSdkVersion in build.gradle if defaults need changing
- [ ] Add internet permission (already present by default), camera permission if needed
- [ ] Configure deep links / App Links in AndroidManifest.xml

## Capacitor Plugins (evaluate as features are built)

- [ ] `@capacitor/push-notifications` — for coaching reminders, messages
- [ ] `@capacitor/camera` — for profile photo upload
- [ ] `@capacitor/filesystem` + `@capacitor/share` — for exporting/sharing plans
- [ ] `@capacitor/browser` — for opening external links (coach's socials, payment pages)
- [ ] `@capacitor/network` — offline detection banner
- [ ] `@capacitor/splash-screen` — customize splash duration/fade

## Dev Workflow

- [ ] Set up live reload: uncomment `server.url` in `capacitor.config.ts` with local IP
- [ ] Document the workflow: `pnpm dev` (web) + `cap run ios --livereload` or via Xcode
- [ ] Add `ios/` and `android/` to `.gitignore` if the team decides to not commit native projects (alternative: commit them for CI)

## CI/CD

- [ ] Decide: commit native projects or regenerate from `cap sync` in CI
- [ ] Set up Fastlane or EAS Build for automated iOS/Android builds
- [ ] Configure environment-specific API URLs (dev/staging/prod) — currently hardcoded localhost:4000

## Safe Area / Status Bar

- [ ] Initialize `@capacitor/status-bar` in `main.tsx` (style, overlay, color)
- [ ] Add `safe-area-inset-*` CSS env() vars to app-shell for notch/gesture bar devices
- [ ] Initialize `@capacitor/keyboard` to handle resize/scroll behavior on iOS

## Deep Linking

- [ ] Define URL scheme (e.g. `coacheasy://`)
- [ ] Configure universal links (iOS) / App Links (Android)
- [ ] Handle deep link routing in react-router (e.g. invitation accept links)
