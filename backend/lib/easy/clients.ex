defmodule Easy.Clients do
  import Ecto.Query

  alias Easy.Clients.Client
  alias Easy.Ctx
  alias Easy.Orgs.Coach
  alias Easy.Repo

  @spec reassign_clients_to_owner(Ctx.t(), String.t()) :: {:ok, non_neg_integer()} | {:error, :not_owner}
  def reassign_clients_to_owner(%Ctx{} = ctx, coach_id) do
    with :ok <- ensure_owner(ctx) do
      {count, _} =
        Client
        |> Client.for_business(ctx.business_id)
        |> Client.assigned_to(coach_id)
        |> Repo.update_all(set: [coach_id: ctx.coach_id])

      {:ok, count}
    end
  end

  @spec get_client_with_preloads(Ctx.t(), String.t()) ::
          {:ok, Client.t()} | {:error, :not_found}
  def get_client_with_preloads(%Ctx{} = ctx, client_id) do
    Client
    |> Client.for_business(ctx.business_id)
    |> Client.visible_to(ctx)
    |> Client.include_preloads(ctx.business_id)
    |> Repo.get(client_id)
    |> case do
      nil ->
        {:error, :not_found}

      client ->
        {:ok, Client.derive(client, DateTime.utc_now())}
    end
  end

  @spec list_clients(Ctx.t(), keyword()) ::
          {:ok, %{clients: [Client.t()], count: non_neg_integer(), summary: Client.state_counts()}}
  def list_clients(%Ctx{} = ctx, opts \\ []) do
    search = Keyword.get(opts, :q, "")
    state = Keyword.get(opts, :state)
    sort = Keyword.get(opts, :sort, :newest)

    visible = Client |> Client.for_business(ctx.business_id) |> Client.visible_to(ctx) |> Client.for_assigned_coach(Keyword.get(opts, :coach_id))

    base =
      visible
      |> Client.search(search)
      |> Client.for_state(state)

    {:ok,
     %{
       count: Repo.aggregate(base, :count, :id),
       summary: state_counts(visible),
       clients:
         base
         |> sort_clients(sort)
         |> Easy.Utils.paginate(opts)
         |> Client.include_preloads(ctx.business_id)
         |> Repo.all()
         |> Enum.map(&Client.derive(&1, DateTime.utc_now()))
     }}
  end

  @spec list_client_page(Ctx.t(), keyword()) ::
          {:ok, Easy.CursorPage.t(Client.t()) | map()} | {:error, :cursor_incompatible | :invalid_cursor}
  def list_client_page(%Ctx{} = ctx, opts \\ []) do
    case Keyword.get(opts, :cursor) do
      nil ->
        with {:ok, result} <- list_clients(ctx, opts) do
          {:ok, %{data: result.clients, count: result.count, summary: result.summary, next_cursor: nil}}
        end

      cursor ->
        with :ok <- validate_cursor_options(opts) do
          list_cursor_page(ctx, cursor, opts)
        end
    end
  end

  defp validate_cursor_options(opts) do
    if Keyword.get(opts, :offset, 0) == 0 and Keyword.get(opts, :sort, :newest) == :newest do
      :ok
    else
      {:error, :cursor_incompatible}
    end
  end

  defp list_cursor_page(ctx, cursor, opts) do
    visible = Client |> Client.for_business(ctx.business_id) |> Client.visible_to(ctx) |> Client.for_assigned_coach(Keyword.get(opts, :coach_id))
    base = visible |> Client.search(Keyword.get(opts, :q, "")) |> Client.for_state(Keyword.get(opts, :state))
    limit = Easy.CursorPage.limit(opts)

    with {:ok, query} <- Easy.CursorPage.query(base, cursor, limit) do
      count = Repo.aggregate(base, :count, :id)

      rows =
        query
        |> Client.include_preloads(ctx.business_id)
        |> Repo.all()
        |> Enum.map(&Client.derive(&1, DateTime.utc_now()))

      page = Easy.CursorPage.finish(rows, limit, count)
      {:ok, Map.put(page, :summary, state_counts(visible))}
    end
  end

  defp sort_clients(query, :last_active), do: Client.by_last_active(query)
  defp sort_clients(query, _newest), do: Client.newest(query)

  @spec update_client(Ctx.t(), String.t(), map()) ::
          {:ok, Client.t()} | {:error, :not_found | :seat_limit_reached | Ecto.Changeset.t()}
  def update_client(%Ctx{} = ctx, client_id, attrs) do
    with {:ok, client} <- get_client_with_preloads(ctx, client_id),
         {:ok, updated_client} <- write_client_update(ctx, client, attrs) do
      preload_client(updated_client)
    end
  end

  defp write_client_update(ctx, client, attrs) do
    changeset = Client.update_changeset(client, attrs)
    coach_id = changeset.params["coach_id"]

    if coach_id && coach_id != client.coach_id do
      reassign_and_update(ctx, coach_id, changeset)
    else
      Repo.update(changeset)
    end
  end

  defp reassign_and_update(ctx, coach_id, changeset) do
    with :ok <- ensure_owner(ctx) do
      Repo.transact(fn -> update_with_locked_coach(ctx, coach_id, changeset) end)
    end
  end

  defp update_with_locked_coach(ctx, coach_id, changeset) do
    with {:ok, coach} <- get_active_coach_for_update(ctx, coach_id) do
      changeset |> Ecto.Changeset.put_change(:coach_id, coach.id) |> Repo.update()
    end
  end

  defp state_counts(query), do: query |> Client.select_state_counts() |> Repo.one()

  defp preload_client(%Client{} = client) do
    client =
      client
      |> Repo.preload([:business, :terms, coach: Coach.for_business(client.business_id)], force: true)
      |> Client.derive(DateTime.utc_now())

    {:ok, client}
  end

  defp ensure_owner(%Ctx{owner?: true}), do: :ok
  defp ensure_owner(%Ctx{}), do: {:error, :not_owner}

  defp get_active_coach_for_update(%Ctx{} = ctx, coach_id) do
    Coach
    |> Coach.for_business(ctx.business_id)
    |> Coach.active()
    |> lock("FOR UPDATE")
    |> Repo.get(coach_id)
    |> case do
      nil -> {:error, :coach_not_active}
      coach -> {:ok, coach}
    end
  end
end
