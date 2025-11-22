# Coding Standards

## Core Architecture
- **Tenant Isolation**: Every database query MUST include `business_id` to ensure data isolation.
- **Context Pattern**: All public context functions MUST return `{:ok, result}` or `{:error, reason}` tuples.
- **Controllers**: Controllers must be thin wrappers around Context functions. Do not put business logic in controllers.
- **Performance**: Strictly avoid N+1 queries. Always preload associations that will be accessed in views.

## Elixir & Phoenix
- **HTTP Client**: Use `:req` (Req). Avoid `:httpoison`, `:tesla`, or `:httpc`.
- **Date/Time**: Use the standard library (`Time`, `Date`, `DateTime`, `Calendar`). Do not add dependencies for this.
- **Safety**: NEVER use `String.to_atom/1` on user input (DoS risk).
- **Structure**: Do not nest multiple modules in the same file.
- **Lists**: Use `Enum.at`, pattern matching, or `List` functions. Elixir lists do not support `[]` index access.

## Ecto
- **Schema**: Always use `:string` type for text columns.
- **Changesets**: Use `Ecto.Changeset.get_field/2` to access changeset data.
- **Security**: Restricted fields (e.g., `user_id`, `business_id`) must NOT be in `cast/3`. Set them programmatically.
- **Preloading**: Always preload associations in the Context layer if needed for the view.