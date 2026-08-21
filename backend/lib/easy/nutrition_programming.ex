defmodule Easy.Nutrition.Programming do
  alias Easy.Clients
  alias Easy.Clients.Client
  alias Easy.CopyName
  alias Easy.Ctx
  alias Easy.LocalCalendar

  alias Easy.Nutrition.{
    DayPattern,
    Library,
    Meal,
    MealItem,
    MealOption,
    MealSlot,
    Plan,
    Recipe,
    WeekSchedule
  }

  alias Easy.Orgs.Business
  alias Easy.Repo
  alias Easy.Utils

  import Ecto.Changeset
  import Ecto.Query

  @max_position 2_147_483_647

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
         {:ok, _client} <- Clients.authorize_client(ctx, client_id) do
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

  @spec replace_menu(Ctx.t(), String.t(), pos_integer(), map()) ::
          {:ok, Plan.t()} | {:error, :not_found | Ecto.Changeset.t()}
  def replace_menu(%Ctx{} = ctx, plan_id, expected_revision, attrs) do
    mutate_plan(ctx, plan_id, expected_revision, fn plan ->
      replace_locked_menu(ctx, plan, attrs)
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
         {:ok, _client} <- Clients.authorize_client(ctx, client_id) do
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

  # Menu replacement: validation
  #
  # Every stage rejects the whole request, so nothing is written unless the
  # complete Menu is valid; persistence then runs inside the caller's
  # transaction and lock.

  defp replace_locked_menu(_ctx, %Plan{archived_at: archived_at} = plan, _attrs)
       when not is_nil(archived_at) do
    {:error, archived_changeset(plan)}
  end

  defp replace_locked_menu(ctx, plan, attrs) do
    with {:ok, menu} <- validate_menu(ctx, plan, attrs),
         {:ok, meal_ids} <- reconcile_meals(plan, menu),
         {:ok, pattern_ids} <- reconcile_day_patterns(plan, menu),
         :ok <- rebuild_meal_options(plan, menu, meal_ids, pattern_ids),
         :ok <- rebuild_week_schedule(plan, menu, pattern_ids) do
      plan
      |> Plan.lifecycle_changeset(%{revision: plan.revision + 1})
      |> Repo.update()
    end
  end

  defp validate_menu(ctx, plan, attrs) do
    meals = Map.get(attrs, :meals)
    patterns = Map.get(attrs, :day_patterns)
    schedule = Map.get(attrs, :schedule)

    with :ok <- validate_menu_shape(plan, meals, patterns, schedule),
         {:ok, existing} <- validate_persisted_nodes(plan, meals, patterns),
         :ok <- validate_local_references(plan, meals, patterns),
         :ok <- validate_menu_positions(plan, meals, patterns),
         :ok <- validate_day_patterns(plan, patterns, meals),
         :ok <- validate_schedule(plan, schedule, patterns),
         {:ok, resolved} <- resolve_menu_items(ctx, plan, meals) do
      {:ok,
       %{
         meals: zip_resolved_items(meals, resolved),
         day_patterns: patterns,
         schedule: schedule,
         existing: existing
       }}
    end
  end

  defp validate_menu_shape(plan, meals, patterns, schedule) do
    cond do
      not (is_list(meals) and Enum.all?(meals, &meal_shaped?/1)) ->
        {:error, menu_error(plan, :meals, "is invalid")}

      not (is_list(patterns) and Enum.all?(patterns, &is_map/1)) ->
        {:error, menu_error(plan, :day_patterns, "is invalid")}

      not is_map(schedule) ->
        {:error, menu_error(plan, :schedule, "is invalid")}

      true ->
        :ok
    end
  end

  defp meal_shaped?(meal) when is_map(meal), do: is_list(meal_items(meal))
  defp meal_shaped?(_meal), do: false

  # Guarantees every submitted id names a live row of this plan (items under
  # their own meal), and returns those rows indexed by id.
  defp validate_persisted_nodes(plan, meals, patterns) do
    existing = load_existing_menu(plan)

    cond do
      not persisted_meals_known?(meals, existing) ->
        {:error, menu_error(plan, :meals, "contains an unknown persisted node")}

      not persisted_patterns_known?(patterns, existing) ->
        {:error, menu_error(plan, :day_patterns, "contains an unknown persisted node")}

      true ->
        {:ok, existing}
    end
  end

  defp load_existing_menu(plan) do
    %{
      meals: index_by_id(Meal.for_plan(Meal.for_business(plan.business_id), plan.id)),
      items: index_by_id(MealItem.for_plan(MealItem.for_business(plan.business_id), plan.id)),
      patterns: index_by_id(DayPattern.for_plan(DayPattern.for_business(plan.business_id), plan.id)),
      options: index_by_id(MealOption.for_plan(MealOption.for_business(plan.business_id), plan.id))
    }
  end

  defp index_by_id(query), do: query |> Repo.all() |> Map.new(&{&1.id, &1})

  defp persisted_meals_known?(meals, existing) do
    meal_ids = meals |> Enum.map(&node_id/1) |> Enum.reject(&is_nil/1)

    item_ids =
      meals |> Enum.flat_map(&meal_items/1) |> Enum.map(&node_id/1) |> Enum.reject(&is_nil/1)

    unique?(meal_ids) and unique?(item_ids) and
      Enum.all?(meal_ids, &(valid_uuid?(&1) and Map.has_key?(existing.meals, &1))) and
      Enum.all?(meals, &persisted_items_belong_to_meal?(&1, existing.items))
  end

  defp persisted_patterns_known?(patterns, existing) do
    pattern_ids = patterns |> Enum.map(&node_id/1) |> Enum.reject(&is_nil/1)
    option_ids = patterns |> all_options() |> Enum.map(&node_id/1) |> Enum.reject(&is_nil/1)

    unique?(pattern_ids) and unique?(option_ids) and
      Enum.all?(pattern_ids, &(valid_uuid?(&1) and Map.has_key?(existing.patterns, &1))) and
      Enum.all?(option_ids, &(valid_uuid?(&1) and Map.has_key?(existing.options, &1)))
  end

  defp persisted_items_belong_to_meal?(meal, existing_items) do
    Enum.all?(meal_items(meal), fn input ->
      case node_id(input) do
        nil -> true
        id -> persisted_item_belongs?(Map.get(existing_items, id), meal)
      end
    end)
  end

  defp persisted_item_belongs?(%MealItem{nutrition_meal_id: meal_id}, meal),
    do: meal_id == node_id(meal)

  defp persisted_item_belongs?(_item, _meal), do: false

  # Every node carries exactly one identity (persisted id or local ref), and
  # local refs share one menu-wide namespace.
  defp validate_local_references(plan, meals, patterns) do
    meal_nodes = meals ++ Enum.flat_map(meals, &meal_items/1)
    pattern_nodes = patterns ++ all_options(patterns)
    refs = (meal_nodes ++ pattern_nodes) |> Enum.map(&node_ref/1) |> Enum.reject(&is_nil/1)

    cond do
      not Enum.all?(meal_nodes, &single_identity?/1) ->
        {:error, menu_error(plan, :meals, "contains invalid or duplicate local references")}

      not Enum.all?(pattern_nodes, &single_identity?/1) ->
        {:error, menu_error(plan, :day_patterns, "contains invalid or duplicate local references")}

      not unique?(refs) ->
        {:error, menu_error(plan, :meals, "contains invalid or duplicate local references")}

      true ->
        :ok
    end
  end

  defp single_identity?(node) do
    case {node_id(node), node_ref(node)} do
      {id, nil} -> valid_uuid?(id)
      {nil, ref} -> valid_local_ref?(ref)
      {_id, _ref} -> false
    end
  end

  defp validate_menu_positions(plan, meals, patterns) do
    meals_valid? =
      unique_nonnegative_positions?(meals) and
        Enum.all?(meals, &unique_nonnegative_positions?(meal_items(&1)))

    cond do
      not meals_valid? ->
        {:error, menu_error(plan, :meals, "positions must be unique nonnegative integers")}

      not unique_nonnegative_positions?(patterns) ->
        {:error, menu_error(plan, :day_patterns, "positions must be unique nonnegative integers")}

      true ->
        :ok
    end
  end

  defp unique_nonnegative_positions?(nodes) do
    positions = Enum.map(nodes, &node_position/1)
    Enum.all?(positions, &valid_position?/1) and unique?(positions)
  end

  defp valid_position?(position),
    do: is_integer(position) and position >= 0 and position <= @max_position

  defp validate_day_patterns(plan, patterns, meals) do
    meal_identities = submitted_identities(meals)

    cond do
      patterns == [] ->
        {:error, menu_error(plan, :day_patterns, "must contain at least one Day Pattern")}

      Enum.all?(patterns, &valid_pattern_slots?(&1, meal_identities)) ->
        :ok

      true ->
        {:error, menu_error(plan, :day_patterns, "contains invalid Meal Slots or Meal Options")}
    end
  end

  defp valid_pattern_slots?(pattern, meal_identities) do
    case Map.get(pattern, :slots, []) do
      slots when is_list(slots) ->
        unique_slots?(slots) and Enum.all?(slots, &valid_slot?(&1, meal_identities))

      _other ->
        false
    end
  end

  defp unique_slots?(slots) do
    names = Enum.map(slots, &slot_name/1)
    Enum.all?(names, &(not is_nil(&1))) and unique?(names)
  end

  defp valid_slot?(slot, meal_identities) when is_map(slot) do
    options = slot_options(slot)

    is_list(options) and options != [] and contiguous_from_zero?(options) and
      unique_option_meals?(options) and
      Enum.all?(options, &valid_option_meal?(&1, meal_identities))
  end

  defp valid_slot?(_slot, _meal_identities), do: false

  defp contiguous_from_zero?(nodes) do
    count = length(nodes)
    positions = Enum.map(nodes, &node_position/1)

    Enum.all?(positions, &valid_position?/1) and
      Enum.sort(positions) == Enum.to_list(0..(count - 1))
  end

  defp unique_option_meals?(options) do
    identities = Enum.map(options, &option_meal_identity/1)
    Enum.all?(identities, &(not is_nil(&1))) and unique?(identities)
  end

  defp valid_option_meal?(option, meal_identities) do
    case option_meal_identity(option) do
      {_kind, value} -> MapSet.member?(meal_identities, value)
      nil -> false
    end
  end

  defp option_meal_identity(option) when is_map(option) do
    case {Map.get(option, :nutrition_meal_id), Map.get(option, :meal_local_ref)} do
      {id, nil} when is_binary(id) -> {:id, id}
      {nil, ref} when is_binary(ref) -> {:ref, ref}
      _other -> nil
    end
  end

  defp option_meal_identity(_option), do: nil

  defp validate_schedule(plan, schedule, patterns) do
    pattern_identities = submitted_identities(patterns)

    complete? =
      Enum.all?(WeekSchedule.weekdays(), fn weekday ->
        case Map.get(schedule, weekday) do
          identity when is_binary(identity) -> MapSet.member?(pattern_identities, identity)
          _other -> false
        end
      end)

    if complete? do
      :ok
    else
      {:error, menu_error(plan, :schedule, "must map every weekday to a Day Pattern in this Menu")}
    end
  end

  defp submitted_identities(nodes) do
    MapSet.new(Enum.flat_map(nodes, &Enum.reject([node_id(&1), node_ref(&1)], fn v -> is_nil(v) end)))
  end

  # Menu replacement: Library resolution

  defp resolve_menu_items(ctx, plan, meals) do
    specs = meals |> Enum.flat_map(&meal_items/1) |> Enum.map(&library_item_spec/1)

    cond do
      Enum.any?(specs, &is_nil/1) ->
        {:error, menu_error(plan, :meals, "contains an invalid Menu Item")}

      specs == [] ->
        {:ok, []}

      true ->
        resolve_library_items(ctx, plan, specs)
    end
  end

  defp resolve_library_items(ctx, plan, specs) do
    lock_recipe_rows(ctx.business_id, specs)

    case Library.resolve_items(ctx, specs) do
      {:ok, resolved} ->
        {:ok, resolved}

      {:error, :not_found} ->
        {:error, :not_found}

      {:error, :invalid_portion} ->
        {:error, menu_error(plan, :meals, "contains an invalid Portion")}
    end
  end

  # Gram Portions resolve through cooked weight, so referenced Recipe rows are
  # share-locked (in sorted order, to avoid deadlock) against a concurrent
  # cooked-weight removal.
  defp lock_recipe_rows(business_id, specs) do
    recipe_ids =
      specs
      |> Enum.flat_map(fn
        %{kind: :recipe, id: id} -> [id]
        _food -> []
      end)
      |> Enum.uniq()
      |> Enum.sort()

    Recipe
    |> Recipe.for_business(business_id)
    |> where([recipe], recipe.id in ^recipe_ids)
    |> order_by([recipe], asc: recipe.id)
    |> lock("FOR SHARE")
    |> Repo.all()

    :ok
  end

  defp library_item_spec(input) do
    portion = normalize_portion(Map.get(input, :portion))

    case {item_kind(input), Map.get(input, :food_id), Map.get(input, :recipe_id), portion} do
      {:food, food_id, nil, portion} when is_binary(food_id) and not is_nil(portion) ->
        %{kind: :food, id: food_id, portion: portion}

      {:recipe, nil, recipe_id, portion} when is_binary(recipe_id) and not is_nil(portion) ->
        %{kind: :recipe, id: recipe_id, portion: portion}

      _invalid ->
        nil
    end
  end

  defp item_kind(input) do
    case Map.get(input, :kind) do
      kind when kind in [:food, "food"] -> :food
      kind when kind in [:recipe, "recipe"] -> :recipe
      _other -> nil
    end
  end

  defp normalize_portion(portion) when is_map(portion) do
    case portion_kind(Map.get(portion, :kind)) do
      nil ->
        nil

      kind ->
        %{
          kind: kind,
          grams: Map.get(portion, :grams),
          amount: Map.get(portion, :amount),
          unit: Map.get(portion, :unit),
          label: Map.get(portion, :label)
        }
    end
  end

  defp normalize_portion(_portion), do: nil

  defp portion_kind(kind) when kind in [:gram, "gram"], do: :gram
  defp portion_kind(kind) when kind in [:serving, "serving"], do: :serving
  defp portion_kind(_kind), do: nil

  # Library returns resolutions in flat submission order, so they zip back
  # meal by meal.
  defp zip_resolved_items(meals, resolved) do
    {zipped, _rest} =
      Enum.map_reduce(meals, resolved, fn meal, rest ->
        {resolved_items, rest} = Enum.split(rest, length(meal_items(meal)))
        {Map.put(meal, :resolved_items, Enum.zip(meal_items(meal), resolved_items)), rest}
      end)

    zipped
  end

  # Menu replacement: persistence
  #
  # Reconcile keeps rows named by id (updated in place), deletes omitted rows,
  # inserts the rest, and returns identity → id. Rebuild deletes the whole
  # collection and reinserts it from the input.

  defp reconcile_meals(plan, menu) do
    scope = Meal |> Meal.for_business(plan.business_id) |> Meal.for_plan(plan.id)

    with :ok <- park_retained_meals(plan, menu),
         :ok <- delete_omitted(scope, menu.meals) do
      upsert_each(menu.meals, &upsert_meal(plan, &1, menu.existing))
    end
  end

  defp upsert_meal(plan, input, existing) do
    with {:ok, meal} <- upsert_meal_row(plan, input, existing),
         :ok <- reconcile_meal_items(plan, meal, Map.fetch!(input, :resolved_items), existing) do
      {:ok, meal}
    end
  end

  defp upsert_meal_row(plan, input, existing) do
    case node_id(input) do
      nil ->
        Meal.insert_changeset(plan.business_id, plan.id, input) |> Repo.insert()

      id ->
        existing.meals
        |> Map.fetch!(id)
        |> Meal.update_changeset(input)
        |> force_requested_position(input)
        |> Repo.update()
    end
  end

  defp reconcile_meal_items(plan, meal, pairs, existing) do
    inputs = Enum.map(pairs, &elem(&1, 0))
    scope = MealItem |> MealItem.for_business(plan.business_id) |> MealItem.for_meal(meal.id)

    with :ok <- park_retained_items(plan, meal, inputs, existing),
         :ok <- delete_omitted(scope, inputs) do
      each_ok(pairs, fn {input, resolved} ->
        upsert_meal_item(plan, meal, input, resolved, existing)
      end)
    end
  end

  defp upsert_meal_item(plan, meal, input, resolved, existing) do
    attrs = meal_item_attrs(input, resolved)

    case node_id(input) do
      nil ->
        MealItem.insert_changeset(plan.business_id, plan.id, meal.id, attrs) |> Repo.insert()

      id ->
        existing.items
        |> Map.fetch!(id)
        |> MealItem.update_changeset(attrs)
        |> force_requested_position(input)
        |> Repo.update()
    end
  end

  defp meal_item_attrs(input, resolved) do
    portion = resolved.portion
    nutrients = resolved.nutrients
    kind = normalize_portion(Map.get(input, :portion)).kind

    %{
      portion_kind: kind,
      weight_g: portion.grams,
      amount: portion.amount,
      unit: portion[:unit],
      serving_label: portion[:label],
      position: node_position(input),
      food_id: if(resolved.kind == :food, do: resolved.item.id),
      recipe_id: if(resolved.kind == :recipe, do: resolved.item.id),
      calories: nutrients.calories,
      protein: nutrients.protein,
      carbohydrates: nutrients.carbohydrates,
      fat: nutrients.fat,
      fiber: nutrients.fiber,
      complete: nutrients.complete
    }
  end

  defp reconcile_day_patterns(plan, menu) do
    scope = DayPattern |> DayPattern.for_business(plan.business_id) |> DayPattern.for_plan(plan.id)

    with :ok <- park_retained_patterns(plan, menu),
         :ok <- delete_omitted(scope, menu.day_patterns) do
      upsert_each(menu.day_patterns, &upsert_pattern(plan, &1, menu.existing))
    end
  end

  defp upsert_pattern(plan, input, existing) do
    case node_id(input) do
      nil ->
        DayPattern.insert_changeset(plan.business_id, plan.id, input) |> Repo.insert()

      id ->
        existing.patterns
        |> Map.fetch!(id)
        |> DayPattern.update_changeset(input)
        |> force_requested_position(input)
        |> Repo.update()
    end
  end

  defp rebuild_meal_options(plan, menu, meal_ids, pattern_ids) do
    MealOption
    |> MealOption.for_business(plan.business_id)
    |> MealOption.for_plan(plan.id)
    |> Repo.delete_all()

    menu.day_patterns
    |> Enum.flat_map(&option_rows(&1, pattern_ids, meal_ids))
    |> each_ok(&insert_option(plan, &1))
  end

  defp option_rows(pattern, pattern_ids, meal_ids) do
    pattern_id = Map.fetch!(pattern_ids, node_id(pattern) || node_ref(pattern))

    Enum.flat_map(pattern_slots(pattern), fn slot ->
      meal_slot = slot_name(slot)

      Enum.map(slot_options(slot), fn option ->
        %{
          id: node_id(option),
          meal_slot: meal_slot,
          position: node_position(option),
          nutrition_day_pattern_id: pattern_id,
          nutrition_meal_id: Map.fetch!(meal_ids, option_meal_key(option))
        }
      end)
    end)
  end

  defp option_meal_key(option),
    do: Map.get(option, :nutrition_meal_id) || Map.get(option, :meal_local_ref)

  defp insert_option(plan, row) do
    changeset =
      MealOption.insert_changeset(
        plan.business_id,
        plan.id,
        row.nutrition_day_pattern_id,
        row.nutrition_meal_id,
        %{meal_slot: row.meal_slot, position: row.position}
      )

    changeset = if row.id, do: put_change(changeset, :id, row.id), else: changeset
    Repo.insert(changeset)
  end

  defp rebuild_week_schedule(plan, menu, pattern_ids) do
    WeekSchedule
    |> WeekSchedule.for_business(plan.business_id)
    |> WeekSchedule.for_plan(plan.id)
    |> Repo.delete_all()

    each_ok(WeekSchedule.weekdays(), fn weekday ->
      pattern_id = Map.fetch!(pattern_ids, Map.fetch!(menu.schedule, weekday))

      WeekSchedule.insert_changeset(plan.business_id, plan.id, pattern_id, %{weekday: weekday})
      |> Repo.insert()
    end)
  end

  # Menu replacement: position parking
  #
  # A retained row's final position may currently belong to a sibling, and the
  # unique index checks each UPDATE separately. Parking every retained row on a
  # position nothing holds or requests first lets each later update land its
  # final position without a collision.

  defp park_retained_meals(plan, menu) do
    park_retained(
      plan,
      :meals,
      retained_rows(menu.meals, menu.existing.meals),
      occupied_positions(Map.values(menu.existing.meals), menu.meals),
      fn meal, position ->
        Meal
        |> Meal.for_business(plan.business_id)
        |> Meal.for_plan(plan.id)
        |> where([row], row.id == ^meal.id)
        |> Repo.update_all(set: [position: position])
      end
    )
  end

  defp park_retained_patterns(plan, menu) do
    park_retained(
      plan,
      :day_patterns,
      retained_rows(menu.day_patterns, menu.existing.patterns),
      occupied_positions(Map.values(menu.existing.patterns), menu.day_patterns),
      fn pattern, position ->
        DayPattern
        |> DayPattern.for_business(plan.business_id)
        |> DayPattern.for_plan(plan.id)
        |> where([row], row.id == ^pattern.id)
        |> Repo.update_all(set: [position: position])
      end
    )
  end

  defp park_retained_items(plan, meal, inputs, existing) do
    siblings = existing.items |> Map.values() |> Enum.filter(&(&1.nutrition_meal_id == meal.id))

    park_retained(
      plan,
      :meals,
      retained_rows(inputs, existing.items),
      occupied_positions(siblings, inputs),
      fn item, position ->
        MealItem
        |> MealItem.for_business(plan.business_id)
        |> MealItem.for_meal(meal.id)
        |> where([row], row.id == ^item.id)
        |> Repo.update_all(set: [position: position])
      end
    )
  end

  defp retained_rows(inputs, existing_by_id) do
    inputs
    |> Enum.map(&node_id/1)
    |> Enum.reject(&is_nil/1)
    |> Enum.map(&Map.fetch!(existing_by_id, &1))
  end

  defp occupied_positions(existing_rows, inputs) do
    Enum.map(existing_rows, & &1.position) ++ Enum.map(inputs, &node_position/1)
  end

  defp park_retained(_owner, _field, [], _occupied, _park), do: :ok

  defp park_retained(owner, field, retained, occupied, park) do
    case first_free_positions(MapSet.new(occupied), length(retained)) do
      {:ok, free} ->
        retained
        |> Enum.zip(free)
        |> Enum.each(fn {row, position} -> park.(row, position) end)

        :ok

      :error ->
        {:error, menu_error(owner, field, "positions are too large to safely reorder")}
    end
  end

  defp first_free_positions(occupied, count) do
    free =
      0..min(@max_position, MapSet.size(occupied) + count)
      |> Stream.reject(&MapSet.member?(occupied, &1))
      |> Enum.take(count)

    if length(free) == count, do: {:ok, free}, else: :error
  end

  defp delete_omitted(scoped_query, inputs) do
    kept_ids = inputs |> Enum.map(&node_id/1) |> Enum.reject(&is_nil/1)

    scoped_query
    |> where([row], row.id not in ^kept_ids)
    |> Repo.delete_all()

    :ok
  end

  # The loaded struct predates parking, so cast/3 would see an unchanged
  # position and skip the write, leaving the row parked. force_change always
  # lands the requested position.
  defp force_requested_position(changeset, input) do
    force_change(changeset, :position, node_position(input))
  end

  # Menu input readers

  defp node_id(node), do: Map.get(node, :id)
  defp node_ref(node), do: Map.get(node, :local_ref)
  defp node_position(node), do: Map.get(node, :position)
  defp meal_items(meal), do: Map.get(meal, :meal_items) || []

  defp pattern_slots(pattern) when is_map(pattern) do
    case Map.get(pattern, :slots) do
      slots when is_list(slots) -> slots
      _other -> []
    end
  end

  defp pattern_slots(_pattern), do: []

  defp slot_options(slot) when is_map(slot), do: Map.get(slot, :options) || []
  defp slot_options(_slot), do: []

  defp all_options(patterns),
    do:
      Enum.flat_map(patterns, fn pattern ->
        Enum.flat_map(pattern_slots(pattern), &slot_options/1)
      end)

  defp slot_name(slot) when is_map(slot) do
    case MealSlot.cast(Map.get(slot, :meal_slot)) do
      {:ok, name} -> name
      :error -> nil
    end
  end

  defp slot_name(_slot), do: nil

  defp unique?(values), do: length(values) == MapSet.size(MapSet.new(values))
  defp valid_uuid?(value), do: match?({:ok, _uuid}, Ecto.UUID.cast(value))

  defp valid_local_ref?(value),
    do: is_binary(value) and value == String.trim(value) and value != "" and byte_size(value) <= 100

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
    case Clients.authorize_client(ctx, client_id) do
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
         :ok <- Clients.advance_stage_to_coaching(ctx, client_id) do
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
    do: Clients.authorize_client_id(ctx, client_id)

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

  defp menu_error(plan, field, message), do: plan |> change() |> add_error(field, message)

  defp each_ok(items, fun) do
    Enum.reduce_while(items, :ok, fn item, :ok ->
      case fun.(item) do
        {:ok, _row} -> {:cont, :ok}
        {:error, reason} -> {:halt, {:error, reason}}
      end
    end)
  end

  defp upsert_each(inputs, upsert_one) do
    Enum.reduce_while(inputs, {:ok, %{}}, fn input, {:ok, ids} ->
      case upsert_one.(input) do
        {:ok, row} -> {:cont, {:ok, put_identities(ids, input, row.id)}}
        {:error, reason} -> {:halt, {:error, reason}}
      end
    end)
  end

  defp put_identities(ids, input, saved_id) do
    [node_id(input), node_ref(input)]
    |> Enum.reject(&is_nil/1)
    |> Enum.reduce(ids, &Map.put(&2, &1, saved_id))
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
