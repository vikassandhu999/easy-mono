# 01 — Fix the three live boundary defects

**What to build:** Three audit findings are behavioural bugs, not style. Fix them first, independently of the wider refactor, because each already misbehaves in production.

**Blocked by:** none

**Status:** resolved

- [x] The attachment size guard rejects oversize files for every mime the composer accepts. `clientapp-v2/src/messages/attachment-composer.tsx:242` indexes `MAX_BYTES[file.type as AttachmentUploadRequest['content_type']]`; a `MediaRecorder` mime outside the map (`audio/webm;codecs=opus`, `audio/ogg`) yields `undefined`, and `file.size > undefined` is `false`, so the 10 MB limit silently passes. Use the file's existing `isAcceptedType` guard (`:49`) rather than a cast.
- [x] The same defect is fixed in its verbatim duplicate at `coachapp-v2/src/messages/use-attachment-composer.ts:205`.
- [x] A rejected file surfaces the existing oversize message; an accepted-but-unmapped mime cannot reach the upload call.
- [x] `coachapp-v2/src/settings/billing.tsx:85` no longer renders a raw enum value to the user from its `default:` arm. Give the known event kinds real copy and make an unknown kind fail the build or render a neutral fallback, not `payment_refunded`.
- [x] `EVENT_ICON` at `billing.tsx:75` is keyed on the event-kind union rather than `Record<string, LucideIcon>`, matching its two neighbours at `:60` and `:67` which already key on `BillingSummary['status']`.
- [x] `getSeatLimitError` (`coachapp-v2/src/api/billing.ts:113-118`) validates before it reads. It currently casts `unknown` straight to `{status?; data?: {…}}` and then trusts `seat_summary` as a full `BillingSummary` with no checks. It returns a typed result only when the shape is actually present, and `null` otherwise.
- [x] Both apps build clean; the messages flow is exercised in a browser (client 375px, coach 375px and 1280px) with an oversize image and a recorded voice note.

## Answer

Size guard now goes through `attachmentSizeLimit` (accepted mime → byte cap, anything else → `undefined`). Voice-note stop uses that: unmapped mime or oversize shows "Voice recordings can be 10 MB at most." and never calls upload. Same in both apps.

Billing activity: `EVENT_ICON` is `Record<BillingEvent['kind'], LucideIcon>`. Unknown kind fails the build via `unknownActivityLabel(never)` and would render "Billing update" if a raw value slipped through.

`getSeatLimitError` lives in `api/seat-limit-error.ts` so the check runner can load it. It returns a summary only for 409 + `seat_limit_reached` + a full `BillingSummary`; partial/wrong bodies return `null`. Ticket 05 can still wrap this with `instanceof ApiError`.

Both apps `build` (tsc + check + vite) passed. Browser pass not done.
