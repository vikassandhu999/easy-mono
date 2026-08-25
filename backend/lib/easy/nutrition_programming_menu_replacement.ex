defmodule Easy.Nutrition.Programming.MenuReplacement do
  import Ecto.Changeset
  import Ecto.Query

  alias Easy.Ctx

  alias Easy.Nutrition.{
    DayPattern,
    Food,
    Library,
    Meal,
    MealItem,
    MealOption,
    MealSlot,
    NutrientTotals,
    Plan,
    Recipe,
    WeekSchedule
  }

  alias Easy.Repo

  @max_position 2_147_483_647

  @type portion_input() :: %{
          required(:kind) => :gram | :serving | String.t(),
          optional(:grams) => number() | nil,
          optional(:amount) => number() | nil,
          optional(:unit) => String.t() | nil,
          optional(:label) => String.t() | nil
        }

  @type meal_item_input() :: %{
          optional(:id) => String.t(),
          optional(:local_ref) => String.t(),
          required(:kind) => :food | :recipe | String.t(),
          optional(:food_id) => String.t() | nil,
          optional(:recipe_id) => String.t() | nil,
          required(:position) => integer(),
          required(:portion) => portion_input()
        }

  @type meal_input() :: %{
          optional(:id) => String.t(),
          optional(:local_ref) => String.t(),
          required(:name) => String.t(),
          optional(:notes) => String.t() | nil,
          required(:position) => integer(),
          required(:meal_items) => [meal_item_input()]
        }

  @type meal_option_input() :: %{
          optional(:id) => String.t(),
          optional(:local_ref) => String.t(),
          optional(:nutrition_meal_id) => String.t(),
          optional(:meal_local_ref) => String.t(),
          required(:position) => integer()
        }

  @type meal_slot_input() :: %{
          required(:meal_slot) => atom() | String.t(),
          required(:options) => [meal_option_input()]
        }

  @type day_pattern_input() :: %{
          optional(:id) => String.t(),
          optional(:local_ref) => String.t(),
          required(:name) => String.t(),
          required(:position) => integer(),
          required(:slots) => [meal_slot_input()]
        }

  @type schedule_input() :: %{required(atom()) => String.t()}

  @type menu_input() :: %{
          required(:meals) => [meal_input()],
          required(:day_patterns) => [day_pattern_input()],
          required(:schedule) => schedule_input()
        }

  @type resolved_library_item() :: %{
          required(:kind) => :food | :recipe,
          required(:item) => Food.t() | Recipe.t(),
          required(:portion) => Library.resolved_portion(),
          required(:nutrients) => NutrientTotals.t()
        }

  @type existing_menu() :: %{
          required(:meals) => %{optional(String.t()) => Meal.t()},
          required(:items) => %{optional(String.t()) => MealItem.t()},
          required(:patterns) => %{optional(String.t()) => DayPattern.t()},
          required(:options) => %{optional(String.t()) => MealOption.t()}
        }

  @type resolved_meal_input() :: %{
          optional(:id) => String.t(),
          optional(:local_ref) => String.t(),
          required(:name) => String.t(),
          optional(:notes) => String.t() | nil,
          required(:position) => integer(),
          required(:meal_items) => [meal_item_input()],
          required(:resolved_items) => [{meal_item_input(), resolved_library_item()}]
        }

  @type resolved_menu() :: %{
          required(:meals) => [resolved_meal_input()],
          required(:day_patterns) => [day_pattern_input()],
          required(:schedule) => schedule_input(),
          required(:existing) => existing_menu()
        }

  @spec replace(Ctx.t(), Plan.t(), menu_input()) ::
          {:ok, Plan.t()} | {:error, :not_found | Ecto.Changeset.t()}
  def replace(_ctx, %Plan{archived_at: archived_at} = plan, _attrs)
      when not is_nil(archived_at) do
    {:error, archived_changeset(plan)}
  end

  def replace(%Ctx{} = ctx, %Plan{} = plan, attrs) do
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

  @spec validate_menu(Ctx.t(), Plan.t(), menu_input()) ::
          {:ok, resolved_menu()} | {:error, :not_found | Ecto.Changeset.t()}
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

  # Persisted ids must name live rows of this plan; persisted items must also
  # remain under their submitted Meal.
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

  # New nodes share one request-wide local-ref namespace, so every later
  # identity lookup is unambiguous.
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
    MapSet.new(Enum.flat_map(nodes, &Enum.reject([node_id(&1), node_ref(&1)], fn value -> is_nil(value) end)))
  end

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

  # Gram portions depend on cooked weight. Sorted share locks keep that value
  # stable and avoid deadlocks with concurrent Recipe edits.
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

  # Library resolutions retain flat submission order, so they zip back into
  # their owning Meals without another identity protocol.
  defp zip_resolved_items(meals, resolved) do
    {zipped, _rest} =
      Enum.map_reduce(meals, resolved, fn meal, rest ->
        {resolved_items, rest} = Enum.split(rest, length(meal_items(meal)))
        {Map.put(meal, :resolved_items, Enum.zip(meal_items(meal), resolved_items)), rest}
      end)

    zipped
  end

  # Reconciliation updates submitted ids in place, removes omitted rows, then
  # creates nodes identified by local refs.
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

  # A retained row's requested position may still belong to a sibling. Parking
  # retained rows first prevents per-statement unique-index collisions.
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

  # The loaded struct predates parking, so force the final requested position
  # even when the old in-memory value already matches it.
  defp force_requested_position(changeset, input) do
    force_change(changeset, :position, node_position(input))
  end

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

  defp all_options(patterns) do
    Enum.flat_map(patterns, fn pattern ->
      Enum.flat_map(pattern_slots(pattern), &slot_options/1)
    end)
  end

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

  defp menu_error(plan, field, message), do: plan |> change() |> add_error(field, message)

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
end
