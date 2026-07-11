# Client attention endpoint design

## Scope

Add a read-only coach endpoint that returns every visible active client requiring attention. The clients-list popup and dashboard can consume the same endpoint. This work covers the backend contract only; popup UI, dashboard wiring, nudge actions, and generalized attention signals are separate work.

No database migration or alert table is required. Attention remains a computed read model based on client intake, plan assignment, and subscription data.

## Eligibility

A client is eligible when all of these conditions hold:

* the client is visible to the authenticated coach;
* the client status is `active`;
* at least one supported attention flag is true.

The supported flags retain their established definitions:

* `intake_incomplete`: an intake form assignment has status `assigned` or `in_progress`;
* `needs_plan`: the client has neither an active training plan nor an active nutrition plan;
* `expiring_soon`: the subscription end date is between the UTC date and seven days later, inclusive.

Pending and inactive clients are excluded even if their derived `needs_plan` or `intake_incomplete` value would otherwise be true. Both onboarding and coaching stages are eligible.

## HTTP interface

```text
GET /v1/coach/clients/attention?offset=0&limit=20
```

The route is declared before `GET /v1/coach/clients/:id` so `attention` cannot be captured as a client ID.

Query parameters follow the client-list pagination contract:

* `offset` defaults to `0` and is clamped to a minimum of `0`;
* `limit` defaults to `20` and is clamped between `0` and `100`.

The response uses the full `Client` schema so consumers receive identity, status, stage, and all three attention flags without learning another client representation.

```json
{
  "data": [
    {
      "id": "0a5b2aec-c086-4d36-b9df-76803e5311ba",
      "email": "maya@example.com",
      "first_name": "Maya",
      "last_name": "Chen",
      "phone": null,
      "notes": null,
      "goal_weight_value": null,
      "goal_weight_unit": null,
      "status": "active",
      "stage": "coaching",
      "inactive_reason": null,
      "subscription_started_on": "2026-06-01",
      "subscription_ends_on": "2026-07-16",
      "intake_incomplete": true,
      "needs_plan": false,
      "expiring_soon": true,
      "assigned_coach_id": "184b163f-ea3d-464f-ad2e-5257c33cf6b5",
      "invite_url": null,
      "invitation_sent_at": null,
      "invitation_expires_at": null,
      "inserted_at": "2026-06-01T09:00:00Z",
      "updated_at": "2026-07-11T09:00:00Z"
    }
  ],
  "count": 1
}
```

`count` is the total eligible client count before pagination. The response does not include the general roster's status summary.

The OpenAPI operation ID is `listAttentionClients`. A `ClientAttentionListResponse` schema defines `data` and `count`. The endpoint returns `200` for an empty result and uses the coach authentication pipeline's standard unauthorized response.

## Context interface

The public context interface is:

```elixir
Clients.list_attention_clients(ctx, offset: 0, limit: 20)
```

It returns:

```elixir
{:ok, %{clients: clients, count: count}}
```

The context owns eligibility, visibility, ordering, counting, pagination, preloads, and attention-flag annotation. Controllers and frontend callers must not reconstruct those rules.

The base query is scoped by `ctx.business_id`, piped through `Client.visible_to(ctx)`, and limited to active clients. Correlated existence predicates select clients with an open intake assignment, no active plan of either supported kind, or a subscription ending within the seven-day window. Filtering and counting happen in SQL before pagination. The returned page passes through the shared attention-flag annotation code so the response booleans use the same definitions as client list and detail responses.

## Ordering

Each client appears once. A client with several flags is positioned by the highest applicable priority:

1. Intake incomplete
2. Needs plan
3. Expiring soon

Clients within the same priority sort by `inserted_at DESC`, then `id DESC`. The ID tie-break keeps offset pagination deterministic when timestamps match.

## Ownership and files

The endpoint stays in the client module:

* `Easy.Clients.list_attention_clients/2` owns the read model;
* `EasyWeb.Coaches.ClientController.attention/2` adapts HTTP parameters to the context call;
* `EasyWeb.Coaches.ClientJSON.attention/1` renders `data` and `count`;
* `ClientAttentionListResponse` owns the OpenAPI response contract;
* the coach router owns the static route before the client-ID route.

No separate attention context is added. The proposed generic `/v1/coach/attention` signal model remains out of scope because meal, check-in, thread, and profile-conflict signals are not part of this endpoint.

## Verification

Context tests cover:

* each attention reason independently;
* exclusion of pending and inactive clients;
* inclusion of both onboarding and coaching clients;
* one result for a client with several flags;
* the approved priority and deterministic tie-breaks;
* total count before pagination;
* owner, assigned-trainer, and cross-tenant visibility.

Controller tests cover authentication, parameter defaults and limits, an empty result, response-schema validity, and the `/clients/attention` route taking precedence over `/clients/:id`.

Backend verification runs `mix precommit`. API generation runs through the repository's normal OpenAPI generation command so the frontend receives `useListAttentionClientsQuery` from the generated contract.
