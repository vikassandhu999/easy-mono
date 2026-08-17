defmodule Easy.Nutrition.Diary do
  alias Easy.Clients
  alias Easy.Clients.Client
  alias Easy.Ctx
  alias Easy.LocalCalendar
  alias Easy.Nutrition.{Food, Meal, MealItem, MealOption, MealSlot, NutrientTotals, Programming, Recipe}
  alias Easy.Repo

  @spec get_client_nutrition_day(Ctx.t(), Date.t()) :: {:ok, map()} | {:error, :not_found}
  def get_client_nutrition_day(%Ctx{} = ctx, %Date{} = date) do
    with {:ok, [day]} <- list_client_nutrition_days(ctx, date: date) do
      {:ok, day}
    end
  end

  @spec get_nutrition_day_for_client(Ctx.t(), String.t(), Date.t()) ::
          {:ok, map()} | {:error, :not_found}
  def get_nutrition_day_for_client(%Ctx{} = ctx, client_id, %Date{} = date) do
    with {:ok, [day]} <- list_nutrition_days_for_client(ctx, client_id, date: date) do
      {:ok, day}
    end
  end

  @spec list_client_nutrition_days(Ctx.t(), keyword()) ::
          {:ok, [map()]}
          | {:error, :not_found | :invalid_date_range | :date_range_too_wide | :incomplete_date_range}
  def list_client_nutrition_days(%Ctx{} = ctx, opts \\ []) do
    with {:ok, client} <- Clients.get_client_account(ctx) do
      list_days(ctx, client, opts, :client)
    end
  end

  @spec list_nutrition_days_for_client(Ctx.t(), String.t(), keyword()) ::
          {:ok, [map()]}
          | {:error, :not_found | :invalid_date_range | :date_range_too_wide | :incomplete_date_range}
  def list_nutrition_days_for_client(%Ctx{} = ctx, client_id, opts \\ []) do
    with {:ok, client} <- Clients.authorize_client(ctx, client_id) do
      list_days(ctx, client, opts, :coach)
    end
  end

  defp list_days(ctx, client, opts, actor) do
    client = Repo.preload(client, :business)

    with {:ok, dates} <- resolve_dates(opts, local_today(client)) do
      {:ok, Enum.map(dates, &assemble_day(ctx, client, &1, actor))}
    end
  end

  defp assemble_day(ctx, client, date, actor) do
    today = local_today(client)
    write_eligible? = Date.compare(date, today) != :gt

    case live_guidance(ctx, client.id, date, today, actor) do
      {:ok, nil} -> empty_day(date, write_eligible?)
      {:ok, guidance} -> live_day(date, write_eligible?, guidance)
    end
  end

  defp live_guidance(ctx, client_id, date, today, actor) do
    if Date.compare(date, today) == :lt do
      {:ok, nil}
    else
      resolve_guidance(ctx, client_id, date, actor)
    end
  end

  defp resolve_guidance(ctx, _client_id, date, :client), do: Programming.resolve_client_coverage(ctx, date)
  defp resolve_guidance(ctx, client_id, date, :coach), do: Programming.resolve_coverage_for_client(ctx, client_id, date)

  defp empty_day(date, write_eligible?) do
    %{
      date: date,
      plan_id: nil,
      write_eligible: write_eligible?,
      targets: empty_targets(),
      slots: []
    }
  end

  defp live_day(date, write_eligible?, %{plan: plan, day_pattern: pattern}) do
    %{
      date: date,
      plan_id: plan.id,
      write_eligible: write_eligible?,
      targets: targets(plan),
      slots: live_slots(pattern, plan)
    }
  end

  defp live_slots(nil, _plan), do: []

  defp live_slots(pattern, plan) do
    meals = Map.new(List.wrap(plan.meals), &{&1.id, &1})
    grouped = Enum.group_by(List.wrap(pattern.meal_options), & &1.meal_slot)

    MealSlot.values()
    |> Enum.filter(&Map.has_key?(grouped, &1))
    |> Enum.map(&slot_from_options(&1, Map.fetch!(grouped, &1), meals))
  end

  defp slot_from_options(slot, options, meals) do
    ordered = Enum.sort_by(options, &{&1.position, &1.id})
    default = hd(ordered)
    items = meal_items(meals[default.nutrition_meal_id])

    %{
      meal_slot: slot,
      meal_id: default.nutrition_meal_id,
      planned_calories: planned_calories(items),
      logged_calories: 0.0,
      options: Enum.map(ordered, &option_data(&1, meals)),
      rows: []
    }
  end

  defp option_data(%MealOption{} = option, meals) do
    meal = meals[option.nutrition_meal_id]
    items = meal_items(meal)

    %{
      meal_id: option.nutrition_meal_id,
      meal_name: meal && meal.name,
      position: option.position,
      items: Enum.map(items, &item_data/1)
    }
  end

  defp item_data(%MealItem{} = item) do
    %{
      meal_item_id: item.id,
      kind: item_kind(item),
      name: item_name(item),
      food_id: item.food_id,
      recipe_id: item.recipe_id,
      position: item.position,
      portion: portion_data(item),
      nutrients: NutrientTotals.from_fields(item)
    }
  end

  defp item_kind(%MealItem{food_id: food_id}) when not is_nil(food_id), do: :food
  defp item_kind(%MealItem{}), do: :recipe

  defp item_name(%MealItem{food: %Food{name: name}}), do: name
  defp item_name(%MealItem{recipe: %Recipe{name: name}}), do: name
  defp item_name(_item), do: nil

  defp portion_data(%MealItem{} = item) do
    %{
      kind: item.portion_kind,
      grams: item.weight_g,
      amount: item.amount,
      unit: item.unit,
      label: item.serving_label
    }
  end

  defp meal_items(%Meal{meal_items: items}) when is_list(items), do: items
  defp meal_items(_meal), do: []

  defp planned_calories(items) do
    NutrientTotals.sum(items).calories
  end

  defp targets(plan) do
    %{
      calories: plan.target_calories,
      protein_g: plan.target_protein_g,
      carbs_g: plan.target_carbs_g,
      fat_g: plan.target_fat_g,
      fiber_g: plan.target_fiber_g
    }
  end

  defp empty_targets do
    %{calories: nil, protein_g: nil, carbs_g: nil, fat_g: nil, fiber_g: nil}
  end

  defp local_today(%Client{} = client) do
    timezone = LocalCalendar.applied_timezone(client.timezone, business_timezone(client))
    LocalCalendar.to_local_date(DateTime.utc_now(), timezone)
  end

  defp business_timezone(%Client{business: %Easy.Orgs.Business{timezone: timezone}}), do: timezone
  defp business_timezone(_client), do: nil

  defp resolve_dates(opts, today) do
    date = Keyword.get(opts, :date)
    from_date = Keyword.get(opts, :from)
    to_date = Keyword.get(opts, :to)

    cond do
      not is_nil(date) ->
        {:ok, [date]}

      not is_nil(from_date) and not is_nil(to_date) ->
        range_dates(from_date, to_date)

      not is_nil(from_date) or not is_nil(to_date) ->
        {:error, :incomplete_date_range}

      true ->
        {:ok, [today]}
    end
  end

  defp range_dates(from_date, to_date) do
    cond do
      Date.compare(from_date, to_date) == :gt ->
        {:error, :invalid_date_range}

      Date.diff(to_date, from_date) > 30 ->
        {:error, :date_range_too_wide}

      true ->
        {:ok, Enum.to_list(Date.range(from_date, to_date))}
    end
  end
end
