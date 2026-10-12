defmodule Easy.Nutrition do
  import Bitwise
  import Ecto.Query
  alias Easy.{ClientAccess, Ctx, CursorPage, Repo}
  alias Easy.Clients.Client

  alias Easy.Nutrition.{
    Food,
    MealItem,
    Nutrient,
    NutritionPreset,
    NutritionSchedule,
    NutritionTargets,
    TargetSchedule,
    Timing,
    Undo,
    Values
  }

  @type result :: {:ok, map() | struct() | [struct()]} | {:error, atom() | Ecto.Changeset.t()}

  @spec ensure_nutrients(Ctx.t()) :: result()
  def ensure_nutrients(ctx) do
    now = DateTime.utc_now(:second)

    rows =
      Enum.map(
        Nutrient.catalogue(),
        &Map.merge(&1, %{id: Ecto.UUID.generate(), business_id: ctx.business_id, inserted_at: now, updated_at: now})
      )

    Repo.insert_all(Nutrient, rows, on_conflict: :nothing, conflict_target: [:business_id, :code])
    {:ok, Nutrient.for_business(ctx.business_id) |> order_by([n], asc: n.code) |> Repo.all()}
  end

  @spec list_foods(Ctx.t(), keyword()) :: result()
  def list_foods(ctx, opts \\ []) do
    with :ok <- Ctx.ensure_coach(ctx) do
      query = Food.for_business(ctx.business_id) |> Food.search(opts[:search]) |> Food.for_kind(opts[:kind])
      page(query, opts)
    end
  end

  @spec get_food(Ctx.t(), String.t()) :: result()
  def get_food(ctx, id) do
    with :ok <- Ctx.ensure_coach(ctx), do: Food.for_business(ctx.business_id) |> Repo.get(id) |> found()
  end

  @spec create_food(Ctx.t(), map()) :: result()
  def create_food(ctx, attrs) do
    with :ok <- Ctx.ensure_coach(ctx), {:ok, _} <- ensure_nutrients(ctx) do
      cs = Food.insert_changeset(ctx.business_id, attrs) |> validate_codes(ctx, :nutrients)
      Repo.insert(cs)
    end
  end

  @spec update_food(Ctx.t(), String.t(), map()) :: result()
  def update_food(ctx, id, attrs) do
    with :ok <- Ctx.ensure_coach(ctx), {:ok, _} <- get_food(ctx, id) do
      Repo.transaction(fn ->
        food = Food.for_business(ctx.business_id) |> where([f], f.id == ^id) |> lock("FOR UPDATE") |> Repo.one()
        cs = Food.update_changeset(food, attrs) |> validate_codes(ctx, :nutrients) |> validate_food_dependents(ctx)
        unwrap(Repo.update(cs))
      end)
    end
  end

  @spec read_week_for_client(Ctx.t(), String.t(), keyword()) :: result()
  def read_week_for_client(ctx, client_id, opts \\ []) do
    with :ok <- Ctx.ensure_coach(ctx),
         {:ok, client} <- ClientAccess.authorize_client(ctx, client_id),
         {:ok, _} <- ensure_nutrients(ctx) do
      effective_today = client |> Repo.preload(:business) |> today()
      with {:ok, on} <- on_date(opts[:on], effective_today), do: {:ok, week(ctx, client_id, on, effective_today)}
    end
  end

  @spec list_presets_for_client(Ctx.t(), String.t(), keyword()) :: result()
  def list_presets_for_client(ctx, client_id, opts \\ []) do
    with :ok <- Ctx.ensure_coach(ctx), :ok <- ClientAccess.authorize_client_id(ctx, client_id) do
      query =
        NutritionPreset.for_client(ctx.business_id, client_id)
        |> NutritionPreset.active()
        |> NutritionPreset.include_content(ctx.business_id)

      query = if opts[:type] in [nil, ""], do: query, else: where(query, [p], p.type == ^opts[:type])

      query =
        if opts[:search] in [nil, ""],
          do: query,
          else: where(query, [p], ilike(p.name, ^Easy.Search.like_pattern(opts[:search])))

      page(query, opts)
    end
  end

  @spec create_preset_for_client(Ctx.t(), String.t(), map()) :: result()
  def create_preset_for_client(ctx, client_id, attrs),
    do: write(ctx, client_id, fn _today -> insert_preset(ctx, client_id, attrs) end)

  @spec update_preset_for_client(Ctx.t(), String.t(), String.t(), map()) :: result()
  def update_preset_for_client(ctx, client_id, id, attrs),
    do: write(ctx, client_id, fn today -> update_preset(ctx, client_id, id, attrs, today) end)

  @spec archive_preset_for_client(Ctx.t(), String.t(), String.t()) :: result()
  def archive_preset_for_client(ctx, client_id, id),
    do: write(ctx, client_id, fn today -> archive_preset(ctx, client_id, id, today) end)

  defp archive_preset(ctx, client_id, id, today) do
    with {:ok, row} <- preset(ctx, client_id, id) do
      schedules =
        NutritionSchedule.for_client(ctx.business_id, client_id)
        |> where([s], s.nutrition_preset_id == ^id)
        |> Repo.all()

      Enum.each(schedules, &end_schedule(&1, today))

      if Enum.any?(schedules, &Timing.last_fact(&1, today)),
        do: save(Ecto.Changeset.change(row, archived_at: DateTime.utc_now(:second))),
        else: remove(row)

      {:ok, week(ctx, client_id, today, today)}
    end
  end

  @spec add_schedule_for_client(Ctx.t(), String.t(), map()) :: result()
  def add_schedule_for_client(ctx, client_id, attrs) do
    write(ctx, client_id, fn today ->
      attrs = Values.encode(attrs)

      with {:ok, preset} <- chosen_preset(ctx, client_id, attrs),
           do: insert_schedule(ctx, client_id, preset.id, Map.put(attrs, "from_date", today))
    end)
  end

  @spec update_schedule_for_client(Ctx.t(), String.t(), String.t(), map()) :: result()
  def update_schedule_for_client(ctx, client_id, id, attrs) do
    write(ctx, client_id, fn today ->
      attrs = Values.encode(attrs)

      with {:ok, row} <- schedule(ctx, client_id, id),
           true <- Timing.future?(row, today) || {:error, :not_found},
           {:ok, {preset, row}} <- schedule_preset(ctx, client_id, row, attrs, today) do
        next =
          Map.merge(timing_attrs(row), Map.take(attrs, ["weekdays_mask", "time"]))
          |> Map.put("nutrition_preset_id", preset.id)

        {:ok, change_schedule(row, next, today)}
      end
    end)
  end

  @spec remove_schedule_for_client(Ctx.t(), String.t(), String.t(), integer() | nil) :: result()
  def remove_schedule_for_client(ctx, client_id, id, weekday \\ nil),
    do: write(ctx, client_id, fn today -> remove_schedule(ctx, client_id, id, weekday, today) end)

  defp remove_schedule(ctx, client_id, id, weekday, today) do
    with {:ok, row} <- schedule(ctx, client_id, id),
         true <- Timing.future?(row, today) || {:error, :not_found},
         :ok <- valid_weekday(weekday) do
      mask = if weekday && row.weekdays_mask, do: row.weekdays_mask &&& bnot(Timing.bit(weekday)), else: 0

      if mask == 0,
        do: end_schedule(row, today),
        else: change_schedule(row, Map.put(timing_attrs(row), "weekdays_mask", mask), today)

      {:ok, week(ctx, client_id, today, today)}
    end
  end

  @spec create_targets_for_client(Ctx.t(), String.t(), map()) :: result()
  def create_targets_for_client(ctx, client_id, attrs),
    do: write(ctx, client_id, fn today -> create_targets(ctx, client_id, Values.encode(attrs), today) end)

  defp create_targets(ctx, client_id, attrs, today) do
    with {:ok, row} <- insert_targets(ctx, client_id, attrs) do
      if attrs["weekdays_mask"], do: replace_target_days(ctx, client_id, row.id, attrs["weekdays_mask"], today)
      {:ok, row}
    end
  end

  @spec update_targets_for_client(Ctx.t(), String.t(), String.t(), map()) :: result()
  def update_targets_for_client(ctx, client_id, id, attrs) do
    attrs = Values.encode(attrs)

    write(ctx, client_id, fn today ->
      if attrs["copy_for_day"],
        do: copy_targets_for_day(ctx, client_id, id, attrs, today),
        else: update_targets(ctx, client_id, id, attrs, today)
    end)
  end

  defp copy_targets_for_day(ctx, client_id, id, attrs, today) do
    with :ok <- valid_weekday(attrs["copy_for_day"]),
         {:ok, row} <- targets(ctx, client_id, id),
         {:ok, copy} <-
           insert_targets(ctx, client_id, Map.merge(Map.take(row, [:name, :targets]) |> Values.encode(), attrs)) do
      replace_target_days(ctx, client_id, copy.id, Timing.bit(attrs["copy_for_day"]), today)
      {:ok, copy}
    end
  end

  @spec assign_targets_for_client(Ctx.t(), String.t(), integer(), map()) :: result()
  def assign_targets_for_client(ctx, client_id, weekday, attrs),
    do: write(ctx, client_id, fn today -> assign_targets(ctx, client_id, weekday, Values.encode(attrs), today) end)

  defp assign_targets(ctx, client_id, weekday, attrs, today) do
    with :ok <- valid_weekday(weekday), true <- not is_nil(weekday) || {:error, :invalid_date} do
      replacements =
        Enum.reduce(attrs["target_updates"] || [], %{}, fn update, ids ->
          row = unwrap(update_targets(ctx, client_id, update["id"], update, today))
          Map.put(ids, update["id"], row.id)
        end)

      selected = Map.get(replacements, attrs["nutrition_targets_id"], attrs["nutrition_targets_id"])
      id = if attrs["new_targets"], do: unwrap(insert_targets(ctx, client_id, attrs["new_targets"])).id, else: selected
      if id, do: unwrap(targets(ctx, client_id, id))
      replace_target_days(ctx, client_id, id, Timing.bit(weekday), today)
      {:ok, week(ctx, client_id, today, today)}
    end
  end

  defp insert_targets(ctx, client_id, attrs),
    do:
      NutritionTargets.insert_changeset(ctx.business_id, client_id, attrs)
      |> validate_codes(ctx, :targets)
      |> Repo.insert()

  @spec undo_for_client(Ctx.t(), String.t(), String.t()) :: result()
  def undo_for_client(ctx, client_id, token) do
    with :ok <- Ctx.ensure_coach(ctx), {:ok, _} <- ClientAccess.authorize_client(ctx, client_id) do
      Repo.transaction(fn ->
        client = lock_client(ctx, client_id)
        effective_today = today(client)
        unwrap(Undo.restore(ctx, client_id, token, effective_today))
        week(ctx, client_id, effective_today, effective_today)
      end)
    end
  end

  defp write(ctx, client_id, operation) do
    with :ok <- Ctx.ensure_coach(ctx), {:ok, _} <- ClientAccess.authorize_client(ctx, client_id) do
      Repo.transaction(fn ->
        client = lock_client(ctx, client_id)
        effective_today = today(client)
        unwrap(ensure_nutrients(ctx))
        before = Undo.snapshot(ctx, client_id)
        value = unwrap(operation.(effective_today))
        %{data: value, undo_token: Undo.token(ctx, client_id, before, effective_today)}
      end)
    end
  end

  defp lock_client(ctx, client_id),
    do:
      Client.for_business(ctx.business_id)
      |> where([c], c.id == ^client_id)
      |> lock("FOR UPDATE")
      |> preload(:business)
      |> Repo.one()

  defp today(client), do: Client.local_date(client, DateTime.utc_now())
  defp on_date(nil, today), do: {:ok, today}
  defp on_date(%Date{} = on, _today), do: {:ok, on}

  defp on_date(on, _today) do
    case Date.from_iso8601(on) do
      {:ok, date} -> {:ok, date}
      _ -> {:error, :invalid_date}
    end
  end

  defp found(nil), do: {:error, :not_found}
  defp found(value), do: {:ok, value}
  defp unwrap({:ok, value}), do: value
  defp unwrap({:error, reason}), do: Repo.rollback(reason)
  defp save(cs), do: unwrap(Repo.update(cs))
  defp remove(row), do: unwrap(Repo.delete(row))
  defp valid_weekday(nil), do: :ok
  defp valid_weekday(day) when is_integer(day) and day in 1..7, do: :ok
  defp valid_weekday(_day), do: {:error, :invalid_date}

  defp preset(ctx, client_id, id),
    do:
      NutritionPreset.for_client(ctx.business_id, client_id)
      |> NutritionPreset.active()
      |> NutritionPreset.include_content(ctx.business_id)
      |> Repo.get(id)
      |> found()

  defp targets(ctx, client_id, id),
    do: NutritionTargets.for_client(ctx.business_id, client_id) |> NutritionTargets.active() |> Repo.get(id) |> found()

  defp schedule(ctx, client_id, id),
    do: NutritionSchedule.for_client(ctx.business_id, client_id) |> Repo.get(id) |> found()

  defp validate_codes(cs, ctx, field) do
    codes = (Ecto.Changeset.get_field(cs, field) || %{}) |> Map.keys() |> Enum.map(&to_string/1)
    registered = Nutrient.for_business(ctx.business_id) |> where([n], n.code in ^codes) |> Repo.aggregate(:count)
    if registered == length(codes), do: cs, else: Ecto.Changeset.add_error(cs, field, "use registered nutrient codes")
  end

  defp validate_food_dependents(cs, ctx) do
    case Ecto.Changeset.apply_action(cs, :update) do
      {:ok, food} ->
        direct =
          NutritionPreset |> where([p], p.business_id == ^ctx.business_id and p.food_id == ^food.id) |> Repo.all()

        items = MealItem.for_business(ctx.business_id) |> where([i], i.food_id == ^food.id) |> Repo.all()

        valid_direct =
          Enum.all?(direct, fn p -> food.kind == p.type and match?({:ok, _}, Food.factor(food, p.amount, p.unit)) end)

        valid_items = Enum.all?(items, &match?({:ok, _}, Food.factor(food, &1.amount, &1.unit)))

        if valid_direct and valid_items,
          do: cs,
          else: Ecto.Changeset.add_error(cs, :kind, "keep the kind and units used by existing prescriptions")

      {:error, _} ->
        cs
    end
  end

  defp page(query, opts) do
    limit = CursorPage.limit(opts)

    with :ok <- CursorPage.validate_options(opts),
         {:ok, paged} <- CursorPage.query(query, opts[:cursor] || "start", limit),
         do: {:ok, CursorPage.finish(Repo.all(paged), limit, Repo.aggregate(query, :count))}
  end

  defp week(ctx, client_id, on, today) do
    current = Date.compare(on, today) != :lt

    presets =
      NutritionPreset.for_client(ctx.business_id, client_id)
      |> NutritionPreset.include_content(ctx.business_id)
      |> NutritionPreset.alphabetical()

    sets = NutritionTargets.for_client(ctx.business_id, client_id) |> NutritionTargets.alphabetical()
    presets = if current, do: NutritionPreset.active(presets), else: presets
    sets = if current, do: NutritionTargets.active(sets), else: sets
    schedules = NutritionSchedule.for_client(ctx.business_id, client_id) |> NutritionSchedule.by_time() |> Repo.all()
    target_schedules = TargetSchedule.for_client(ctx.business_id, client_id) |> TargetSchedule.by_weekdays() |> Repo.all()
    schedules = Enum.filter(schedules, fn s -> if current, do: Timing.future?(s, on), else: Timing.applies?(s, on) end)

    target_schedules =
      Enum.filter(target_schedules, fn s -> if current, do: Timing.future?(s, on), else: Timing.applies?(s, on) end)

    presets = Repo.all(presets)
    sets = Repo.all(sets)

    presets =
      if current,
        do: presets,
        else: Enum.filter(presets, fn p -> Enum.any?(schedules, &(&1.nutrition_preset_id == p.id)) end)

    sets =
      if current,
        do: sets,
        else: Enum.filter(sets, fn t -> Enum.any?(target_schedules, &(&1.nutrition_targets_id == t.id)) end)

    %{
      today: today,
      nutrients: Repo.all(Nutrient.for_business(ctx.business_id) |> order_by([n], asc: n.code)),
      presets: presets,
      schedules: schedules,
      nutrition_targets: sets,
      target_schedules: target_schedules
    }
  end

  defp positioned(attrs) do
    attrs = Values.encode(attrs)

    if Map.has_key?(attrs, "options"),
      do: Map.put(attrs, "options", Enum.with_index(attrs["options"], &position_option/2)),
      else: attrs
  end

  defp position_option(option, position) do
    items = Enum.with_index(option["items"] || [], fn item, index -> Map.put(item, "position", index) end)
    option |> Map.put("position", position) |> Map.put("items", items)
  end

  defp insert_preset(ctx, client_id, attrs) do
    cs = NutritionPreset.insert_changeset(ctx.business_id, client_id, positioned(attrs))
    with :ok <- validate_foods(ctx, cs), {:ok, row} <- Repo.insert(cs), do: preset(ctx, client_id, row.id)
  end

  defp validate_foods(ctx, cs) do
    with {:ok, row} <- Ecto.Changeset.apply_action(cs, :insert), do: validate_preset_items(ctx, row)
  end

  defp validate_preset_items(ctx, %{type: :meal} = row) do
    items = Enum.flat_map(row.options, & &1.items)
    with {:ok, _} <- Easy.Result.traverse(items, &validate_meal_item(ctx, &1)), do: :ok
  end

  defp validate_preset_items(ctx, row), do: validate_item(ctx, row, row.type)

  defp validate_meal_item(ctx, item) do
    case validate_item(ctx, item, nil) do
      :ok -> {:ok, item}
      error -> error
    end
  end

  defp validate_item(ctx, item, kind) do
    with {:ok, food} <-
           Food.for_business(ctx.business_id)
           |> where([f], f.id == ^item.food_id)
           |> lock("FOR SHARE")
           |> Repo.one()
           |> found(),
         true <- (is_nil(kind) or food.kind == kind) || {:error, :invalid_nutrition_item},
         {:ok, _} <- Food.factor(food, item.amount, item.unit),
         do: :ok
  end

  defp chosen_preset(ctx, client_id, %{"preset" => attrs}), do: insert_preset(ctx, client_id, attrs)
  defp chosen_preset(ctx, client_id, %{"nutrition_preset_id" => id}), do: preset(ctx, client_id, id)
  defp chosen_preset(_ctx, _client_id, _attrs), do: {:error, :invalid_nutrition_item}

  defp update_preset(ctx, client_id, id, attrs, today) do
    case update_preset_version(ctx, client_id, id, attrs, today) do
      {:ok, {row, _schedules}} -> {:ok, row}
      error -> error
    end
  end

  defp update_preset_version(ctx, client_id, id, attrs, today) do
    with {:ok, row} <- preset(ctx, client_id, id) do
      schedules =
        NutritionSchedule.for_client(ctx.business_id, client_id)
        |> where([s], s.nutrition_preset_id == ^id)
        |> Repo.all()

      if Enum.any?(schedules, &Timing.last_fact(&1, today)),
        do: copy_preset_version(ctx, client_id, row, schedules, attrs, today),
        else: edit_unused_preset(ctx, client_id, row, schedules, attrs)
    end
  end

  defp copy_preset_version(ctx, client_id, row, schedules, attrs, today) do
    with {:ok, copy} <- insert_preset(ctx, client_id, Map.merge(preset_attrs(row), Values.encode(attrs))) do
      moved = Map.new(schedules, fn schedule -> {schedule.id, move_content_schedule(schedule, copy.id, today)} end)
      save(Ecto.Changeset.change(row, archived_at: DateTime.utc_now(:second)))
      {:ok, {copy, moved}}
    end
  end

  defp edit_unused_preset(ctx, client_id, row, schedules, attrs) do
    cs = NutritionPreset.update_changeset(row, positioned(attrs))

    with :ok <- validate_foods(ctx, cs),
         {:ok, saved} <- Repo.update(cs),
         {:ok, loaded} <- preset(ctx, client_id, saved.id),
         do: {:ok, {loaded, Map.new(schedules, &{&1.id, &1})}}
  end

  defp preset_attrs(row) do
    attrs = Map.take(row, [:type, :name, :instructions, :food_id, :amount, :unit]) |> Values.encode()

    options =
      Enum.map(row.options, fn option ->
        %{name: option.name, items: Enum.map(option.items, &Map.take(&1, [:food_id, :amount, :unit]))}
      end)

    Map.put(attrs, "options", Values.encode(%{options: options})["options"])
  end

  defp update_targets(ctx, client_id, id, attrs, today) do
    with {:ok, row} <- targets(ctx, client_id, id) do
      schedules =
        TargetSchedule.for_client(ctx.business_id, client_id) |> where([s], s.nutrition_targets_id == ^id) |> Repo.all()

      if Enum.any?(schedules, &Timing.last_fact(&1, today)),
        do: copy_target_version(ctx, client_id, row, schedules, attrs, today),
        else: Repo.update(NutritionTargets.update_changeset(row, attrs) |> validate_codes(ctx, :targets))
    end
  end

  defp copy_target_version(ctx, client_id, row, schedules, attrs, today) do
    attrs = Map.merge(Map.take(row, [:name, :targets]) |> Values.encode(), Values.encode(attrs))

    with {:ok, copy} <- insert_targets(ctx, client_id, attrs) do
      Enum.each(schedules, &move_content_schedule(&1, copy.id, today))
      save(Ecto.Changeset.change(row, archived_at: DateTime.utc_now(:second)))
      {:ok, copy}
    end
  end

  defp insert_schedule(ctx, client_id, preset_id, attrs) do
    NutritionSchedule.insert_changeset(ctx.business_id, client_id, preset_id, attrs)
    |> Ecto.Changeset.put_change(:coach_id, ctx.coach_id)
    |> Repo.insert()
  end

  defp schedule_preset(ctx, client_id, row, attrs, today) do
    id = attrs["nutrition_preset_id"] || row.nutrition_preset_id

    if Map.has_key?(attrs, "amount") or Map.has_key?(attrs, "unit") do
      with {:ok, {preset, moved}} <-
             update_preset_version(ctx, client_id, id, Map.take(attrs, ["amount", "unit"]), today),
           do: {:ok, {preset, Map.get(moved, row.id, row)}}
    else
      with {:ok, preset} <- preset(ctx, client_id, id), do: {:ok, {preset, row}}
    end
  end

  defp timing_attrs(row),
    do:
      Map.take(row, [
        :date,
        :weekdays_mask,
        :from_date,
        :until_date,
        :time,
        :coach_id,
        :nutrition_preset_id,
        :nutrition_targets_id
      ])
      |> Values.encode()

  defp change_schedule(row, attrs, today) do
    module = row.__struct__

    if Timing.last_fact(row, today) do
      save(Ecto.Changeset.change(row, until_date: Date.add(today, -1)))
      attrs = attrs |> Map.put("from_date", today)
      insert_schedule_copy(row, attrs, module)
    else
      parent = parent_field(row)
      module.update_changeset(row, attrs) |> Ecto.Changeset.put_change(parent, attrs[Atom.to_string(parent)]) |> save()
    end
  end

  defp insert_schedule_copy(row, attrs, module) do
    parent = parent_field(row)
    cs = module.insert_changeset(row.business_id, row.client_id, attrs[Atom.to_string(parent)], attrs)
    cs = if module == NutritionSchedule, do: Ecto.Changeset.put_change(cs, :coach_id, row.coach_id), else: cs
    unwrap(Repo.insert(cs))
  end

  defp end_schedule(row, today) do
    cond do
      not Timing.future?(row, today) -> row
      Timing.last_fact(row, today) -> save(Ecto.Changeset.change(row, until_date: Date.add(today, -1)))
      true -> remove(row)
    end
  end

  defp parent_field(%NutritionSchedule{}), do: :nutrition_preset_id
  defp parent_field(%TargetSchedule{}), do: :nutrition_targets_id

  defp move_content_schedule(row, new_id, today) do
    if Timing.future?(row, today) do
      parent = parent_field(row)

      if fact = Timing.last_fact(row, today) do
        save(Ecto.Changeset.change(row, until_date: fact))
        attrs = timing_attrs(row) |> Map.put(Atom.to_string(parent), new_id) |> Map.put("from_date", today)
        insert_schedule_copy(row, attrs, row.__struct__)
      else
        save(Ecto.Changeset.change(row, [{parent, new_id}]))
      end
    else
      row
    end
  end

  defp replace_target_days(ctx, client_id, id, mask, today) do
    rows = current_target_rows(ctx, client_id, today)

    # The days already belong to these targets: nothing to move, so no row is split.
    unless id && Enum.any?(rows, &(&1.nutrition_targets_id == id and covers?(&1, mask))) do
      Enum.each(rows, &remove_target_schedule_days(&1, mask, today))
      add_target_days(ctx, client_id, id, mask, today)
    end
  end

  defp current_target_rows(ctx, client_id, today),
    do:
      TargetSchedule.for_client(ctx.business_id, client_id)
      |> TargetSchedule.current(today)
      |> Repo.all()
      |> Enum.filter(&Timing.future?(&1, today))

  defp covers?(%{weekdays_mask: row_mask}, mask) when is_integer(row_mask), do: (row_mask &&& mask) == mask
  defp covers?(_row, _mask), do: false

  defp add_target_days(_ctx, _client_id, nil, _mask, _today), do: nil

  # A weekday joins the targets' repeating row when they have one (W36: one row covers several weekdays).
  defp add_target_days(ctx, client_id, id, mask, today) do
    case Enum.find(current_target_rows(ctx, client_id, today), &(&1.nutrition_targets_id == id and &1.weekdays_mask)) do
      nil ->
        insert_target_days(ctx, client_id, id, mask, today)

      row ->
        change_schedule(row, Map.put(timing_attrs(row), "weekdays_mask", row.weekdays_mask ||| mask), today)
    end
  end

  defp insert_target_days(ctx, client_id, id, mask, today) do
    cs = TargetSchedule.insert_changeset(ctx.business_id, client_id, id, %{weekdays_mask: mask, from_date: today})
    row = unwrap(Ecto.Changeset.apply_action(cs, :insert))
    other = TargetSchedule.for_client(ctx.business_id, client_id) |> Repo.all()

    if Enum.any?(other, &Timing.overlap?(&1, row)),
      do: Repo.rollback(Ecto.Changeset.add_error(cs, :weekdays_mask, "overlaps another target schedule"))

    unwrap(Repo.insert(cs))
  end

  defp remove_target_schedule_days(row, mask, today) do
    row_mask = row.weekdays_mask || Timing.bit(Date.day_of_week(row.date))
    remaining = row_mask &&& bnot(mask)

    cond do
      remaining == row_mask -> row
      remaining == 0 -> end_schedule(row, today)
      true -> change_schedule(row, Map.put(timing_attrs(row), "weekdays_mask", remaining), today)
    end
  end
end
