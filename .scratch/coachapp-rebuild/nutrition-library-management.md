# Food and recipe management

When a coach customizes a shared food or adapts a recipe, they need an independent copy. When removing a library item, they need to see its direct uses and protect planned meals, ingredients and logged history.

A saved editor links to Manage food/recipe. A small confirmation works for copying, but deletion needs linked usage that may span many recipes and plans. Choose a dedicated management page: item name, copy action, a server-counted usage category selector, search and cursor list, then deletion with an explicit confirmation. Keep the saved editor's unsaved-change guard when entering management.

Usage is direct: food-to-recipe, food-to-plan, or recipe-to-plan. A food used inside a recipe is shown as a recipe link; that recipe's page shows its plans. Include archived plans because they still hold references. Trainers see only accessible client plans, while any structural use in the business can block deletion. Explain that other team members may need to remove an inaccessible use without exposing client names or IDs.

Copy uses the saved item and opens its independent editor. Food serving sizes/media and recipe ingredients must survive. An interrupted copy presents server-search results for review before another explicit attempt; a matching name is not a receipt. Delete checks current backend constraints and confirms absence after a lost response. Logged nutrition stays frozen. Failed usage reads retain loaded rows and disable deletion until refreshed. Pending writes guard navigation and late account changes.

Verify both libraries at 375px and 1280px: copy and independent edits, shared foods, usage counts and links, multiple cursor pages, search beyond page one, failure/retry, filtered-list return, in-use/unused deletion, concurrent references and interrupted writes. Food serving-size/media authoring and recipe dietary fields remain subsequent editable-field work.


Implemented on 2026-09-14. Saved food/recipe editors link to a management page, with shadcn category selection, URL search, shared infinite lists and explicit copy/delete confirmations. Returning from a linked recipe or plan preserves the usage query and originating library search. Copy-recovery results remain explicit choices; a matching name never confirms a write.

`tests/nutrition-library/management.browser.mjs` passes at 375px and 1280px: 44 food-to-recipe uses across three pages, server counts/search, next-page and refresh failures, links/return, independent copies and preserved portions/tags, concurrent references blocking deletion, lost copy/delete responses and session replacement during a write. Shared-food UI uses an intercepted projection; routed backend tests separately verify real system-food restrictions and copying. Screenshots were reviewed at both widths. Existing recipe authoring/reuse regression passes at both widths.

The new `/usage` endpoints return only visible client-plan references. The legacy `/impact` read was corrected to apply the same client visibility; deletion checks still include every structural use in the business. Focused controller suite: 86 tests, zero failures. Full `mix precommit`: 1,769 tests, zero failures. Coachapp build, scoped Biome and `just check-rm` pass. The existing Vite bundle-size warning remains. Normal API 4000 and coachapp 2022 respond successfully.
