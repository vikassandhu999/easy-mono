defmodule Easy.Trackers do
  alias Easy.ClientAccess
  alias Easy.Clients.Client
  alias Easy.Ctx
  alias Easy.CursorPage
  alias Easy.Repo
  alias Easy.Result
  alias Easy.Trackers.Entry
  alias Easy.Trackers.Template
  alias Easy.Trackers.Tracker
  alias Easy.Units
  alias Easy.Utils
  import Ecto.Query

  @spec list_trackers(Ctx.t(), keyword()) :: {:ok, map()} | {:error, term()}
  def list_trackers(%Ctx{} = ctx, opts \\ []) do
    with :ok <- actor(ctx) do
      query = Tracker.visible(ctx.business_id) |> filter(opts)
      page(query, opts, &present(ctx, &1))
    end
  end

  @spec get_tracker(Ctx.t(), String.t()) :: {:ok, Tracker.t()} | {:error, atom()}
  def get_tracker(%Ctx{} = ctx, id) do
    with :ok <- actor(ctx) do
      case Repo.get(Tracker.visible(ctx.business_id), id) do
        nil -> {:error, :not_found}
        row -> {:ok, row}
      end
    end
  end

  @spec describe_tracker(Ctx.t(), String.t()) :: {:ok, map()} | {:error, atom()}
  def describe_tracker(ctx, id) do
    with {:ok, row} <- get_tracker(ctx, id), do: {:ok, present(ctx, row)}
  end

  @spec create_tracker(Ctx.t(), map()) :: {:ok, map()} | {:error, term()}
  def create_tracker(%Ctx{} = ctx, attrs) do
    with :ok <- Ctx.ensure_coach(ctx), {:ok, row} <- ctx.business_id |> Tracker.insert_changeset(attrs) |> Repo.insert(), do: {:ok, present(ctx, row)}
  end

  @spec update_tracker(Ctx.t(), String.t(), map()) :: {:ok, map()} | {:error, term()}
  def update_tracker(ctx, id, attrs) do
    with {:ok, row} <- editable(ctx, id), {:ok, row} <- row |> Tracker.update_changeset(attrs) |> Repo.update(), do: {:ok, present(ctx, row)}
  end

  @spec archive_tracker(Ctx.t(), String.t()) :: {:ok, map()} | {:error, term()}
  def archive_tracker(ctx, id), do: set_archived(ctx, id, DateTime.utc_now(:second))
  @spec restore_tracker(Ctx.t(), String.t()) :: {:ok, map()} | {:error, term()}
  def restore_tracker(ctx, id), do: set_archived(ctx, id, nil)

  defp set_archived(ctx, id, value) do
    Repo.transact(fn ->
      with {:ok, row} <- editable(ctx, id),
           {:ok, row} <- row |> Ecto.Changeset.change(archived_at: value) |> Repo.update(),
           {:ok, _} <- prune_archived(ctx, id, value) do
        {:ok, present(ctx, row)}
      end
    end)
  end

  defp prune_archived(_ctx, _id, nil), do: {:ok, []}
  defp prune_archived(ctx, id, _), do: prune_templates(ctx, id)

  @spec delete_tracker(Ctx.t(), String.t()) :: {:ok, term()} | {:error, term()}
  def delete_tracker(ctx, id) do
    Repo.transact(fn -> with {:ok, row} <- editable(ctx, id), do: delete_unused(ctx, row) end)
  end

  defp delete_unused(ctx, row) do
    row = Repo.get(Tracker.visible(ctx.business_id) |> lock("FOR UPDATE"), row.id)

    if Repo.exists?(from(e in Entry, where: e.tracker_id == ^row.id)) do
      {:error, :in_use}
    else
      with {:ok, _} <- prune_templates(ctx, row.id) do
        row |> Ecto.Changeset.change() |> Ecto.Changeset.foreign_key_constraint(:id, name: :tracker_entries_tracker_id_fkey) |> Repo.delete()
      end
    end
  end

  defp prune_templates(ctx, id) do
    templates = Repo.all(from(t in Template, where: t.business_id == ^ctx.business_id and t.domain == :trackers, lock: "FOR UPDATE"))
    Result.traverse(templates, &prune_template(&1, id))
  end

  defp prune_template(template, id) do
    items = template.content["items"] || []
    remaining = Enum.reject(items, &(&1["tracker_id"] == id))

    if remaining == items do
      {:ok, template}
    else
      template |> Template.update_changeset(%{content: %{"items" => remaining}}) |> Repo.update()
    end
  end

  defp editable(ctx, id) do
    with :ok <- Ctx.ensure_coach(ctx), {:ok, row} <- get_tracker(ctx, id) do
      if row.business_id, do: {:ok, row}, else: {:error, :forbidden}
    end
  end

  @spec active_tracker(Ctx.t(), String.t()) :: {:ok, Tracker.t()} | {:error, atom()}
  def active_tracker(ctx, id) do
    with {:ok, row} <- get_tracker(ctx, id), true <- is_nil(row.archived_at) || {:error, :conflict}, do: {:ok, row}
  end

  @spec present(Ctx.t(), Tracker.t()) :: map()
  def present(ctx, row) do
    query = from(e in Entry, join: c in Client, on: c.id == e.client_id and c.business_id == e.business_id, where: e.tracker_id == ^row.id and e.business_id == ^ctx.business_id)

    query =
      cond do
        ctx.client_id -> where(query, [e], e.client_id == ^ctx.client_id)
        ctx.owner? -> query
        true -> where(query, [_e, c], c.coach_id == ^ctx.coach_id)
      end

    count = Repo.aggregate(query, :count)

    row
    |> Map.take([:id, :name, :kind, :base_unit, :scale_max, :archived_at])
    |> Map.merge(%{built_in: is_nil(row.business_id), entry_count: count, units: Units.tracker_options(row)})
  end

  @spec client(Ctx.t(), String.t()) :: {:ok, Client.t()} | {:error, atom()}
  def client(%Ctx{client_id: id, coach_id: nil} = ctx, id) when is_binary(id) do
    case Repo.one(from(c in Client, where: c.id == ^id and c.business_id == ^ctx.business_id)) do
      nil -> {:error, :not_found}
      row -> {:ok, Repo.preload(row, [:business, :terms])}
    end
  end

  def client(%Ctx{client_id: id, coach_id: nil}, _) when is_binary(id), do: {:error, :not_found}

  def client(ctx, id) do
    with :ok <- Ctx.ensure_coach(ctx), {:ok, client} <- ClientAccess.authorize_client(ctx, id) do
      {:ok, Repo.preload(client, [:business, :terms])}
    end
  end

  @spec page(Ecto.Queryable.t(), keyword(), (term() -> term())) :: {:ok, map()} | {:error, term()}
  def page(query, opts, present) do
    limit = CursorPage.limit(opts)

    with :ok <- if(Keyword.get(opts, :cursor), do: CursorPage.validate_options(opts), else: :ok),
         {:ok, paged} <- CursorPage.query(query, Keyword.get(opts, :cursor) || "start", limit) do
      {offset, _} = Utils.pagination_bounds(opts, 1)
      paged = if Keyword.get(opts, :cursor), do: paged, else: offset(paged, ^offset)
      rows = Repo.all(paged)
      result = CursorPage.finish(rows, limit, Repo.aggregate(query, :count))
      {:ok, Map.update!(result, :data, &Enum.map(&1, present))}
    end
  end

  defp filter(query, opts) do
    query =
      case Keyword.get(opts, :archived, false) do
        true -> where(query, [t], not is_nil(t.archived_at))
        false -> where(query, [t], is_nil(t.archived_at))
        _ -> query
      end

    query =
      case Keyword.get(opts, :search) do
        s when is_binary(s) and s != "" -> where(query, [t], ilike(t.name, ^Easy.Search.like_pattern(s)))
        _ -> query
      end

    case Keyword.get(opts, :kind) do
      nil -> query
      kind -> where(query, [t], t.kind == ^kind)
    end
  end

  defp actor(%Ctx{coach_id: id}) when is_binary(id), do: :ok
  defp actor(%Ctx{client_id: id}) when is_binary(id), do: :ok
  defp actor(_), do: {:error, :unauthorized}
end
