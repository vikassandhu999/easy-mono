defmodule Easy.Nutrition.Programming do
  alias Easy.ClientAccess
  alias Easy.Clients.Client
  alias Easy.CopyName
  alias Easy.Ctx
  alias Easy.LocalCalendar

  alias Easy.Nutrition.{
    DayPattern,
    Meal,
    MealItem,
    MealOption,
    Plan,
    WeekSchedule
  }

  alias Easy.Nutrition.Programming.MenuReplacement
  alias Easy.Orgs.Business
  alias Easy.Repo
  alias Easy.Utils

  import Ecto.Changeset
  import Ecto.Query

  # Plan CRUD and lifecycle

  @spec create_template(Ctx.t(), map()) ::
          {:ok, Plan.t()} | {:error, :not_found | Ecto.Changeset.t()}
  def create_template(%Ctx{} = ctx, attrs) do
    with :ok <- ensure_coach(ctx) do
      result = Repo.transaction(fn -> insert_everyday_template(ctx, attrs) end)
      finalize(result, &get_template(ctx, &1))
    end
  end

  @spec list_templates(Ctx.t(), keyword()) ::
          {:ok, %{count: non_neg_integer(), templates: [Plan.t()]}} | {:error, :not_found}
  def list_templates(%Ctx{} = ctx, opts \\ []) do
    {offset, limit} = page(opts)
    search = opts |> Keyword.get(:search, "") |> to_string() |> String.trim()

    with :ok <- ensure_coach(ctx) do
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
        |> Plan.include_menu(ctx.business_id)
        |> Repo.all()

      {:ok, %{count: Repo.aggregate(query, :count, :id), templates: stamp_lifecycle(templates)}}
    end
  end

  @spec get_template(Ctx.t(), String.t()) :: {:ok, Plan.t()} | {:error, :not_found}
  def get_template(%Ctx{} = ctx, template_id) do
    with :ok <- ensure_coach(ctx) do
      ctx
      |> template_query()
      |> Plan.join_assigned_client_count(ctx.business_id)
      |> Plan.include_menu(ctx.business_id)
      |> Repo.get(template_id)
      |> ok_or_not_found()
    end
  end

  @spec update_template(Ctx.t(), String.t(), pos_integer(), map()) ::
          {:ok, Plan.t()} | {:error, :not_found | Ecto.Changeset.t()}
  def update_template(%Ctx{} = ctx, template_id, expected_revision, attrs) do
    mutate_template(ctx, template_id, expected_revision, &update_active(&1, attrs))
  end

  @spec archive_template(Ctx.t(), String.t(), pos_integer()) ::
          {:ok, Plan.t()} | {:error, :not_found | Ecto.Changeset.t()}
  def archive_template(%Ctx{} = ctx, template_id, expected_revision) do
    mutate_template(ctx, template_id, expected_revision, &archive/1)
  end

  @spec restore_template(Ctx.t(), String.t(), pos_integer()) ::
          {:ok, Plan.t()} | {:error, :not_found | Ecto.Changeset.t()}
  def restore_template(%Ctx{} = ctx, template_id, expected_revision) do
    mutate_template(ctx, template_id, expected_revision, &restore/1)
  end

  @spec delete_template(Ctx.t(), String.t(), pos_integer()) ::
          {:ok, Plan.t()} | {:error, :not_found | Ecto.Changeset.t()}
  def delete_template(%Ctx{} = ctx, template_id, expected_revision) do
    mutate_template(ctx, template_id, expected_revision, &Repo.delete/1, reload?: false)
  end

  @spec list_plans_for_client(Ctx.t(), String.t(), keyword()) ::
          {:ok, %{count: non_neg_integer(), plans: [Plan.t()]}} | {:error, :not_found}
  def list_plans_for_client(%Ctx{} = ctx, client_id, opts \\ []) do
    {offset, limit} = page(opts)

    with :ok <- ensure_coach(ctx),
         {:ok, _client} <- ClientAccess.authorize_client(ctx, client_id) do
      query =
        ctx
        |> client_plan_query(client_id)
        |> Plan.for_archived(Keyword.get(opts, :archived))

      plans =
        query
        |> Plan.newest()
        |> Utils.paginate(offset, limit)
        |> Plan.include_menu(ctx.business_id)
        |> Plan.include_client(ctx.business_id)
        |> Repo.all()

      {:ok, %{count: Repo.aggregate(query, :count, :id), plans: stamp_lifecycle(plans)}}
    end
  end

  @spec get_plan(Ctx.t(), String.t()) :: {:ok, Plan.t()} | {:error, :not_found}
  def get_plan(%Ctx{} = ctx, plan_id) do
    with :ok <- ensure_coach(ctx),
         {:ok, plan} <-
           Plan
           |> Plan.for_business(ctx.business_id)
           |> Plan.join_assigned_client_count(ctx.business_id)
           |> Plan.include_menu(ctx.business_id)
           |> Plan.include_client(ctx.business_id)
           |> Repo.get(plan_id)
           |> ok_or_not_found(),
         :ok <- authorize_plan(ctx, plan) do
      {:ok, plan}
    end
  end

  @spec update_plan(Ctx.t(), String.t(), pos_integer(), map()) ::
          {:ok, Plan.t()} | {:error, :not_found | Ecto.Changeset.t()}
  def update_plan(%Ctx{} = ctx, plan_id, expected_revision, attrs) do
    mutate_plan(ctx, plan_id, expected_revision, &update_active(&1, attrs))
  end

  @spec archive_plan(Ctx.t(), String.t(), pos_integer()) ::
          {:ok, Plan.t()} | {:error, :not_found | Ecto.Changeset.t()}
  def archive_plan(%Ctx{} = ctx, plan_id, expected_revision) do
    mutate_plan(ctx, plan_id, expected_revision, &archive/1)
  end

  @spec restore_plan(Ctx.t(), String.t(), pos_integer()) ::
          {:ok, Plan.t()} | {:error, :not_found | Ecto.Changeset.t()}
  def restore_plan(%Ctx{} = ctx, plan_id, expected_revision) do
    mutate_plan(ctx, plan_id, expected_revision, &restore/1)
  end

  @spec delete_plan(Ctx.t(), String.t(), pos_integer()) ::
          {:ok, Plan.t()} | {:error, :not_found | Ecto.Changeset.t()}
  def delete_plan(%Ctx{} = ctx, plan_id, expected_revision) do
    mutate_plan(ctx, plan_id, expected_revision, &Repo.delete/1, reload?: false)
  end

  @spec list_client_plans(Ctx.t(), keyword()) ::
          {:ok, %{count: non_neg_integer(), plans: [Plan.t()]}} | {:error, :not_found}
  def list_client_plans(%Ctx{} = ctx, opts \\ []) do
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
        |> Plan.include_menu(ctx.business_id)
        |> Plan.include_client(ctx.business_id)
        |> Repo.all()

      {:ok, %{count: Repo.aggregate(query, :count, :id), plans: stamp_lifecycle(plans)}}
    end
  end

  @spec get_client_plan(Ctx.t(), String.t()) :: {:ok, Plan.t()} | {:error, :not_found}
  def get_client_plan(%Ctx{} = ctx, plan_id) do
    with {:ok, client_id} <- Ctx.fetch_client_id(ctx) do
      ctx
      |> client_plan_query(client_id)
      |> Plan.include_menu(ctx.business_id)
      |> Plan.include_client(ctx.business_id)
      |> Repo.get(plan_id)
      |> ok_or_not_found()
    end
  end

  # Menu replacement

  @spec replace_menu(Ctx.t(), String.t(), pos_integer(), MenuReplacement.menu_input()) ::
          {:ok, Plan.t()} | {:error, :not_found | Ecto.Changeset.t()}
  def replace_menu(%Ctx{} = ctx, plan_id, expected_revision, attrs) do
    mutate_plan(ctx, plan_id, expected_revision, fn plan ->
      MenuReplacement.replace(ctx, plan, attrs)
    end)
  end

  # Assignment and duplication

  @spec duplicate_template(Ctx.t(), String.t(), pos_integer()) ::
          {:ok, Plan.t()} | {:error, :not_found | Ecto.Changeset.t()}
  def duplicate_template(%Ctx{} = ctx, template_id, expected_revision) do
    with :ok <- ensure_coach(ctx) do
      result =
        Repo.transaction(fn ->
          lock_business_for_copy_name(ctx.business_id)
          duplicate_locked_template(ctx, template_id, expected_revision)
        end)

      finalize(result, &get_template(ctx, &1))
    end
  end

  @spec assign_template_to_client(Ctx.t(), String.t(), String.t(), pos_integer(), map()) ::
          {:ok, Plan.t()} | {:error, :not_found | Ecto.Changeset.t()}
  def assign_template_to_client(%Ctx{} = ctx, client_id, template_id, expected_revision, attrs) do
    with :ok <- ensure_coach(ctx) do
      result =
        Repo.transaction(fn ->
          assign_visible_template(ctx, client_id, template_id, expected_revision, attrs)
        end)

      finalize(result, &get_plan(ctx, &1))
    end
  end

  # Coverage

  @spec resolve_client_coverage(Ctx.t(), Date.t()) ::
          {:ok,
           nil
           | %{plan: Plan.t(), day_pattern: DayPattern.t() | nil, date: Date.t(), weekday: atom()}}
          | {:error, :not_found}
  def resolve_client_coverage(%Ctx{} = ctx, %Date{} = date) do
    with {:ok, client_id} <- Ctx.fetch_client_id(ctx) do
      ctx
      |> covering_plan_query(client_id, date)
      |> Repo.one()
      |> resolve_covering_plan(date)
    end
  end

  @spec resolve_coverage_for_client(Ctx.t(), String.t(), Date.t()) ::
          {:ok,
           nil
           | %{plan: Plan.t(), day_pattern: DayPattern.t() | nil, date: Date.t(), weekday: atom()}}
          | {:error, :not_found}
  def resolve_coverage_for_client(%Ctx{} = ctx, client_id, %Date{} = date) do
    with :ok <- ensure_coach(ctx),
         {:ok, _client} <- ClientAccess.authorize_client(ctx, client_id) do
      ctx
      |> covering_plan_query(client_id, date)
      |> Repo.one()
      |> resolve_covering_plan(date)
    end
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

  # Plan lifecycle helpers

  defp insert_everyday_template(ctx, attrs) do
    with {:ok, plan} <-
           ctx.business_id |> Plan.insert_changeset(ctx.user_id, attrs) |> Repo.insert(),
         {:ok, pattern} <-
           DayPattern.insert_changeset(plan.business_id, plan.id, %{name: "Everyday", position: 0})
           |> Repo.insert(),
         :ok <- schedule_every_weekday(plan, pattern) do
      plan
    else
      {:error, reason} -> Repo.rollback(reason)
    end
  end

  defp schedule_every_weekday(plan, pattern) do
    each_ok(WeekSchedule.weekdays(), fn weekday ->
      WeekSchedule.insert_changeset(plan.business_id, plan.id, pattern.id, %{weekday: weekday})
      |> Repo.insert()
    end)
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

  defp duplicate_locked_template(ctx, template_id, expected_revision) do
    ctx
    |> get_locked_active_template(template_id)
    |> mutate_revisioned(expected_revision, fn locked ->
      locked
      |> reload_with_menu()
      |> then(&copy_template(ctx, &1))
    end)
  end

  defp assign_visible_template(ctx, client_id, template_id, expected_revision, attrs) do
    case ClientAccess.authorize_client(ctx, client_id) do
      {:ok, _client} ->
        assign_locked_template(ctx, client_id, template_id, expected_revision, attrs)

      {:error, reason} ->
        Repo.rollback(reason)
    end
  end

  defp assign_locked_template(ctx, client_id, template_id, expected_revision, attrs) do
    ctx
    |> get_locked_active_template(template_id)
    |> mutate_revisioned(expected_revision, fn locked ->
      locked
      |> reload_with_menu()
      |> then(&copy_template_to_client(ctx, client_id, &1, attrs))
    end)
  end

  defp get_locked_active_template(ctx, template_id) do
    ctx
    |> template_query()
    |> Plan.for_archived(false)
    |> lock("FOR UPDATE")
    |> Repo.get(template_id)
  end

  defp reload_with_menu(template) do
    Plan
    |> Plan.for_business(template.business_id)
    |> Plan.include_menu(template.business_id)
    |> Repo.get(template.id)
  end

  defp copy_template(ctx, template) do
    attrs = %{
      name: copy_name(template.name, ctx.business_id),
      description: template.description,
      target_calories: template.target_calories,
      target_protein_g: template.target_protein_g,
      target_carbs_g: template.target_carbs_g,
      target_fat_g: template.target_fat_g,
      target_fiber_g: template.target_fiber_g
    }

    with {:ok, copy} <-
           Plan.insert_changeset(ctx.business_id, ctx.user_id, attrs) |> Repo.insert(),
         :ok <- copy_menu(template, copy) do
      {:ok, copy}
    end
  end

  defp copy_template_to_client(ctx, client_id, template, attrs) do
    with {:ok, copy} <-
           Plan.insert_changeset(ctx.business_id, ctx.user_id, client_id, template, attrs)
           |> Repo.insert(),
         :ok <- copy_menu(template, copy),
         :ok <- ClientAccess.advance_stage_to_coaching(ctx, client_id) do
      {:ok, copy}
    end
  end

  defp copy_menu(source, copy) do
    with {:ok, pattern_ids} <- copy_day_patterns(source.day_patterns, copy),
         {:ok, meal_ids} <- copy_each(source.meals, &copy_meal(&1, copy)),
         :ok <- copy_meal_options(source.day_patterns, copy, pattern_ids, meal_ids) do
      copy_week_schedule(source.week_schedule, copy, pattern_ids)
    end
  end

  defp copy_day_patterns(patterns, copy) do
    copy_each(patterns, fn pattern ->
      DayPattern.insert_changeset(copy.business_id, copy.id, %{
        name: pattern.name,
        position: pattern.position
      })
      |> Repo.insert()
    end)
  end

  defp copy_meal(meal, copy) do
    attrs = %{name: meal.name, notes: meal.notes, position: meal.position}

    with {:ok, copied} <-
           Meal.insert_changeset(copy.business_id, copy.id, attrs) |> Repo.insert(),
         :ok <- copy_meal_items(meal.meal_items, copy, copied) do
      {:ok, copied}
    end
  end

  defp copy_meal_items(items, copy, copied_meal) do
    each_ok(items, fn item ->
      attrs = %{
        portion_kind: item.portion_kind,
        weight_g: item.weight_g,
        amount: item.amount,
        unit: item.unit,
        serving_label: item.serving_label,
        position: item.position,
        food_id: item.food_id,
        recipe_id: item.recipe_id,
        calories: item.calories,
        protein: item.protein,
        carbohydrates: item.carbohydrates,
        fat: item.fat,
        fiber: item.fiber,
        complete: item.complete
      }

      MealItem.insert_changeset(copy.business_id, copy.id, copied_meal.id, attrs)
      |> Repo.insert()
    end)
  end

  defp copy_meal_options(patterns, copy, pattern_ids, meal_ids) do
    patterns
    |> Enum.flat_map(& &1.meal_options)
    |> each_ok(fn option ->
      MealOption.insert_changeset(
        copy.business_id,
        copy.id,
        Map.fetch!(pattern_ids, option.nutrition_day_pattern_id),
        Map.fetch!(meal_ids, option.nutrition_meal_id),
        %{meal_slot: option.meal_slot, position: option.position}
      )
      |> Repo.insert()
    end)
  end

  defp copy_week_schedule(schedule, copy, pattern_ids) do
    each_ok(schedule, fn row ->
      WeekSchedule.insert_changeset(
        copy.business_id,
        copy.id,
        Map.fetch!(pattern_ids, row.nutrition_day_pattern_id),
        %{weekday: row.weekday}
      )
      |> Repo.insert()
    end)
  end

  defp copy_name(original_name, business_id) do
    existing_names =
      Plan
      |> Plan.for_business(business_id)
      |> Plan.templates()
      |> select([template], template.name)
      |> Repo.all()

    CopyName.next(original_name, existing_names)
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

  defp covering_plan_query(%Ctx{} = ctx, client_id, date) do
    ctx
    |> client_plan_query(client_id)
    |> Plan.covering(client_id, date)
    |> Plan.include_menu(ctx.business_id)
    |> Plan.include_client(ctx.business_id)
  end

  defp resolve_covering_plan(nil, _date), do: {:ok, nil}

  defp resolve_covering_plan(plan, date) do
    weekday = Enum.at(WeekSchedule.weekdays(), Date.day_of_week(date) - 1)
    scheduled = Enum.find(List.wrap(plan.week_schedule), &(&1.weekday == weekday))

    pattern =
      scheduled &&
        Enum.find(List.wrap(plan.day_patterns), &(&1.id == scheduled.nutrition_day_pattern_id))

    {:ok, %{plan: stamp_lifecycle(plan), day_pattern: pattern, date: date, weekday: weekday}}
  end

  defp stamp_lifecycle(plans) when is_list(plans), do: Enum.map(plans, &stamp_lifecycle/1)

  defp stamp_lifecycle(%Plan{} = plan) do
    %{plan | lifecycle: Plan.lifecycle(plan, local_today_for(plan))}
  end

  defp local_today_for(%Plan{client: %Client{timezone: timezone}}) do
    LocalCalendar.to_local_date(DateTime.utc_now(), LocalCalendar.applied_timezone(timezone, nil))
  end

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
    with :ok <- ensure_coach(ctx) do
      result =
        Repo.transaction(fn ->
          mutate_locked_template(ctx, template_id, expected_revision, mutation)
        end)

      finalize(result, if(Keyword.get(opts, :reload?, true), do: &get_template(ctx, &1)))
    end
  end

  defp mutate_plan(ctx, plan_id, expected_revision, mutation, opts \\ []) do
    with :ok <- ensure_coach(ctx) do
      result =
        Repo.transaction(fn -> mutate_locked_plan(ctx, plan_id, expected_revision, mutation) end)

      finalize(result, if(Keyword.get(opts, :reload?, true), do: &get_plan(ctx, &1)))
    end
  end

  defp mutate_locked_template(ctx, template_id, expected_revision, mutation) do
    template = ctx |> template_query() |> lock("FOR UPDATE") |> Repo.get(template_id)
    mutate_revisioned(template, expected_revision, mutation)
  end

  defp mutate_locked_plan(ctx, plan_id, expected_revision, mutation) do
    plan =
      Plan
      |> Plan.for_business(ctx.business_id)
      |> lock("FOR UPDATE")
      |> Repo.get(plan_id)

    case plan && authorize_plan(ctx, plan) do
      :ok -> mutate_revisioned(plan, expected_revision, mutation)
      _denied -> Repo.rollback(:not_found)
    end
  end

  defp mutate_revisioned(nil, _expected_revision, _mutation), do: Repo.rollback(:not_found)

  defp mutate_revisioned(%Plan{revision: revision} = plan, expected_revision, _mutation)
       when revision != expected_revision,
       do: Repo.rollback(stale_revision_changeset(plan))

  defp mutate_revisioned(plan, _expected_revision, mutation) do
    case mutation.(plan) do
      {:ok, changed} -> changed
      {:error, reason} -> Repo.rollback(reason)
    end
  end

  defp finalize({:ok, plan}, nil), do: {:ok, plan}
  defp finalize({:ok, plan}, reload), do: reload.(plan.id)
  defp finalize({:error, reason}, _reload), do: {:error, reason}

  defp authorize_plan(_ctx, %Plan{kind: :template}), do: :ok

  defp authorize_plan(ctx, %Plan{kind: :client_plan, client_id: client_id}),
    do: ClientAccess.authorize_client_id(ctx, client_id)

  defp ensure_coach(%Ctx{coach_id: coach_id}) when not is_nil(coach_id), do: :ok
  defp ensure_coach(%Ctx{}), do: {:error, :not_found}

  defp ok_or_not_found(nil), do: {:error, :not_found}
  defp ok_or_not_found(%Plan{} = plan), do: {:ok, stamp_lifecycle(plan)}

  defp stale_revision_changeset(plan) do
    plan
    |> change()
    |> add_error(:revision, "is stale")
    |> Map.put(:action, :stale_revision)
  end

  defp archived_changeset(plan) do
    plan
    |> change()
    |> add_error(:archived_at, "is read-only")
  end

  defp each_ok(items, fun) do
    Enum.reduce_while(items, :ok, fn item, :ok ->
      case fun.(item) do
        {:ok, _row} -> {:cont, :ok}
        {:error, reason} -> {:halt, {:error, reason}}
      end
    end)
  end

  defp copy_each(rows, copy_one) do
    Enum.reduce_while(rows, {:ok, %{}}, fn row, {:ok, ids} ->
      case copy_one.(row) do
        {:ok, copied} -> {:cont, {:ok, Map.put(ids, row.id, copied.id)}}
        {:error, reason} -> {:halt, {:error, reason}}
      end
    end)
  end
end
