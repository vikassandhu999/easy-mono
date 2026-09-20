# Physical-device and client checks

No physical phone is connected: `xcrun xctrace list devices` lists only this Mac and
simulators, and `adb devices -l` lists only emulator-5554 (2026-09-20).

These checks are pending. Simulator, emulator and browser results in completion.md do
not establish them. Use a separate test coach/client with representative plans, forms
and messages. Record device model, OS, app commit, network, result and observed problem
for each check. Do not use the retained localhost preview account for destructive tests.

## iPhone and Android hardware

* Join from an invitation opened in the mail app. Enter or autofill the OTP with the
  software keyboard visible, close the app, then reopen the same authenticated account.
* Start a workout, enter an unsaved set, lock the phone, switch apps and return. Repeat
  after OS process reclamation. Verify the draft and saved sets against the coach view.
* Save a set, meal, check-in and message with the keyboard open using one tap. Check
  small phone screens, gesture-navigation insets, landscape and a connected hardware
  keyboard. Android Back must close an open picker/sheet before leaving its screen.
* Capture an actual iPhone camera frame, cancel a capture, deny permission, grant it in
  Settings, and retry. Check iOS limited-library changes and Android selected-photo
  access. Submit and reopen the saved image. Android emulator capture passed; an actual
  iPhone camera frame is unavailable in the simulator.
* Send a phone-recorded video and voice attachment, including a larger file within the
  stated upload limit. Play them through the speaker and Bluetooth headphones; test a
  call interruption and background/resume. The one-second simulator/emulator fixtures
  prove player progress, not hardware sound or every camera/codec combination.
* Move between Wi-Fi, cellular and airplane mode during editing and a deliberate save.
  Verify the draft, clear connection feedback and one server result after recovery.
  There is no general background write queue.
* Sign out, restart, and switch clients. Check that private screens, drafts and saved
  media from the signed-out account are unavailable to the next account.
* Lock/unlock around token refresh. Check Keychain/Keystore availability, process death
  immediately after sign-in/sign-out, reinstall and backup/device transfer. Reinstall
  must require sign-in even when iOS retains a keychain item. Migration ordering has
  automated fault tests; full hardware protection/backup behavior remains unverified.
* Use VoiceOver/TalkBack, larger system text and increased display size. Check input
  labels, choice groups, sheets, focus after errors, saved feedback and navigation.
  Verify readable contrast in outdoor light and reachability with one hand.

## Real-client usability sessions

Give clients the goal, not a description of which buttons to press. Observe hesitation,
wrong turns, repeated typing, accidental submissions and whether saved feedback is clear.

* From Today, find the next useful action and explain whether today is a workout or rest
  day. Resume a partly recorded workout and finish it.
* Record a prescribed meal, choose an alternative, adjust a portion, and find the saved
  entry. Ask the client to explain what the totals represent.
* Complete a check-in with a progress photo, correct a missing answer, and find the saved
  response. For a closed request, ask what the client thinks happened and what to do next.
* Message the coach, attach a photo, interrupt the app and return to the draft. Open a
  coach-shared form and return to the conversation.
* Review progress and update account details or an optional weight goal. Confirm that
  the client understands units and the difference between a saved entry and a local draft.

Record observations separately from automated pass/fail results. Resolve material
usability problems before a client rollout; this document is not a usability sign-off.

## External setup

Verified HTTPS invitation links need an owned domain, Apple association file, Android
asset links and signing identities. Custom-scheme cold/warm links are tested locally.
Push notifications need a supported registration/delivery API and APNs/FCM credentials;
no notification permission is requested without a delivery workflow. Production builds
need their HTTPS API/storage origins, signing and store configuration. No deployment,
push or store publication is authorized or performed by this rebuild.
