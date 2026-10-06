# Slice 4 client app

## Changes

Today has a pinned Focus card above the active workout. A Check-ins card opens `/check-ins`, which shows the current Focus and a paginated history of coach Review replies. It uses the chat messages returned by `/v1/client/review-replies`. The client does not request coach Review data.

A Review reference in chat opens `/check-ins?review=<id>`. The API filters this page to that Review's reply. The page has return links to Messages and all Review replies. If the reply was removed, it shows that the reply is no longer available. History stays readable when coaching ends.

Chat and reply history display `edited` when `edited_at` is present. Reply history uses keys under `conversationKeys.lists()`. The conversation socket handles `message_updated`, `message_deleted`, and `conversation_updated` and invalidates this key group, so loaded history and an open conversation read the saved reply changes.

The screens reuse `Page`, `ActionCard`, `InfiniteList`, and `CachedRead`. They retain one mobile layout and include loading, empty, offline, refresh failure, and pagination recovery states. There is no check-in form, send action, or submitted state.

## Choices

- Check-ins is a Today card. The existing four navigation tabs stay as they are.
- A missing Focus is hidden on Today. History shows `Your coach has not set a Focus.`
- A Review reference opens the client-visible reply, with its original Review timestamp. It does not open the coach Review endpoint.
- The reply list has 20 items per page and uses the existing cursor pagination behavior.
- Focus uses the existing profile refresh on page entry, window focus, and a 60-second interval. The API does not emit a separate Focus event.

## Verification

- `rtk pnpm -C frontend/apps/clientapp check`: passed all discovered suites.
- `rtk pnpm -C frontend lint:ci`: passed Biome on 461 files and design lint at this checkpoint.
- A later full lint run found one formatting error in the root task's in-progress `coachapp/tests/reviews/core-domains.browser.mjs`. The root task was notified and owns the final full lint run.
- `rtk pnpm -C frontend/apps/clientapp build`: passed TypeScript, all discovered behavior suites, and Vite against the generated Review contract. Vite reports the existing large-chunk warning.
- `rtk git diff --check -- frontend/apps/clientapp .scratch/core-domains/build/s4-client-report.md`: passed.
- The root task owns the live slice-4 browser flow, including Focus, reply navigation, and edit/delete while Messages stays open.
- Native devices and simulators were not tested for this slice.

The task did not change `clientapp-v2`, create a branch or worktree, or commit or push. Prior Tracker edits remain intact.
