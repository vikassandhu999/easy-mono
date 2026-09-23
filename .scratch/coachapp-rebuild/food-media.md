# Food photos and videos

A coach can attach a food photo or preparation video from the food editor. Nutrition and servings remain the primary fields; optional media follows them. Uploading prepares the asset, and Save food attaches it. Replace and remove remain draft edits, removal has Undo, and ordinary metadata saves leave the current media identity untouched. Shared foods show their media without upload or removal controls.

The food and exercise editors share `ui/library-media-field.tsx` for file validation, public uploads, retries and cancellation. Feature components own their labels and Undo behavior; exercise reference photos retain their separate controls. Accepted files remain JPG/PNG/WebP up to 15 MB and MP4/WebM up to 50 MB. The existing public library-media API and generated contract are unchanged.

Recipe-ingredient and meal-food pickers show a compact View photo/video disclosure when media exists. Opening it loads a preview across the row width; closed rows do not mount media players. Native video controls, failed-read Retry and names remain accessible. Search and cursor counts remain server-owned.

Verified on 2026-09-14 against normal API 4000, coachapp 2022 and MinIO 9000. `test:food-media` passes at 375px and 1280px with real PNG/WebM uploads, anonymous byte checks and playback. Scenarios include invalid/oversized files, upload retry, failed-save recovery, new-food recovery after a lost response, metadata preservation, copies and removal/Undo, shared-food controls, both pickers, media-read failure, cancellation after storage accepts bytes and account replacement during upload. Viewport screenshots of editor and picker states were reviewed at both widths.

The existing food, recipe and exercise-media browser suites also pass at both widths. Coachapp build, scoped Biome and the former repository checks pass. Full `mix precommit`: 1,769 tests, zero failures. The existing Vite bundle-size warning remains; physical-device/browser media compatibility stays in the final application audit.
