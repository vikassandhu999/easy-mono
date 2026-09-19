defmodule Easy.Training.PlanReader do
  alias Easy.ClientAccess
  alias Easy.ClientAccount
  alias Easy.Clients.Client
  alias Easy.Ctx
  alias Easy.CursorPage
  alias Easy.Repo
  alias Easy.Training.{TrainingPlan, TrainingWorkout, WorkoutSchedule}
  alias Easy.Utils

  import Ecto.Query

  @spec list_templates(Ctx.t(), keyword()) ::
          {:ok, %{count: non_neg_integer(), templates: [TrainingPlan.t()]}} | {:error, :not_found}
  def list_templates(%Ctx{} = ctx, opts \\ []) do
    search = opts |> Keyword.get(:search, "") |> to_string() |> String.trim()
    archived = Keyword.get(opts, :archived)

    with :ok <- Ctx.ensure_coach(ctx) do
      query =
        ctx
        |> template_query()
        |> TrainingPlan.for_archived(archived)
        |> TrainingPlan.for_search(search)

      {count, templates} = plan_page(query, ctx.business_id, opts)
      {:ok, %{count: count, templates: templates}}
    end
  end

  @spec list_plans_for_client(Ctx.t(), String.t(), keyword()) ::
          {:ok, %{count: non_neg_integer(), plans: [TrainingPlan.t()]}} | {:error, :not_found}
  def list_plans_for_client(%Ctx{} = ctx, client_id, opts \\ []) do
    archived = Keyword.get(opts, :archived)

    with :ok <- Ctx.ensure_coach(ctx),
         :ok <- ClientAccess.authorize_client_id(ctx, client_id) do
      query =
        TrainingPlan
        |> TrainingPlan.for_kind(:client_plan)
        |> TrainingPlan.for_client(ctx.business_id, client_id)
        |> TrainingPlan.for_archived(archived)

      {count, plans} = plan_page(query, ctx.business_id, opts)
      {:ok, %{count: count, plans: plans}}
    end
  end

  @spec list_template_page(Ctx.t(), keyword()) ::
          {:ok, CursorPage.t(TrainingPlan.t())} | {:error, atom()}
  def list_template_page(%Ctx{} = ctx, opts \\ []) do
    with :ok <- Ctx.ensure_coach(ctx) do
      ctx
      |> template_query()
      |> TrainingPlan.for_archived(Keyword.get(opts, :archived))
      |> TrainingPlan.for_search(opts |> Keyword.get(:search, "") |> to_string() |> String.trim())
      |> cursor_or_offset_page(ctx.business_id, opts)
    end
  end

  @spec list_plan_page_for_client(Ctx.t(), String.t(), keyword()) ::
          {:ok, CursorPage.t(TrainingPlan.t())} | {:error, atom()}
  def list_plan_page_for_client(%Ctx{} = ctx, client_id, opts \\ []) do
    with :ok <- Ctx.ensure_coach(ctx),
         :ok <- ClientAccess.authorize_client_id(ctx, client_id) do
      TrainingPlan
      |> TrainingPlan.for_kind(:client_plan)
      |> TrainingPlan.for_client(ctx.business_id, client_id)
      |> TrainingPlan.for_archived(Keyword.get(opts, :archived))
      |> TrainingPlan.for_search(opts |> Keyword.get(:search, "") |> to_string() |> String.trim())
      |> cursor_or_offset_page(ctx.business_id, opts)
    end
  end

  @spec list_client_plans(Ctx.t(), keyword()) ::
          {:ok, %{count: non_neg_integer(), plans: [TrainingPlan.t()]}} | {:error, :not_found}
  def list_client_plans(%Ctx{} = ctx, opts \\ []) do
    with {:ok, client_id} <- Ctx.fetch_client_id(ctx) do
      query = client_plan_query(ctx, client_id)

      {count, plans} = plan_page(query, ctx.business_id, opts)
      {:ok, %{count: count, plans: plans}}
    end
  end

  @spec list_client_plan_page(Ctx.t(), keyword()) ::
          {:ok, CursorPage.t(TrainingPlan.t())} | {:error, atom()}
  def list_client_plan_page(%Ctx{} = ctx, opts \\ []) do
    with {:ok, client_id} <- Ctx.fetch_client_id(ctx) do
      ctx
      |> client_plan_query(client_id)
      |> TrainingPlan.for_search(opts |> Keyword.get(:search, "") |> String.trim())
      |> cursor_or_offset_page(ctx.business_id, opts)
    end
  end

  @spec get_client_plan(Ctx.t(), String.t()) :: {:ok, TrainingPlan.t()} | {:error, :not_found}
  def get_client_plan(%Ctx{} = ctx, plan_id) do
    with {:ok, client_id} <- Ctx.fetch_client_id(ctx) do
      ctx
      |> client_plan_query(client_id)
      |> TrainingPlan.include_workouts(ctx.business_id)
      |> TrainingPlan.include_client(ctx.business_id)
      |> Repo.get(plan_id)
      |> ok_or_not_found()
    end
  end

  @spec resolve_client_coverage(Ctx.t(), Date.t() | nil) ::
          {:ok,
           nil
           | %{
               plan: TrainingPlan.t(),
               workout: TrainingWorkout.t() | nil,
               date: Date.t(),
               weekday: WorkoutSchedule.weekday()
             }}
          | {:error, :not_found}
  def resolve_client_coverage(ctx, date \\ nil)

  def resolve_client_coverage(%Ctx{} = ctx, nil) do
    with {:ok, %{local_date: date}} <- ClientAccount.get_client_calendar(ctx) do
      resolve_client_coverage(ctx, date)
    end
  end

  def resolve_client_coverage(%Ctx{} = ctx, %Date{} = date) do
    with {:ok, client_id} <- Ctx.fetch_client_id(ctx) do
      plan =
        ctx
        |> covering_plan_query(client_id, date)
        |> TrainingPlan.include_client(ctx.business_id)
        |> Repo.one()

      resolve_coverage_plan(plan, date)
    end
  end

  @spec resolve_client_startable_prescription(Ctx.t(), String.t(), Date.t()) ::
          {:ok, %{plan: TrainingPlan.t(), workout: TrainingWorkout.t()}} | {:error, :not_found}
  def resolve_client_startable_prescription(%Ctx{} = ctx, workout_id, %Date{} = date) do
    with {:ok, client_id} <- Ctx.fetch_client_id(ctx),
         %TrainingPlan{} = plan <-
           ctx
           |> covering_plan_query(client_id, date)
           |> Repo.one(),
         %TrainingWorkout{} = workout <- Enum.find(plan.workouts, &(&1.id == workout_id)) do
      {:ok, %{plan: with_lifecycle(plan), workout: workout}}
    else
      _ -> {:error, :not_found}
    end
  end

  @spec get_template(Ctx.t(), String.t()) :: {:ok, TrainingPlan.t()} | {:error, :not_found}
  def get_template(%Ctx{} = ctx, template_id) do
    with :ok <- Ctx.ensure_coach(ctx) do
      ctx
      |> template_query()
      |> TrainingPlan.include_workouts(ctx.business_id)
      |> Repo.get(template_id)
      |> ok_or_not_found()
    end
  end

  @spec get_plan(Ctx.t(), String.t()) :: {:ok, TrainingPlan.t()} | {:error, :not_found}
  def get_plan(%Ctx{} = ctx, plan_id) do
    with :ok <- Ctx.ensure_coach(ctx),
         {:ok, plan} <-
           TrainingPlan
           |> TrainingPlan.for_business(ctx.business_id)
           |> TrainingPlan.include_workouts(ctx.business_id)
           |> TrainingPlan.include_client(ctx.business_id)
           |> Repo.get(plan_id)
           |> ok_or_not_found(),
         :ok <- authorize_plan(ctx, plan) do
      {:ok, plan}
    end
  end

  @spec current_plan_names_for_clients(Ctx.t(), %{String.t() => Date.t()}) ::
          {:ok, %{String.t() => String.t()}}
  def current_plan_names_for_clients(%Ctx{}, local_dates) when map_size(local_dates) == 0, do: {:ok, %{}}

  def current_plan_names_for_clients(%Ctx{} = ctx, local_dates) do
    client_ids = Map.keys(local_dates)
    dates = Map.values(local_dates)

    names =
      TrainingPlan
      |> TrainingPlan.for_business(ctx.business_id)
      |> TrainingPlan.active_in_window(Enum.min(dates, Date), Enum.max(dates, Date))
      |> where([plan], plan.client_id in ^client_ids)
      |> TrainingPlan.newest()
      |> Repo.all()
      |> Enum.filter(fn plan ->
        TrainingPlan.lifecycle(plan, Map.fetch!(local_dates, plan.client_id)) == :current
      end)
      |> Enum.reduce(%{}, fn plan, acc -> Map.put_new(acc, plan.client_id, plan.name) end)

    {:ok, names}
  end

  defp cursor_or_offset_page(query, business_id, opts) do
    case Keyword.get(opts, :cursor) do
      nil ->
        {count, plans} = plan_page(query, business_id, opts)
        {:ok, %{data: plans, count: count, next_cursor: nil}}

      cursor ->
        cursor_page(query, business_id, cursor, opts)
    end
  end

  defp cursor_page(base, business_id, cursor, opts) do
    limit = CursorPage.limit(opts)

    with :ok <- CursorPage.validate_options(opts),
         {:ok, query} <- CursorPage.query(base, cursor, limit) do
      plans =
        query
        |> TrainingPlan.include_workouts(business_id)
        |> TrainingPlan.include_client(business_id)
        |> Repo.all()
        |> Enum.map(&with_lifecycle/1)

      {:ok, CursorPage.finish(plans, limit, Repo.aggregate(base, :count, :id))}
    end
  end

  defp plan_page(query, business_id, opts) do
    {offset, limit} = Utils.pagination_bounds(opts, 1)

    plans =
      query
      |> TrainingPlan.newest()
      |> Utils.paginate(offset, limit)
      |> TrainingPlan.include_workouts(business_id)
      |> TrainingPlan.include_client(business_id)
      |> Repo.all()
      |> Enum.map(&with_lifecycle/1)

    {Repo.aggregate(query, :count, :id), plans}
  end

  defp client_plan_query(%Ctx{} = ctx, client_id) do
    TrainingPlan
    |> TrainingPlan.for_kind(:client_plan)
    |> TrainingPlan.for_client(ctx.business_id, client_id)
    |> TrainingPlan.for_archived(false)
  end

  defp covering_plan_query(ctx, client_id, date) do
    ctx
    |> client_plan_query(client_id)
    |> TrainingPlan.covering(client_id, date)
    |> TrainingPlan.include_workouts(ctx.business_id)
  end

  defp resolve_coverage_plan(nil, _date), do: {:ok, nil}

  defp resolve_coverage_plan(plan, date) do
    weekday = Enum.at(WorkoutSchedule.weekdays(), Date.day_of_week(date) - 1)
    scheduled = Enum.find(plan.workout_schedule, &(&1.weekday == weekday))

    workout =
      if scheduled do
        Enum.find(plan.workouts, &(&1.id == scheduled.training_workout_id))
      end

    {:ok, %{plan: with_lifecycle(plan), workout: workout, date: date, weekday: weekday}}
  end

  defp ok_or_not_found(nil), do: {:error, :not_found}
  defp ok_or_not_found(plan), do: {:ok, with_lifecycle(plan)}

  defp with_lifecycle(%{client: %Client{} = client} = plan) do
    %{plan | lifecycle: TrainingPlan.lifecycle(plan, Client.local_date(client, DateTime.utc_now()))}
  end

  defp with_lifecycle(plan), do: %{plan | lifecycle: TrainingPlan.lifecycle(plan, Date.utc_today())}

  defp template_query(%Ctx{} = ctx) do
    TrainingPlan
    |> TrainingPlan.for_business(ctx.business_id)
    |> TrainingPlan.templates()
  end

  defp authorize_plan(_ctx, %TrainingPlan{kind: :template}), do: :ok

  defp authorize_plan(ctx, %TrainingPlan{kind: :client_plan, client_id: client_id}),
    do: ClientAccess.authorize_client_id(ctx, client_id)
end
