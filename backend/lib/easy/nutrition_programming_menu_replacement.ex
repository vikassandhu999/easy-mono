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

  @type portion_input() :: %{
          required(:kind) => :gram | :serving | String.t(),
          optional(:grams) => number() | nil,
          optional(:amount) => number() | nil,
          optional(:unit) => String.t() | nil,
          optional(:label) => String.t() | nil
        }

  @type meal_item_input() :: %{
          required(:id) => String.t(),
          required(:kind) => :food | :recipe | String.t(),
          optional(:food_id) => String.t() | nil,
          optional(:recipe_id) => String.t() | nil,
          required(:portion) => portion_input()
        }

  @type meal_input() :: %{
          required(:id) => String.t(),
          required(:name) => String.t(),
          optional(:notes) => String.t() | nil,
          required(:meal_items) => [meal_item_input()]
        }

  @type meal_option_input() :: %{
          required(:id) => String.t(),
          required(:nutrition_meal_id) => String.t()
        }

  @type meal_slot_input() :: %{
          required(:meal_slot) => atom() | String.t(),
          required(:options) => [meal_option_input()]
        }

  @type day_pattern_input() :: %{
          required(:id) => String.t(),
          required(:name) => String.t(),
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
          required(:patterns) => %{optional(String.t()) => DayPattern.t()}
        }

  @type resolved_meal_input() :: %{
          required(:id) => String.t(),
          required(:name) => String.t(),
          optional(:notes) => String.t() | nil,
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
         :ok <- reconcile_meals(plan, menu),
         :ok <- reconcile_day_patterns(plan, menu),
         :ok <- rebuild_meal_options(plan, menu),
         :ok <- rebuild_week_schedule(plan, menu) do
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
         :ok <- validate_node_ids(plan, meals, patterns),
         {:ok, existing} <- validate_item_owners(plan, meals),
         :ok <- validate_day_patterns(plan, patterns, meals),
         :ok <- validate_schedule(plan, schedule, patterns),
         {:ok, resolved} <- resolve_menu_items(ctx, plan, meals) do
      {:ok,
       %{
         meals: meals |> zip_resolved_items(resolved) |> positions(),
         day_patterns: positions(patterns),
         schedule: schedule,
         existing: existing
       }}
    end
  end

  defp validate_menu_shape(plan, meals, patterns, schedule) do
    cond do
      not (is_list(meals) and Enum.all?(meals, &meal_shaped?/1)) ->
        {:error, menu_error(plan, :meals, "is invalid")}

      not (is_list(patterns) and Enum.all?(patterns, &pattern_shaped?/1)) ->
        {:error, menu_error(plan, :day_patterns, "is invalid")}

      not is_map(schedule) ->
        {:error, menu_error(plan, :schedule, "is invalid")}

      true ->
        :ok
    end
  end

  defp meal_shaped?(%{meal_items: items}) when is_list(items), do: Enum.all?(items, &is_map/1)
  defp meal_shaped?(_meal), do: false

  defp pattern_shaped?(%{slots: slots}) when is_list(slots) do
    Enum.all?(slots, fn
      %{options: options} when is_list(options) -> Enum.all?(options, &is_map/1)
      _other -> false
    end)
  end

  defp pattern_shaped?(_pattern), do: false

  defp validate_node_ids(plan, meals, patterns) do
    nodes = meals ++ Enum.flat_map(meals, &meal_items/1) ++ patterns ++ all_options(patterns)
    ids = Enum.map(nodes, &node_id/1)

    if Enum.all?(ids, &valid_uuid?/1) and unique?(ids) do
      :ok
    else
      {:error, menu_error(plan, :menu, "node IDs must be unique UUIDs")}
    end
  end

  # Look up only this plan's rows. A new ID is inserted, never used to load or
  # update another plan's row. Primary-key constraints reject any collision.
  defp validate_item_owners(plan, meals) do
    existing = %{
      meals: index_by_id(Meal.for_plan(Meal.for_business(plan.business_id), plan.id)),
      items: index_by_id(MealItem.for_plan(MealItem.for_business(plan.business_id), plan.id)),
      patterns: index_by_id(DayPattern.for_plan(DayPattern.for_business(plan.business_id), plan.id))
    }

    valid? =
      Enum.all?(meals, fn meal ->
        Enum.all?(meal_items(meal), fn item ->
          saved = Map.get(existing.items, node_id(item))
          is_nil(saved) or saved.nutrition_meal_id == meal.id
        end)
      end)

    if valid?, do: {:ok, existing}, else: {:error, menu_error(plan, :meals, "contains an item belonging to another meal")}
  end

  defp index_by_id(query), do: query |> Repo.all() |> Map.new(&{&1.id, &1})

  defp positions(nodes), do: Enum.with_index(nodes, &Map.put(&1, :position, &2))

  defp validate_day_patterns(plan, patterns, meals) do
    meal_identities = MapSet.new(meals, &node_id/1)

    cond do
      patterns == [] ->
        {:error, menu_error(plan, :day_patterns, "must contain at least one Day Pattern")}

      Enum.all?(patterns, &valid_pattern_slots?(&1, meal_identities)) ->
        :ok

      true ->
        {:error, menu_error(plan, :day_patterns, "contains invalid Meal Slots or Meal Options")}
    end
  end

  defp valid_pattern_slots?(pattern, meal_ids) do
    unique_slots?(pattern.slots) and Enum.all?(pattern.slots, &valid_slot?(&1, meal_ids))
  end

  defp unique_slots?(slots) do
    names = Enum.map(slots, &slot_name/1)
    Enum.all?(names, &(not is_nil(&1))) and unique?(names)
  end

  defp valid_slot?(slot, meal_identities) do
    options = slot.options

    options != [] and
      unique_option_meals?(options) and
      Enum.all?(options, &valid_option_meal?(&1, meal_identities))
  end

  defp unique_option_meals?(options) do
    ids = Enum.map(options, &Map.get(&1, :nutrition_meal_id))
    unique?(ids)
  end

  defp valid_option_meal?(option, meal_ids), do: MapSet.member?(meal_ids, Map.get(option, :nutrition_meal_id))

  defp validate_schedule(plan, schedule, patterns) do
    pattern_identities = MapSet.new(patterns, &node_id/1)

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

  defp resolve_menu_items(ctx, plan, meals) do
    specs = meals |> Enum.flat_map(&meal_items/1) |> Enum.map(&library_item_spec/1)

    cond do
      Enum.any?(specs, &(is_nil(&1) or not valid_uuid?(&1.id))) ->
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
        {Map.put(meal, :resolved_items, Enum.zip(positions(meal_items(meal)), resolved_items)), rest}
      end)

    zipped
  end

  # Reconciliation updates submitted ids in place, removes omitted rows, then
  # inserts new rows with their submitted UUIDs.
  defp reconcile_meals(plan, menu) do
    scope = Meal |> Meal.for_business(plan.business_id) |> Meal.for_plan(plan.id)

    with :ok <- park_retained_meals(plan, menu),
         :ok <- delete_omitted(scope, menu.meals) do
      each_ok(menu.meals, &upsert_meal(plan, &1, menu.existing))
    end
  end

  defp upsert_meal(plan, input, existing) do
    with {:ok, meal} <- upsert_meal_row(plan, input, existing),
         :ok <- reconcile_meal_items(plan, meal, Map.fetch!(input, :resolved_items), existing) do
      {:ok, meal}
    end
  end

  defp upsert_meal_row(plan, input, existing) do
    case Map.get(existing.meals, input.id) do
      nil ->
        Meal.insert_changeset(plan.business_id, plan.id, input) |> insert_with_id(input.id)

      row ->
        row
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

    case Map.get(existing.items, input.id) do
      nil ->
        MealItem.insert_changeset(plan.business_id, plan.id, meal.id, attrs) |> insert_with_id(input.id)

      row ->
        row
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
      each_ok(menu.day_patterns, &upsert_pattern(plan, &1, menu.existing))
    end
  end

  defp upsert_pattern(plan, input, existing) do
    case Map.get(existing.patterns, input.id) do
      nil ->
        DayPattern.insert_changeset(plan.business_id, plan.id, input) |> insert_with_id(input.id)

      row ->
        row
        |> DayPattern.update_changeset(input)
        |> force_requested_position(input)
        |> Repo.update()
    end
  end

  defp rebuild_meal_options(plan, menu) do
    MealOption
    |> MealOption.for_business(plan.business_id)
    |> MealOption.for_plan(plan.id)
    |> Repo.delete_all()

    menu.day_patterns
    |> Enum.flat_map(&option_rows/1)
    |> each_ok(&insert_option(plan, &1))
  end

  defp option_rows(pattern) do
    Enum.flat_map(pattern.slots, fn slot ->
      Enum.with_index(slot.options, fn option, position ->
        %{
          id: option.id,
          meal_slot: slot_name(slot),
          position: position,
          nutrition_day_pattern_id: pattern.id,
          nutrition_meal_id: option.nutrition_meal_id
        }
      end)
    end)
  end

  defp insert_option(plan, row) do
    MealOption.insert_changeset(
      plan.business_id,
      plan.id,
      row.nutrition_day_pattern_id,
      row.nutrition_meal_id,
      %{meal_slot: row.meal_slot, position: row.position}
    )
    |> insert_with_id(row.id)
  end

  defp rebuild_week_schedule(plan, menu) do
    WeekSchedule
    |> WeekSchedule.for_business(plan.business_id)
    |> WeekSchedule.for_plan(plan.id)
    |> Repo.delete_all()

    each_ok(WeekSchedule.weekdays(), fn weekday ->
      WeekSchedule.insert_changeset(plan.business_id, plan.id, Map.fetch!(menu.schedule, weekday), %{weekday: weekday})
      |> Repo.insert()
    end)
  end

  defp insert_with_id(changeset, id) do
    table = changeset.data.__struct__.__schema__(:source)

    changeset
    |> put_change(:id, id)
    |> unique_constraint(:id, name: "#{table}_pkey")
    |> Repo.insert()
  end

  # A retained row's requested position may still belong to a sibling. Parking
  # retained rows first prevents per-statement unique-index collisions.
  defp park_retained_meals(plan, menu) do
    park_retained(
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
    |> Enum.flat_map(fn id ->
      case Map.fetch(existing_by_id, id) do
        {:ok, row} -> [row]
        :error -> []
      end
    end)
  end

  defp occupied_positions(existing_rows, inputs) do
    Enum.map(existing_rows, & &1.position) ++ Enum.map(inputs, &node_position/1)
  end

  defp park_retained(retained, occupied, park) do
    occupied = MapSet.new(occupied)

    free =
      0..(MapSet.size(occupied) + length(retained))
      |> Stream.reject(&MapSet.member?(occupied, &1))
      |> Enum.take(length(retained))

    retained |> Enum.zip(free) |> Enum.each(fn {row, position} -> park.(row, position) end)
    :ok
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
  defp node_position(node), do: Map.get(node, :position)
  defp meal_items(meal), do: meal.meal_items

  defp all_options(patterns) do
    Enum.flat_map(patterns, fn pattern ->
      Enum.flat_map(pattern.slots, & &1.options)
    end)
  end

  defp slot_name(slot) do
    case MealSlot.cast(Map.get(slot, :meal_slot)) do
      {:ok, name} -> name
      :error -> nil
    end
  end

  defp unique?(values), do: length(values) == MapSet.size(MapSet.new(values))
  defp valid_uuid?(value), do: is_binary(value) and Ecto.UUID.cast(value) == {:ok, value}

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
end
