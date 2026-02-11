# Coding Standards

## Must

- Every database query must include `business_id` for tenant isolation.
- All public functions return `{:ok, result}` or `{:error, reason}` — never raise for expected failures.
- Controllers only call schema/service functions — no business logic or `Repo` in controllers.
- Preload associations before returning data — no N+1 queries.
- Never call `String.to_atom/1` on user input.
- No `@moduledoc` or `@doc` — remove any you find.
- Use `Req` for HTTP — not HTTPoison, Tesla, or `:httpc`.
- Never include `user_id` or `business_id` in `cast/3` — set them programmatically.
- Add `@spec` for every public function.
- Update `docs/api_contract.yaml` when creating/updating/deleting endpoints or modifying schema types.

```elixir
# BAD
cast(attrs, [:name, :business_id, :user_id])

# GOOD
cast(attrs, [:name])
|> put_change(:business_id, business_id)
|> put_change(:user_id, user_id)
```

## Simplicity — The Elixir Way

- More code means more bugs and more to manage — keep it minimal.
- Things can always be simpler.
- Embrace pattern matching over conditionals.
- Use the pipe operator to build readable data transformations.
- Let the standard library and abstractions do the work.
- No defensive programming — trust the types and let it crash.
- Delete code whenever possible — the best code is no code.

```elixir
# BAD: defensive with nested conditionals
def process(data) do
  if data != nil do
    if is_map(data) do
      if Map.has_key?(data, :items) do
        items = Map.get(data, :items)
        if is_list(items) do
          Enum.map(items, fn item ->
            if item.valid do
              transform(item)
            else
              nil
            end
          end)
          |> Enum.reject(&is_nil/1)
        end
      end
    end
  end
end

# GOOD: pattern matching, pipe operator, minimal code
def process(%{items: items}) when is_list(items) do
  items
  |> Enum.filter(& &1.valid)
  |> Enum.map(&transform/1)
end
def process(_), do: []
```

## Fat Schema Pattern for CRUD operations

All CRUD changesets, and queries live in the Schema module. Use a service module only for complex cross-schema workflows and business logic only.

- Name changesets per operation — never a generic `changeset/2`.
- Query functions take optional queryable as first arg, return `Ecto.Query` — never call `Repo` inside.
- Only write **atomic, domain-specific** query functions — filters, scopes, ordering that encode business rules unique to this schema.
- Don't put `list`, `get`, or `paginate` in the schema — these are trivially composed by the caller from basic queries + `Repo` + `Easy.Utils.paginate/3`.
- Schema module ordering: fields → relationships → changesets → queries → actions.

```elixir
# BAD: generic changeset
def changeset(struct, attrs), do: cast(struct, attrs, [:title, :status])

# GOOD: operation-specific changesets
def insert_changeset(attrs), do: %__MODULE__{} |> cast(attrs, [:title]) |> validate_required([:title])
def update_changeset(struct, attrs), do: struct |> cast(attrs, [:title, :status])
```

```elixir
# BAD: calls Repo inside query, not composable
def get_published_audio do
  Repo.all(from a in Article, where: a.type == :audio and a.status == :published)
end

# GOOD: composable query, takes Ecto.Query as first arg, returns Ecto.Query
def published(query \\ __MODULE__), do: from(q in query, where: q.status == ^:published)
def audio(query \\ __MODULE__), do: from(q in query, where: q.type == ^:audio)
# Article |> Article.audio() |> Article.published() |> Repo.all()
```

```elixir
# BAD: list/get wrappers in schema — hides composition, hard to customise
def list(business_id, opts) do
  __MODULE__
  |> for_business(business_id)
  |> paginate(opts.offset, opts.limit)
  |> Repo.all()
end

# GOOD: caller composes queries directly
base = Article |> Article.for_business(business_id) |> Article.published()
total = Repo.aggregate(base, :count, :id)
items = base |> Article.newest() |> Easy.Utils.paginate(offset, limit) |> Repo.all()
```

```elixir
# BAD: action logic in controller
def publish(conn, %{"id" => id}) do
  item = Repo.get!(Article, id)
  item |> change(%{status: :published}) |> Repo.update!()
end

# GOOD: action logic in schema module
def publish!(item) do
  item |> change(%{status: :published, published_at: now_in_seconds()}) |> Repo.update!()
end
```

## Ecto

- Read changeset fields with `Ecto.Changeset.get_field/2` — not `changeset.changes.field`.

```elixir
# BAD
changeset.changes.email

# GOOD
Ecto.Changeset.get_field(changeset, :email)
```

## Testing

- Use `SchemaCase` for schema/model tests.
- Use ExMachina factories (`insert/build`) — never `Repo.insert!` with raw structs.
- Test changeset validity for both success and failure paths.

```elixir
# BAD: manual struct insertion
host = Repo.insert!(%Person{name: "Host", email: "host@test.com", handle: "host"})

# GOOD: factory-based setup
host = insert(:person)
episode = insert(:published_episode)
insert(:episode_host, person: host, episode: episode)
```
