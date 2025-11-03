# Easy Backend Code Law

This document is our north star for organizing Elixir + Phoenix code in the Easy backend. Treat it like a law: when in doubt, follow these rules so new modules feel at home in the project.

## 1. Contexts Are the Source of Truth
- Every business capability lives inside a Phoenix context under `lib/easy/<context>.ex`.
- Contexts expose public, intention-revealing functions and orchestrate data access, validation, and side effects.
- Schemas, changesets, and helper modules for a context live under `lib/easy/<context>/` using namespaced modules (e.g. `Easy.Accounts.User`).
- Keep external callers out of schemas—always go through a context function.

## 2. Web Layer Only Talks to Contexts
- Controllers and LiveViews must depend on contexts (`Easy.Accounts`, `Easy.Tenant`, etc.), never on schemas or Repo directly.
- Error values must be `Easy.APIError` structs so fallback controllers render consistently.
- Any request validation happens in the controller, but business validation stays in the context.

## 3. Supporting Concerns Live Beside Their Context
- Reusable helpers such as OTP generation or phone parsing belong to the context that owns the behaviour (`Easy.Accounts.OTP`, `Easy.Accounts.Phone`).
- Cross-cutting infrastructure lives in dedicated contexts (e.g. `Easy.Notifications`) to keep responsibilities clear.
- Avoid “service” grab-bags—prefer descriptive modules grouped by context.

## 4. Database Discipline
- Schemas define real database tables and MUST scope associations with namespaced modules.
- Migrations stay in `priv/repo/migrations` and mirror the schema modules that use them.
- Queries live in the context; keep them close to the functions that call them.

## 5. Configuration and Secrets
- Runtime configuration keys follow the module they configure (e.g. `config :easy, Easy.Accounts.Token`).
- Never read `Application.get_env/3` in controllers; contexts and support modules own configuration access.

## 6. Error Handling
- Contexts return `{:ok, value}` or `{:error, Easy.APIError.t()}` so callers have a predictable shape.
- Convert `Ecto.Changeset` errors into `Easy.APIError` with field metadata before returning.

## 7. Testing Expectations
- Each context ships with focused tests under `test/easy/<context>_test.exs` (or nested directories) covering success and failure flows.
- Use factories or fixtures that live next to the tests to keep setup local.

## 8. Naming Conventions
- Use descriptive verbs for context functions (`create_user/1`, `issue_email_confirmation/1`).
- Schemas are singular nouns (`User`, `Session`).
- Background or integration modules read like capabilities (`Easy.Notifications.Email`).

## 9. Future Contributions Checklist
Before adding code, answer these questions:
1. Which context owns this behaviour? Create or extend it there.
2. Does the web layer only call contexts?
3. Are schemas, changesets, and queries colocated with their context?
4. Are configuration keys aligned with module names?
5. Do tests cover both happy and unhappy paths?

Following this law keeps the project “Phoenix-native,” predictable, and easy to extend.
