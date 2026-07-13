# Coachapp functional recovery implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reapply the coachapp functionality that landed after `b5d90e95` without restoring the Claude workspace, Builder redesign, or clientapp changes.

**Architecture:** Reuse the completed profile-removal and rich-chat implementations from Git, but keep the restored coachapp modules and classes as the visual authority. The regenerated OpenAPI client stays unchanged. Small RTK Query invalidation fixes are replayed separately because they prevent stale lists and do not depend on the discarded designs.

**Tech Stack:** React 19, TypeScript, HeroUI 3.2.1, Tailwind CSS 4, Redux Toolkit, RTK Query, Vite, pnpm 10.

## Global constraints

- Work only on `recovery/coachapp-design` in `.worktrees/coachapp-design-recovery`.
- Do not modify `frontend/apps/clientapp-v2`, `backend`, or `frontend/packages`.
- Do not hand-edit `frontend/apps/coachapp-v2/src/api/generated.ts`.
- Preserve the coachapp structure and visual classes restored from `b5d90e95`.
- Do not restore `ClientWorkspaceShell`, the responsive workspace routing, Builder cards, localStorage recents/favourites, design tokens, or plan-builder layout changes.
- Do not implement web push. Its July 11 plan never landed on the archive branch and its backend dependency is absent.
- The failing coachapp build is the red contract check. The app has no component-test runner; green requires the production build plus focused static and browser checks.

---

### Task 1: Remove the retired client-profile surface

**Files:**

- Delete: `frontend/apps/coachapp-v2/src/api/client-profile.ts`
- Delete: `frontend/apps/coachapp-v2/src/clients/client-profile.tsx`
- Delete: `frontend/apps/coachapp-v2/src/clients/components/profile-field-input.tsx`
- Delete: `frontend/apps/coachapp-v2/src/settings/profile-fields.tsx`
- Modify: `frontend/apps/coachapp-v2/src/@config/routes.ts`
- Modify: `frontend/apps/coachapp-v2/src/api/base.ts`
- Modify: `frontend/apps/coachapp-v2/src/api/checkins.ts`
- Modify: `frontend/apps/coachapp-v2/src/checkins/checkin-builder.tsx`
- Modify: `frontend/apps/coachapp-v2/src/clients/components/client-detail-card.tsx`
- Modify: `frontend/apps/coachapp-v2/src/router.tsx`

**Interfaces:**

- Consumes: the generated contract after backend commit `b0cef296` removed profile endpoints and types.
- Produces: no coachapp imports or routes for client profiles, no `fieldKey`/`profile_mapping` draft behavior, and a Detail card that keeps the restored membership layout.

- [ ] **Step 1: Confirm the red profile errors**

Run from `frontend/`:

```bash
pnpm -C apps/coachapp-v2 build
```

Expected: failure references missing `ClientProfileField`, `CoachingClientProfile`, and profile endpoint hooks.

- [ ] **Step 2: Replay the completed profile-removal change**

Apply commit `27ad3b3e` to the recovery branch. Resolve any `client-detail-card.tsx` conflict by removing profile queries, rows, and the profile Edit link while retaining the restored card and membership markup. Apply `f76f8667` for the remaining dead cache tag and builder comment.

After the replay, `src/api/base.ts` must contain neither `ClientProfile` nor `ProfileField` in `tagTypes`.

- [ ] **Step 3: Check for retired contract residue**

Run:

```bash
rg -n "client-profile|ProfileField|profile-fields|CLIENT_PROFILE|SETTINGS_PROFILE_FIELDS|fieldKey|profile_mapping" frontend/apps/coachapp-v2/src -g '*.{ts,tsx}' -g '!api/generated.ts'
```

Expected: no output.

- [ ] **Step 4: Run the intermediate typecheck**

Run from `frontend/`:

```bash
pnpm -C apps/coachapp-v2 build
```

Expected: profile errors are gone. Remaining failures may only reference `ChatAttachment.read_url` and `chatMessageCreateRequest`.

### Task 2: Restore rich chat through the restored conversation UI

**Files:**

- Create: `frontend/apps/coachapp-v2/src/api/attachments.ts`
- Create: `frontend/apps/coachapp-v2/src/messages/attachment-composer.tsx`
- Create: `frontend/apps/coachapp-v2/src/messages/message-attachments.tsx`
- Create: `frontend/apps/coachapp-v2/src/messages/message-embed.tsx`
- Create: `frontend/apps/coachapp-v2/src/messages/use-attachment-download-urls.ts`
- Modify: `frontend/apps/coachapp-v2/src/messages/conversation-view.tsx`
- Modify: `frontend/apps/coachapp-v2/src/messages/client-conversation.tsx`
- Modify: `frontend/apps/coachapp-v2/src/messages/conversation-page.tsx`
- Modify: `frontend/apps/coachapp-v2/src/checkins/review-checkin.tsx`
- Modify: `frontend/apps/coachapp-v2/src/checkins/review-answers.tsx`

**Interfaces:**

- Consumes: generated coach upload/download hooks and rich `ChatMessage` types; shared `@easy/utils` upload and media helpers retained from `main`.
- Produces: text, attachment-only, mixed, and form-submission-embed messages through the restored chat screen. Attachment reads use batched signed URLs and refresh before expiry.

- [ ] **Step 1: Restore the completed standalone modules**

Restore these files from `5b61881a`:

```bash
git restore --source=5b61881a -- \
  frontend/apps/coachapp-v2/src/api/attachments.ts \
  frontend/apps/coachapp-v2/src/messages/attachment-composer.tsx \
  frontend/apps/coachapp-v2/src/messages/message-attachments.tsx \
  frontend/apps/coachapp-v2/src/messages/message-embed.tsx \
  frontend/apps/coachapp-v2/src/messages/use-attachment-download-urls.ts
```

- [ ] **Step 2: Add attachment and embed behavior to `ConversationView`**

Port the functional diff from commits `f8fc6d3e` and `d552fd4b` into the restored file. Keep the restored header, message bubble, scroll area, and footer classes. The public props become:

```typescript
{
  backTo: string;
  clientId: string;
  conversationId: string;
  initialEmbed?: ChatMessageEmbedRequest | null;
  onEmbedSent?: () => void;
  title: string;
}
```

The send request must use:

```typescript
await sendMessage({
  id: conversationId,
  coachChatMessageCreateRequest: {
    ...(trimmed && {body: trimmed}),
    attachment_ids: attachmentState.attachmentIds,
    ...(embed && {embed}),
  },
}).unwrap();
```

Clear body, uploads, and embed only after success. Render attachments and embeds inside the existing bubble.

- [ ] **Step 3: Thread client and embed state through entry screens**

`conversation-page.tsx` passes `data.data.client_id` as `clientId`.

`client-conversation.tsx` accepts only `embed_type=form_submission` with a non-empty `embed_id`, passes `{type: 'form_submission', id: embedId}`, and removes both parameters with `setSearchParams(..., {replace: true})` after a successful send. Keep the restored standalone page and Back behavior.

`review-checkin.tsx` replaces text prefill with:

```typescript
new URLSearchParams({embed_type: 'form_submission', embed_id: item.id})
```

- [ ] **Step 4: Move check-in photos onto signed batch reads**

In `review-answers.tsx`, call `useAttachmentDownloadUrls` with attachment IDs. Render the restored thumbnails using `urls[attachment.id]`; retain loading, unavailable, and Retry states from `5b61881a`. Do not read `attachment.read_url`.

- [ ] **Step 5: Run focused checks and commit**

Run from `frontend/`:

```bash
pnpm biome check apps/coachapp-v2/src/api/attachments.ts \
  apps/coachapp-v2/src/messages \
  apps/coachapp-v2/src/checkins/review-checkin.tsx \
  apps/coachapp-v2/src/checkins/review-answers.tsx
pnpm -C apps/coachapp-v2 build
```

Expected: both commands exit 0.

Commit:

```bash
git add frontend/apps/coachapp-v2/src/api/attachments.ts \
  frontend/apps/coachapp-v2/src/messages \
  frontend/apps/coachapp-v2/src/checkins/review-checkin.tsx \
  frontend/apps/coachapp-v2/src/checkins/review-answers.tsx
git commit -m "feat(coachapp): restore rich chat on the classic UI"
```

### Task 3: Restore mutation cache correctness

**Files:**

- Modify: `frontend/apps/coachapp-v2/src/api/training-plans-list.ts`
- Modify: `frontend/apps/coachapp-v2/src/api/nutrition-plans-list.ts`

**Interfaces:**

- Consumes: existing `TrainingPlan` and `NutritionPlan` RTK Query tags.
- Produces: list refresh after training-plan update/delete and nutrition-plan delete; assigned training plans refresh after an update.

- [ ] **Step 1: Add the missing invalidations**

`updateTrainingPlan` invalidates both `TrainingPlan/LIST` and `TrainingPlan/CLIENT-LIST`. `deleteTrainingPlan` invalidates `TrainingPlan/LIST`. `deleteNutritionPlan` invalidates `NutritionPlan/LIST`.

- [ ] **Step 2: Run build and commit**

Run from `frontend/`:

```bash
pnpm -C apps/coachapp-v2 build
```

Expected: exit code 0.

Commit:

```bash
git add frontend/apps/coachapp-v2/src/api/training-plans-list.ts \
  frontend/apps/coachapp-v2/src/api/nutrition-plans-list.ts
git commit -m "fix(coachapp): refresh plan lists after mutations"
```

### Task 4: Verify the recovered coachapp

**Files:**

- Verify: `frontend/apps/coachapp-v2/**`

**Interfaces:**

- Consumes: Tasks 1-3.
- Produces: a clean recovery branch with no protected-path changes.

- [ ] **Step 1: Run static gates**

Run:

```bash
pnpm -C frontend/apps/coachapp-v2 build
just check-rm
git diff --check
```

Expected: all commands exit 0. Known HeroUI CSS minifier and bundle-size warnings may remain.

- [ ] **Step 2: Verify protected paths**

Run:

```bash
git diff --exit-code archive/claude-coachapp-2026-07-13...HEAD -- \
  frontend/apps/clientapp-v2 backend frontend/packages
```

Expected: no output.

- [ ] **Step 3: Browser-check restored flows**

At 375px and 1280px, verify client Detail and check-in builder have no profile-field surfaces; check-in photos load through signed URLs; text, media, attachment-only, and check-in-embed chat messages send and render; training/nutrition delete and training update refresh their visible lists.
