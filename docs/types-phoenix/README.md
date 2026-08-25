# Typed Phoenix contracts

These documents describe a design. The running API still uses OpenApiSpex under `backend/lib/easy_web/open_api/`, `just gen-api`, and `src/api/schema.ts`. Nothing in this folder is implemented.

Read [About typed HTTP contracts](about.md) for the rule: you write Elixir types and point `typed` at them. Read [Contract](contract.md) for the closed set (slots, types, caster, `ok`, prefixes, dual-run). Read [Flaws](flaws.md) for the costs of that rule. Read [How to add a typed route](add-a-route.md) when you are adding an endpoint under this design.
