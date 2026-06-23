> **⚠️ SUPERSEDED (2026-06-23).** This plan proposed custom Credo checks + a
> bespoke changed-files CI gate. The chosen direction is lighter and avoids
> inventing enforcement machinery: conventions live in `backend/AGENTS.md`
> (authority), are followed via the agentic workflow (`.agents/skills/elixir-conventions`
> while writing + `.agents/skills/review` and the superpowers SDD review loop at
> review), and the mechanical rules are caught by **stock** `mix credo` + `mix format`
> wired into the `precommit` alias — no custom checks, no CI. Kept for history only;
> do not execute.

# Backend Conventions Enforcement Gate Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the backend conventions in `docs/superpowers/specs/2026-06-23-elixir-conventions-design.md` / `backend/AGENTS.md` self-enforcing on every change — a mandatory CI gate plus Credo static analysis — without a big-bang migration, by ratcheting the strict checks to files changed in each PR.

**Architecture:** Two enforcement layers. (1) **Credo + custom checks** is the new strict layer for the convention rules currently unenforced; in CI it runs **only against changed `.ex(s)` files** (vs the PR's merge base), so new/edited code must comply while untouched legacy is exempt until migrated. (2) The **existing per-slice ExUnit boundary tests** (already green whole-tree, curated path lists) stay as the deep guarantees and run in the full `mix test`. A **GitHub Actions workflow** wires `mix format --check-formatted` + `mix compile --warnings-as-errors` + changed-files Credo + full `mix test` into a required gate. Local devs get the same via an extended `precommit` alias + a `just` target. Non-mechanical rules (function ordering by importance, `with`-happy-path, three-case naming *semantics*) remain with the SDD review loop + `AGENTS.md`.

**Tech Stack:** Elixir 1.19 / Phoenix 1.8 / Ecto / Credo `~> 1.7` / GitHub Actions / Postgres.

## Global Constraints

- **Ratchet = changed files only.** The strict Credo gate in CI MUST run against just the `.ex`/`.exs` files changed vs the merge base, never the whole tree. Legacy violations must NOT block a PR that doesn't touch them. (Local whole-tree `mix credo` is advisory and WILL surface legacy debt — that is expected and drains via the separate Part-B migration.)
- **Custom Credo checks must not ship in the release.** They live under `backend/priv/credo/checks/` and are loaded via `.credo.exs` `requires:` (Code.require_file at Credo runtime), NOT under `lib/` (which compiles into prod) and NOT relying on `elixirc_paths`.
- **Credo is `only: [:dev, :test], runtime: false`.**
- The existing ExUnit boundary tests are the authority for the 6 already-covered rules — do NOT duplicate them in Credo. Credo covers the 11 GAP rules listed in this plan.
- Every task ends green: `mix compile --warnings-as-errors` exits 0 and `mix test` is fully green before committing. Custom Credo checks are TDD'd with `Credo.Test.Case`.
- Pin toolchain: Elixir `1.19.1-otp-28` / Erlang `28` (matches local `elixir --version`). CI reads `.tool-versions`.
- Run all `mix` commands from `backend/`.

---

## Task 1: Add Credo, base config, toolchain pin, and local wiring

**Files:**
- Modify: `backend/mix.exs` (add dep; fix + extend `precommit` alias; add a `check` alias)
- Create: `backend/.credo.exs`
- Create: `backend/priv/credo/checks/.gitkeep` (custom checks land here in Tasks 2–4)
- Create: `backend/.tool-versions`
- Modify: `Justfile` (add a backend lint target)

**Interfaces:**
- Produces: a runnable `mix credo` / `mix credo --strict`; `.credo.exs` with a `requires: ["./priv/credo/checks/"]` line so later tasks' checks auto-load; `mix check` alias; `just be-lint`.
- Consumes: nothing.

- [ ] **Step 1: Add the Credo dependency**

In `backend/mix.exs` `deps/0`, add:

```elixir
{:credo, "~> 1.7", only: [:dev, :test], runtime: false}
```

- [ ] **Step 2: Fetch it**

Run: `mix deps.get`
Expected: credo 1.7.x resolved and fetched.

- [ ] **Step 3: Fix the precommit typo and wire credo + add a `check` alias**

In `backend/mix.exs` `aliases/0`, the current `precommit` has a typo (`--warning-as-errors`) and no credo. Replace with:

```elixir
precommit: [
  "compile --warnings-as-errors",
  "deps.unlock --unused",
  "format",
  "credo --strict",
  "test"
],
check: ["format --check-formatted", "compile --warnings-as-errors", "credo --strict"]
```

(`precommit` already runs in `MIX_ENV=test` via the existing `cli/0` `preferred_envs`.)

- [ ] **Step 4: Create `.credo.exs`**

Create `backend/.credo.exs`. Start from a minimal explicit config (do NOT `mix credo.gen.config`'s giant default — keep it curated). Enable the built-ins that map to our spec rules, set legacy-noisy ones low, and wire the custom-checks dir:

```elixir
%{
  configs: [
    %{
      name: "default",
      files: %{
        included: ["lib/", "test/"],
        excluded: [~r"/_build/", ~r"/deps/", ~r"/priv/"]
      },
      # Custom checks (Tasks 2-4) live here and are loaded at runtime.
      requires: ["./priv/credo/checks/"],
      strict: true,
      parse_timeout: 5000,
      color: true,
      checks: %{
        enabled: [
          # --- spec rules backed by Credo built-ins ---
          {Credo.Check.Readability.Specs, []},               # A4: @spec on public fns
          {Credo.Check.Warning.Dbg, []},
          {Credo.Check.Warning.IExPry, []},
          {Credo.Check.Warning.IoInspect, []},
          {Credo.Check.Design.TagFIXME, []}
        ],
        # Disabled for now: noisy on legacy; not spec rules. Re-enable as the
        # codebase converges. (Changed-files scoping limits blast radius, but
        # these add churn without enforcing a spec convention.)
        disabled: [
          {Credo.Check.Readability.ModuleDoc, []},           # we FORBID moduledoc in schemas via a custom check; allow elsewhere
          {Credo.Check.Design.AliasUsage, []},
          {Credo.Check.Refactor.Nesting, []},
          {Credo.Check.Readability.MaxLineLength, []}
        ]
      }
    }
  ]
}
```

- [ ] **Step 5: Create the custom-checks directory placeholder**

Run: `mkdir -p backend/priv/credo/checks && touch backend/priv/credo/checks/.gitkeep`
(Tasks 2–4 add `*.ex` check files here; `.credo.exs` `requires:` loads them.)

- [ ] **Step 6: Pin the toolchain**

Create `backend/.tool-versions`:

```
erlang 28.0
elixir 1.19.1-otp-28
```

(If the team's installed versions differ, set these to match `elixir --version` / `erl` on the dev machine — CI reads this file.)

- [ ] **Step 7: Add a Justfile target**

In `Justfile`, add (mirroring the existing `backend`/`test` recipe style — `cd backend && …`):

```make
# lint backend (format check + compile + credo)
be-lint:
    cd backend && mix check
```

- [ ] **Step 8: Verify credo runs**

Run: `cd backend && mix credo --strict`
Expected: it RUNS to completion (exit code may be non-zero due to legacy `@spec`/etc. debt — that is fine and expected; the CI gate scopes to changed files). It must not crash on config errors. Then `mix compile --warnings-as-errors` exits 0 and `mix test` stays green.

- [ ] **Step 9: Commit**

```bash
cd /Users/vikassandhu/Desktop/10x/easy-mono
git add backend/mix.exs backend/mix.lock backend/.credo.exs backend/.tool-versions backend/priv/credo/checks/.gitkeep Justfile
git commit -m "build(backend): add Credo + base config, toolchain pin, lint wiring"
```

---

## Task 2: Custom Credo checks — schema layer

Three checks enforcing §A4 schema rules, scoped to schema files (`lib/easy/<context>/<schema>.ex` containing `use Ecto.Schema`).

**Files:**
- Create: `backend/priv/credo/checks/schema_no_docs.ex`, `schema_changeset_names.ex`, `schema_prefer_ecto_enum.ex`
- Create: `backend/test/credo/schema_checks_test.exs`
- Modify: `backend/.credo.exs` (register the three checks in `enabled`)
- Modify: `backend/mix.exs` — add `"test/credo"` is NOT needed (tests live under `test/`, already compiled in `:test`); but the check `.ex` files under `priv/` are loaded by Credo's `requires:`, and in the test they must be available. Add `Code.require_file` in the test (shown below) so the check modules load without Credo's runtime.

**Interfaces:**
- Produces: `Easy.CredoChecks.SchemaNoDocs`, `Easy.CredoChecks.SchemaChangesetNames`, `Easy.CredoChecks.SchemaPreferEctoEnum`.
- Consumes: Credo `~> 1.7` (`Credo.Check`, `Credo.Test.Case`).

- [ ] **Step 1: Write the failing test**

Create `backend/test/credo/schema_checks_test.exs`:

```elixir
defmodule Easy.CredoChecks.SchemaChecksTest do
  use Credo.Test.Case

  # Load the checks (Credo loads these via .credo.exs requires: at runtime;
  # here we require them directly so the unit test is self-contained).
  for f <- ["schema_no_docs.ex", "schema_changeset_names.ex", "schema_prefer_ecto_enum.ex"] do
    Code.require_file(Path.join([__DIR__, "..", "..", "priv", "credo", "checks", f]))
  end

  alias Easy.CredoChecks.{SchemaNoDocs, SchemaChangesetNames, SchemaPreferEctoEnum}

  defp schema(body), do: """
  defmodule Easy.Training.Thing do
    use Ecto.Schema
    #{body}
  end
  """

  describe "SchemaNoDocs" do
    test "flags @moduledoc in a schema" do
      schema("@moduledoc \"nope\"")
      |> to_source_file("lib/easy/training/thing.ex")
      |> run_check(SchemaNoDocs)
      |> assert_issue()
    end

    test "flags @doc in a schema" do
      schema("@doc \"nope\"\n  def x, do: 1")
      |> to_source_file("lib/easy/training/thing.ex")
      |> run_check(SchemaNoDocs)
      |> assert_issue()
    end

    test "passes a clean schema" do
      schema("field :name, :string")
      |> to_source_file("lib/easy/training/thing.ex")
      |> run_check(SchemaNoDocs)
      |> refute_issues()
    end

    test "ignores non-schema files" do
      "defmodule Easy.Foo do\n  @moduledoc \"ok here\"\nend"
      |> to_source_file("lib/easy/foo.ex")
      |> run_check(SchemaNoDocs)
      |> refute_issues()
    end
  end

  describe "SchemaChangesetNames" do
    test "flags create_changeset" do
      schema("def create_changeset(a, b), do: {a, b}")
      |> to_source_file("lib/easy/training/thing.ex")
      |> run_check(SchemaChangesetNames)
      |> assert_issue()
    end

    test "flags a top-level changeset/2" do
      schema("def changeset(a, b), do: {a, b}")
      |> to_source_file("lib/easy/training/thing.ex")
      |> run_check(SchemaChangesetNames)
      |> assert_issue()
    end

    test "passes insert_changeset / update_changeset" do
      schema("def insert_changeset(a, b), do: {a, b}\n  def update_changeset(a, b), do: {a, b}")
      |> to_source_file("lib/easy/training/thing.ex")
      |> run_check(SchemaChangesetNames)
      |> refute_issues()
    end
  end

  describe "SchemaPreferEctoEnum" do
    test "flags :string field paired with validate_inclusion" do
      schema("field :status, :string\n  def c(cs), do: validate_inclusion(cs, :status, [\"a\", \"b\"])")
      |> to_source_file("lib/easy/training/thing.ex")
      |> run_check(SchemaPreferEctoEnum)
      |> assert_issue()
    end

    test "passes Ecto.Enum" do
      schema("field :status, Ecto.Enum, values: [:a, :b]")
      |> to_source_file("lib/easy/training/thing.ex")
      |> run_check(SchemaPreferEctoEnum)
      |> refute_issues()
    end
  end
end
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd backend && mix test test/credo/schema_checks_test.exs`
Expected: FAIL — the check modules don't exist yet (`Code.require_file` raises / `SchemaNoDocs` undefined).

- [ ] **Step 3: Implement `SchemaNoDocs`**

Create `backend/priv/credo/checks/schema_no_docs.ex`:

```elixir
defmodule Easy.CredoChecks.SchemaNoDocs do
  use Credo.Check,
    base_priority: :high,
    category: :readability,
    explanations: [
      check: "Ecto schema modules must not carry @moduledoc or @doc (AGENTS.md §A4)."
    ]

  @schema_path ~r{lib/easy/[^/]+/[^/]+\.ex$}

  @impl true
  def run(%Credo.SourceFile{} = source_file, params) do
    if schema_file?(source_file) do
      issue_meta = IssueMeta.for(source_file, params)
      Credo.Code.prewalk(source_file, &traverse(&1, &2, issue_meta))
    else
      []
    end
  end

  defp schema_file?(source_file) do
    filename = source_file.filename
    Regex.match?(@schema_path, filename) and
      String.contains?(Credo.SourceFile.source(source_file), "use Ecto.Schema")
  end

  defp traverse({:@, meta, [{attr, _, _}]} = ast, issues, issue_meta) when attr in [:moduledoc, :doc] do
    {ast, [issue_for(issue_meta, meta[:line], attr) | issues]}
  end

  defp traverse(ast, issues, _issue_meta), do: {ast, issues}

  defp issue_for(issue_meta, line, attr) do
    format_issue(issue_meta,
      message: "Schemas must not use @#{attr} (AGENTS.md §A4).",
      line_no: line
    )
  end
end
```

(`IssueMeta` / `format_issue` are available via `use Credo.Check`.)

- [ ] **Step 4: Implement `SchemaChangesetNames`**

Create `backend/priv/credo/checks/schema_changeset_names.ex`. Same `schema_file?/1` guard. Walk for `def` of `create_changeset` (any arity) or `changeset` (arity 2 — the top-level generic):

```elixir
defmodule Easy.CredoChecks.SchemaChangesetNames do
  use Credo.Check,
    base_priority: :high,
    category: :consistency,
    explanations: [check: "Schemas use insert_changeset/update_changeset only — no create_changeset, no generic changeset/2 (AGENTS.md §A4)."]

  @schema_path ~r{lib/easy/[^/]+/[^/]+\.ex$}

  @impl true
  def run(%Credo.SourceFile{} = source_file, params) do
    if schema_file?(source_file) do
      issue_meta = IssueMeta.for(source_file, params)
      Credo.Code.prewalk(source_file, &traverse(&1, &2, issue_meta))
    else
      []
    end
  end

  defp schema_file?(source_file) do
    Regex.match?(@schema_path, source_file.filename) and
      String.contains?(Credo.SourceFile.source(source_file), "use Ecto.Schema")
  end

  defp traverse({:def, meta, [{:create_changeset, _, _} | _]} = ast, issues, im),
    do: {ast, [issue(im, meta[:line], "create_changeset", "rename to insert_changeset") | issues]}

  defp traverse({:def, meta, [{:changeset, _, args} | _]} = ast, issues, im) when length(args) == 2,
    do: {ast, [issue(im, meta[:line], "changeset/2", "use insert_changeset/update_changeset") | issues]}

  defp traverse(ast, issues, _im), do: {ast, issues}

  defp issue(im, line, name, fix),
    do: format_issue(im, message: "Schema defines #{name}; #{fix} (AGENTS.md §A4).", line_no: line)
end
```

(Note: `args` for `def name(a, b)` is the param list; guard on `length(args) == 2`. A `def changeset(struct, attrs)` matches; `insert_changeset/2` does not because the name differs.)

- [ ] **Step 5: Implement `SchemaPreferEctoEnum`**

Create `backend/priv/credo/checks/schema_prefer_ecto_enum.ex`. Heuristic at source level: a schema that has BOTH a `field :x, :string` and a `validate_inclusion(_, :x, …)` for the same field should use `Ecto.Enum`. Keep it simple and low-false-positive — flag any `validate_inclusion(` whose field also appears as a `:string` field:

```elixir
defmodule Easy.CredoChecks.SchemaPreferEctoEnum do
  use Credo.Check,
    base_priority: :normal,
    category: :consistency,
    explanations: [check: "Closed sets use Ecto.Enum, not :string + validate_inclusion (AGENTS.md §A4)."]

  @schema_path ~r{lib/easy/[^/]+/[^/]+\.ex$}
  @string_field ~r/field\s+:(\w+),\s*:string/
  @incl ~r/validate_inclusion\(\s*[^,]+,\s*:(\w+)/

  @impl true
  def run(%Credo.SourceFile{} = source_file, params) do
    src = Credo.SourceFile.source(source_file)

    if Regex.match?(@schema_path, source_file.filename) and String.contains?(src, "use Ecto.Schema") do
      issue_meta = IssueMeta.for(source_file, params)
      string_fields = @string_field |> Regex.scan(src) |> Enum.map(&List.last/1) |> MapSet.new()

      @incl
      |> Regex.scan(src, return: :index)
      |> Enum.flat_map(fn [{start, _len} | _] ->
        field = @incl |> Regex.run(binary_part(src, start, min(80, byte_size(src) - start))) |> List.last()
        line = 1 + (src |> binary_part(0, start) |> String.graphemes() |> Enum.count(&(&1 == "\n")))
        if MapSet.member?(string_fields, field),
          do: [format_issue(issue_meta, message: "Field :#{field} is :string + validate_inclusion; use Ecto.Enum (AGENTS.md §A4).", line_no: line)],
          else: []
      end)
    else
      []
    end
  end
end
```

(If the index-scan proves fiddly, a simpler acceptable implementation: walk lines, collect `:string` field names and `validate_inclusion` field names, then emit one issue per intersecting field at the `validate_inclusion` line. Keep the behavior: clean `Ecto.Enum` schema → no issue; `:string`+`validate_inclusion` on the same field → one issue.)

- [ ] **Step 6: Register the three checks in `.credo.exs`**

Add to `checks.enabled` in `backend/.credo.exs`:

```elixir
{Easy.CredoChecks.SchemaNoDocs, []},
{Easy.CredoChecks.SchemaChangesetNames, []},
{Easy.CredoChecks.SchemaPreferEctoEnum, []},
```

- [ ] **Step 7: Run the tests to verify they pass**

Run: `cd backend && mix test test/credo/schema_checks_test.exs`
Expected: PASS (all cases). Then `mix credo --strict list lib/easy/training/training_session.ex` runs without crashing (it loads the custom checks via `requires:`).

- [ ] **Step 8: Commit**

```bash
git add backend/priv/credo/checks/schema_no_docs.ex backend/priv/credo/checks/schema_changeset_names.ex backend/priv/credo/checks/schema_prefer_ecto_enum.ex backend/test/credo/schema_checks_test.exs backend/.credo.exs
git commit -m "feat(credo): schema-layer convention checks (no docs, changeset names, Ecto.Enum)"
```

---

## Task 3: Custom Credo checks — naming (context fns + query builders)

Two checks: forbid retired actor-suffix names (§A2) and forbid `with_*` query builders (§A6).

**Files:**
- Create: `backend/priv/credo/checks/context_actor_suffix.ex`, `query_builder_prefix.ex`
- Create: `backend/test/credo/naming_checks_test.exs`
- Modify: `backend/.credo.exs` (register both)

**Interfaces:**
- Produces: `Easy.CredoChecks.ContextActorSuffix`, `Easy.CredoChecks.QueryBuilderPrefix`.
- Consumes: Credo test/check API; the `use Credo.Check` + `Credo.Code.prewalk` pattern from Task 2.

- [ ] **Step 1: Write the failing test**

Create `backend/test/credo/naming_checks_test.exs`:

```elixir
defmodule Easy.CredoChecks.NamingChecksTest do
  use Credo.Test.Case

  for f <- ["context_actor_suffix.ex", "query_builder_prefix.ex"] do
    Code.require_file(Path.join([__DIR__, "..", "..", "priv", "credo", "checks", f]))
  end

  alias Easy.CredoChecks.{ContextActorSuffix, QueryBuilderPrefix}

  describe "ContextActorSuffix" do
    test "flags _for_coach_user / _for_user / _as_coach / _as_client fn names" do
      for name <- ~w(create_plan_for_coach_user list_plans_for_user do_thing_as_coach get_as_client) do
        """
        defmodule Easy.Plans do
          def #{name}(ctx), do: ctx
        end
        """
        |> to_source_file("lib/easy/plans.ex")
        |> run_check(ContextActorSuffix)
        |> assert_issue()
      end
    end

    test "passes three-case names" do
      """
      defmodule Easy.Plans do
        def create_plan(ctx, attrs), do: {ctx, attrs}
        def list_plans_for_client(ctx, client_id), do: {ctx, client_id}
        def list_client_plans(ctx), do: ctx
      end
      """
      |> to_source_file("lib/easy/plans.ex")
      |> run_check(ContextActorSuffix)
      |> refute_issues()
    end
  end

  describe "QueryBuilderPrefix" do
    test "flags a with_* function in a schema file" do
      """
      defmodule Easy.Training.TrainingPlan do
        use Ecto.Schema
        def with_workouts(q, bid), do: {q, bid}
      end
      """
      |> to_source_file("lib/easy/training/training_plan.ex")
      |> run_check(QueryBuilderPrefix)
      |> assert_issue()
    end

    test "passes for_/include_ builders" do
      """
      defmodule Easy.Training.TrainingPlan do
        use Ecto.Schema
        def for_status(q, s), do: {q, s}
        def include_workouts(q, bid), do: {q, bid}
      end
      """
      |> to_source_file("lib/easy/training/training_plan.ex")
      |> run_check(QueryBuilderPrefix)
      |> refute_issues()
    end
  end
end
```

- [ ] **Step 2: Run to verify failure**

Run: `cd backend && mix test test/credo/naming_checks_test.exs`
Expected: FAIL (modules undefined).

- [ ] **Step 3: Implement `ContextActorSuffix`**

Create `backend/priv/credo/checks/context_actor_suffix.ex`. Applies to context files (`lib/easy/<ctx>.ex`, NOT the schema subdirs and NOT web). Flag any `def`/`defp` whose name matches the retired patterns:

```elixir
defmodule Easy.CredoChecks.ContextActorSuffix do
  use Credo.Check,
    base_priority: :high,
    category: :consistency,
    explanations: [check: "Retired actor markers _for_user/_for_coach_user/_as_coach/_as_client — use three-case naming (AGENTS.md §A2)."]

  @ctx_path ~r{lib/easy/[^/]+\.ex$}
  @retired ~r/_(for_user|for_coach_user|as_coach|as_client)$/

  @impl true
  def run(%Credo.SourceFile{} = source_file, params) do
    if Regex.match?(@ctx_path, source_file.filename) do
      issue_meta = IssueMeta.for(source_file, params)
      Credo.Code.prewalk(source_file, &traverse(&1, &2, issue_meta))
    else
      []
    end
  end

  defp traverse({op, meta, [{name, _, _} | _]} = ast, issues, im)
       when op in [:def, :defp] and is_atom(name) do
    if Regex.match?(@retired, Atom.to_string(name)),
      do: {ast, [format_issue(im, message: "#{name} uses a retired actor marker; use three-case naming (AGENTS.md §A2).", line_no: meta[:line]) | issues]},
      else: {ast, issues}
  end

  defp traverse(ast, issues, _im), do: {ast, issues}
end
```

(`@ctx_path` matches a single-level file like `lib/easy/training_plans.ex` but NOT `lib/easy/training/x.ex` — `[^/]+\.ex$` allows no further slash. Verify against a two-level path in a quick check; if it over-matches, anchor with a guard that the segment after `lib/easy/` contains no `/`.)

- [ ] **Step 4: Implement `QueryBuilderPrefix`**

Create `backend/priv/credo/checks/query_builder_prefix.ex`. Applies to schema files; flag any `def with_*` (the retired query-builder prefix). `with_` must become `for_` (filter) or `include_` (preload):

```elixir
defmodule Easy.CredoChecks.QueryBuilderPrefix do
  use Credo.Check,
    base_priority: :normal,
    category: :consistency,
    explanations: [check: "Query builders use for_* (filter) / include_* (preload). The with_* prefix is retired (AGENTS.md §A6)."]

  @schema_path ~r{lib/easy/[^/]+/[^/]+\.ex$}

  @impl true
  def run(%Credo.SourceFile{} = source_file, params) do
    if Regex.match?(@schema_path, source_file.filename) and
         String.contains?(Credo.SourceFile.source(source_file), "use Ecto.Schema") do
      issue_meta = IssueMeta.for(source_file, params)
      Credo.Code.prewalk(source_file, &traverse(&1, &2, issue_meta))
    else
      []
    end
  end

  defp traverse({op, meta, [{name, _, _} | _]} = ast, issues, im)
       when op in [:def, :defp] and is_atom(name) do
    if String.starts_with?(Atom.to_string(name), "with_"),
      do: {ast, [format_issue(im, message: "#{name}: with_* is retired; use for_* (filter) or include_* (preload) (AGENTS.md §A6).", line_no: meta[:line]) | issues]},
      else: {ast, issues}
  end

  defp traverse(ast, issues, _im), do: {ast, issues}
end
```

- [ ] **Step 5: Register in `.credo.exs`**

Add to `checks.enabled`:

```elixir
{Easy.CredoChecks.ContextActorSuffix, []},
{Easy.CredoChecks.QueryBuilderPrefix, []},
```

- [ ] **Step 6: Run tests**

Run: `cd backend && mix test test/credo/naming_checks_test.exs`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add backend/priv/credo/checks/context_actor_suffix.ex backend/priv/credo/checks/query_builder_prefix.ex backend/test/credo/naming_checks_test.exs backend/.credo.exs
git commit -m "feat(credo): naming checks (retired actor suffixes, with_* query builders)"
```

---

## Task 4: Custom Credo checks — context/controller hygiene

Three checks: forbid dual-key `Map.get` attr probing (§A10), forbid `conn.assigns.claims` raw-id destructuring in controllers (§A5), forbid bang `!` functions in `lib/easy*` (§A3).

**Files:**
- Create: `backend/priv/credo/checks/no_dual_key_attr.ex`, `controller_uses_ctx.ex`, `no_bang_functions.ex`
- Create: `backend/test/credo/hygiene_checks_test.exs`
- Modify: `backend/.credo.exs` (register all three)

**Interfaces:**
- Produces: `Easy.CredoChecks.NoDualKeyAttr`, `Easy.CredoChecks.ControllerUsesCtx`, `Easy.CredoChecks.NoBangFunctions`.

- [ ] **Step 1: Write the failing test**

Create `backend/test/credo/hygiene_checks_test.exs`:

```elixir
defmodule Easy.CredoChecks.HygieneChecksTest do
  use Credo.Test.Case

  for f <- ["no_dual_key_attr.ex", "controller_uses_ctx.ex", "no_bang_functions.ex"] do
    Code.require_file(Path.join([__DIR__, "..", "..", "priv", "credo", "checks", f]))
  end

  alias Easy.CredoChecks.{NoDualKeyAttr, ControllerUsesCtx, NoBangFunctions}

  describe "NoDualKeyAttr" do
    test "flags Map.get(attrs, \"x\") || Map.get(attrs, :x)" do
      ~S'''
      defmodule Easy.Foods do
        def f(attrs), do: Map.get(attrs, "name") || Map.get(attrs, :name)
      end
      '''
      |> to_source_file("lib/easy/foods.ex")
      |> run_check(NoDualKeyAttr)
      |> assert_issue()
    end

    test "flags attrs[\"x\"] || attrs[:x]" do
      ~S'''
      defmodule Easy.Foods do
        def f(attrs), do: attrs["name"] || attrs[:name]
      end
      '''
      |> to_source_file("lib/easy/foods.ex")
      |> run_check(NoDualKeyAttr)
      |> assert_issue()
    end

    test "passes single-key access" do
      ~S'''
      defmodule Easy.Foods do
        def f(attrs), do: attrs["name"]
      end
      '''
      |> to_source_file("lib/easy/foods.ex")
      |> run_check(NoDualKeyAttr)
      |> refute_issues()
    end
  end

  describe "ControllerUsesCtx" do
    test "flags conn.assigns.claims in a controller" do
      ~S'''
      defmodule EasyWeb.Coaches.PlanController do
        use EasyWeb, :controller
        def index(conn, _), do: conn.assigns.claims.business_id
      end
      '''
      |> to_source_file("lib/easy_web/controllers/coaches/plan_controller.ex")
      |> run_check(ControllerUsesCtx)
      |> assert_issue()
    end

    test "passes conn.assigns.ctx" do
      ~S'''
      defmodule EasyWeb.Coaches.PlanController do
        use EasyWeb, :controller
        def index(conn, _), do: conn.assigns.ctx
      end
      '''
      |> to_source_file("lib/easy_web/controllers/coaches/plan_controller.ex")
      |> run_check(ControllerUsesCtx)
      |> refute_issues()
    end
  end

  describe "NoBangFunctions" do
    test "flags a bang def in lib/easy" do
      ~S'''
      defmodule Easy.Foods do
        def get_food!(id), do: id
      end
      '''
      |> to_source_file("lib/easy/foods.ex")
      |> run_check(NoBangFunctions)
      |> assert_issue()
    end

    test "passes non-bang fns" do
      ~S'''
      defmodule Easy.Foods do
        def get_food(id), do: id
      end
      '''
      |> to_source_file("lib/easy/foods.ex")
      |> run_check(NoBangFunctions)
      |> refute_issues()
    end
  end
end
```

- [ ] **Step 2: Run to verify failure**

Run: `cd backend && mix test test/credo/hygiene_checks_test.exs`
Expected: FAIL (modules undefined).

- [ ] **Step 3: Implement `NoDualKeyAttr`**

Create `backend/priv/credo/checks/no_dual_key_attr.ex`. Applies to `lib/easy/` (context layer). Match an `||` whose both sides are the same-collection access with a string key on one side and atom key on the other (covers both `Map.get(m, "k") || Map.get(m, :k)` and `m["k"] || m[:k]`):

```elixir
defmodule Easy.CredoChecks.NoDualKeyAttr do
  use Credo.Check,
    base_priority: :high,
    category: :consistency,
    explanations: [check: "attrs are string-keyed (CastAndValidate). The Map.get(\"x\") || Map.get(:x) dual-key probe is retired (AGENTS.md §A10)."]

  @ctx_path ~r{lib/easy/}

  @impl true
  def run(%Credo.SourceFile{} = source_file, params) do
    if Regex.match?(@ctx_path, source_file.filename) do
      issue_meta = IssueMeta.for(source_file, params)
      Credo.Code.prewalk(source_file, &traverse(&1, &2, issue_meta))
    else
      []
    end
  end

  # Map.get(coll, "k") || Map.get(coll, :k)   (or reversed)
  defp traverse({:||, meta, [lhs, rhs]} = ast, issues, im) do
    if dual_key?(lhs, rhs),
      do: {ast, [format_issue(im, message: "Dual-key attr probe; attrs are string-keyed (AGENTS.md §A10).", line_no: meta[:line]) | issues]},
      else: {ast, issues}
  end

  defp traverse(ast, issues, _im), do: {ast, issues}

  defp dual_key?(lhs, rhs), do: keyset(lhs) != nil and keyset(lhs) == keyset(rhs) and key_types_differ?(lhs, rhs)

  # Returns the collection AST (without the key) for Map.get/2 or access syntax, else nil.
  defp access(coll, key) when is_binary(key) or is_atom(key), do: {coll, key}
  defp coll_key({{:., _, [Access, :get]}, _, [coll, key]}), do: {coll, key}     # coll[key]
  defp coll_key({{:., _, [{:__aliases__, _, [:Map]}, :get]}, _, [coll, key]}), do: {coll, key}  # Map.get(coll, key)
  defp coll_key(_), do: nil

  defp keyset(node), do: with({coll, _k} <- coll_key(node), do: coll, else: (_ -> nil))

  defp key_types_differ?(lhs, rhs) do
    with {_, k1} <- coll_key(lhs), {_, k2} <- coll_key(rhs) do
      (is_binary(k1) and is_atom(k2)) or (is_atom(k1) and is_binary(k2))
    else
      _ -> false
    end
  end
end
```

(If the AST matching proves brittle for the two access forms, an acceptable simpler implementation is a regex over source lines: flag a line containing both `Map.get(<x>, "` and `Map.get(<x>, :` for the same `<x>`, or `["..."] ||` adjacent to `[:...]`. Keep behavior: the three test cases above must pass.)

- [ ] **Step 4: Implement `ControllerUsesCtx`**

Create `backend/priv/credo/checks/controller_uses_ctx.ex`. Applies to `lib/easy_web/controllers/`. Flag any `conn.assigns.claims` access (source-level is reliable here):

```elixir
defmodule Easy.CredoChecks.ControllerUsesCtx do
  use Credo.Check,
    base_priority: :high,
    category: :consistency,
    explanations: [check: "Controllers read conn.assigns.ctx and pass it to the context — not conn.assigns.claims raw ids (AGENTS.md §A5)."]

  @controller_path ~r{lib/easy_web/controllers/}

  @impl true
  def run(%Credo.SourceFile{} = source_file, params) do
    if Regex.match?(@controller_path, source_file.filename) do
      issue_meta = IssueMeta.for(source_file, params)

      source_file
      |> Credo.SourceFile.lines()
      |> Enum.filter(fn {_line_no, text} -> String.contains?(text, "assigns.claims") end)
      |> Enum.map(fn {line_no, _text} ->
        format_issue(issue_meta, message: "Use conn.assigns.ctx, not conn.assigns.claims (AGENTS.md §A5).", line_no: line_no)
      end)
    else
      []
    end
  end
end
```

(`AuthController` legitimately works with claims/tokens — but it lives at `lib/easy_web/controllers/auth_controller.ex` and the §A8 exception is about render shape, not claims. In practice the gate is changed-files-scoped, so this only fires on edited controllers; if `auth_controller.ex` trips it spuriously when edited, add a filename allowlist constant here. Leave allowlist empty initially.)

- [ ] **Step 5: Implement `NoBangFunctions`**

Create `backend/priv/credo/checks/no_bang_functions.ex`. Applies to `lib/easy/` and `lib/easy_web/` (production source). Flag `def name!(...)`:

```elixir
defmodule Easy.CredoChecks.NoBangFunctions do
  use Credo.Check,
    base_priority: :normal,
    category: :consistency,
    explanations: [check: "No bang (!) functions outside tests/migrations/seeds — return {:ok, _}/{:error, _} (AGENTS.md §A3)."]

  @lib_path ~r{lib/easy(_web)?/}

  @impl true
  def run(%Credo.SourceFile{} = source_file, params) do
    if Regex.match?(@lib_path, source_file.filename) do
      issue_meta = IssueMeta.for(source_file, params)
      Credo.Code.prewalk(source_file, &traverse(&1, &2, issue_meta))
    else
      []
    end
  end

  defp traverse({op, meta, [{name, _, _} | _]} = ast, issues, im)
       when op in [:def, :defp] and is_atom(name) do
    if String.ends_with?(Atom.to_string(name), "!"),
      do: {ast, [format_issue(im, message: "Bang function #{name}; return tagged tuples instead (AGENTS.md §A3).", line_no: meta[:line]) | issues]},
      else: {ast, issues}
  end

  defp traverse(ast, issues, _im), do: {ast, issues}
end
```

- [ ] **Step 6: Register in `.credo.exs`**

Add to `checks.enabled`:

```elixir
{Easy.CredoChecks.NoDualKeyAttr, []},
{Easy.CredoChecks.ControllerUsesCtx, []},
{Easy.CredoChecks.NoBangFunctions, []},
```

- [ ] **Step 7: Run tests**

Run: `cd backend && mix test test/credo/hygiene_checks_test.exs`
Expected: PASS. Then `mix test test/credo/` (all three check suites) green.

- [ ] **Step 8: Commit**

```bash
git add backend/priv/credo/checks/no_dual_key_attr.ex backend/priv/credo/checks/controller_uses_ctx.ex backend/priv/credo/checks/no_bang_functions.ex backend/test/credo/hygiene_checks_test.exs backend/.credo.exs
git commit -m "feat(credo): context/controller hygiene checks (dual-key attrs, ctx-not-claims, no bang fns)"
```

---

## Task 5: CI workflow — the changed-files-scoped gate

**Files:**
- Create: `.github/workflows/backend-ci.yml`

**Interfaces:**
- Produces: a required PR gate running format-check + compile-warnings-as-errors + changed-files Credo + full `mix test` against Postgres.
- Consumes: `.tool-versions` (Task 1), `mix check`/`credo` (Tasks 1–4).

- [ ] **Step 1: Write the workflow**

Create `.github/workflows/backend-ci.yml`:

```yaml
name: backend-ci

on:
  pull_request:
    paths: ["backend/**", ".github/workflows/backend-ci.yml"]
  push:
    branches: [main]
    paths: ["backend/**"]

permissions:
  contents: read

jobs:
  backend:
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: backend
    env:
      MIX_ENV: test
    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_USER: admin
          POSTGRES_PASSWORD: L2KjxOH9al
          POSTGRES_DB: easy_test
        ports: ["5432:5432"]
        options: >-
          --health-cmd pg_isready --health-interval 10s
          --health-timeout 5s --health-retries 5
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0   # need merge-base for changed-files diff

      - uses: erlef/setup-beam@v1
        with:
          version-file: backend/.tool-versions
          version-type: strict

      - uses: actions/cache@v4
        with:
          path: |
            backend/deps
            backend/_build
          key: ${{ runner.os }}-mix-${{ hashFiles('backend/mix.lock') }}
          restore-keys: ${{ runner.os }}-mix-

      - run: mix deps.get

      - name: Format check
        run: mix format --check-formatted

      - name: Compile (warnings as errors)
        run: mix compile --warnings-as-errors

      - name: Credo (changed files only)
        run: |
          BASE="${{ github.event.pull_request.base.sha }}"
          if [ -z "$BASE" ]; then BASE="${{ github.event.before }}"; fi
          # Files changed under backend/, made relative to backend/ (Credo's cwd).
          CHANGED=$(git diff --name-only --diff-filter=ACMR "$BASE" HEAD -- 'backend/**/*.ex' 'backend/**/*.exs' \
            | sed 's#^backend/##')
          if [ -z "$CHANGED" ]; then
            echo "No backend .ex(s) files changed; skipping Credo."
          else
            echo "Running Credo --strict on changed files:"; echo "$CHANGED"
            mix credo --strict --files-included $(echo "$CHANGED" | tr '\n' ' ')
          fi

      - name: Test
        run: mix test
```

- [ ] **Step 2: Validate the YAML locally**

Run (from repo root): `python3 -c "import yaml,sys; yaml.safe_load(open('.github/workflows/backend-ci.yml')); print('yaml ok')"`
Expected: `yaml ok`.

- [ ] **Step 3: Sanity-check the changed-files Credo command shape locally**

Run from `backend/`:
```bash
CHANGED=$(git diff --name-only --diff-filter=ACMR HEAD~1 HEAD -- 'backend/**/*.ex' 'backend/**/*.exs' | sed 's#^backend/##')
[ -n "$CHANGED" ] && mix credo --strict --files-included $(echo "$CHANGED" | tr '\n' ' ') || echo "no changed files"
```
Expected: credo runs on just those files (or "no changed files"). Confirms `--files-included` accepts the relative paths. (If `--files-included` does not accept multiple bare paths in this Credo version, fall back to `mix credo --strict $(echo "$CHANGED" | tr '\n' ' ')` — Credo accepts trailing path args. Use whichever the installed Credo supports; document the choice in the workflow comment.)

- [ ] **Step 4: Commit**

```bash
cd /Users/vikassandhu/Desktop/10x/easy-mono
git add .github/workflows/backend-ci.yml
git commit -m "ci(backend): conventions gate — format, warnings-as-errors, changed-files credo, tests"
```

---

## Task 6: Sync AGENTS.md to the locked spec + document the gate

**Files:**
- Modify: `backend/AGENTS.md`

**Interfaces:**
- Consumes: the spec and the now-built tooling. No code.

- [ ] **Step 1: Update the stale context-layer examples**

In `backend/AGENTS.md`, update any context-layer code examples that still show raw-id signatures (`fn(business_id, user_id, …)`) to the locked `Ctx`-first / three-case forms from spec §A2–A3 (e.g. `create_plan(ctx, attrs)`, `list_plans_for_client(ctx, client_id)`, `list_client_plans(ctx)`). Confirm the doc's stated rules match spec §A1–A15 (the spec says `AGENTS.md` remains the authority and these examples are the known-stale part).

- [ ] **Step 2: Add an "Enforcement" section**

Add a short section to `backend/AGENTS.md` documenting how conventions are enforced, so a contributor (human or agent) knows the gate exists:

```markdown
## Enforcement

Conventions are enforced automatically, ratcheted to changed files:

- **Credo** (`mix credo --strict`) — static checks for the mechanical rules
  (schema docs, changeset names, `for_*`/`include_*` builders, three-case
  naming, no dual-key attrs, `ctx`-not-`claims`, no bang fns, `@spec`). Custom
  checks live in `priv/credo/checks/`. CI runs Credo only on the files a PR
  changes, so new/edited code must comply while legacy is exempt until migrated.
- **Boundary tests** (`test/easy*/**/*boundary*`, `business_id_response_test`,
  `context_layout_test`) — deeper per-slice guarantees over curated path lists.
- **CI gate** (`.github/workflows/backend-ci.yml`) — `mix format --check-formatted`,
  `mix compile --warnings-as-errors`, changed-files Credo, full `mix test`.
  Run the same locally with `mix check` / `mix precommit` / `just be-lint`.
- **Review** — the rules that are not mechanically checkable (function ordering
  by importance, `with`-happy-path, three-case naming *semantics*) are caught in
  code review.

Rules not yet satisfied by legacy code are tracked in
`docs/superpowers/specs/2026-06-23-elixir-conventions-design.md` Part B
(migration backlog) and fixed per-context, not big-bang.
```

- [ ] **Step 2: Verify the whole gate end-to-end**

Run from `backend/`:
```bash
mix check          # format-check + compile + credo (whole tree — legacy debt expected, advisory)
mix test           # full suite incl. all boundary + custom-check tests
```
Expected: `mix test` fully green (custom-check tests + existing suite). `mix check`'s credo step will list legacy debt (expected; CI scopes to changed files).

Also confirm the gate actually FIRES on a violation: create a throwaway file `lib/easy/training/_probe.ex` with `@moduledoc "x"` + `use Ecto.Schema` + `def with_x(q), do: q`, run `mix credo --strict lib/easy/training/_probe.ex`, confirm it reports the SchemaNoDocs + QueryBuilderPrefix issues, then delete the probe.

- [ ] **Step 3: Commit**

```bash
cd /Users/vikassandhu/Desktop/10x/easy-mono
git add backend/AGENTS.md
git commit -m "docs(backend): sync AGENTS.md to locked conventions + document enforcement gate"
```

---

## Self-Review

**Spec coverage (enforcement of the mechanical rules):**
- No `@moduledoc`/`@doc` in schemas → Task 2 `SchemaNoDocs`.
- No `create_changeset` / top-level `changeset/2` → Task 2 `SchemaChangesetNames`.
- `Ecto.Enum` over `:string`+`validate_inclusion` → Task 2 `SchemaPreferEctoEnum`.
- Retired `_for_user`/`_for_coach_user`/`_as_*` names → Task 3 `ContextActorSuffix`.
- `with_*` builders retired → Task 3 `QueryBuilderPrefix`.
- Dual-key `Map.get` attr probe → Task 4 `NoDualKeyAttr`.
- `ctx` not `claims` in controllers → Task 4 `ControllerUsesCtx`.
- No bang fns in lib → Task 4 `NoBangFunctions`.
- `@spec` on public fns → Task 1 (Credo built-in `Readability.Specs`).
- No `Repo` in schemas/controllers, no `business_id` in responses, context-dir-schemas-only, no schema-writes-from-controllers → ALREADY covered by existing ExUnit boundary tests (kept, not duplicated).
- The mandatory gate (CI) + changed-files ratchet → Task 5.
- Toolchain pin + local wiring → Task 1. AGENTS.md authority sync → Task 6.

**Rules deliberately NOT auto-enforced (left to review + AGENTS.md, per spec):** function ordering by importance (§A14), `with`-happy-path structure (§A12), three-case naming *semantics* / actor-target correctness (§A2), changeset trusted-id arg-order beyond name (§A7 — `business_id`-first is hard to check mechanically without false positives), `Ecto.Multi`-for-multi-step (§A11), pagination clamp values (§A9). These are noted so the gate's scope is honest, not silently partial.

**Migration backlog (Part B) is OUT OF SCOPE** of this plan — this plan builds the *gate*; the per-context migration that makes legacy code pass whole-tree is a separate plan. The changed-files ratchet is exactly what lets the gate ship before that migration.

**Type/name consistency:** all custom checks are namespaced `Easy.CredoChecks.*`, live in `backend/priv/credo/checks/*.ex`, loaded via `.credo.exs` `requires:`, and registered in `checks.enabled`. Each is tested with `Credo.Test.Case` via `Code.require_file` (since they're not in `elixirc_paths`). The `run/2 + Credo.Code.prewalk + format_issue/IssueMeta` shape is uniform across all eight.

**Open confirmations for the implementer (verify against installed Credo `1.7.x`, adjust call sites — not blockers):** (1) `Credo.SourceFile.lines/1` returns `{line_no, text}` tuples (used in `ControllerUsesCtx`); if the arity/shape differs, use `Credo.Code.to_lines/1`. (2) `mix credo --files-included <paths>` accepts multiple relative paths; if not, use trailing path args (`mix credo --strict <paths>`), per Task 5 Step 3. (3) `Credo.Test.Case` helper names (`to_source_file/2`, `run_check/2`, `assert_issue/1`, `refute_issues/1`) match the installed version.
```
