# Billing Sync-on-Demand + Pending Activation UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** After a Razorpay checkout completes, the coach immediately sees their paid seats (or an honest "activating…" state) even if the webhook is delayed or lost — via a reconcile-on-demand endpoint that fetches the subscription from Razorpay and applies the same transition the webhook would.

**Architecture:** New `GET /subscriptions/:id` function in the `Easy.Razorpay` Req boundary; `Easy.Billing.sync_billing/1` (owner-only) maps the fetched subscription status onto the existing webhook transition logic (extracted, not duplicated); `POST /v1/coach/billing/sync` endpoint; coachapp calls it in the checkout success handler and shows a pending banner until billing reflects payment.

**Tech Stack:** Elixir/Phoenix + Req (Req.Test stubs), OpenApiSpex; React/RTK Query generated client.

## Problem (spec)

The checkout modal's `handler` fires on payment success, but seats only change when the `subscription.charged` webhook arrives. With a delayed/lost webhook the Billing page keeps showing the pre-payment state indefinitely — no confirmation, no pending indicator. Two-layer fix: (1) reconcile-on-demand so the webhook is redundancy, not a single point of failure; (2) an honest "activating" UI between modal success and confirmed state.

## Global Constraints

- Bare-atom errors (`:not_owner`, `:no_subscription`, `:razorpay_error`); Ctx-first public context fns; FallbackController maps atoms (all three already have clauses — verify, don't duplicate).
- Sync must reuse the webhook's transition semantics — the state written for a given Razorpay subscription status must be identical whether it arrives via webhook or sync (one code path, extracted).
- Sync must NOT record a `:payment_succeeded` event (no payment entity available); seat-delta events only, via existing `record_seat_change/2`. The later-arriving webhook then records the payment event and is a no-op for seats (same quantity → `record_seat_change` no-op) — keeping the two paths idempotent together.
- Razorpay boundary: all failures normalize to `{:error, :razorpay_error}`; tests stub via `Req.Test` (`config :easy, Easy.Razorpay, req_options: [plug: {Req.Test, Easy.Razorpay}]` already set in test.exs).
- OpenAPI: new endpoint gets a co-located operation; response reuses the existing `BillingSummary` schema. Restart any running dev phx.server after schema edits.
- FE: regen via `just gen-api`; tag:false → wire invalidations; copy uses sentence case, never "Failed to load"; verbatim strings below.
- Verbatim UI copy: banner (pending) **"Payment received. Activating your seats…"**; banner (slow, after ~30s) **"This is taking longer than usual. Your payment is safe — seats activate automatically. Check again in a minute."**
- Backend baseline: 8 pre-existing full-suite failures (food/exercise ordering) are not yours.

---

### Task 1: Backend — `get_subscription/1`, `sync_billing/1`, `POST /v1/coach/billing/sync`

**Files:**
- Modify: `backend/lib/easy/razorpay.ex`
- Modify: `backend/lib/easy/billing.ex`
- Modify: `backend/lib/easy_web/controllers/coaches/billing_controller.ex` (+ its JSON if summary rendering lives there — inspect; `show` already renders a summary+events shape, reuse)
- Modify: `backend/lib/easy_web/router.ex` (coach scope, next to existing billing routes)
- Modify: `backend/lib/easy_web/open_api/schemas/billing.ex` only if a response schema is missing (expected: reuse `BillingSummary`)
- Test: `backend/test/easy/billing_test.exs` area (billing tests live under `test/easy/billing/` — follow existing layout) + coach billing controller test

**Interfaces:**
- Produces `Easy.Razorpay.get_subscription(subscription_id)` → `{:ok, body} | {:error, :razorpay_error}`:

```elixir
def get_subscription(subscription_id) do
  request(:get, "/subscriptions/#{subscription_id}", [])
end
```

- Produces `Easy.Billing.sync_billing(ctx)` → `{:ok, seat_summary_map} | {:error, :not_owner | :no_subscription | :razorpay_error}`:

```elixir
@spec sync_billing(Ctx.t()) ::
        {:ok, map()} | {:error, :not_owner | :no_subscription | :razorpay_error}
def sync_billing(%Ctx{business_id: business_id} = ctx) do
  with :ok <- ensure_owner(ctx) do
    billing = billing_for(business_id)

    case billing.razorpay_subscription_id do
      nil ->
        {:error, :no_subscription}

      subscription_id ->
        with {:ok, subscription} <- Razorpay.get_subscription(subscription_id) do
          apply_subscription_state(billing, subscription)
          {:ok, seat_summary(ctx)}
        end
    end
  end
end
```

- `apply_subscription_state(billing, subscription)` — new private fn mapping Razorpay subscription `"status"` onto the SAME transitions the webhook handlers perform. Extract shared logic rather than copying:
  - `"active"` or `"authenticated"` → the `subscription.charged` transition minus the payment event: set `paid_seats: quantity` (fallback to current when `"quantity"` isn't an integer), `status: :active` (preserving `:cancel_at_period_end`), `current_period_end: safe_unix(subscription["current_end"])`; `record_seat_change(billing, quantity)`; `activate_awaiting_clients(business_id)`. **Refactor:** extract this body from `apply_webhook_event(%{"event" => "subscription.charged", ...})` into a shared private helper (e.g. `apply_charged_transition(billing, subscription)`), the webhook clause calling it plus `record_event(:payment_succeeded, …)`, sync calling it bare. The webhook's behavior must be byte-identical after the refactor (existing webhook tests prove it).
  - `"halted"` or `"pending"` → same as the pending/halted webhook clause (past_due only from active/cancel_at_period_end, `:payment_failed` event) — reuse/extract likewise.
  - `"cancelled"` or `"completed"` → same as the cancelled webhook clause.
  - `"created"` (checkout opened, not paid) or any other/missing status → no state change, `:ok`.
  - Note the entity shape difference: webhooks wrap as `payload.subscription.entity`; the REST fetch returns the entity directly (`subscription["status"]` at top level). `apply_subscription_state` takes the bare entity map.
- Produces `POST /v1/coach/billing/sync` → `BillingController.sync/2`: one context call, renders the same shape as `show` (summary + recent events) on 200; 403 `:not_owner`; 422/409 per existing FallbackController mapping for `:no_subscription`; 502 for `:razorpay_error` (all three clauses already exist — verify with grep before assuming).
- OpenAPI operation `operation_id: "syncBilling"`, no request body, response = the same schema `show` uses.

**Steps:**

- [ ] **Step 1: Write failing tests.** Context tests (mirror existing billing test setup/factories and Req.Test stub patterns — read `backend/test/easy/billing/` first):
  1. owner + subscription id + Razorpay returns `%{"id" => sub, "status" => "active", "quantity" => 3, "current_end" => unix}` → billing becomes active/paid_seats 3/period end set; awaiting client activated; `seats_added` event with delta; NO `payment_succeeded` event.
  2. same but billing already `:cancel_at_period_end` → status preserved.
  3. Razorpay returns `"status" => "created"` → billing unchanged, `{:ok, summary}` (summary still free state).
  4. `"status" => "halted"` on an active billing → `:past_due` + `payment_failed` event.
  5. non-owner → `{:error, :not_owner}`; no subscription id → `{:error, :no_subscription}`; Req stub 500 → `{:error, :razorpay_error}`.
  6. idempotence pair: sync applies charged state, then the real `subscription.charged` webhook for the same quantity arrives → paid_seats unchanged, exactly one `seats_added` event total, `payment_succeeded` recorded by the webhook.
  Controller test: 200 happy path renders summary, 403 non-owner.
- [ ] **Step 2: Run to verify failure** (`mix test test/easy/billing`).
- [ ] **Step 3: Implement** (Razorpay fn, extraction refactor, sync_billing, controller action + operation + route).
- [ ] **Step 4: Run** `mix test test/easy/billing test/easy_web/controllers/coaches/billing_controller_test.exs test/easy_web/controllers/webhook_controller_test.exs` (webhook suite proves the refactor changed nothing) — all green. `mix format --check-formatted`, compile warnings-as-errors.
- [ ] **Step 5: Commit** `feat(billing): sync-on-demand — reconcile subscription state from Razorpay`

### Task 2: Coachapp — call sync on checkout success + pending banner

**Files:**
- Regen: `just gen-api` (repo root)
- Modify: `frontend/apps/coachapp-v2/src/api/billing.ts` (export `useSyncBillingMutation` wrapper + invalidation wiring consistent with the file's existing pattern)
- Modify: `frontend/apps/coachapp-v2/src/settings/billing.tsx` and/or `src/settings/add-seats-dialog.tsx` (wherever `openRazorpayCheckout`'s `onSuccess` lives — read both first)

**Behavior (binding):**
1. On checkout modal success: set a local `activating` state on the Billing page, fire `syncBilling()`.
2. If sync resolves and the returned summary shows the purchase landed (`paid_seats` increased vs. pre-checkout snapshot, or `status` in `active`) → clear `activating`; normal refreshed UI (the sync response/invalidation updates the billing query).
3. If sync errors OR the summary still shows the old state (Razorpay eventually consistent): keep the banner, retry `syncBilling()` every ~5s up to ~30s total.
4. Banner copy while pending (verbatim): **"Payment received. Activating your seats…"** with a small spinner. After the ~30s budget without confirmation, swap to (verbatim): **"This is taking longer than usual. Your payment is safe — seats activate automatically. Check again in a minute."** and stop polling (billing still refetches on normal page revisits).
5. The `update_quantity` checkout path (`action: :updated`, no modal) already reflects seats synchronously — do NOT show the banner there. Banner only applies to the `action: :checkout` (modal) path.
6. Modal dismissed without paying (`onDismiss`) → no banner, unchanged behavior.
7. No new deps; timers via `setTimeout`/`setInterval` in the component with proper cleanup on unmount.

**Steps:**
- [ ] **Step 1:** `just gen-api`; verify `useSyncBillingMutation` (or actual generated name from operation_id `syncBilling`) exists in `src/api/generated.ts`.
- [ ] **Step 2:** Implement wiring + banner per behavior spec.
- [ ] **Step 3:** `pnpm -C apps/coachapp-v2 build` (tsc clean) + `bash scripts/check-rm.sh` — both from `frontend/`.
- [ ] **Step 4:** Live smoke with real test keys (dev servers; keys already in `backend/config/dev.secret.exs`): buy seats → banner appears on modal success → seats reflect within a few seconds WITHOUT any webhook tunnel registered (this is the whole point). Then verify webhook arriving later (if tunnel configured) causes no double-count.
- [ ] **Step 5: Commit** `feat(coachapp): pending-activation banner + billing sync after checkout`

### Task 3: Final review

Whole-branch review (small branch): the extraction refactor in billing.ex is the risk center — webhook suite green is the key evidence. Then finishing-a-development-branch.
