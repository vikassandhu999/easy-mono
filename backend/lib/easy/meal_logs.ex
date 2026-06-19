defmodule Easy.MealLogs do
  alias Easy.Clients.Client
  alias Easy.Nutrition.Food
  alias Easy.Nutrition.FoodLogEntry
  alias Easy.MacroCalc
  alias Easy.Nutrition.Meal
  alias Easy.Nutrition.MealItem
  alias Easy.Nutrition.MealLog
  alias Easy.Nutrition.Plan
  alias Easy.Nutrition.PlanItem
  alias Easy.Nutrition.Recipe
  alias Easy.Repo

  import Ecto.Changeset
  import Ecto.Query

  @spec list_meal_logs(String.t(), String.t(), Date.t() | nil, Date.t() | nil, Date.t() | nil) ::
          {:ok, [MealLog.t()]}
  def list_meal_logs(business_id, client_id, date, from_date, to_date) do
    meal_logs =
      MealLog
      |> MealLog.for_client(business_id, client_id)
      |> MealLog.for_date_range(date, from_date, to_date)
      |> MealLog.ordered()
      |> MealLog.with_entries()
      |> Repo.all()

    {:ok, meal_logs}
  end

  @spec list_meal_logs_for_client(
          String.t(),
          String.t(),
          Date.t() | nil,
          Date.t() | nil,
          Date.t() | nil
        ) ::
          {:ok, [MealLog.t()]} | {:error, :not_found}
  def list_meal_logs_for_client(business_id, client_id, date, from_date, to_date) do
    with {:ok, _client} <- get_client(business_id, client_id) do
      list_meal_logs(business_id, client_id, date, from_date, to_date)
    end
  end

  @spec list_meal_logs_for_user(
          String.t(),
          String.t(),
          Date.t() | nil,
          Date.t() | nil,
          Date.t() | nil
        ) ::
          {:ok, [MealLog.t()]} | {:error, :not_found}
  def list_meal_logs_for_user(business_id, user_id, date, from_date, to_date) do
    with {:ok, client} <- get_client_for_user(business_id, user_id) do
      list_meal_logs(business_id, client.id, date, from_date, to_date)
    end
  end

  @spec get_client_meal_log(String.t(), String.t(), String.t()) ::
          {:ok, MealLog.t()} | {:error, :not_found}
  def get_client_meal_log(business_id, client_id, meal_log_id) do
    MealLog
    |> MealLog.for_business(business_id)
    |> MealLog.for_client(client_id)
    |> MealLog.with_entries()
    |> Repo.get(meal_log_id)
    |> ok_or_not_found()
  end

  @spec get_client_meal_log_for_user(String.t(), String.t(), String.t()) ::
          {:ok, MealLog.t()} | {:error, :not_found}
  def get_client_meal_log_for_user(business_id, user_id, meal_log_id) do
    with {:ok, client} <- get_client_for_user(business_id, user_id) do
      get_client_meal_log(business_id, client.id, meal_log_id)
    end
  end

  defp daily_summaries(meal_logs) do
    meal_logs
    |> Enum.group_by(& &1.date)
    |> Enum.map(fn {date, day_logs} ->
      all_entries = Enum.flat_map(day_logs, & &1.food_log_entries)

      %{
        date: date,
        meals_logged: length(day_logs),
        total_entries: length(all_entries),
        planned_calories: sum_non_nil(day_logs, :planned_calories),
        logged_calories: sum_non_nil(day_logs, :logged_calories),
        replacements: Enum.count(all_entries, &(&1.source == :replacement)),
        unplanned_count: Enum.count(all_entries, &(&1.source == :unplanned))
      }
    end)
    |> Enum.sort_by(& &1.date, Date)
  end

  @spec summarize_client_meal_logs(String.t(), String.t(), Date.t() | nil, Date.t() | nil) ::
          {:ok, [map()]} | {:error, :not_found}
  def summarize_client_meal_logs(business_id, client_id, from_date, to_date) do
    with {:ok, meal_logs} <-
           list_meal_logs_for_client(business_id, client_id, nil, from_date, to_date) do
      {:ok, daily_summaries(meal_logs)}
    end
  end

  @spec get_business_food_log_entry(String.t(), String.t()) ::
          {:ok, FoodLogEntry.t()} | {:error, :not_found}
  def get_business_food_log_entry(business_id, entry_id) do
    FoodLogEntry
    |> FoodLogEntry.for_business(business_id)
    |> Repo.get(entry_id)
    |> ok_or_not_found()
  end

  @spec get_client_food_log_entry(String.t(), String.t(), String.t()) ::
          {:ok, FoodLogEntry.t()} | {:error, :not_found}
  def get_client_food_log_entry(business_id, client_id, entry_id) do
    FoodLogEntry
    |> FoodLogEntry.for_client(business_id, client_id)
    |> Repo.get(entry_id)
    |> ok_or_not_found()
  end

  @spec log_entry(String.t(), String.t(), map()) ::
          {:ok, FoodLogEntry.t()} | {:error, any()}
  def log_entry(business_id, client_id, attrs) do
    date = parse_date(attrs)
    meal_slot = attrs["meal_slot"] || attrs[:meal_slot]

    with {:ok, date} <- require_date(date) do
      Repo.transaction(fn ->
        snapshot = build_planned_snapshot(business_id, client_id, date, meal_slot)

        meal_log =
          case find_or_create_meal_log(business_id, client_id, date, meal_slot, snapshot) do
            {:ok, ml} -> ml
            {:error, reason} -> Repo.rollback(reason)
          end

        case create_food_log_entry(meal_log.id, business_id, attrs) do
          {:ok, entry} ->
            case recalculate_logged_calories(meal_log) do
              {:ok, _meal_log} -> entry
              {:error, reason} -> Repo.rollback(reason)
            end

          {:error, reason} ->
            Repo.rollback(reason)
        end
      end)
    end
  end

  @spec log_entry_for_user(String.t(), String.t(), map()) ::
          {:ok, FoodLogEntry.t()} | {:error, any()}
  def log_entry_for_user(business_id, user_id, attrs) do
    with {:ok, client} <- get_client_for_user(business_id, user_id) do
      log_entry(business_id, client.id, attrs)
    end
  end

  @spec update_entry(FoodLogEntry.t(), String.t(), map()) ::
          {:ok, FoodLogEntry.t()} | {:error, any()}
  def update_entry(%FoodLogEntry{} = entry, business_id, attrs) do
    Repo.transaction(fn ->
      case update_food_log_entry(entry, business_id, attrs) do
        {:ok, updated} ->
          case recalculate_entry_meal_log(updated, business_id) do
            {:ok, _meal_log} -> updated
            {:error, reason} -> Repo.rollback(reason)
          end

        {:error, reason} ->
          Repo.rollback(reason)
      end
    end)
  end

  @spec update_entry_for_user(String.t(), String.t(), String.t(), map()) ::
          {:ok, FoodLogEntry.t()} | {:error, any()}
  def update_entry_for_user(business_id, user_id, entry_id, attrs) do
    with {:ok, client} <- get_client_for_user(business_id, user_id),
         {:ok, entry} <- get_client_food_log_entry(business_id, client.id, entry_id) do
      update_entry(entry, business_id, attrs)
    end
  end

  @spec delete_entry(FoodLogEntry.t(), String.t()) :: {:ok, FoodLogEntry.t()} | {:error, any()}
  def delete_entry(%FoodLogEntry{} = entry, business_id) do
    Repo.transaction(fn ->
      case Repo.delete(entry) do
        {:ok, deleted} ->
          case recalculate_entry_meal_log(deleted, business_id) do
            {:ok, _meal_log} -> deleted
            {:error, reason} -> Repo.rollback(reason)
          end

        {:error, reason} ->
          Repo.rollback(reason)
      end
    end)
  end

  @spec delete_entry_for_business(String.t(), String.t()) ::
          {:ok, FoodLogEntry.t()} | {:error, any()}
  def delete_entry_for_business(business_id, entry_id) do
    with {:ok, entry} <- get_business_food_log_entry(business_id, entry_id) do
      delete_entry(entry, business_id)
    end
  end

  @spec delete_entry_for_user(String.t(), String.t(), String.t()) ::
          {:ok, FoodLogEntry.t()} | {:error, any()}
  def delete_entry_for_user(business_id, user_id, entry_id) do
    with {:ok, client} <- get_client_for_user(business_id, user_id),
         {:ok, entry} <- get_client_food_log_entry(business_id, client.id, entry_id) do
      delete_entry(entry, business_id)
    end
  end

  @spec log_meal(String.t(), String.t(), Date.t(), String.t(), String.t()) ::
          {:ok, [FoodLogEntry.t()]} | {:error, any()}
  def log_meal(business_id, client_id, date, meal_slot, meal_id) do
    Repo.transaction(fn ->
      do_log_meal(business_id, client_id, date, meal_slot, meal_id)
    end)
  end

  @spec log_meal_for_user(String.t(), String.t(), String.t(), String.t(), String.t()) ::
          {:ok, [FoodLogEntry.t()]} | {:error, any()}
  def log_meal_for_user(business_id, user_id, date_str, meal_slot, meal_id) do
    with {:ok, client} <- get_client_for_user(business_id, user_id),
         {:ok, date} <- parse_required_date(date_str) do
      log_meal(business_id, client.id, date, meal_slot, meal_id)
    end
  end

  @spec log_day(String.t(), String.t(), Date.t(), String.t()) ::
          {:ok, [FoodLogEntry.t()]} | {:error, any()}
  def log_day(business_id, client_id, date, plan_id) do
    plan =
      Plan
      |> Plan.for_business(business_id)
      |> Plan.for_client(client_id)
      |> Repo.get(plan_id)

    case plan do
      nil ->
        {:error, :not_found}

      _ ->
        day = Easy.Utils.weekday_name(date)

        plan_items =
          PlanItem
          |> PlanItem.for_plan(plan_id)
          |> PlanItem.for_business(business_id)
          |> PlanItem.for_day(day)
          |> Repo.all()

        Repo.transaction(fn ->
          Enum.flat_map(plan_items, fn plan_item ->
            do_log_meal(business_id, client_id, date, plan_item.meal_type, plan_item.meal_id)
          end)
        end)
    end
  end

  @spec log_day_for_user(String.t(), String.t(), String.t(), String.t()) ::
          {:ok, [FoodLogEntry.t()]} | {:error, any()}
  def log_day_for_user(business_id, user_id, date_str, plan_id) do
    with {:ok, client} <- get_client_for_user(business_id, user_id),
         {:ok, date} <- parse_required_date(date_str) do
      log_day(business_id, client.id, date, plan_id)
    end
  end

  defp build_planned_snapshot(business_id, client_id, date, meal_slot) do
    plan =
      Plan
      |> Plan.for_business(business_id)
      |> Plan.active_for_client(client_id, date)
      |> Plan.newest()
      |> limit(1)
      |> Repo.one()

    if is_nil(plan), do: nil, else: snapshot_meal(plan, date, meal_slot)
  end

  @spec find_or_create_meal_log(String.t(), String.t(), Date.t(), String.t(), map() | nil) ::
          {:ok, MealLog.t()} | {:error, Ecto.Changeset.t()}
  def find_or_create_meal_log(business_id, client_id, date, meal_slot, snapshot \\ nil) do
    case get_existing_meal_log(business_id, client_id, date, meal_slot) do
      %MealLog{} = existing ->
        {:ok, existing}

      nil ->
        attrs = %{date: date, meal_slot: meal_slot}
        planned_cal = snapshot && snapshot[:total_calories]

        changeset =
          MealLog.insert_changeset(business_id, client_id, attrs)
          |> put_change(:planned_snapshot, snapshot)
          |> put_change(:planned_calories, planned_cal && planned_cal * 1.0)

        case Repo.insert(changeset) do
          {:ok, meal_log} ->
            {:ok, meal_log}

          {:error, %{errors: errors} = changeset} ->
            if has_unique_violation?(errors) do
              case get_existing_meal_log(business_id, client_id, date, meal_slot) do
                %MealLog{} = existing -> {:ok, existing}
                nil -> {:error, changeset}
              end
            else
              {:error, changeset}
            end
        end
    end
  end

  @spec recalculate_logged_calories(MealLog.t()) :: {:ok, MealLog.t()} | {:error, :not_found}
  def recalculate_logged_calories(%MealLog{} = meal_log) do
    case do_recalculate_logged_calories(meal_log) do
      {1, [%{logged_calories: total}]} -> {:ok, %{meal_log | logged_calories: total}}
      {0, []} -> {:error, :not_found}
    end
  end

  defp do_log_meal(business_id, client_id, date, meal_slot, meal_id) do
    snapshot = build_planned_snapshot(business_id, client_id, date, meal_slot)

    meal_log =
      case find_or_create_meal_log(business_id, client_id, date, meal_slot, snapshot) do
        {:ok, ml} -> ml
        {:error, reason} -> Repo.rollback(reason)
      end

    meal = load_meal_with_items(business_id, client_id, meal_id) || Repo.rollback(:not_found)

    already_logged =
      FoodLogEntry
      |> FoodLogEntry.for_meal_log(meal_log.id)
      |> FoodLogEntry.planned_indices()
      |> Repo.all()
      |> MapSet.new()

    entries =
      meal.meal_items
      |> Enum.sort_by(& &1.position)
      |> Enum.reduce([], fn item, acc ->
        if MapSet.member?(already_logged, item.position) do
          acc
        else
          attrs = build_entry_attrs(item)

          case create_food_log_entry(meal_log.id, business_id, attrs) do
            {:ok, entry} -> [entry | acc]
            {:error, reason} -> Repo.rollback(reason)
          end
        end
      end)
      |> Enum.reverse()

    case recalculate_logged_calories(meal_log) do
      {:ok, _meal_log} -> entries
      {:error, reason} -> Repo.rollback(reason)
    end
  end

  defp create_food_log_entry(meal_log_id, business_id, attrs) do
    changeset = FoodLogEntry.insert_changeset(meal_log_id, attrs)

    if changeset.valid? do
      changeset
      |> resolve_and_compute(business_id)
      |> validate_required([:food_name])
      |> Repo.insert()
    else
      {:error, %{changeset | action: :insert}}
    end
  end

  defp update_food_log_entry(%FoodLogEntry{} = entry, business_id, attrs) do
    changeset = FoodLogEntry.update_changeset(entry, attrs)
    weight_g = get_field(changeset, :weight_g)

    changeset
    |> maybe_recompute_macros(entry, business_id, weight_g)
    |> Repo.update()
  end

  defp resolve_and_compute(changeset, business_id) do
    food_id = get_field(changeset, :food_id)
    recipe_id = get_field(changeset, :recipe_id)
    weight_g = get_field(changeset, :weight_g) || 0.0

    cond do
      not is_nil(food_id) ->
        resolve_food(changeset, food_id, business_id, weight_g)

      not is_nil(recipe_id) ->
        resolve_recipe(changeset, recipe_id, business_id, weight_g)

      true ->
        changeset
    end
  end

  defp resolve_food(changeset, food_id, business_id, weight_g) do
    case Food |> Food.for_business_or_system(business_id) |> Repo.get(food_id) do
      nil ->
        add_error(changeset, :food_id, "food not found")

      food ->
        changeset
        |> put_change(:food_name, get_field(changeset, :food_name) || food.name)
        |> put_computed_macros(food.macros || %{}, weight_g, nil)
    end
  end

  defp resolve_recipe(changeset, recipe_id, business_id, weight_g) do
    case Recipe |> Recipe.for_business(business_id) |> Repo.get(recipe_id) do
      nil ->
        add_error(changeset, :recipe_id, "recipe not found")

      recipe ->
        changeset
        |> put_change(:food_name, get_field(changeset, :food_name) || recipe.name)
        |> put_computed_macros(recipe.macros || %{}, weight_g, recipe.cooked_weight_g)
    end
  end

  defp put_computed_macros(changeset, macros, weight_g, cooked_weight_g) do
    computed = MacroCalc.compute_all(macros, weight_g, cooked_weight_g)

    changeset
    |> put_change(:calories, computed.calories)
    |> put_change(:protein_g, computed.protein_g)
    |> put_change(:carbs_g, computed.carbs_g)
    |> put_change(:fat_g, computed.fat_g)
  end

  defp maybe_recompute_macros(changeset, entry, business_id, weight_g) do
    if get_change(changeset, :weight_g) do
      entry =
        Repo.preload(entry,
          food: Food.for_business_or_system(Food, business_id),
          recipe: Recipe.for_business(Recipe, business_id)
        )

      case {entry.food, entry.recipe} do
        {%Food{} = food, _} ->
          put_computed_macros(changeset, food.macros || %{}, weight_g, nil)

        {_, %Recipe{} = recipe} ->
          put_computed_macros(changeset, recipe.macros || %{}, weight_g, recipe.cooked_weight_g)

        _ ->
          changeset
      end
    else
      changeset
    end
  end

  defp recalculate_entry_meal_log(entry, business_id) do
    case MealLog |> MealLog.for_business(business_id) |> Repo.get(entry.meal_log_id) do
      nil -> {:error, :not_found}
      meal_log -> recalculate_logged_calories(meal_log)
    end
  end

  defp do_recalculate_logged_calories(meal_log) do
    from(ml in MealLog,
      where: ml.id == ^meal_log.id and ml.business_id == ^meal_log.business_id,
      select: %{
        logged_calories:
          fragment(
            "(SELECT coalesce(sum(calories), 0.0) FROM food_log_entries WHERE meal_log_id = ?)",
            ml.id
          )
      },
      update: [
        set: [
          logged_calories:
            fragment(
              "(SELECT coalesce(sum(calories), 0.0) FROM food_log_entries WHERE meal_log_id = ?)",
              ml.id
            )
        ]
      ]
    )
    |> Repo.update_all([], returning: [:logged_calories])
  end

  defp get_existing_meal_log(business_id, client_id, date, meal_slot) do
    MealLog
    |> MealLog.for_business(business_id)
    |> MealLog.for_client(client_id)
    |> MealLog.for_date(date)
    |> MealLog.for_meal_slot(meal_slot)
    |> Repo.one()
  end

  defp has_unique_violation?(errors) do
    Enum.any?(errors, fn {_field, {_msg, meta}} ->
      Keyword.get(meta, :constraint) == :unique
    end)
  end

  defp load_meal_with_items(business_id, client_id, meal_id) do
    case Meal |> Meal.for_business(business_id) |> Repo.get(meal_id) do
      nil ->
        nil

      %{plan_id: plan_id} = meal ->
        plan_belongs =
          Plan
          |> Plan.for_business(business_id)
          |> Plan.for_client(client_id)
          |> Repo.get(plan_id)

        if is_nil(plan_belongs) do
          nil
        else
          Repo.preload(meal, meal_items: meal_items_with_food_and_recipe(business_id))
        end
    end
  end

  defp build_entry_attrs(%MealItem{} = item) do
    food_or_recipe = item.food || item.recipe

    %{
      "food_name" => food_or_recipe && food_or_recipe.name,
      "food_id" => item.food_id,
      "recipe_id" => item.recipe_id,
      "amount" => item.amount,
      "unit" => item.unit,
      "weight_g" => item.weight_g,
      "source" => "planned",
      "planned_item_index" => item.position
    }
  end

  defp snapshot_meal(plan, date, meal_slot) do
    day = Easy.Utils.weekday_name(date)

    plan_item =
      PlanItem
      |> PlanItem.for_plan(plan.id)
      |> PlanItem.for_business(plan.business_id)
      |> PlanItem.for_day(day)
      |> PlanItem.for_meal_type(meal_slot)
      |> Repo.one()

    if is_nil(plan_item), do: nil, else: do_snapshot(plan_item)
  end

  defp do_snapshot(plan_item) do
    meal =
      Meal
      |> Meal.for_business(plan_item.business_id)
      |> Repo.get(plan_item.meal_id)

    if is_nil(meal) do
      nil
    else
      meal =
        Repo.preload(meal, meal_items: meal_items_with_food_and_recipe(plan_item.business_id))

      items =
        meal.meal_items
        |> Enum.sort_by(& &1.position)
        |> Enum.map(&snapshot_item/1)

      %{
        meal_name: meal.name,
        items: items,
        total_calories: sum_field(items, :calories),
        total_protein_g: sum_field(items, :protein_g),
        total_carbs_g: sum_field(items, :carbs_g),
        total_fat_g: sum_field(items, :fat_g)
      }
    end
  end

  defp snapshot_item(%MealItem{} = item) do
    {name, macros, cooked_weight_g} = resolve_food_or_recipe(item)
    weight_g = item.weight_g || 0.0
    computed = MacroCalc.compute_all(macros, weight_g, cooked_weight_g)

    %{
      food_name: name,
      amount: item.amount,
      unit: item.unit,
      weight_g: weight_g,
      calories: computed.calories,
      protein_g: computed.protein_g,
      carbs_g: computed.carbs_g,
      fat_g: computed.fat_g
    }
  end

  defp resolve_food_or_recipe(%MealItem{food: %Food{} = f}) do
    {f.name, f.macros || %{}, nil}
  end

  defp resolve_food_or_recipe(%MealItem{recipe: %Recipe{} = r}) do
    {r.name, r.macros || %{}, r.cooked_weight_g}
  end

  defp resolve_food_or_recipe(_), do: {nil, %{}, nil}

  defp apply_date_filters(query, date, _from, _to) when not is_nil(date) do
    MealLog.for_date(query, date)
  end

  defp apply_date_filters(query, _date, from_date, to_date)
       when not is_nil(from_date) and not is_nil(to_date) do
    MealLog.for_date_range(query, from_date, to_date)
  end

  defp apply_date_filters(query, _date, _from_date, _to_date), do: query

  defp meal_items_with_food_and_recipe(business_id) do
    food_query = Food.for_business_or_system(Food, business_id)
    recipe_query = Recipe.for_business(Recipe, business_id)

    MealItem
    |> MealItem.for_business(business_id)
    |> MealItem.ordered()
    |> preload(food: ^food_query, recipe: ^recipe_query)
  end

  defp get_client(business_id, client_id) do
    Client
    |> Client.for_business(business_id)
    |> Repo.get(client_id)
    |> ok_or_not_found()
  end

  defp get_client_for_user(business_id, user_id) do
    Client
    |> Client.for_business(business_id)
    |> Client.for_user(user_id)
    |> Repo.one()
    |> ok_or_not_found()
  end

  defp parse_date(%{"date" => date}) when is_binary(date) do
    case Date.from_iso8601(date) do
      {:ok, d} -> d
      _ -> nil
    end
  end

  defp parse_date(%{"date" => %Date{} = date}), do: date
  defp parse_date(%{date: %Date{} = date}), do: date
  defp parse_date(_), do: nil

  defp parse_required_date(date_str) when is_binary(date_str) do
    case Date.from_iso8601(date_str) do
      {:ok, _date} = ok -> ok
      _ -> {:error, Easy.Error.unprocessable(%{fields: %{date: ["is invalid"]}})}
    end
  end

  defp parse_required_date(_) do
    {:error, Easy.Error.unprocessable(%{fields: %{date: ["can't be blank"]}})}
  end

  defp require_date(%Date{} = date), do: {:ok, date}

  defp require_date(nil),
    do: {:error, Easy.Error.unprocessable(%{fields: %{date: ["is invalid"]}})}

  defp sum_field(items, field) do
    items
    |> Enum.reduce(0.0, &((Map.get(&1, field) || 0.0) + &2))
    |> Float.round(1)
  end

  defp sum_non_nil(structs, field) do
    structs
    |> Enum.map(&Map.get(&1, field))
    |> Enum.reject(&is_nil/1)
    |> case do
      [] -> nil
      vals -> Enum.sum(vals) |> Float.round(1)
    end
  end

  defp ok_or_not_found(nil), do: {:error, :not_found}
  defp ok_or_not_found(record), do: {:ok, record}
end
