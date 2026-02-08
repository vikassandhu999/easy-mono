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

```elixir
# BAD
cast(attrs, [:name, :business_id, :user_id])

# GOOD
cast(attrs, [:name])
|> put_change(:business_id, business_id)
|> put_change(:user_id, user_id)
```

## Fat Schema Pattern

All business logic, changesets, and queries live in the Schema module. Use a service module only for complex cross-schema workflows.

- Name changesets per operation — never a generic `changeset/2`.
- Query functions take optional queryable as first arg, return `Ecto.Query` — never call `Repo` inside.
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

# GOOD: composable query, returns Ecto.Query
def published(query \\ __MODULE__), do: from(q in query, where: q.status == ^:published)
def audio(query \\ __MODULE__), do: from(q in query, where: q.type == ^:audio)
# Article |> Article.audio() |> Article.published() |> Repo.all()
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
