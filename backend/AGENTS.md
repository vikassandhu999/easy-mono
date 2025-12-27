# Coding Standards

These rules exist to keep the API predictable, safe, and multi-tenant correct.

## Non-negotiables (MUST)
- **Tenant isolation**: Every database query includes `business_id`.
- **Context API contract**: All public context functions return `{:ok, result}` or `{:error, reason}`.
- **Thin controllers**: Controllers call Context functions only (no business logic, no direct `Repo` usage).
- **No N+1**: Preload associations in the Context layer before returning data.
- **No atom leaks**: Never call `String.to_atom/1` on user input.
- **No doc**: Don't add module document or function documentation, remove anywhere if you find any.

## Elixir & Phoenix
- **HTTP**: Use `:req` (Req). Avoid `:httpoison`, `:tesla`, and `:httpc`.
- **Date/Time**: Use stdlib (`Time`, `Date`, `DateTime`, `Calendar`). Do not add deps.
- **Files/modules**: One module per file. Do not nest modules.
- **Lists**: Elixir lists do not support index access (`list[0]`). Use `Enum.at/2`, pattern matching, or `List` functions.

## Ecto
- **Schema types**: Use `:string` for text columns.
- **Changeset reads**: Use `Ecto.Changeset.get_field/2`.
- **Restricted fields**: Do not include restricted fields (e.g., `user_id`, `business_id`) in `cast/3`; set them programmatically.
- **Preloading**: If a view/serializer will access associations, preload them in the Context.

## Function style (SHOULD)
- **Typespecs**: Add `@spec` for every public function.
- **Error handling**: Do not raise for expected failures. Prefer:
  - `{:ok, value}`
  - `{:error, :not_found}`
  - `{:error, changeset}`
- **Business logic shape**: Prefer small, single-purpose functions and use `with` to keep happy-paths flat.
- **Functions places**: Public and important functions should be first and  private functions and unimportant functions go below public functions in the same module.

## Formatting & naming (SHOULD)
- Run `mix format` (2-space indentation, no trailing whitespace).
- Keep lines <= 98 chars (as configured in `.formatter.exs`).
- Naming:
  - Modules: `MyApp.Accounts.User`
  - Functions/variables/atoms: `snake_case`
  - Predicates: `active?/1`, `valid?/1`
  - Context APIs: `create_*`, `update_*`, `get_*`, `list_*`