defmodule Easy.Nutrition.Programming do
  alias Easy.Clients
  alias Easy.CopyName
  alias Easy.Ctx
  alias Easy.Nutrition.{DayPattern, Library, Meal, MealItem, MealOption, MealSlot, Plan, WeekSchedule}
  alias Easy.Orgs.Business
  alias Easy.Repo
  alias Easy.Utils

  import Ecto.Changeset
  import Ecto.Query

  @everyday "Everyday"
  @max_position 2_147_483_647

  @spec create_template(Ctx.t(), map()) :: {:ok, Plan.t()} | {:error, :not_found | Ecto.Changeset.t()}
  def create_template(%Ctx{} = ctx, attrs) do
    with :ok <- ensure_coach(ctx) do
      result = Repo.transaction(fn -> insert_everyday_template(ctx, attrs) end)
      preload_created(result, ctx.business_id)
    end
  end

  @spec list_templates(Ctx.t(), keyword()) ::
          {:ok, %{count: non_neg_integer(), templates: [Plan.t()]}} | {:error, :not_found}
  def list_templates(%Ctx{} = ctx, opts \\ []) do
    offset = max(Keyword.get(opts, :offset, 0), 0)
    limit = opts |> Keyword.get(:limit, 20) |> max(1) |> min(100)
    search = opts |> Keyword.get(:search, "") |> to_string() |> String.trim()
    archived = Keyword.get(opts, :archived)

    with :ok <- ensure_coach(ctx) do
      query =
        ctx
        |> template_query()
        |> Plan.for_archived(archived)
        |> Plan.for_search(search)

      templates =
        query
        |> Plan.newest()
        |> Utils.paginate(offset, limit)
        |> Plan.join_assigned_client_count(ctx.business_id)
        |> Plan.include_menu(ctx.business_id)
        |> Repo.all()

      {:ok, %{count: Repo.aggregate(query, :count, :id), templates: templates}}
    end
  end

  @spec list_plans_for_client(Ctx.t(), String.t(), keyword()) ::
          {:ok, %{count: non_neg_integer(), plans: [Plan.t()]}} | {:error, :not_found}
  def list_plans_for_client(%Ctx{} = ctx, client_id, opts \\ []) do
    offset = max(Keyword.get(opts, :offset, 0), 0)
    limit = opts |> Keyword.get(:limit, 20) |> max(1) |> min(100)
    archived = Keyword.get(opts, :archived)

    with :ok <- ensure_coach(ctx),
         {:ok, _client} <- Clients.authorize_client(ctx, client_id) do
      query =
        Plan
        |> Plan.for_kind(:client_plan)
        |> Plan.for_client(ctx.business_id, client_id)
        |> Plan.for_archived(archived)

      plans =
        query
        |> Plan.newest()
        |> Utils.paginate(offset, limit)
        |> Plan.include_menu(ctx.business_id)
        |> Plan.include_client(ctx.business_id)
        |> Repo.all()

      {:ok, %{count: Repo.aggregate(query, :count, :id), plans: plans}}
    end
  end

  @spec list_client_plans(Ctx.t(), keyword()) ::
          {:ok, %{count: non_neg_integer(), plans: [Plan.t()]}} | {:error, :not_found}
  def list_client_plans(%Ctx{} = ctx, opts \\ []) do
    offset = max(Keyword.get(opts, :offset, 0), 0)
    limit = opts |> Keyword.get(:limit, 20) |> max(1) |> min(100)
    archived = Keyword.get(opts, :archived)

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
        |> Repo.all()

      {:ok, %{count: Repo.aggregate(query, :count, :id), plans: plans}}
    end
  end

  @spec get_client_plan(Ctx.t(), String.t()) :: {:ok, Plan.t()} | {:error, :not_found}
  def get_client_plan(%Ctx{} = ctx, plan_id) do
    with {:ok, client_id} <- Ctx.fetch_client_id(ctx) do
      ctx
      |> client_plan_query(client_id)
      |> Plan.include_menu(ctx.business_id)
      |> Repo.get(plan_id)
      |> ok_or_not_found()
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

  @spec get_plan(Ctx.t(), String.t()) :: {:ok, Plan.t()} | {:error, :not_found}
  def get_plan(%Ctx{} = ctx, plan_id) do
    with :ok <- ensure_coach(ctx),
         {:ok, plan} <-
           ctx
           |> plan_query()
           |> Plan.join_assigned_client_count(ctx.business_id)
           |> Plan.include_menu(ctx.business_id)
           |> Plan.include_client(ctx.business_id)
           |> Repo.get(plan_id)
           |> ok_or_not_found(),
         :ok <- authorize_plan(ctx, plan) do
      {:ok, plan}
    end
  end

  @spec update_template(Ctx.t(), String.t(), pos_integer(), map()) ::
          {:ok, Plan.t()} | {:error, :not_found | Ecto.Changeset.t()}
  def update_template(%Ctx{} = ctx, template_id, expected_revision, attrs) do
    mutate_template(ctx, template_id, expected_revision, &update_active(&1, attrs))
  end

  @spec update_plan(Ctx.t(), String.t(), pos_integer(), map()) ::
          {:ok, Plan.t()} | {:error, :not_found | Ecto.Changeset.t()}
  def update_plan(%Ctx{} = ctx, plan_id, expected_revision, attrs) do
    mutate_plan(ctx, plan_id, expected_revision, &update_active(&1, attrs))
  end

  @spec archive_template(Ctx.t(), String.t(), pos_integer()) ::
          {:ok, Plan.t()} | {:error, :not_found | Ecto.Changeset.t()}
  def archive_template(%Ctx{} = ctx, template_id, expected_revision) do
    mutate_template(ctx, template_id, expected_revision, &archive/1)
  end

  @spec archive_plan(Ctx.t(), String.t(), pos_integer()) ::
          {:ok, Plan.t()} | {:error, :not_found | Ecto.Changeset.t()}
  def archive_plan(%Ctx{} = ctx, plan_id, expected_revision) do
    mutate_plan(ctx, plan_id, expected_revision, &archive/1)
  end

  @spec restore_template(Ctx.t(), String.t(), pos_integer()) ::
          {:ok, Plan.t()} | {:error, :not_found | Ecto.Changeset.t()}
  def restore_template(%Ctx{} = ctx, template_id, expected_revision) do
    mutate_template(ctx, template_id, expected_revision, &restore/1)
  end

  @spec restore_plan(Ctx.t(), String.t(), pos_integer()) ::
          {:ok, Plan.t()} | {:error, :not_found | Ecto.Changeset.t()}
  def restore_plan(%Ctx{} = ctx, plan_id, expected_revision) do
    mutate_plan(ctx, plan_id, expected_revision, &restore/1)
  end

  @spec delete_template(Ctx.t(), String.t(), pos_integer()) ::
          {:ok, Plan.t()} | {:error, :not_found | Ecto.Changeset.t()}
  def delete_template(%Ctx{} = ctx, template_id, expected_revision) do
    mutate_template(ctx, template_id, expected_revision, &Repo.delete/1, reload?: false)
  end

  @spec delete_plan(Ctx.t(), String.t(), pos_integer()) ::
          {:ok, Plan.t()} | {:error, :not_found | Ecto.Changeset.t()}
  def delete_plan(%Ctx{} = ctx, plan_id, expected_revision) do
    mutate_plan(ctx, plan_id, expected_revision, &Repo.delete/1, reload?: false)
  end

  @spec duplicate_template(Ctx.t(), String.t(), pos_integer()) ::
          {:ok, Plan.t()} | {:error, :not_found | Ecto.Changeset.t()}
  def duplicate_template(%Ctx{} = ctx, template_id, expected_revision) do
    with :ok <- ensure_coach(ctx) do
      result =
        Repo.transaction(fn ->
          lock_business_for_duplicate_name(ctx.business_id)
          duplicate_locked_template(ctx, template_id, expected_revision)
        end)

      finalize_template_mutation(result, ctx, true)
    end
  end

  @spec replace_menu(Ctx.t(), String.t(), pos_integer(), map()) ::
          {:ok, Plan.t()} | {:error, :not_found | :invalid_portion | Ecto.Changeset.t()}
  def replace_menu(%Ctx{} = ctx, plan_id, expected_revision, attrs) do
    mutate_plan(ctx, plan_id, expected_revision, fn plan ->
      replace_locked_menu(ctx, plan, attrs)
    end)
  end

  defp replace_locked_menu(_ctx, %Plan{archived_at: archived_at} = plan, _attrs) when not is_nil(archived_at) do
    {:error, archived_changeset(plan)}
  end

  defp replace_locked_menu(ctx, plan, attrs) do
    with {:ok, menu} <- validate_menu(ctx, plan, attrs),
         {:ok, meal_ids} <- persist_menu_meals(plan, menu),
         {:ok, pattern_ids} <- persist_menu_patterns(plan, menu),
         :ok <- persist_menu_options(plan, menu, meal_ids, pattern_ids),
         :ok <- persist_menu_schedule(plan, menu, pattern_ids),
         :ok <- delete_omitted_patterns(plan, Map.values(pattern_ids)) do
      plan
      |> Plan.lifecycle_changeset(%{revision: plan.revision + 1})
      |> Repo.update()
    end
  end

  defp validate_menu(ctx, plan, attrs) do
    meals = Map.get(attrs, :meals)
    patterns = Map.get(attrs, :day_patterns)
    schedule = Map.get(attrs, :schedule)

    with :ok <- validate_menu_collections(plan, meals, patterns, schedule),
         {:ok, existing} <- validate_persisted_menu_nodes(plan, meals, patterns),
         :ok <- validate_menu_local_references(plan, meals, patterns),
         :ok <- validate_menu_positions(plan, meals, patterns),
         :ok <- validate_day_patterns(plan, patterns, meals),
         :ok <- validate_schedule(plan, schedule, patterns),
         {:ok, resolved} <- resolve_menu_items(ctx, plan, meals) do
      {:ok,
       %{
         meals: attach_resolved(meals, resolved),
         day_patterns: patterns,
         schedule: schedule,
         existing: existing
       }}
    end
  end

  defp validate_menu_collections(plan, meals, patterns, schedule) do
    cond do
      not valid_meal_list?(meals) ->
        {:error, menu_error(plan, :meals, "is invalid")}

      not valid_pattern_list?(patterns) ->
        {:error, menu_error(plan, :day_patterns, "is invalid")}

      not is_map(schedule) ->
        {:error, menu_error(plan, :schedule, "is invalid")}

      true ->
        :ok
    end
  end

  defp valid_meal_list?(meals), do: is_list(meals) and Enum.all?(meals, &valid_meal_collection?/1)
  defp valid_pattern_list?(patterns), do: is_list(patterns) and Enum.all?(patterns, &is_map/1)

  defp valid_meal_collection?(meal) when is_map(meal), do: is_list(meal_items(meal))
  defp valid_meal_collection?(_meal), do: false

  defp validate_persisted_menu_nodes(plan, meals, patterns) do
    existing = load_existing_menu(plan)

    if persisted_meals_valid?(meals, existing) and persisted_patterns_valid?(patterns, existing) do
      {:ok, existing}
    else
      {:error, menu_error(plan, :meals, "contains an unknown persisted node")}
    end
  end

  defp load_existing_menu(plan) do
    %{
      meals: load_menu_rows(Meal.for_plan(Meal.for_business(plan.business_id), plan.id)),
      items: load_menu_rows(MealItem.for_plan(MealItem.for_business(plan.business_id), plan.id)),
      patterns: load_menu_rows(DayPattern.for_plan(DayPattern.for_business(plan.business_id), plan.id)),
      options: load_menu_rows(MealOption.for_plan(MealOption.for_business(plan.business_id), plan.id))
    }
  end

  defp load_menu_rows(query), do: query |> Repo.all() |> Map.new(&{&1.id, &1})

  defp persisted_meals_valid?(meals, existing) do
    meal_ids = meals |> Enum.map(&node_id/1) |> Enum.reject(&is_nil/1)
    item_ids = meals |> Enum.flat_map(&meal_items/1) |> Enum.map(&node_id/1) |> Enum.reject(&is_nil/1)

    unique?(meal_ids) and unique?(item_ids) and
      Enum.all?(meal_ids, &(valid_uuid?(&1) and Map.has_key?(existing.meals, &1))) and
      Enum.all?(meals, &persisted_items_belong_to_meal?(&1, existing.items))
  end

  defp persisted_patterns_valid?(patterns, existing) do
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

  defp persisted_item_belongs?(%MealItem{nutrition_meal_id: meal_id}, meal), do: meal_id == node_id(meal)
  defp persisted_item_belongs?(_item, _meal), do: false

  defp validate_menu_local_references(plan, meals, patterns) do
    nodes = meals ++ Enum.flat_map(meals, &meal_items/1) ++ patterns ++ all_options(patterns)
    refs = nodes |> Enum.map(&node_ref/1) |> Enum.reject(&is_nil/1)

    if Enum.all?(nodes, &valid_node_identity?/1) and unique?(refs) do
      :ok
    else
      {:error, menu_error(plan, :meals, "contains invalid or duplicate local references")}
    end
  end

  defp valid_node_identity?(node) do
    case {node_id(node), node_ref(node)} do
      {id, nil} -> valid_uuid?(id)
      {nil, ref} -> valid_local_ref?(ref)
      {_id, _ref} -> false
    end
  end

  defp validate_menu_positions(plan, meals, patterns) do
    meals_valid? = unique_nonnegative_positions?(meals)
    items_valid? = Enum.all?(meals, &unique_nonnegative_positions?(meal_items(&1)))
    patterns_valid? = unique_nonnegative_positions?(patterns)

    if meals_valid? and items_valid? and patterns_valid? do
      :ok
    else
      {:error, menu_error(plan, :meals, "positions must be unique nonnegative integers")}
    end
  end

  defp validate_day_patterns(plan, patterns, meals) do
    meal_ids = submitted_identities(meals)

    cond do
      patterns == [] ->
        {:error, menu_error(plan, :day_patterns, "must contain at least one Day Pattern")}

      Enum.all?(patterns, &valid_pattern_slots?(&1, meal_ids)) ->
        :ok

      true ->
        {:error, menu_error(plan, :day_patterns, "contains invalid Meal Slots or Meal Options")}
    end
  end

  defp valid_pattern_slots?(pattern, meal_ids) do
    case Map.get(pattern, :slots, []) do
      slots when is_list(slots) -> unique_slots?(slots) and Enum.all?(slots, &valid_slot?(&1, meal_ids))
      _other -> false
    end
  end

  defp unique_slots?(slots) do
    names = Enum.map(slots, &slot_name/1)
    Enum.all?(names, &(not is_nil(&1))) and unique?(names)
  end

  defp valid_slot?(slot, meal_ids) when is_map(slot) do
    options = slot_options(slot)

    is_list(options) and options != [] and contiguous_from_zero?(options) and unique_option_meals?(options) and
      Enum.all?(options, &valid_option_meal?(&1, meal_ids))
  end

  defp valid_slot?(_slot, _meal_ids), do: false

  defp unique_option_meals?(options) do
    identities = Enum.map(options, &option_meal_identity/1)
    Enum.all?(identities, &(not is_nil(&1))) and unique?(identities)
  end

  defp valid_option_meal?(option, meal_ids) do
    case option_meal_identity(option) do
      {_kind, value} -> Map.has_key?(meal_ids, value)
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
    if valid_schedule?(schedule, submitted_identities(patterns)) do
      :ok
    else
      {:error, menu_error(plan, :schedule, "must map every weekday to a Day Pattern in this Menu")}
    end
  end

  defp valid_schedule?(schedule, pattern_ids) when is_map(schedule) do
    Enum.all?(WeekSchedule.weekdays(), fn weekday ->
      case schedule_pattern(schedule, weekday) do
        value when is_binary(value) -> Map.has_key?(pattern_ids, value)
        _other -> false
      end
    end)
  end

  defp valid_schedule?(_schedule, _pattern_ids), do: false

  defp schedule_pattern(schedule, weekday) do
    Map.get(schedule, weekday) || Map.get(schedule, Atom.to_string(weekday))
  end

  defp submitted_identities(nodes) do
    Map.new(Enum.flat_map(nodes, &node_identities/1), &{&1, true})
  end

  defp node_identities(node), do: Enum.reject([node_id(node), node_ref(node)], &is_nil/1)

  defp contiguous_from_zero?(nodes) do
    count = length(nodes)
    positions = Enum.map(nodes, &node_position/1)
    Enum.all?(positions, &valid_position?/1) and Enum.sort(positions) == Enum.to_list(0..(count - 1))
  end

  defp unique_nonnegative_positions?(nodes) do
    positions = Enum.map(nodes, &node_position/1)
    Enum.all?(positions, &valid_position?/1) and unique?(positions)
  end

  defp valid_position?(position), do: is_integer(position) and position >= 0 and position <= @max_position

  defp resolve_menu_items(ctx, plan, meals) do
    specs = meals |> Enum.flat_map(&meal_items/1) |> Enum.map(&library_item/1)

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
    case Library.resolve_items(ctx, specs) do
      {:ok, resolved} -> {:ok, resolved}
      {:error, :not_found} -> {:error, :not_found}
      {:error, :invalid_portion} -> {:error, menu_error(plan, :meals, "contains an invalid Portion")}
    end
  end

  defp library_item(input) do
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

  defp attach_resolved(meals, resolved) do
    {attached, _remaining} =
      Enum.map_reduce(meals, resolved, fn meal, remaining ->
        count = length(meal_items(meal))
        {resolved_items, rest} = Enum.split(remaining, count)
        {Map.put(meal, :resolved_items, Enum.zip(meal_items(meal), resolved_items)), rest}
      end)

    attached
  end

  defp persist_menu_patterns(plan, menu) do
    with :ok <- stage_retained_patterns(plan, menu) do
      persist_pattern_inputs(plan, menu)
    end
  end

  defp persist_pattern_inputs(plan, menu) do
    Enum.reduce_while(menu.day_patterns, {:ok, %{}}, fn input, {:ok, ids} ->
      case persist_pattern(plan, input, menu.existing) do
        {:ok, pattern} -> {:cont, {:ok, merge_identity(ids, input, pattern.id)}}
        {:error, reason} -> {:halt, {:error, reason}}
      end
    end)
  end

  defp persist_pattern(plan, input, existing) do
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

  defp stage_retained_patterns(plan, menu) do
    retained =
      menu.day_patterns
      |> Enum.map(&node_id/1)
      |> Enum.reject(&is_nil/1)
      |> Enum.map(&Map.fetch!(menu.existing.patterns, &1))

    current_positions = Enum.map(Map.values(menu.existing.patterns), & &1.position)
    requested_positions = Enum.map(menu.day_patterns, &node_position/1)

    stage_positions(plan, retained, current_positions ++ requested_positions, fn pattern, position ->
      DayPattern
      |> DayPattern.for_business(plan.business_id)
      |> DayPattern.for_plan(plan.id)
      |> where([row], row.id == ^pattern.id)
      |> Repo.update_all(set: [position: position])
    end)
  end

  defp persist_menu_options(plan, menu, meal_ids, pattern_ids) do
    MealOption
    |> MealOption.for_business(plan.business_id)
    |> MealOption.for_plan(plan.id)
    |> Repo.delete_all()

    menu.day_patterns
    |> Enum.flat_map(&option_rows(&1, pattern_ids, meal_ids))
    |> persist_option_rows(plan)
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

  defp option_meal_key(option), do: Map.get(option, :nutrition_meal_id) || Map.get(option, :meal_local_ref)

  defp persist_option_rows(inputs, plan) do
    Enum.reduce_while(inputs, :ok, fn input, :ok ->
      case persist_option_row(plan, input) do
        {:ok, _option} -> {:cont, :ok}
        {:error, reason} -> {:halt, {:error, reason}}
      end
    end)
  end

  defp persist_option_row(plan, input) do
    changeset =
      MealOption.insert_changeset(
        plan.business_id,
        plan.id,
        input.nutrition_day_pattern_id,
        input.nutrition_meal_id,
        %{meal_slot: input.meal_slot, position: input.position}
      )

    changeset = if input.id, do: put_change(changeset, :id, input.id), else: changeset
    Repo.insert(changeset)
  end

  defp persist_menu_schedule(plan, menu, pattern_ids) do
    WeekSchedule
    |> WeekSchedule.for_business(plan.business_id)
    |> WeekSchedule.for_plan(plan.id)
    |> Repo.delete_all()

    Enum.reduce_while(WeekSchedule.weekdays(), :ok, fn weekday, :ok ->
      pattern_id = Map.fetch!(pattern_ids, schedule_pattern(menu.schedule, weekday))

      case WeekSchedule.insert_changeset(plan.business_id, plan.id, pattern_id, %{weekday: weekday})
           |> Repo.insert() do
        {:ok, _row} -> {:cont, :ok}
        {:error, reason} -> {:halt, {:error, reason}}
      end
    end)
  end

  defp delete_omitted_patterns(plan, kept_ids) do
    DayPattern
    |> DayPattern.for_business(plan.business_id)
    |> DayPattern.for_plan(plan.id)
    |> where([pattern], pattern.id not in ^kept_ids)
    |> Repo.delete_all()

    :ok
  end

  defp persist_menu_meals(plan, menu) do
    with :ok <- stage_retained_meals(plan, menu),
         :ok <- delete_omitted_meals(plan, menu.meals) do
      persist_meal_inputs(plan, menu)
    end
  end

  defp persist_meal_inputs(plan, menu) do
    Enum.reduce_while(menu.meals, {:ok, %{}}, fn input, {:ok, ids} ->
      case persist_meal(plan, input, menu.existing) do
        {:ok, meal} -> {:cont, {:ok, merge_identity(ids, input, meal.id)}}
        {:error, reason} -> {:halt, {:error, reason}}
      end
    end)
  end

  defp persist_meal(plan, input, existing) do
    result =
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

    case result do
      {:ok, meal} -> persist_meal_items(plan, meal, input, existing)
      {:error, changeset} -> {:error, changeset}
    end
  end

  defp persist_meal_items(plan, meal, meal_input, existing) do
    inputs = Map.get(meal_input, :resolved_items) || []

    with :ok <- stage_retained_items(plan, meal, inputs, existing),
         :ok <- delete_omitted_items(plan, meal, inputs) do
      persist_item_inputs(plan, meal, inputs, existing)
    end
  end

  defp persist_item_inputs(plan, meal, inputs, existing) do
    Enum.reduce_while(inputs, {:ok, meal}, fn {input, resolved}, {:ok, meal} ->
      case persist_meal_item(plan, meal, input, resolved, existing) do
        {:ok, _item} -> {:cont, {:ok, meal}}
        {:error, reason} -> {:halt, {:error, reason}}
      end
    end)
  end

  defp persist_meal_item(plan, meal, input, resolved, existing) do
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

  defp stage_retained_meals(plan, menu) do
    retained =
      menu.meals
      |> Enum.map(&node_id/1)
      |> Enum.reject(&is_nil/1)
      |> Enum.map(&Map.fetch!(menu.existing.meals, &1))

    current_positions = Enum.map(Map.values(menu.existing.meals), & &1.position)
    requested_positions = Enum.map(menu.meals, &node_position/1)

    stage_positions(plan, retained, current_positions ++ requested_positions, fn meal, position ->
      Meal
      |> Meal.for_business(plan.business_id)
      |> Meal.for_plan(plan.id)
      |> where([row], row.id == ^meal.id)
      |> Repo.update_all(set: [position: position])
    end)
  end

  defp delete_omitted_meals(plan, meals) do
    requested_ids = meals |> Enum.map(&node_id/1) |> Enum.reject(&is_nil/1)

    Meal
    |> Meal.for_business(plan.business_id)
    |> Meal.for_plan(plan.id)
    |> where([meal], meal.id not in ^requested_ids)
    |> Repo.delete_all()

    :ok
  end

  defp stage_retained_items(plan, meal, inputs, existing) do
    retained =
      inputs
      |> Enum.map(fn {input, _resolved} -> node_id(input) end)
      |> Enum.reject(&is_nil/1)
      |> Enum.map(&Map.fetch!(existing.items, &1))

    existing_for_meal =
      existing.items
      |> Map.values()
      |> Enum.filter(&(&1.nutrition_meal_id == meal.id))

    current_positions = Enum.map(existing_for_meal, & &1.position)
    requested_positions = Enum.map(inputs, fn {input, _resolved} -> node_position(input) end)

    stage_positions(plan, retained, current_positions ++ requested_positions, fn item, position ->
      MealItem
      |> MealItem.for_business(plan.business_id)
      |> MealItem.for_meal(meal.id)
      |> where([row], row.id == ^item.id)
      |> Repo.update_all(set: [position: position])
    end)
  end

  defp delete_omitted_items(plan, meal, inputs) do
    requested_ids =
      inputs
      |> Enum.map(fn {input, _resolved} -> node_id(input) end)
      |> Enum.reject(&is_nil/1)

    MealItem
    |> MealItem.for_business(plan.business_id)
    |> MealItem.for_meal(meal.id)
    |> where([item], item.id not in ^requested_ids)
    |> Repo.delete_all()

    :ok
  end

  defp force_requested_position(changeset, input) do
    force_change(changeset, :position, node_position(input))
  end

  defp stage_positions(_owner, [], _positions, _update), do: :ok

  defp stage_positions(owner, retained, positions, update) do
    used = MapSet.new(positions)

    case free_stage_positions(used, length(retained)) do
      {:ok, staged} ->
        retained
        |> Enum.zip(staged)
        |> Enum.each(fn {row, position} -> update.(row, position) end)

        :ok

      :error ->
        {:error, menu_error(owner, :meals, "positions are too large to safely reorder")}
    end
  end

  defp free_stage_positions(used, count) do
    positions =
      0..min(@max_position, MapSet.size(used) + count)
      |> Stream.reject(&MapSet.member?(used, &1))
      |> Enum.take(count)

    if length(positions) == count, do: {:ok, positions}, else: :error
  end

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
  defp all_options(patterns), do: Enum.flat_map(patterns, fn pattern -> Enum.flat_map(pattern_slots(pattern), &slot_options/1) end)

  defp slot_name(slot) when is_map(slot) do
    case MealSlot.cast(Map.get(slot, :meal_slot)) do
      {:ok, name} -> name
      :error -> nil
    end
  end

  defp slot_name(_slot), do: nil

  defp merge_identity(ids, input, saved_id) do
    ids
    |> put_identity(node_id(input), saved_id)
    |> put_identity(node_ref(input), saved_id)
  end

  defp put_identity(ids, nil, _saved_id), do: ids
  defp put_identity(ids, key, saved_id), do: Map.put(ids, key, saved_id)

  defp node_id(node), do: Map.get(node, :id)
  defp node_ref(node), do: Map.get(node, :local_ref)
  defp node_position(node), do: Map.get(node, :position)
  defp unique?(values), do: length(values) == MapSet.size(MapSet.new(values))
  defp valid_uuid?(value), do: match?({:ok, _uuid}, Ecto.UUID.cast(value))

  defp valid_local_ref?(value),
    do: is_binary(value) and value == String.trim(value) and value != "" and byte_size(value) <= 100

  defp menu_error(plan, field, message), do: plan |> change() |> add_error(field, message)

  defp insert_everyday_template(ctx, attrs) do
    with {:ok, plan} <- ctx.business_id |> Plan.insert_changeset(ctx.user_id, attrs) |> Repo.insert(),
         {:ok, pattern} <- insert_everyday_pattern(plan),
         :ok <- assign_everyday_week(plan, pattern) do
      plan
    else
      {:error, reason} -> Repo.rollback(reason)
    end
  end

  defp insert_everyday_pattern(plan) do
    DayPattern.insert_changeset(plan.business_id, plan.id, %{name: @everyday, position: 0})
    |> Repo.insert()
  end

  defp assign_everyday_week(plan, pattern) do
    Enum.reduce_while(WeekSchedule.weekdays(), :ok, fn weekday, :ok ->
      case WeekSchedule.insert_changeset(plan.business_id, plan.id, pattern.id, %{weekday: weekday})
           |> Repo.insert() do
        {:ok, _row} -> {:cont, :ok}
        {:error, reason} -> {:halt, {:error, reason}}
      end
    end)
  end

  defp update_active(%Plan{archived_at: archived_at} = plan, _attrs) when not is_nil(archived_at) do
    {:error, archived_changeset(plan)}
  end

  defp update_active(plan, attrs) do
    plan
    |> Plan.update_changeset(attrs)
    |> put_change(:revision, plan.revision + 1)
    |> Repo.update()
  end

  defp archive(%Plan{archived_at: archived_at} = plan) when not is_nil(archived_at), do: {:ok, plan}

  defp archive(plan) do
    plan
    |> Plan.lifecycle_changeset(%{archived_at: DateTime.utc_now(:second), revision: plan.revision + 1})
    |> Repo.update()
  end

  defp restore(%Plan{archived_at: nil} = plan), do: {:ok, plan}

  defp restore(plan) do
    plan
    |> Plan.lifecycle_changeset(%{archived_at: nil, revision: plan.revision + 1})
    |> Repo.update()
  end

  defp mutate_template(ctx, template_id, expected_revision, mutation, opts \\ []) do
    with :ok <- ensure_coach(ctx) do
      result = Repo.transaction(fn -> mutate_locked_template(ctx, template_id, expected_revision, mutation) end)
      finalize_template_mutation(result, ctx, Keyword.get(opts, :reload?, true))
    end
  end

  defp mutate_plan(ctx, plan_id, expected_revision, mutation, opts \\ []) do
    with :ok <- ensure_coach(ctx) do
      result = Repo.transaction(fn -> mutate_locked_plan(ctx, plan_id, expected_revision, mutation) end)
      finalize_plan_mutation(result, ctx, Keyword.get(opts, :reload?, true))
    end
  end

  defp mutate_locked_template(ctx, template_id, expected_revision, mutation) do
    template = ctx |> template_query() |> lock("FOR UPDATE") |> Repo.get(template_id)
    mutate_revisioned(template, expected_revision, mutation)
  end

  defp mutate_locked_plan(ctx, plan_id, expected_revision, mutation) do
    plan = ctx |> plan_query() |> lock("FOR UPDATE") |> Repo.get(plan_id)

    case authorize_locked_plan(ctx, plan) do
      :ok -> mutate_revisioned(plan, expected_revision, mutation)
      :error -> Repo.rollback(:not_found)
    end
  end

  defp duplicate_locked_template(ctx, template_id, expected_revision) do
    template =
      ctx
      |> template_query()
      |> Plan.for_archived(false)
      |> lock("FOR UPDATE")
      |> Repo.get(template_id)

    template
    |> mutate_revisioned(expected_revision, fn locked ->
      locked
      |> preload_duplicate_source()
      |> then(&duplicate_template_rows(ctx, &1))
    end)
  end

  defp preload_duplicate_source(template) do
    Plan
    |> Plan.for_business(template.business_id)
    |> Plan.include_menu(template.business_id)
    |> Repo.get(template.id)
  end

  defp duplicate_template_rows(ctx, template) do
    attrs = %{
      name: duplicate_template_name(template.name, ctx.business_id),
      description: template.description,
      target_calories: template.target_calories,
      target_protein_g: template.target_protein_g,
      target_carbs_g: template.target_carbs_g,
      target_fat_g: template.target_fat_g,
      target_fiber_g: template.target_fiber_g
    }

    with {:ok, copy} <- Plan.insert_changeset(ctx.business_id, ctx.user_id, attrs) |> Repo.insert(),
         {:ok, pattern_ids} <- duplicate_day_pattern_rows(template.day_patterns, copy),
         {:ok, meal_ids} <- duplicate_meal_rows(template.meals, copy),
         :ok <- duplicate_meal_option_rows(template.day_patterns, copy, pattern_ids, meal_ids),
         :ok <- duplicate_schedule_rows(template.week_schedule, copy, pattern_ids) do
      {:ok, copy}
    end
  end

  defp duplicate_day_pattern_rows(patterns, copy) do
    Enum.reduce_while(patterns, {:ok, %{}}, fn pattern, {:ok, ids} ->
      attrs = %{name: pattern.name, position: pattern.position}

      case DayPattern.insert_changeset(copy.business_id, copy.id, attrs) |> Repo.insert() do
        {:ok, copied} -> {:cont, {:ok, Map.put(ids, pattern.id, copied.id)}}
        {:error, reason} -> {:halt, {:error, reason}}
      end
    end)
  end

  defp duplicate_schedule_rows(schedule, copy, pattern_ids) do
    Enum.reduce_while(schedule, :ok, fn row, :ok ->
      copied_pattern_id = Map.fetch!(pattern_ids, row.nutrition_day_pattern_id)

      case WeekSchedule.insert_changeset(copy.business_id, copy.id, copied_pattern_id, %{weekday: row.weekday})
           |> Repo.insert() do
        {:ok, _row} -> {:cont, :ok}
        {:error, reason} -> {:halt, {:error, reason}}
      end
    end)
  end

  defp duplicate_meal_rows(meals, copy) do
    Enum.reduce_while(meals, {:ok, %{}}, fn meal, {:ok, ids} ->
      case copy_meal_row(meal, copy) do
        {:ok, copied} -> {:cont, {:ok, Map.put(ids, meal.id, copied.id)}}
        {:error, reason} -> {:halt, {:error, reason}}
      end
    end)
  end

  defp copy_meal_row(meal, copy) do
    attrs = %{name: meal.name, notes: meal.notes, position: meal.position}

    case Meal.insert_changeset(copy.business_id, copy.id, attrs) |> Repo.insert() do
      {:ok, copied} ->
        case duplicate_meal_item_rows(meal.meal_items, copy, copied) do
          :ok -> {:ok, copied}
          {:error, reason} -> {:error, reason}
        end

      {:error, reason} ->
        {:error, reason}
    end
  end

  defp duplicate_meal_option_rows(patterns, copy, pattern_ids, meal_ids) do
    patterns
    |> Enum.flat_map(&meal_options_for/1)
    |> Enum.reduce_while(:ok, fn option, :ok ->
      attrs = %{meal_slot: option.meal_slot, position: option.position}
      pattern_id = Map.fetch!(pattern_ids, option.nutrition_day_pattern_id)
      meal_id = Map.fetch!(meal_ids, option.nutrition_meal_id)

      case MealOption.insert_changeset(copy.business_id, copy.id, pattern_id, meal_id, attrs) |> Repo.insert() do
        {:ok, _copied} -> {:cont, :ok}
        {:error, reason} -> {:halt, {:error, reason}}
      end
    end)
  end

  defp meal_options_for(%{meal_options: options}) when is_list(options), do: options
  defp meal_options_for(_pattern), do: []

  defp duplicate_meal_item_rows(items, copy, copied_meal) do
    Enum.reduce_while(items, :ok, fn item, :ok ->
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

      case MealItem.insert_changeset(copy.business_id, copy.id, copied_meal.id, attrs) |> Repo.insert() do
        {:ok, _row} -> {:cont, :ok}
        {:error, reason} -> {:halt, {:error, reason}}
      end
    end)
  end

  defp duplicate_template_name(original_name, business_id) do
    existing_names =
      Plan
      |> Plan.for_business(business_id)
      |> Plan.templates()
      |> select([template], template.name)
      |> Repo.all()

    CopyName.next(original_name, existing_names)
  end

  defp lock_business_for_duplicate_name(business_id) do
    Business
    |> where([business], business.id == ^business_id)
    |> select([business], business.id)
    |> lock("FOR UPDATE")
    |> Repo.one()
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

  defp finalize_template_mutation({:ok, template}, ctx, true), do: get_template(ctx, template.id)
  defp finalize_template_mutation({:ok, template}, _ctx, false), do: {:ok, template}
  defp finalize_template_mutation({:error, reason}, _ctx, _reload?), do: {:error, reason}

  defp finalize_plan_mutation({:ok, plan}, ctx, true), do: get_plan(ctx, plan.id)
  defp finalize_plan_mutation({:ok, plan}, _ctx, false), do: {:ok, plan}
  defp finalize_plan_mutation({:error, reason}, _ctx, _reload?), do: {:error, reason}

  defp preload_created({:ok, plan}, business_id) do
    {:ok,
     Plan
     |> Plan.for_business(business_id)
     |> Plan.join_assigned_client_count(business_id)
     |> Plan.include_menu(business_id)
     |> Repo.get(plan.id)}
  end

  defp preload_created(error, _business_id), do: error

  defp authorize_locked_plan(_ctx, nil), do: :error
  defp authorize_locked_plan(ctx, plan), do: if(authorize_plan(ctx, plan) == :ok, do: :ok, else: :error)

  defp authorize_plan(_ctx, %Plan{kind: :template}), do: :ok
  defp authorize_plan(ctx, %Plan{kind: :client_plan, client_id: client_id}), do: Clients.authorize_client_id(ctx, client_id)

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

  defp plan_query(%Ctx{} = ctx), do: Plan.for_business(Plan, ctx.business_id)

  defp ensure_coach(%Ctx{coach_id: coach_id}) when not is_nil(coach_id), do: :ok
  defp ensure_coach(%Ctx{}), do: {:error, :not_found}

  defp ok_or_not_found(nil), do: {:error, :not_found}
  defp ok_or_not_found(value), do: {:ok, value}
end
