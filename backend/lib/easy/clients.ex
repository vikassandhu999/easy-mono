defmodule Easy.Clients do
  import Ecto.Query

  alias Easy.Billing
  alias Easy.ClientAccess
  alias Easy.Clients.Client
  alias Easy.Coaches
  alias Easy.Ctx
  alias Easy.Nutrition.PlanReader
  alias Easy.Repo
  alias Easy.Training.PlanReader, as: TrainingPlanReader

  @spec reassign_clients_to_owner(Ctx.t(), String.t()) :: {:ok, non_neg_integer()} | {:error, :not_owner}
  def reassign_clients_to_owner(%Ctx{} = ctx, coach_id) do
    with :ok <- ensure_owner(ctx) do
      {count, _} =
        Client
        |> Client.for_business(ctx.business_id)
        |> Client.assigned_to(coach_id)
        |> Repo.update_all(set: [assigned_coach_id: ctx.coach_id])

      {:ok, count}
    end
  end

  @spec advance_stage_to_coaching(Ctx.t(), String.t()) :: {:ok, non_neg_integer()}
  def advance_stage_to_coaching(%Ctx{} = ctx, client_id) do
    {count, _} =
      Client
      |> Client.for_business(ctx.business_id)
      |> Client.for_stage(:onboarding)
      |> where([client], client.id == ^client_id)
      |> Repo.update_all(set: [stage: :coaching, updated_at: DateTime.utc_now(:second)])

    {:ok, count}
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
        {:ok, put_expiring_flag(client)}
    end
  end

  @spec reassign_client(Ctx.t(), String.t(), String.t()) ::
          {:ok, Client.t()} | {:error, :not_owner | :not_found | :coach_not_active | Ecto.Changeset.t()}
  def reassign_client(%Ctx{} = ctx, client_id, coach_id) do
    with :ok <- ensure_owner(ctx),
         {:ok, coach} <- get_active_coach(ctx, coach_id),
         {:ok, client} <- ClientAccess.authorize_client(ctx, client_id),
         {:ok, updated_client} <-
           client
           |> Client.reassign_changeset(coach.id)
           |> Repo.update() do
      preload_client(updated_client)
    end
  end

  @spec list_clients(Ctx.t(), keyword()) ::
          {:ok, %{clients: [Client.t()], count: non_neg_integer(), summary: Client.status_counts()}}
  def list_clients(%Ctx{} = ctx, opts \\ []) do
    search = Keyword.get(opts, :search, "")
    status = Keyword.get(opts, :status)
    stage = Keyword.get(opts, :stage)
    sort = Keyword.get(opts, :sort, :newest)
    include_plans? = Keyword.get(opts, :include_plans, false)

    visible = Client |> Client.for_business(ctx.business_id) |> Client.visible_to(ctx)

    base =
      visible
      |> Client.search(search)
      |> Client.for_status(status)
      |> Client.for_stage(stage)

    {:ok,
     %{
       count: Repo.aggregate(base, :count, :id),
       summary: visible |> Client.select_status_counts() |> Repo.one(),
       clients:
         base
         |> sort_clients(sort)
         |> Easy.Utils.paginate(opts)
         |> Client.include_preloads(ctx.business_id)
         |> Repo.all()
         |> Enum.map(&put_expiring_flag/1)
         |> put_plan_names_for_clients(ctx, include_plans?)
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
    visible = Client |> Client.for_business(ctx.business_id) |> Client.visible_to(ctx)
    base = visible |> Client.search(Keyword.get(opts, :search, "")) |> Client.for_status(Keyword.get(opts, :status)) |> Client.for_stage(Keyword.get(opts, :stage))
    limit = Easy.CursorPage.limit(opts)

    with {:ok, query} <- Easy.CursorPage.query(base, cursor, limit) do
      count = Repo.aggregate(base, :count, :id)

      rows =
        query
        |> Client.include_preloads(ctx.business_id)
        |> Repo.all()
        |> Enum.map(&put_expiring_flag/1)
        |> put_plan_names_for_clients(ctx, Keyword.get(opts, :include_plans, false))

      page = Easy.CursorPage.finish(rows, limit, count)
      {:ok, Map.put(page, :summary, visible |> Client.select_status_counts() |> Repo.one())}
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

  # Reactivation (inactive -> active) consumes a seat, so it reserves one atomically;
  # every other update is a plain write.
  defp write_client_update(ctx, client, attrs) do
    changeset = Client.update_changeset(client, Date.utc_today(), attrs)
    update = fn -> Repo.update(changeset) end
    if Client.reactivation?(changeset), do: Billing.reserve_seat(ctx, update), else: update.()
  end

  # Opt-in (`include_plans: true`): the clients list wants each row's in-force plan
  # names for its chips. Two extra queries per PAGE, not per row, and skipped
  # entirely for every caller that doesn't ask.
  defp put_plan_names_for_clients(clients, _ctx, false), do: clients
  defp put_plan_names_for_clients([], _ctx, true), do: []

  defp put_plan_names_for_clients(clients, %Ctx{} = ctx, true) do
    now = DateTime.utc_now()

    local_dates = Map.new(clients, &{&1.id, Client.local_date(&1, now)})

    {:ok, training} = TrainingPlanReader.current_plan_names_for_clients(ctx, local_dates)
    {:ok, nutrition_plans} = PlanReader.covering_plans_for_clients(ctx, local_dates)
    nutrition = Map.new(nutrition_plans, fn {client_id, plan} -> {client_id, plan.name} end)

    Enum.map(clients, fn client ->
      %{
        client
        | training_plan_name: Map.get(training, client.id),
          nutrition_plan_name: Map.get(nutrition, client.id)
      }
    end)
  end

  defp put_expiring_flag(%Client{} = client), do: Client.put_expiring_flag(client, Date.utc_today())

  defp preload_client(%Client{} = client) do
    client =
      client
      |> Repo.preload([:user, :business, :creator], force: true)
      |> put_expiring_flag()

    {:ok, client}
  end

  defp ensure_owner(%Ctx{owner?: true}), do: :ok
  defp ensure_owner(%Ctx{}), do: {:error, :not_owner}

  defp get_active_coach(%Ctx{} = ctx, coach_id) do
    case Coaches.get_active_coach(ctx, coach_id) do
      {:ok, coach} -> {:ok, coach}
      {:error, :not_found} -> {:error, :coach_not_active}
    end
  end
end
