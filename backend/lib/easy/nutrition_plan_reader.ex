defmodule Easy.Nutrition.PlanReader do
  alias Easy.ClientAccess
  alias Easy.Clients.Client
  alias Easy.Ctx
  alias Easy.CursorPage
  alias Easy.LocalCalendar
  alias Easy.Nutrition.{ItemResolver, Menu, Plan}
  alias Easy.Repo
  alias Easy.Utils

  import Ecto.Query

  @type read_error :: :not_found | :invalid_portion | :conflict

  @type usage :: %{id: String.t(), name: String.t(), client_id: String.t() | nil, kind: Plan.kind()}

  @spec list_templates(Ctx.t(), keyword()) ::
          {:ok, %{count: non_neg_integer(), templates: [Plan.t()]}} | {:error, read_error()}
  def list_templates(%Ctx{} = ctx, opts \\ []) do
    Repo.snapshot(fn ->
      {offset, limit} = Utils.pagination_bounds(opts, 1)
      search = opts |> Keyword.get(:search, "") |> to_string() |> String.trim()

      with :ok <- Ctx.ensure_coach(ctx) do
        query =
          ctx
          |> template_query()
          |> Plan.for_archived(Keyword.get(opts, :archived))
          |> Plan.for_search(search)

        templates =
          query
          |> Plan.newest()
          |> Utils.paginate(offset, limit)
          |> Plan.join_assigned_client_count(ctx.business_id)
          |> Repo.all()

        resolve_page(query, templates, ctx, :templates)
      end
    end)
  end

  @spec list_template_page(Ctx.t(), keyword()) ::
          {:ok, CursorPage.t(Plan.t())} | {:error, read_error() | :invalid_cursor}
  def list_template_page(%Ctx{} = ctx, opts \\ []) do
    Repo.snapshot(fn ->
      query =
        ctx
        |> template_query()
        |> Plan.for_archived(Keyword.get(opts, :archived))
        |> Plan.for_search(opts |> Keyword.get(:search, "") |> to_string() |> String.trim())

      limit = CursorPage.limit(opts)

      with :ok <- Ctx.ensure_coach(ctx),
           {:ok, page_query} <- CursorPage.query(query, Keyword.get(opts, :cursor), limit) do
        rows = page_query |> Plan.join_assigned_client_count(ctx.business_id) |> Repo.all()
        page = CursorPage.finish(rows, limit, Repo.aggregate(query, :count, :id))

        resolve_cursor_page(page, ctx)
      end
    end)
  end

  @spec list_plan_page_for_client(Ctx.t(), String.t(), keyword()) ::
          {:ok, CursorPage.t(Plan.t())} | {:error, read_error() | :invalid_cursor}
  def list_plan_page_for_client(%Ctx{} = ctx, client_id, opts \\ []) do
    Repo.snapshot(fn ->
      query =
        ctx
        |> client_plan_query(client_id)
        |> Plan.for_archived(Keyword.get(opts, :archived))
        |> Plan.for_search(opts |> Keyword.get(:search, "") |> to_string() |> String.trim())

      limit = CursorPage.limit(opts)

      with :ok <- Ctx.ensure_coach(ctx),
           :ok <- ClientAccess.authorize_client_id(ctx, client_id),
           {:ok, page_query} <- CursorPage.query(query, Keyword.get(opts, :cursor, "start"), limit) do
        rows = page_query |> Plan.include_client(ctx.business_id) |> Repo.all()
        page = CursorPage.finish(rows, limit, Repo.aggregate(query, :count, :id))
        resolve_cursor_page(page, ctx)
      end
    end)
  end

  @spec get_template(Ctx.t(), String.t()) :: {:ok, Plan.t()} | {:error, read_error()}
  def get_template(%Ctx{} = ctx, template_id) do
    Repo.snapshot(fn ->
      with :ok <- Ctx.ensure_coach(ctx) do
        ctx
        |> template_query()
        |> Plan.join_assigned_client_count(ctx.business_id)
        |> Repo.get(template_id)
        |> resolve_plan(ctx)
      end
    end)
  end

  @spec get_coverage_for_client(Ctx.t(), String.t()) ::
          {:ok, %{date: Date.t(), current: Plan.t() | nil, upcoming: [Plan.t()]}} | {:error, read_error()}
  def get_coverage_for_client(%Ctx{} = ctx, client_id) do
    Repo.snapshot(fn ->
      with :ok <- Ctx.ensure_coach(ctx),
           {:ok, client} <- ClientAccess.authorize_client(ctx, client_id) do
        client = Repo.preload(client, :business)
        today = local_today_for(client)

        plans =
          ctx
          |> client_plan_query(client_id)
          |> Plan.current_or_upcoming(today)
          |> Plan.include_client(ctx.business_id)
          |> Repo.all()

        coverage_summary(plans, ctx, today)
      end
    end)
  end

  @spec get_plan(Ctx.t(), String.t()) :: {:ok, Plan.t()} | {:error, read_error()}
  def get_plan(%Ctx{} = ctx, plan_id) do
    Repo.snapshot(fn ->
      with :ok <- Ctx.ensure_coach(ctx),
           plan <-
             Plan
             |> Plan.for_business(ctx.business_id)
             |> Plan.join_assigned_client_count(ctx.business_id)
             |> Plan.include_client(ctx.business_id)
             |> Repo.get(plan_id),
           :ok <- authorize_plan(ctx, plan) do
        resolve_plan(plan, ctx)
      end
    end)
  end

  @spec list_client_plans(Ctx.t(), keyword()) ::
          {:ok, %{count: non_neg_integer(), plans: [Plan.t()]}} | {:error, read_error()}
  def list_client_plans(%Ctx{} = ctx, opts \\ []) do
    Repo.snapshot(fn ->
      {offset, limit} = Utils.pagination_bounds(opts, 1)
      archived = Keyword.get(opts, :archived) || false

      with {:ok, client_id} <- Ctx.fetch_client_id(ctx) do
        query =
          ctx
          |> client_plan_query(client_id)
          |> Plan.for_archived(archived)

        plans =
          query
          |> Plan.newest()
          |> Utils.paginate(offset, limit)
          |> Plan.include_client(ctx.business_id)
          |> Repo.all()

        resolve_page(query, plans, ctx, :plans)
      end
    end)
  end

  @spec get_client_plan(Ctx.t(), String.t()) :: {:ok, Plan.t()} | {:error, read_error()}
  def get_client_plan(%Ctx{} = ctx, plan_id) do
    Repo.snapshot(fn ->
      with {:ok, client_id} <- Ctx.fetch_client_id(ctx) do
        ctx
        |> client_plan_query(client_id)
        |> Plan.include_client(ctx.business_id)
        |> Repo.get(plan_id)
        |> resolve_plan(ctx)
      end
    end)
  end

  # Coverage

  @type guidance() :: %{plan: Plan.t(), day_pattern: Menu.DayPattern.t(), date: Date.t(), weekday: Menu.weekday()}

  # `lock: true` holds the covering plan FOR SHARE until the caller's transaction
  # commits, so a menu save cannot land between reading the plan and writing
  # rows that reference its Library items.
  @spec resolve_client_coverage(Ctx.t(), Date.t(), lock: boolean()) ::
          {:ok, guidance() | nil} | {:error, read_error()}
  def resolve_client_coverage(%Ctx{} = ctx, %Date{} = date, opts \\ []) do
    Repo.snapshot(fn ->
      with {:ok, client_id} <- Ctx.fetch_client_id(ctx) do
        resolve_coverage(ctx, client_id, date, Keyword.get(opts, :lock, false))
      end
    end)
  end

  @spec resolve_coverage_for_client(Ctx.t(), String.t(), Date.t()) ::
          {:ok, guidance() | nil} | {:error, read_error()}
  def resolve_coverage_for_client(%Ctx{} = ctx, client_id, %Date{} = date) do
    Repo.snapshot(fn ->
      with :ok <- Ctx.ensure_coach(ctx),
           :ok <- ClientAccess.authorize_client_id(ctx, client_id) do
        resolve_coverage(ctx, client_id, date, false)
      end
    end)
  end

  @spec covering_plans_for_clients(Ctx.t(), %{String.t() => Date.t()}) ::
          {:ok, %{String.t() => Plan.t()}}
  def covering_plans_for_clients(%Ctx{}, client_dates) when map_size(client_dates) == 0, do: {:ok, %{}}

  def covering_plans_for_clients(%Ctx{} = ctx, client_dates) when is_map(client_dates) do
    dates = Map.values(client_dates)
    client_ids = Map.keys(client_dates)

    plans =
      Plan
      |> Plan.for_business(ctx.business_id)
      |> Plan.for_kind(:client_plan)
      |> Plan.active_in_window(Enum.min(dates, Date), Enum.max(dates, Date))
      |> where([plan], plan.client_id in ^client_ids)
      |> Plan.include_client(ctx.business_id)
      |> Plan.newest()
      |> Repo.all()
      |> Enum.filter(fn plan ->
        Plan.lifecycle(plan, Map.fetch!(client_dates, plan.client_id)) == :current
      end)
      |> Enum.map(&%{&1 | lifecycle: :current})

    {:ok, Enum.reduce(plans, %{}, fn plan, acc -> Map.put_new(acc, plan.client_id, plan) end)}
  end

  # Library usage

  @spec library_usage(Ctx.t(), :food | :recipe, String.t()) :: [usage()]
  def library_usage(%Ctx{} = ctx, kind, id) do
    visible_clients =
      Client
      |> Client.for_business(ctx.business_id)
      |> Client.visible_to(ctx)
      |> select([client], client.id)

    Plan.for_business(ctx.business_id)
    |> Plan.for_menu_item(kind, id)
    |> where([plan], plan.kind == :template or plan.client_id in subquery(visible_clients))
    |> order_by([p], asc: p.name, asc: p.id)
    |> select([p], %{id: p.id, name: p.name, client_id: p.client_id, kind: p.kind})
    |> Repo.all()
  end

  @spec library_item_used?(Ctx.t(), :food | :recipe, String.t(), map() | nil) :: boolean()
  def library_item_used?(%Ctx{} = ctx, kind, id, portion \\ nil) do
    Plan.for_business(ctx.business_id) |> Plan.for_menu_item(kind, id, portion) |> Repo.exists?()
  end

  # Coverage helpers

  defp resolve_coverage(ctx, client_id, date, lock?) do
    query =
      ctx
      |> client_plan_query(client_id)
      |> Plan.covering(date)
      |> Plan.include_client(ctx.business_id)

    query = if lock?, do: lock(query, "FOR SHARE"), else: query
    resolve_covering_plan(Repo.one(query), ctx, date, lock?)
  end

  defp resolve_covering_plan(nil, _ctx, _date, _lock?), do: {:ok, nil}

  defp resolve_covering_plan(plan, ctx, date, lock?) do
    with {:ok, [plan]} <- resolve_menus([plan], ctx, lock?) do
      weekday = Enum.at(Menu.weekdays(), Date.day_of_week(date) - 1)
      {:ok, %{plan: stamp_lifecycle(plan), day_pattern: Menu.day_pattern(plan.menu, date), date: date, weekday: weekday}}
    end
  end

  defp resolve_menus(plans, ctx, lock? \\ false) do
    references = Enum.flat_map(plans, &Menu.references(&1.menu))

    result =
      if lock? do
        ItemResolver.resolve_for_write(ctx, references)
      else
        ItemResolver.resolve(ctx, references)
      end

    with {:ok, resolved} <- result do
      {:ok, Enum.map(plans, &%{&1 | menu: Menu.resolve(&1.menu, resolved)})}
    end
  end

  defp resolve_cursor_page(page, ctx) do
    with {:ok, plans} <- resolve_menus(page.data, ctx) do
      {:ok, %{page | data: stamp_lifecycle(plans)}}
    end
  end

  defp resolve_page(query, plans, ctx, key) do
    with {:ok, plans} <- resolve_menus(plans, ctx) do
      {:ok, %{key => stamp_lifecycle(plans), :count => Repo.aggregate(query, :count, :id)}}
    end
  end

  defp coverage_summary(plans, ctx, today) do
    with {:ok, plans} <- resolve_menus(plans, ctx) do
      plans = Enum.map(plans, &%{&1 | lifecycle: Plan.lifecycle(&1, today)})

      {:ok,
       %{
         date: today,
         current: Enum.find(plans, &(&1.lifecycle == :current)),
         upcoming: Enum.filter(plans, &(&1.lifecycle == :upcoming))
       }}
    end
  end

  defp stamp_lifecycle(plans) when is_list(plans), do: Enum.map(plans, &stamp_lifecycle/1)

  defp stamp_lifecycle(%Plan{} = plan) do
    %{plan | lifecycle: Plan.lifecycle(plan, local_today_for(plan))}
  end

  defp local_today_for(%Client{} = client) do
    Client.local_date(client, DateTime.utc_now())
  end

  defp local_today_for(%Plan{client: client}), do: local_today_for(client)

  defp local_today_for(_plan) do
    LocalCalendar.to_local_date(DateTime.utc_now(), LocalCalendar.default_timezone())
  end

  defp client_plan_query(%Ctx{} = ctx, client_id) do
    Plan
    |> Plan.for_kind(:client_plan)
    |> Plan.for_client(ctx.business_id, client_id)
  end

  defp resolve_plan(nil, _ctx), do: {:error, :not_found}

  defp resolve_plan(%Plan{} = plan, ctx) do
    with {:ok, [plan]} <- resolve_menus([plan], ctx) do
      {:ok, stamp_lifecycle(plan)}
    end
  end

  defp template_query(%Ctx{} = ctx) do
    Plan
    |> Plan.for_business(ctx.business_id)
    |> Plan.templates()
  end

  defp authorize_plan(_ctx, nil), do: {:error, :not_found}

  defp authorize_plan(_ctx, %Plan{kind: :template}), do: :ok

  defp authorize_plan(ctx, %Plan{kind: :client_plan, client_id: client_id}),
    do: ClientAccess.authorize_client_id(ctx, client_id)
end
