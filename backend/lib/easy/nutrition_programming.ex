defmodule Easy.Nutrition.Programming do
  alias Easy.ClientAccess
  alias Easy.Clients.Client
  alias Easy.CopyName
  alias Easy.Ctx
  alias Easy.LocalCalendar

  alias Easy.Nutrition.{Library, Menu, Plan}

  alias Easy.Orgs.Business
  alias Easy.Repo
  alias Easy.Revision
  alias Easy.Utils

  import Ecto.Changeset
  import Ecto.Query

  # Plan CRUD and lifecycle

  @spec create_template(Ctx.t(), map()) ::
          {:ok, Plan.t()} | {:error, :not_found | Ecto.Changeset.t()}
  def create_template(%Ctx{} = ctx, attrs) do
    with :ok <- Ctx.ensure_coach(ctx) do
      result = Repo.transaction(fn -> insert_template(ctx, attrs) end)
      finalize(result, &get_template(ctx, &1))
    end
  end

  @spec list_templates(Ctx.t(), keyword()) ::
          {:ok, %{count: non_neg_integer(), templates: [Plan.t()]}} | {:error, :not_found}
  def list_templates(%Ctx{} = ctx, opts \\ []) do
    Repo.snapshot(fn ->
      {offset, limit} = page(opts)
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

        templates = templates |> resolve_menus(ctx) |> stamp_lifecycle()
        {:ok, %{count: Repo.aggregate(query, :count, :id), templates: templates}}
      end
    end)
  end

  @spec get_template(Ctx.t(), String.t()) :: {:ok, Plan.t()} | {:error, :not_found}
  def get_template(%Ctx{} = ctx, template_id) do
    Repo.snapshot(fn ->
      with :ok <- Ctx.ensure_coach(ctx) do
        ctx
        |> template_query()
        |> Plan.join_assigned_client_count(ctx.business_id)
        |> Repo.get(template_id)
        |> ok_or_not_found(ctx)
      end
    end)
  end

  @spec update_template(Ctx.t(), String.t(), pos_integer(), map()) ::
          {:ok, Plan.t()} | {:error, :not_found | Ecto.Changeset.t()}
  def update_template(%Ctx{} = ctx, template_id, expected_revision, attrs) do
    mutate_template(ctx, template_id, expected_revision, &update_active(&1, attrs))
  end

  @spec archive_template(Ctx.t(), String.t()) ::
          {:ok, Plan.t()} | {:error, :not_found | Ecto.Changeset.t()}
  def archive_template(%Ctx{} = ctx, template_id) do
    mutate_template(ctx, template_id, :any, &archive/1)
  end

  @spec restore_template(Ctx.t(), String.t()) ::
          {:ok, Plan.t()} | {:error, :not_found | Ecto.Changeset.t()}
  def restore_template(%Ctx{} = ctx, template_id) do
    mutate_template(ctx, template_id, :any, &restore/1)
  end

  @spec delete_template(Ctx.t(), String.t()) ::
          {:ok, Plan.t()} | {:error, :not_found | Ecto.Changeset.t()}
  def delete_template(%Ctx{} = ctx, template_id) do
    mutate_template(ctx, template_id, :any, &Repo.delete/1, reload?: false)
  end

  @spec get_coverage_for_client(Ctx.t(), String.t()) ::
          {:ok, %{date: Date.t(), current: Plan.t() | nil, upcoming: [Plan.t()]}} | {:error, :not_found}
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
          |> resolve_menus(ctx)
          |> Enum.map(&%{&1 | lifecycle: Plan.lifecycle(&1, today)})

        {:ok,
         %{
           date: today,
           current: Enum.find(plans, &(&1.lifecycle == :current)),
           upcoming: Enum.filter(plans, &(&1.lifecycle == :upcoming))
         }}
      end
    end)
  end

  @spec get_plan(Ctx.t(), String.t()) :: {:ok, Plan.t()} | {:error, :not_found}
  def get_plan(%Ctx{} = ctx, plan_id) do
    Repo.snapshot(fn ->
      with :ok <- Ctx.ensure_coach(ctx),
           {:ok, plan} <-
             Plan
             |> Plan.for_business(ctx.business_id)
             |> Plan.join_assigned_client_count(ctx.business_id)
             |> Plan.include_client(ctx.business_id)
             |> Repo.get(plan_id)
             |> ok_or_not_found(ctx),
           :ok <- authorize_plan(ctx, plan) do
        {:ok, plan}
      end
    end)
  end

  @spec update_plan(Ctx.t(), String.t(), pos_integer(), map()) ::
          {:ok, Plan.t()} | {:error, :not_found | Ecto.Changeset.t()}
  def update_plan(%Ctx{} = ctx, plan_id, expected_revision, attrs) do
    mutate_plan(ctx, plan_id, expected_revision, &update_active(&1, attrs))
  end

  @spec archive_plan(Ctx.t(), String.t()) ::
          {:ok, Plan.t()} | {:error, :not_found | Ecto.Changeset.t()}
  def archive_plan(%Ctx{} = ctx, plan_id) do
    mutate_plan(ctx, plan_id, :any, &archive/1)
  end

  @spec restore_plan(Ctx.t(), String.t()) ::
          {:ok, Plan.t()} | {:error, :not_found | Ecto.Changeset.t()}
  def restore_plan(%Ctx{} = ctx, plan_id) do
    mutate_plan(ctx, plan_id, :any, &restore/1)
  end

  @spec delete_plan(Ctx.t(), String.t()) ::
          {:ok, Plan.t()} | {:error, :not_found | Ecto.Changeset.t()}
  def delete_plan(%Ctx{} = ctx, plan_id) do
    mutate_plan(ctx, plan_id, :any, &Repo.delete/1, reload?: false)
  end

  @spec list_client_plans(Ctx.t(), keyword()) ::
          {:ok, %{count: non_neg_integer(), plans: [Plan.t()]}} | {:error, :not_found}
  def list_client_plans(%Ctx{} = ctx, opts \\ []) do
    Repo.snapshot(fn ->
      {offset, limit} = page(opts)
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

        {:ok, %{count: Repo.aggregate(query, :count, :id), plans: plans |> resolve_menus(ctx) |> stamp_lifecycle()}}
      end
    end)
  end

  @spec get_client_plan(Ctx.t(), String.t()) :: {:ok, Plan.t()} | {:error, :not_found}
  def get_client_plan(%Ctx{} = ctx, plan_id) do
    Repo.snapshot(fn ->
      with {:ok, client_id} <- Ctx.fetch_client_id(ctx) do
        ctx
        |> client_plan_query(client_id)
        |> Plan.include_client(ctx.business_id)
        |> Repo.get(plan_id)
        |> ok_or_not_found(ctx)
      end
    end)
  end

  # Menu replacement

  @spec replace_menu(Ctx.t(), String.t(), pos_integer(), map()) ::
          {:ok, Plan.t()} | {:error, :not_found | Ecto.Changeset.t()}
  def replace_menu(%Ctx{} = ctx, plan_id, expected_revision, attrs) do
    mutate_plan(ctx, plan_id, expected_revision, fn plan ->
      save_menu(ctx, plan, attrs)
    end)
  end

  # Assignment and duplication

  @spec duplicate_template(Ctx.t(), String.t()) ::
          {:ok, Plan.t()} | {:error, :not_found | Ecto.Changeset.t()}
  def duplicate_template(%Ctx{} = ctx, template_id) do
    with :ok <- Ctx.ensure_coach(ctx) do
      result =
        Repo.transaction(fn ->
          lock_business_for_copy_name(ctx.business_id)
          duplicate_locked_template(ctx, template_id)
        end)

      finalize(result, &get_template(ctx, &1))
    end
  end

  @spec assign_template_to_client(Ctx.t(), String.t(), String.t(), map()) ::
          {:ok, Plan.t()} | {:error, :not_found | Ecto.Changeset.t()}
  def assign_template_to_client(%Ctx{} = ctx, client_id, template_id, attrs) do
    with :ok <- Ctx.ensure_coach(ctx) do
      result =
        Repo.transaction(fn ->
          assign_visible_template(ctx, client_id, template_id, attrs)
        end)

      finalize(result, &get_plan(ctx, &1))
    end
  end

  # Coverage

  @type guidance() :: %{plan: Plan.t(), day_pattern: Menu.DayPattern.t(), date: Date.t(), weekday: atom()}

  # `lock: true` holds the covering plan FOR SHARE until the caller's transaction
  # commits, so a menu save cannot land between reading the plan and writing
  # rows that reference its Library items.
  @spec resolve_client_coverage(Ctx.t(), Date.t(), lock: boolean()) ::
          {:ok, guidance() | nil} | {:error, :not_found}
  def resolve_client_coverage(%Ctx{} = ctx, %Date{} = date, opts \\ []) do
    Repo.snapshot(fn ->
      with {:ok, client_id} <- Ctx.fetch_client_id(ctx) do
        resolve_coverage(ctx, client_id, date, Keyword.get(opts, :lock, false))
      end
    end)
  end

  @spec resolve_coverage_for_client(Ctx.t(), String.t(), Date.t()) ::
          {:ok, guidance() | nil} | {:error, :not_found}
  def resolve_coverage_for_client(%Ctx{} = ctx, client_id, %Date{} = date) do
    Repo.snapshot(fn ->
      with :ok <- Ctx.ensure_coach(ctx),
           {:ok, _client} <- ClientAccess.authorize_client(ctx, client_id) do
        resolve_coverage(ctx, client_id, date, false)
      end
    end)
  end

  @spec covering_plans_for_clients(Ctx.t(), %{String.t() => Date.t()}) ::
          {:ok, %{String.t() => Plan.t()}}
  def covering_plans_for_clients(%Ctx{} = ctx, client_dates) when is_map(client_dates) do
    dates = Map.values(client_dates)
    client_ids = Map.keys(client_dates)

    plans =
      Plan
      |> Plan.covering_intervals(ctx.business_id)
      |> where([plan], plan.client_id in ^client_ids)
      |> where([plan], plan.start_date <= ^Enum.max(dates, Date))
      |> where([plan], is_nil(plan.end_date) or plan.end_date >= ^Enum.min(dates, Date))
      |> Plan.include_client(ctx.business_id)
      |> Plan.newest()
      |> Repo.all()
      |> Enum.filter(fn plan ->
        Plan.lifecycle(plan, Map.fetch!(client_dates, plan.client_id)) == :current
      end)
      |> stamp_lifecycle()

    {:ok, Enum.reduce(plans, %{}, fn plan, acc -> Map.put_new(acc, plan.client_id, plan) end)}
  end

  @spec covering_plans_for_clients(Ctx.t(), [String.t()], Date.t()) ::
          {:ok, %{String.t() => Plan.t()}}
  def covering_plans_for_clients(%Ctx{} = ctx, client_ids, %Date{} = date)
      when is_list(client_ids) do
    covering_plans_for_clients(ctx, Map.new(client_ids, &{&1, date}))
  end

  # Library usage

  @spec library_usage(Ctx.t(), :food | :recipe, String.t()) :: [map()]
  def library_usage(%Ctx{} = ctx, kind, id) do
    Plan.for_business(ctx.business_id)
    |> Plan.for_menu_item(kind, id)
    |> order_by([p], asc: p.name, asc: p.id)
    |> select([p], %{id: p.id, name: p.name, client_id: p.client_id, kind: p.kind})
    |> Repo.all()
  end

  @spec library_item_used?(Ctx.t(), :food | :recipe, String.t(), map() | nil) :: boolean()
  def library_item_used?(%Ctx{} = ctx, kind, id, portion \\ nil) do
    Plan.for_business(ctx.business_id) |> Plan.for_menu_item(kind, id, portion) |> Repo.exists?()
  end

  # Plan lifecycle helpers

  defp insert_template(ctx, attrs) do
    case ctx.business_id |> Plan.insert_changeset(ctx.user_id, attrs) |> Repo.insert() do
      {:ok, plan} -> plan
      {:error, reason} -> Repo.rollback(reason)
    end
  end

  defp save_menu(_ctx, %Plan{archived_at: archived_at} = plan, _attrs) when not is_nil(archived_at),
    do: {:error, archived_changeset(plan)}

  defp save_menu(ctx, plan, attrs) do
    with {:ok, menu} <- Menu.cast(attrs),
         {:ok, _resolved} <- Library.resolve_items_for_write(ctx, Menu.references(menu)) do
      plan
      |> change(revision: plan.revision + 1)
      |> put_embed(:menu, menu)
      |> Repo.update()
    else
      {:error, :invalid_portion} -> {:error, add_error(change(plan), :menu, "contains an invalid Portion")}
      {:error, reason} -> {:error, reason}
    end
  end

  defp update_active(%Plan{archived_at: archived_at} = plan, _attrs)
       when not is_nil(archived_at) do
    {:error, archived_changeset(plan)}
  end

  defp update_active(plan, attrs) do
    plan
    |> Plan.update_changeset(attrs)
    |> put_change(:revision, plan.revision + 1)
    |> Repo.update()
  end

  defp archive(%Plan{archived_at: archived_at} = plan) when not is_nil(archived_at),
    do: {:ok, plan}

  defp archive(plan) do
    plan
    |> Plan.lifecycle_changeset(%{
      archived_at: DateTime.utc_now(:second),
      revision: plan.revision + 1
    })
    |> Repo.update()
  end

  defp restore(%Plan{archived_at: nil} = plan), do: {:ok, plan}

  defp restore(plan) do
    plan
    |> Plan.lifecycle_changeset(%{archived_at: nil, revision: plan.revision + 1})
    |> Repo.update()
  end

  # Assignment and duplication helpers

  defp duplicate_locked_template(ctx, template_id) do
    ctx
    |> get_locked_active_template(template_id)
    |> Revision.mutate(:any, fn locked ->
      copy_template(ctx, locked)
    end)
  end

  defp assign_visible_template(ctx, client_id, template_id, attrs) do
    case ClientAccess.authorize_client(ctx, client_id) do
      {:ok, _client} ->
        assign_locked_template(ctx, client_id, template_id, attrs)

      {:error, reason} ->
        Repo.rollback(reason)
    end
  end

  defp assign_locked_template(ctx, client_id, template_id, attrs) do
    ctx
    |> get_locked_active_template(template_id)
    |> Revision.mutate(:any, fn locked ->
      copy_template_to_client(ctx, client_id, locked, attrs)
    end)
  end

  defp get_locked_active_template(ctx, template_id) do
    ctx
    |> template_query()
    |> Plan.for_archived(false)
    |> lock("FOR UPDATE")
    |> Repo.get(template_id)
  end

  defp copy_template(ctx, template) do
    ctx.business_id
    |> Plan.copy_changeset(ctx.user_id, template, CopyName.next(template.name, Repo.all(from(p in template_query(ctx), select: p.name))))
    |> Repo.insert()
  end

  defp copy_template_to_client(ctx, client_id, template, attrs) do
    with {:ok, copy} <-
           Plan.assign_changeset(ctx.business_id, ctx.user_id, client_id, template, attrs)
           |> Repo.insert(),
         :ok <- ClientAccess.advance_stage_to_coaching(ctx, client_id) do
      {:ok, copy}
    end
  end

  # The business row serializes "(Copy)" name generation across concurrent
  # duplicates.
  defp lock_business_for_copy_name(business_id) do
    Business
    |> where([business], business.id == ^business_id)
    |> select([business], business.id)
    |> lock("FOR UPDATE")
    |> Repo.one()
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
    [plan] = resolve_menus([plan], ctx, lock?)
    weekday = Enum.at(Menu.weekdays(), Date.day_of_week(date) - 1)
    {:ok, %{plan: stamp_lifecycle(plan), day_pattern: Menu.day_pattern(plan.menu, date), date: date, weekday: weekday}}
  end

  defp resolve_menus(plans, ctx, lock? \\ false) do
    references = Enum.flat_map(plans, &Menu.references(&1.menu))

    {:ok, resolved} =
      if lock? do
        Library.resolve_items_for_write(ctx, references)
      else
        Library.resolve_items(ctx, references)
      end

    Enum.map(plans, &%{&1 | menu: Menu.resolve(&1.menu, resolved)})
  end

  defp stamp_lifecycle(plans) when is_list(plans), do: Enum.map(plans, &stamp_lifecycle/1)

  defp stamp_lifecycle(%Plan{} = plan) do
    %{plan | lifecycle: Plan.lifecycle(plan, local_today_for(plan))}
  end

  defp local_today_for(%Client{timezone: timezone, business: %Business{timezone: business_timezone}}) do
    LocalCalendar.to_local_date(DateTime.utc_now(), LocalCalendar.applied_timezone(timezone, business_timezone))
  end

  defp local_today_for(%Plan{client: client}), do: local_today_for(client)

  defp local_today_for(_plan) do
    LocalCalendar.to_local_date(DateTime.utc_now(), LocalCalendar.default_timezone())
  end

  # Shared plan plumbing

  defp page(opts) do
    offset = max(Keyword.get(opts, :offset, 0), 0)
    limit = opts |> Keyword.get(:limit, 20) |> max(1) |> min(100)
    {offset, limit}
  end

  defp template_query(%Ctx{} = ctx) do
    Plan
    |> Plan.for_business(ctx.business_id)
    |> Plan.templates()
  end

  defp client_plan_query(%Ctx{} = ctx, client_id) do
    Plan
    |> Plan.for_kind(:client_plan)
    |> Plan.for_client(ctx.business_id, client_id)
  end

  defp mutate_template(ctx, template_id, expected_revision, mutation, opts \\ []) do
    with :ok <- Ctx.ensure_coach(ctx) do
      result =
        Repo.transaction(fn ->
          mutate_locked_template(ctx, template_id, expected_revision, mutation)
        end)

      finalize(result, if(Keyword.get(opts, :reload?, true), do: &get_template(ctx, &1)))
    end
  end

  defp mutate_plan(ctx, plan_id, expected_revision, mutation, opts \\ []) do
    with :ok <- Ctx.ensure_coach(ctx) do
      result =
        Repo.transaction(fn -> mutate_locked_plan(ctx, plan_id, expected_revision, mutation) end)

      finalize(result, if(Keyword.get(opts, :reload?, true), do: &get_plan(ctx, &1)))
    end
  end

  defp mutate_locked_template(ctx, template_id, expected_revision, mutation) do
    template = ctx |> template_query() |> lock("FOR UPDATE") |> Repo.get(template_id)
    Revision.mutate(template, expected_revision, mutation)
  end

  defp mutate_locked_plan(ctx, plan_id, expected_revision, mutation) do
    plan =
      Plan
      |> Plan.for_business(ctx.business_id)
      |> lock("FOR UPDATE")
      |> Repo.get(plan_id)

    case plan && authorize_plan(ctx, plan) do
      :ok -> Revision.mutate(plan, expected_revision, mutation)
      _denied -> Repo.rollback(:not_found)
    end
  end

  defp finalize({:ok, plan}, nil), do: {:ok, plan}
  defp finalize({:ok, plan}, reload), do: reload.(plan.id)
  defp finalize({:error, reason}, _reload), do: {:error, reason}

  defp authorize_plan(_ctx, %Plan{kind: :template}), do: :ok

  defp authorize_plan(ctx, %Plan{kind: :client_plan, client_id: client_id}),
    do: ClientAccess.authorize_client_id(ctx, client_id)

  defp ok_or_not_found(nil, _ctx), do: {:error, :not_found}

  defp ok_or_not_found(%Plan{} = plan, ctx) do
    [plan] = resolve_menus([plan], ctx)
    {:ok, stamp_lifecycle(plan)}
  end

  defp archived_changeset(plan) do
    plan
    |> change()
    |> add_error(:archived_at, "is read-only")
  end
end
