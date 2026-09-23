# Assigned plan, direct entry

The user clarified that clients have one applicable plan. The previous UI unnecessarily
required browsing/searching an API collection. Training now uses the server’s coverage
response to open that plan’s workouts inside Training. Today’s workout is labelled in the
list. A rest day retains the plan; no coverage gets a specific no-plan message. Workout
preview Back returns directly to Training. Freestyle remains available as a secondary
action, and workout history retains its own search/date/status filters.

Nutrition keeps daily meals as its entry. View plan links straight to that day’s plan,
with a return to the same date. The old /nutrition/plans route resolves today’s plan or
shows an explicit no-plan/retry state. It no longer renders search, counts, archive
filters or a selection list. Weekly guidance now uses Monday–Sunday order.

No backend endpoint, assignment rule or generated contract changed. Unused client
plan-list hooks/query-key factories were removed. The client does not fetch pages and
choose the first plan; server coverage/day data chooses the applicable identity.

## Verification

Browser training and nutrition recording/recovery pass at 375/768/1280, including
direct entry, absence of Find a plan, retained history return, and the legacy nutrition
URL. Training history paging/count/retry and Today loading/failure/no-plan/rest/cached
retry pass. The tests were pointed at an isolated Vite on 1317/API4100; localhost1315
remains connected to the user’s regular backend4000. Two tests had hard-coded1315 and
were corrected to honor CLIENT_APP_URL after their mismatched-database login failed.
Today’s previous plan-link assertion now checks the directly displayed plan heading.

Evidence: evidence/assigned-plan-{training,nutrition}-{375,768,1280}.png.
Logs: /tmp/easy-clientapp-plan-entry-{training-final,nutrition-final,today-final,history}.log.
Strict build/native sync, Biome (139 files), shape checks and the former repository checks and full backend precommit
pass (1,846 tests, zero failures). Android auth, encrypted session migration, offline
forms/workouts, process restart and logout pass on the final build. The iPhone meal
recording/restart/save scenario also passes. Native workout coverage uses freestyle;
assigned-plan entry is covered by the real-API browser scenarios above.

The iPhone workout regression encountered an off-screen keyboard after process restart.
Waiting for geometry and switching fields did not resolve it; speculative test changes
were removed. After rebooting the simulator, the unchanged workout test passed,
including visible-keyboard first-tap save, draft restart, notes, completion and saved
history. No keyboard assertion was relaxed and no native test source change remains.
Log: /tmp/easy-clientapp-plan-entry-ios-reboot.log; result:
/tmp/easy-clientapp-ios-build/Logs/Test/Test-ClientUITests-2026.09.20_21-03-58-+0530.xcresult.
Meal pass: /tmp/easy-clientapp-plan-entry-ios-final.log (the combined run's workout
failed before the reboot). Android: /tmp/easy-clientapp-plan-entry-android.log.

Localhost:1315 returns 200 with its served API module configured for localhost:4000.
The protected /v1/client/me endpoint on 4000 returns the expected unauthenticated 403.
Physical-device and real-client usability verification remain separate.
