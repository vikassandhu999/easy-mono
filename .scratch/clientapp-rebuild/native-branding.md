# Native branding

Use the flower already present in the client app bar, with the same cream background and purple stroke. The launcher and initial app surface should be recognizable without introducing another screen or delaying entry. A separate illustrated launch scene was considered; keep a single centered mark so startup transitions directly into the task.

`pnpm brand:assets` derives browser, iOS and Android assets from the installed Lucide Flower2 primitive. Sharp 0.34.5 was already present in the workspace lockfile; it is now an explicit development dependency for repeatable raster output. No runtime dependency was added. iOS uses an opaque 1024px icon and a fixed-size launch mark with 1x/2x/3x images. Android uses legacy density icons, an adaptive foreground/background and monochrome layer, plus the launch theme. Obsolete Capacitor starter splash rasters and unused default vector artwork are removed. Capacitor's initial background and browser theme color match the app.

Android's [adaptive icon guide](https://developer.android.com/develop/ui/compose/system/icon_design_adaptive) defines the central safe zone; the mark stays inside it. The [launch screen guide](https://developer.android.com/develop/ui/views/launch/splash-screen) describes the icon/background theme attributes. Runtime screenshots and builds, rather than these documents, will establish this implementation's result.

Status: generated assets, installed icons and native cold launches verified. No publish/store action is authorized or performed.

## Verification

`pnpm native:sync` passes the strict frontend build and native copies. Android debug build/install and launcher entry pass; a recorded cold launch shows the complete flower on cream, followed by the mobile login screen. Browser icon delivery, theme color and login rendering pass. The asset generator produces 20 identical files on a second run. Logs: `/tmp/easy-clientapp-branding-sync.log` and `/tmp/easy-clientapp-branding-android-build.log`; selected evidence is `evidence/branding-*`.

The first iPhone launcher-only test opened an older installed bundle: the built icon was the flower while the installed icon was still the Capacitor starter. Install the actual built `App.app` before tests that enter through SpringBoard instead of `XCUIApplication.launch()`. After explicit installation, launcher entry and visual inspection pass. Result: `/tmp/easy-clientapp-ios-build/Logs/Test/Test-ClientUITests-2026.09.20_14-30-48-+0530.xcresult`, log `/tmp/easy-clientapp-branding-ios-installed.log`. The project scheme is `ClientUITests`; an initial `-scheme App` command was rejected before building.

The iPhone cold-launch recording then exposed a blank launch screen. SplashBoard reported a cached 29,900,800-byte launch image exceeding its 25,000,000-byte limit. `assetutil` independently confirmed both the built and installed replacement were 384×384 at 3x. A fresh install alone retained the daemon's old image size. Restarting the task simulator and reinstalling the same bundle produced successful launch-image generation for light/dark and portrait/landscape; the new cold-launch recording visibly shows the centered flower and cream transition into login. This was a branding fresh-install/cache check, not evidence of draft recovery. Previous lifecycle recovery tests remain separate. [Apple's launch-screen debugging note](https://developer.apple.com/documentation/technotes/tn3118-debugging-your-apps-launch-screen) describes stale launch-screen troubleshooting; the exact memory failure and recovery here come from runtime logs.

Reproduce native entry with the installed artifact:

```sh
rtk proxy xcrun simctl install 516E4F05-967E-46C9-BCB8-9A8DCFFC5854 /tmp/easy-clientapp-ios-build/Build/Products/Debug-iphonesimulator/App.app
rtk proxy xcodebuild test -project App.xcodeproj -scheme ClientUITests -destination 'platform=iOS Simulator,id=516E4F05-967E-46C9-BCB8-9A8DCFFC5854' -derivedDataPath /tmp/easy-clientapp-ios-build -only-testing:ClientUITests/AuthenticationTests/testLauncherEntry
```

Run the second command from `frontend/apps/clientapp/ios/App`. Visual inspection is required in addition to the launch assertion. Original videos remain in `/tmp/easy-clientapp-branding-{android,ios-reboot}.mp4`; contact sheets and representative frames are retained in the repository.

Full backend `mix precommit` passes 1,846 tests; Biome, check-rm and diff checks pass. No API contract, session or workflow persistence code changed. Store-signing, physical-device branding and human recognition checks remain external observations.
