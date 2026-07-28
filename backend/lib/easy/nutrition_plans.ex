defmodule Easy.NutritionPlans do
  alias Easy.Clients
  alias Easy.Clients.Client
  alias Easy.Ctx
  alias Easy.MealSlot
  alias Easy.Nutrition.DayMeal
  alias Easy.Nutrition.Meal
  alias Easy.Nutrition.MealItem
  alias Easy.Nutrition.MealLog
  alias Easy.Nutrition.Plan
  alias Easy.Nutrition.PlanDay
  alias Easy.Orgs.Coach
  alias Easy.Repo

  import Ecto.Changeset
  import Ecto.Query

  @max_options_per_slot 3

  @spec get_plan_full(Ctx.t(), String.t()) :: {:ok, Plan.t()} | {:error, :not_found}
  def get_plan_full(%Ctx{} = ctx, plan_id) do
    plan =
      Plan
      |> Plan.for_business(ctx.business_id)
      |> Plan.include_full(ctx.business_id)
      |> Repo.get(plan_id)

    with {:ok, plan} <- ok_or_not_found(plan),
         :ok <- Clients.authorize_client_id(ctx, plan.client_id) do
      {:ok, plan}
    end
  end

  @spec get_client_plan_full(Ctx.t(), String.t()) ::
          {:ok, Plan.t()} | {:error, :not_found}
  def get_client_plan_full(%Ctx{} = ctx, plan_id) do
    with {:ok, client} <- get_client(ctx) do
      Plan
      |> Plan.for_business(ctx.business_id)
      |> Plan.for_client(ctx.business_id, client.id)
      |> Plan.include_full(ctx.business_id)
      |> Repo.get(plan_id)
      |> ok_or_not_found()
    end
  end

  @spec list_template_plans(Ctx.t(), keyword()) ::
          {:ok, %{count: non_neg_integer(), plans: [Plan.t()]}}
  def list_template_plans(%Ctx{} = ctx, opts \\ []) do
    offset = Keyword.get(opts, :offset, 0)
    limit = min(Keyword.get(opts, :limit, 20), 100)
    status = Keyword.get(opts, :status)
    search = String.trim(Keyword.get(opts, :search, "") || "")

    base =
      Plan
      |> Plan.for_business(ctx.business_id)
      |> Plan.for_status(status)
      |> Plan.for_search(search)
      |> Plan.templates()

    # The count query aggregates over `base`, so the select-adding join goes on the
    # row branch only.
    {:ok, paginated(base, offset, limit, &Plan.join_assigned_client_count(&1, ctx.business_id))}
  end

  @spec list_client_plans(Ctx.t(), keyword()) ::
          {:ok, %{count: non_neg_integer(), plans: [Plan.t()]}} | {:error, :not_found}
  def list_client_plans(%Ctx{} = ctx, opts \\ []) do
    offset = Keyword.get(opts, :offset, 0)
    limit = min(Keyword.get(opts, :limit, 20), 100)
    status = Keyword.get(opts, :status)

    with {:ok, client} <- get_client(ctx) do
      base =
        Plan
        |> Plan.for_business(ctx.business_id)
        |> Plan.for_client(ctx.business_id, client.id)
        |> Plan.for_status(status)

      {:ok, paginated(base, offset, limit)}
    end
  end

  @spec list_plans_for_client(Ctx.t(), String.t(), keyword()) ::
          {:ok, %{count: non_neg_integer(), plans: [Plan.t()]}} | {:error, :not_found}
  def list_plans_for_client(%Ctx{} = ctx, client_id, opts \\ []) do
    offset = Keyword.get(opts, :offset, 0)
    limit = min(Keyword.get(opts, :limit, 20), 100)
    status = Keyword.get(opts, :status)

    with {:ok, _client} <- Clients.authorize_client(ctx, client_id) do
      base =
        Plan
        |> Plan.for_business(ctx.business_id)
        |> Plan.for_client(ctx.business_id, client_id)
        |> Plan.for_status(status)

      full = fn query ->
        Plan.include_full(query, ctx.business_id)
      end

      {:ok, paginated(base, offset, limit, full)}
    end
  end

  @spec get_client_active_plan_day(Ctx.t(), Date.t()) ::
          {:ok,
           %{
             date: Date.t(),
             day: String.t(),
             plan: Plan.t(),
             slots: [%{meal_slot: atom(), options: [DayMeal.t()]}],
             chosen: %{optional(String.t()) => String.t()}
           }}
          | {:error, :not_found}
  def get_client_active_plan_day(%Ctx{} = ctx, date) do
    with {:ok, client} <- get_client(ctx) do
      get_active_plan_day(ctx.business_id, client.id, date)
    end
  end

  @spec create_plan(Ctx.t(), map()) ::
          {:ok, Plan.t()} | {:error, :not_found | Ecto.Changeset.t()}
  def create_plan(%Ctx{} = ctx, attrs) do
    with {:ok, coach} <- get_coach(ctx) do
      create_plan_for(ctx.business_id, coach.id, attrs)
    end
  end

  @spec update_plan(Ctx.t(), String.t(), map()) ::
          {:ok, Plan.t()} | {:error, :not_found | Ecto.Changeset.t()}
  def update_plan(%Ctx{} = ctx, plan_id, attrs) do
    with {:ok, plan} <- get_plan(ctx, plan_id) do
      plan
      |> Plan.update_changeset(attrs)
      |> Repo.update()
    end
  end

  @spec delete_plan(Ctx.t(), String.t()) ::
          {:ok, Plan.t()} | {:error, :not_found | Ecto.Changeset.t()}
  def delete_plan(%Ctx{} = ctx, plan_id) do
    with {:ok, plan} <- get_plan(ctx, plan_id) do
      Repo.delete(plan)
    end
  end

  @spec assign_plan_to_client(Ctx.t(), String.t(), String.t(), map()) ::
          {:ok, Plan.t()} | {:error, any()}
  def assign_plan_to_client(%Ctx{} = ctx, client_id, plan_id, attrs) do
    with {:ok, coach} <- get_coach(ctx),
         {:ok, plan} <- get_plan(ctx, plan_id),
         {:ok, _client} <- Clients.authorize_client(ctx, client_id) do
      with {:ok, assigned} <- assign_to_client(plan, client_id, coach.id, attrs) do
        :ok = Clients.advance_stage_to_coaching(ctx, client_id)
        {:ok, assigned}
      end
    end
  end

  @spec duplicate_plan(Ctx.t(), String.t()) ::
          {:ok, Plan.t()} | {:error, any()}
  def duplicate_plan(%Ctx{} = ctx, plan_id) do
    with {:ok, coach} <- get_coach(ctx),
         {:ok, plan} <- get_plan(ctx, plan_id) do
      duplicate(plan, coach.id)
    end
  end

  @spec create_plan_day(Ctx.t(), String.t(), map()) ::
          {:ok, PlanDay.t()} | {:error, :not_found | Ecto.Changeset.t()}
  def create_plan_day(%Ctx{} = ctx, plan_id, attrs) do
    with {:ok, plan} <- get_plan(ctx, plan_id) do
      position = (max_day_position(plan.id) || -1) + 1
      name = attrs[:name] || "Day #{position + 1}"

      with {:ok, day} <-
             PlanDay.insert_changeset(ctx.business_id, plan.id, %{"name" => name, "position" => position})
             |> Repo.insert() do
        {:ok, with_day_meals(day, ctx.business_id)}
      end
    end
  end

  @spec update_plan_day(Ctx.t(), String.t(), map()) ::
          {:ok, PlanDay.t()} | {:error, :not_found | Ecto.Changeset.t()}
  def update_plan_day(%Ctx{} = ctx, day_id, attrs) do
    with {:ok, day} <- get_plan_day(ctx, day_id),
         {:ok, updated} <- day |> PlanDay.update_changeset(attrs) |> Repo.update() do
      {:ok, with_day_meals(updated, ctx.business_id)}
    end
  end

  defp with_day_meals(%PlanDay{} = day, business_id) do
    Repo.preload(day, day_meals: DayMeal.by_slot_position() |> DayMeal.for_business(business_id))
  end

  @spec delete_plan_day(Ctx.t(), String.t()) ::
          {:ok, PlanDay.t()} | {:error, :not_found | :last_day | Ecto.Changeset.t()}
  def delete_plan_day(%Ctx{} = ctx, day_id) do
    with {:ok, day} <- get_plan_day(ctx, day_id) do
      fallback =
        PlanDay
        |> PlanDay.for_business(ctx.business_id)
        |> PlanDay.for_plan(day.nutrition_plan_id)
        |> PlanDay.by_position()
        |> where([d], d.id != ^day.id)
        |> limit(1)
        |> Repo.one()

      case fallback do
        nil ->
          {:error, :last_day}

        fallback ->
          delete_plan_day(ctx.business_id, day, fallback.id)
      end
    end
  end

  defp delete_plan_day(business_id, day, fallback_id) do
    Repo.transaction(fn -> delete_plan_day!(business_id, day, fallback_id) end)
  end

  defp delete_plan_day!(business_id, day, fallback_id) do
    move_weekdays(business_id, fallback_id, day.weekdays)

    case Repo.delete(day) do
      {:ok, deleted} -> deleted
      {:error, reason} -> Repo.rollback(reason)
    end
  end

  defp move_weekdays(_business_id, _fallback_id, []), do: :ok

  defp move_weekdays(business_id, fallback_id, weekdays) do
    from(d in PlanDay,
      where: d.business_id == ^business_id and d.id == ^fallback_id,
      update: [set: [weekdays: fragment("? || ?", d.weekdays, type(^weekdays, {:array, :string}))]]
    )
    |> Repo.update_all([])

    :ok
  end

  @spec update_plan_schedule(Ctx.t(), String.t(), map()) ::
          {:ok, %{optional(String.t()) => String.t()}} | {:error, :not_found | :invalid_schedule}
  def update_plan_schedule(%Ctx{} = ctx, plan_id, attrs) do
    with {:ok, plan} <- get_plan(ctx, plan_id),
         {:ok, schedule} <- build_schedule(attrs),
         :ok <- ensure_days_in_plan(ctx.business_id, plan.id, schedule) do
      Repo.transaction(fn -> write_schedule!(ctx.business_id, plan.id, schedule) end)
    end
  end

  defp build_schedule(attrs) do
    entries = Enum.map(PlanDay.days(), fn day -> {Atom.to_string(day), attrs[day]} end)

    if Enum.any?(entries, fn {_weekday, day_id} -> is_nil(day_id) end) do
      {:error, :invalid_schedule}
    else
      {:ok, Map.new(entries)}
    end
  end

  defp ensure_days_in_plan(business_id, plan_id, schedule) do
    ids = schedule |> Map.values() |> Enum.uniq()

    if Enum.all?(ids, &match?({:ok, _}, Ecto.UUID.cast(&1))) and plan_owns_days?(business_id, plan_id, ids) do
      :ok
    else
      {:error, :not_found}
    end
  end

  defp plan_owns_days?(business_id, plan_id, ids) do
    found =
      PlanDay
      |> PlanDay.for_business(business_id)
      |> PlanDay.for_plan(plan_id)
      |> where([d], d.id in ^ids)
      |> select([d], d.id)
      |> Repo.all()

    MapSet.new(found) == MapSet.new(ids)
  end

  defp write_schedule!(business_id, plan_id, schedule) do
    PlanDay
    |> PlanDay.for_business(business_id)
    |> PlanDay.for_plan(plan_id)
    |> Repo.update_all(set: [weekdays: []])

    schedule
    |> Enum.group_by(fn {_weekday, day_id} -> day_id end, fn {weekday, _day_id} -> weekday end)
    |> Enum.each(fn {day_id, weekdays} ->
      PlanDay
      |> PlanDay.for_business(business_id)
      |> PlanDay.for_plan(plan_id)
      |> where([d], d.id == ^day_id)
      |> Repo.update_all(set: [weekdays: Enum.sort_by(weekdays, &weekday_order/1)])
    end)

    schedule
  end

  defp weekday_order(weekday), do: Enum.find_index(PlanDay.day_names(), &(&1 == weekday))

  @spec add_day_meal(Ctx.t(), String.t(), map()) ::
          {:ok, DayMeal.t()} | {:error, :not_found | :max_options | Ecto.Changeset.t()}
  def add_day_meal(%Ctx{} = ctx, day_id, attrs) do
    meal_id = attrs[:nutrition_meal_id]
    name = attrs[:name]
    slot = to_string(attrs[:meal_slot])

    with {:ok, day} <- get_plan_day(ctx, day_id),
         {:ok, coach} <- get_coach(ctx),
         :ok <- ensure_exactly_one_source(meal_id, name) do
      Repo.transaction(fn -> add_day_meal!(ctx.business_id, coach.id, day, slot, meal_id, name) end)
    end
  end

  defp ensure_exactly_one_source(nil, nil), do: source_error()
  defp ensure_exactly_one_source(nil, _name), do: :ok
  defp ensure_exactly_one_source(_meal_id, nil), do: :ok
  defp ensure_exactly_one_source(_meal_id, _name), do: source_error()

  defp source_error do
    %DayMeal{}
    |> change()
    |> add_error(:nutrition_meal_id, "exactly one of nutrition_meal_id or name must be given")
    |> apply_action(:insert)
  end

  defp add_day_meal!(business_id, creator_id, day, slot, nil, name) do
    case Meal.insert_changeset(business_id, creator_id, day.nutrition_plan_id, %{"name" => name}) |> Repo.insert() do
      {:ok, meal} -> place_day_meal!(business_id, day, slot, meal.id)
      {:error, reason} -> Repo.rollback(reason)
    end
  end

  defp add_day_meal!(business_id, _creator_id, day, slot, meal_id, _name) do
    case ensure_meal_for_plan(day.nutrition_plan_id, business_id, meal_id) do
      {:ok, :valid} -> place_day_meal!(business_id, day, slot, meal_id)
      {:error, reason} -> Repo.rollback(reason)
    end
  end

  defp place_day_meal!(business_id, day, slot, meal_id) do
    position = business_id |> slot_options(day.id, slot) |> length()

    if position >= @max_options_per_slot do
      Repo.rollback(:max_options)
    else
      attrs = %{"meal_slot" => slot, "position" => position, "nutrition_meal_id" => meal_id}

      case DayMeal.insert_changeset(business_id, day.id, attrs) |> Repo.insert() do
        {:ok, day_meal} -> Repo.preload(day_meal, meal: Meal.include_items(Meal, business_id))
        {:error, reason} -> Repo.rollback(reason)
      end
    end
  end

  @spec move_slot_option(Ctx.t(), String.t(), map()) ::
          {:ok, DayMeal.t()} | {:error, :not_found | :max_options | Ecto.Changeset.t()}
  def move_slot_option(%Ctx{} = ctx, day_meal_id, attrs) do
    with {:ok, dm} <- get_day_meal(ctx, day_meal_id) do
      slot = if attrs[:meal_slot], do: to_string(attrs[:meal_slot]), else: to_string(dm.meal_slot)
      move_day_meal(ctx.business_id, dm, slot, attrs[:position])
    end
  end

  defp move_day_meal(business_id, day_meal, slot, position) do
    if slot == to_string(day_meal.meal_slot) and is_nil(position) do
      {:ok, day_meal}
    else
      Repo.transaction(fn -> move_slot_option!(business_id, day_meal, slot, position) end)
    end
  end

  defp move_slot_option!(business_id, day_meal, slot, position) do
    source_slot = to_string(day_meal.meal_slot)
    others = business_id |> slot_options(day_meal.nutrition_plan_day_id, slot) |> Enum.reject(&(&1.id == day_meal.id))

    if slot != source_slot and length(others) >= @max_options_per_slot do
      Repo.rollback(:max_options)
    else
      index = position |> Kernel.||(length(others)) |> max(0) |> min(length(others))
      moved = reslot_day_meal!(day_meal, slot, index)
      renumber(business_id, others |> Enum.map(& &1.id) |> List.insert_at(index, day_meal.id))
      if slot != source_slot, do: renumber_slot(business_id, day_meal.nutrition_plan_day_id, source_slot)
      moved
    end
  end

  defp reslot_day_meal!(day_meal, slot, index) do
    case Repo.update(DayMeal.update_changeset(day_meal, %{"meal_slot" => slot, "position" => index})) do
      {:ok, moved} -> moved
      {:error, reason} -> Repo.rollback(reason)
    end
  end

  @spec remove_slot_option(Ctx.t(), String.t()) ::
          {:ok, DayMeal.t()} | {:error, :not_found | Ecto.Changeset.t()}
  def remove_slot_option(%Ctx{} = ctx, day_meal_id) do
    with {:ok, dm} <- get_day_meal(ctx, day_meal_id) do
      Repo.transaction(fn -> delete_slot_option!(ctx.business_id, dm) end)
    end
  end

  defp delete_slot_option!(business_id, day_meal) do
    case Repo.delete(day_meal) do
      {:ok, deleted} ->
        renumber_slot(business_id, day_meal.nutrition_plan_day_id, to_string(day_meal.meal_slot))
        deleted

      {:error, reason} ->
        Repo.rollback(reason)
    end
  end

  defp slot_options(business_id, day_id, slot) do
    DayMeal
    |> DayMeal.for_business(business_id)
    |> DayMeal.for_plan_day(day_id)
    |> DayMeal.for_meal_slot(slot)
    |> DayMeal.by_slot_position()
    |> Repo.all()
  end

  defp renumber_slot(business_id, day_id, slot) do
    business_id |> slot_options(day_id, slot) |> Enum.map(& &1.id) |> then(&renumber(business_id, &1))
  end

  defp renumber(business_id, ids) do
    ids
    |> Enum.with_index()
    |> Enum.each(fn {id, index} ->
      from(dm in DayMeal, where: dm.business_id == ^business_id and dm.id == ^id)
      |> Repo.update_all(set: [position: index])
    end)
  end

  # Private

  defp get_plan(%Ctx{} = ctx, plan_id) do
    plan =
      Plan
      |> Plan.for_business(ctx.business_id)
      |> Repo.get(plan_id)

    with {:ok, plan} <- ok_or_not_found(plan),
         :ok <- Clients.authorize_client_id(ctx, plan.client_id) do
      {:ok, plan}
    end
  end

  defp max_day_position(plan_id) do
    PlanDay |> PlanDay.for_plan(plan_id) |> Repo.aggregate(:max, :position)
  end

  defp get_plan_day(%Ctx{}, nil), do: {:error, :not_found}

  defp get_plan_day(%Ctx{} = ctx, day_id) do
    day = PlanDay |> PlanDay.for_business(ctx.business_id) |> Repo.get(day_id)

    with {:ok, day} <- ok_or_not_found(day),
         {:ok, _plan} <- get_plan(ctx, day.nutrition_plan_id) do
      {:ok, day}
    end
  end

  defp get_day_meal(%Ctx{} = ctx, day_meal_id) do
    dm = DayMeal |> DayMeal.for_business(ctx.business_id) |> Repo.get(day_meal_id)

    with {:ok, dm} <- ok_or_not_found(dm),
         {:ok, _day} <- get_plan_day(ctx, dm.nutrition_plan_day_id) do
      {:ok, dm}
    end
  end

  defp get_active_plan_day(business_id, client_id, date) do
    case active_plan(business_id, client_id, date) do
      nil ->
        {:error, :not_found}

      plan ->
        day_name = Easy.Utils.weekday_name(date)

        day =
          PlanDay
          |> PlanDay.for_business(business_id)
          |> PlanDay.for_plan(plan.id)
          |> PlanDay.for_weekday(day_name)
          |> limit(1)
          |> Repo.one()

        {:ok,
         %{
           plan: plan,
           slots: schedule_slots(day, business_id),
           chosen: chosen_options(business_id, client_id, date),
           date: date,
           day: day_name
         }}
    end
  end

  defp schedule_slots(nil, _business_id), do: []

  defp schedule_slots(day, business_id) do
    DayMeal
    |> DayMeal.for_business(business_id)
    |> DayMeal.for_plan_day(day.id)
    |> DayMeal.by_slot_position()
    |> preload(meal: ^Meal.include_items(Meal, business_id))
    |> Repo.all()
    |> Enum.group_by(& &1.meal_slot)
    |> Enum.map(fn {slot, options} ->
      %{meal_slot: slot, options: Enum.sort_by(options, & &1.position)}
    end)
    |> Enum.sort_by(fn %{meal_slot: slot} -> slot_order(slot) end)
  end

  defp chosen_options(business_id, client_id, date) do
    MealLog
    |> MealLog.for_client(business_id, client_id)
    |> MealLog.for_date(date)
    |> where([ml], not is_nil(ml.nutrition_meal_id))
    |> select([ml], {ml.meal_slot, ml.nutrition_meal_id})
    |> Repo.all()
    |> Map.new(fn {slot, meal_id} -> {to_string(slot), meal_id} end)
  end

  defp slot_order(slot) do
    Enum.find_index(MealSlot.values(), &(&1 == slot)) || length(MealSlot.values())
  end

  defp create_plan_for(business_id, creator_id, attrs) do
    Repo.transaction(fn ->
      with {:ok, plan} <- business_id |> Plan.insert_changeset(creator_id, attrs) |> Repo.insert(),
           {:ok, _day} <- seed_everyday(plan) do
        plan
      else
        {:error, reason} -> Repo.rollback(reason)
      end
    end)
  end

  defp seed_everyday(plan) do
    PlanDay.insert_changeset(plan.business_id, plan.id, %{
      "name" => "Everyday",
      "position" => 0,
      "weekdays" => PlanDay.day_names()
    })
    |> Repo.insert()
  end

  defp assign_to_client(plan, client_id, creator_id, attrs) do
    copy_plan(plan, creator_id,
      client_id: client_id,
      source_template_id: plan.id,
      status: :active,
      start_date: Map.get(attrs, :start_date),
      end_date: Map.get(attrs, :end_date)
    )
  end

  defp duplicate(plan, creator_id) do
    copy_plan(plan, creator_id,
      name: "#{plan.name} (Copy)",
      client_id: nil,
      source_template_id: plan.source_template_id || plan.id,
      status: :active
    )
  end

  defp paginated(base, offset, limit, preload_fun \\ & &1) do
    %{
      count: Repo.aggregate(base, :count, :id),
      plans:
        base
        |> Plan.newest()
        |> Easy.Utils.paginate(offset, limit)
        |> preload_fun.()
        |> Repo.all()
    }
  end

  defp active_plan(business_id, client_id, date) do
    Plan
    |> Plan.for_business(business_id)
    |> Plan.active_for_client(client_id, date)
    |> Plan.newest()
    |> limit(1)
    |> Repo.one()
  end

  defp get_client(%Ctx{} = ctx) do
    Client
    |> Client.for_business(ctx.business_id)
    |> Client.for_user(ctx.user_id)
    |> Repo.one()
    |> ok_or_not_found()
  end

  defp get_coach(%Ctx{} = ctx) do
    Coach
    |> Coach.for_business(ctx.business_id)
    |> Coach.for_user(ctx.user_id)
    |> Repo.one()
    |> ok_or_not_found()
  end

  defp ensure_meal_for_plan(_plan_id, _business_id, nil), do: {:ok, :valid}

  defp ensure_meal_for_plan(plan_id, business_id, meal_id) do
    case Meal |> Meal.for_business(business_id) |> Meal.for_plan(plan_id) |> Repo.get(meal_id) do
      nil -> {:error, :not_found}
      _meal -> {:ok, :valid}
    end
  end

  defp copy_plan(plan, creator_id, opts) do
    Repo.transaction(fn ->
      meal_query =
        Meal
        |> Meal.for_business(plan.business_id)
        |> Meal.oldest()
        |> preload(meal_items: ^MealItem.for_business(MealItem, plan.business_id))

      plan =
        Repo.preload(plan,
          meals: meal_query,
          days: PlanDay.include_day_meals(PlanDay.by_position(), plan.business_id)
        )

      attrs = %{
        name: Keyword.get(opts, :name, plan.name),
        description: plan.description,
        tags: plan.tags,
        target_calories: plan.target_calories,
        target_protein_g: plan.target_protein_g,
        target_carbs_g: plan.target_carbs_g,
        target_fat_g: plan.target_fat_g,
        target_fiber_g: plan.target_fiber_g,
        status: Keyword.get(opts, :status, plan.status),
        start_date: Keyword.get(opts, :start_date),
        end_date: Keyword.get(opts, :end_date)
      }

      changeset =
        Plan.insert_changeset(plan.business_id, creator_id, attrs)
        |> put_change(:client_id, Keyword.get(opts, :client_id))
        |> put_change(:source_template_id, Keyword.get(opts, :source_template_id))

      with {:ok, new_plan} <- Repo.insert(changeset),
           {:ok, meal_map} <-
             copy_meals(plan.meals, new_plan.id, new_plan.business_id, creator_id),
           {:ok, _day_map} <- copy_days(plan.days, new_plan, meal_map) do
        Repo.preload(new_plan, meals: Meal.include_items(Meal, new_plan.business_id))
      else
        {:error, reason} -> Repo.rollback(reason)
      end
    end)
  end

  defp copy_meals(meals, new_plan_id, business_id, creator_id) do
    Enum.reduce_while(meals, {:ok, %{}}, fn meal, {:ok, acc} ->
      copy_meal(meal, acc, new_plan_id, business_id, creator_id)
    end)
  end

  defp copy_meal(meal, acc, new_plan_id, business_id, creator_id) do
    attrs = %{name: meal.name, notes: meal.notes}

    with {:ok, new_meal} <- Meal.insert_changeset(business_id, creator_id, new_plan_id, attrs) |> Repo.insert(),
         {:ok, _items} <- copy_meal_items(meal.meal_items, new_meal.id, business_id) do
      {:cont, {:ok, Map.put(acc, meal.id, new_meal)}}
    else
      {:error, reason} -> {:halt, {:error, reason}}
    end
  end

  defp copy_meal_items(meal_items, new_meal_id, business_id) do
    Enum.reduce_while(meal_items, {:ok, []}, fn meal_item, {:ok, acc} ->
      attrs = %{
        weight_g: meal_item.weight_g,
        amount: meal_item.amount,
        unit: meal_item.unit,
        position: meal_item.position,
        recipe_id: meal_item.recipe_id,
        food_id: meal_item.food_id
      }

      case MealItem.insert_changeset(business_id, new_meal_id, attrs) |> Repo.insert() do
        {:ok, new_item} -> {:cont, {:ok, [new_item | acc]}}
        {:error, reason} -> {:halt, {:error, reason}}
      end
    end)
  end

  defp copy_days(days, new_plan, meal_map) do
    Enum.reduce_while(days, {:ok, %{}}, fn day, {:ok, acc} ->
      with {:ok, new_day} <-
             PlanDay.insert_changeset(new_plan.business_id, new_plan.id, %{
               "name" => day.name,
               "position" => day.position,
               "weekdays" => day.weekdays
             })
             |> Repo.insert(),
           :ok <- copy_day_meals(day.day_meals, new_day, meal_map) do
        {:cont, {:ok, Map.put(acc, day.id, new_day)}}
      else
        {:error, reason} -> {:halt, {:error, reason}}
      end
    end)
  end

  defp copy_day_meals(day_meals, new_day, meal_map) do
    Enum.reduce_while(day_meals, :ok, &copy_day_meal(&1, &2, new_day, meal_map))
  end

  defp copy_day_meal(day_meal, :ok, new_day, meal_map) do
    case Map.get(meal_map, day_meal.nutrition_meal_id) do
      nil ->
        {:halt, {:error, :meal_not_found_in_plan}}

      new_meal ->
        attrs = %{
          "meal_slot" => to_string(day_meal.meal_slot),
          "position" => day_meal.position,
          "nutrition_meal_id" => new_meal.id
        }

        continue_insert(DayMeal.insert_changeset(new_day.business_id, new_day.id, attrs) |> Repo.insert())
    end
  end

  defp continue_insert({:ok, _record}), do: {:cont, :ok}
  defp continue_insert({:error, reason}), do: {:halt, {:error, reason}}

  defp ok_or_not_found(nil), do: {:error, :not_found}
  defp ok_or_not_found(record), do: {:ok, record}
end
