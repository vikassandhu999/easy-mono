defmodule Easy.Workouts do
  import Ecto.Query
  import Bitwise
  alias Easy.{ClientAccess, Ctx, CursorPage, Repo}
  alias Easy.Clients.Client
  alias Easy.Orgs.Coach
  alias Easy.Workouts.{Exercise, ExerciseGroup, Targets, Timing, Undo, Workout, WorkoutExercise, WorkoutSchedule}
  @type result :: {:ok, map() | struct()} | {:error, atom() | Ecto.Changeset.t()}

  @spec list_exercises(Ctx.t(), keyword()) :: result()
  def list_exercises(ctx, opts \\ []) do
    with :ok <- Ctx.ensure_coach(ctx) do
      Exercise.visible(ctx.business_id)
      |> search(opts[:search])
      |> facet(:kind, opts[:kind])
      |> tag(:goals, opts[:goal])
      |> tag(:places, opts[:place])
      |> tag(:equipment, opts[:equipment])
      |> tag(:muscles, opts[:muscle])
      |> page(opts)
    end
  end

  @spec get_exercise(Ctx.t(), String.t()) :: result()
  def get_exercise(ctx, id),
    do: with(:ok <- Ctx.ensure_coach(ctx), do: Exercise.visible(ctx.business_id) |> Repo.get(id) |> found())

  @spec create_exercise(Ctx.t(), map()) :: result()
  def create_exercise(ctx, attrs),
    do: with(:ok <- Ctx.ensure_coach(ctx), do: Exercise.insert_changeset(ctx.business_id, attrs) |> Repo.insert())

  @spec update_exercise(Ctx.t(), String.t(), map()) :: result()
  def update_exercise(ctx, id, attrs),
    do:
      with(
        :ok <- Ctx.ensure_coach(ctx),
        {:ok, row} <- own_exercise(ctx, id),
        do: Exercise.update_changeset(row, attrs) |> Repo.update()
      )

  @spec copy_exercise(Ctx.t(), String.t()) :: result()
  def copy_exercise(ctx, id),
    do:
      with(
        {:ok, row} <- get_exercise(ctx, id),
        do:
          create_exercise(
            ctx,
            Map.take(row, Exercise.__schema__(:fields) -- [:id, :business_id, :inserted_at, :updated_at])
            |> Map.update!(:name, &(&1 <> " (copy)"))
          )
      )

  @spec delete_exercise(Ctx.t(), String.t()) :: result()
  def delete_exercise(ctx, id) do
    with :ok <- Ctx.ensure_coach(ctx),
         do: Repo.transaction(fn -> delete_locked_exercise(ctx, id) end)
  end

  defp delete_locked_exercise(ctx, id) do
    row =
      Exercise.for_business(ctx.business_id)
      |> where([e], e.id == ^id)
      |> lock("FOR UPDATE")
      |> Repo.one()
      |> found()
      |> unwrap()

    if Repo.exists?(from(e in WorkoutExercise, where: e.business_id == ^ctx.business_id and e.exercise_id == ^row.id)),
      do: Repo.rollback(:in_use),
      else: remove(row)
  end

  defp own_exercise(ctx, id), do: Exercise.for_business(ctx.business_id) |> Repo.get(id) |> found()

  @spec list_workouts(Ctx.t(), keyword()) :: result()
  def list_workouts(ctx, opts \\ []), do: with(:ok <- Ctx.ensure_coach(ctx), do: list_owned(ctx, nil, opts))
  @spec get_workout(Ctx.t(), String.t()) :: result()
  def get_workout(ctx, id), do: with(:ok <- Ctx.ensure_coach(ctx), do: workout(ctx, nil, id))
  @spec create_workout(Ctx.t(), map()) :: result()
  def create_workout(ctx, attrs), do: library_write(ctx, fn -> insert_workout(ctx, nil, attrs) end)
  @spec update_workout(Ctx.t(), String.t(), map()) :: result()
  def update_workout(ctx, id, attrs),
    do: library_write(ctx, fn -> with {:ok, row} <- workout(ctx, nil, id), do: edit_workout(ctx, row, attrs) end)

  @spec delete_workout(Ctx.t(), String.t()) :: result()
  def delete_workout(ctx, id),
    do: library_write(ctx, fn -> with {:ok, row} <- workout(ctx, nil, id), do: Repo.delete(row) end)

  @spec copy_workout(Ctx.t(), String.t()) :: result()
  def copy_workout(ctx, id),
    do:
      library_write(ctx, fn ->
        with {:ok, row} <- workout(ctx, nil, id),
             do: insert_workout(ctx, nil, Map.put(content(row), "name", row.name <> " (copy)"), row)
      end)

  @spec list_workouts_for_client(Ctx.t(), String.t(), keyword()) :: result()
  def list_workouts_for_client(ctx, client_id, opts \\ []),
    do: with(:ok <- access(ctx, client_id), do: list_owned(ctx, client_id, opts))

  @spec get_workout_for_client(Ctx.t(), String.t(), String.t()) :: result()
  def get_workout_for_client(ctx, client_id, id),
    do: with(:ok <- access(ctx, client_id), do: workout(ctx, client_id, id, false))

  @spec create_workout_for_client(Ctx.t(), String.t(), map()) :: result()
  def create_workout_for_client(ctx, client_id, attrs),
    do: write(ctx, client_id, fn _ -> insert_workout(ctx, client_id, attrs) end)

  @spec update_workout_for_client(Ctx.t(), String.t(), String.t(), map()) :: result()
  def update_workout_for_client(ctx, client_id, id, attrs),
    do: write(ctx, client_id, fn today -> update_owned(ctx, client_id, id, attrs, today) end)

  @spec copy_workout_for_client(Ctx.t(), String.t(), String.t()) :: result()
  def copy_workout_for_client(ctx, client_id, id),
    do:
      write(ctx, client_id, fn _ ->
        with {:ok, row} <- workout(ctx, client_id, id),
             do: insert_workout(ctx, client_id, Map.put(content(row), "name", row.name <> " (copy)"), row)
      end)

  @spec assign_workout_to_client(Ctx.t(), String.t(), String.t()) :: result()
  def assign_workout_to_client(ctx, client_id, id),
    do:
      write(ctx, client_id, fn _ ->
        with {:ok, row} <- workout(ctx, nil, id), do: insert_workout(ctx, client_id, content(row), row)
      end)

  @spec delete_workout_for_client(Ctx.t(), String.t(), String.t()) :: result()
  def delete_workout_for_client(ctx, client_id, id),
    do: write(ctx, client_id, &delete_owned(ctx, client_id, id, &1))

  defp delete_owned(ctx, client_id, id, today) do
    with {:ok, row} <- workout(ctx, client_id, id) do
      rows = schedules(ctx, client_id, id)
      Enum.each(rows, &end_schedule(&1, today))

      if Enum.any?(rows, &Timing.last_fact(&1, today)),
        do: save(Ecto.Changeset.change(row, archived_at: DateTime.utc_now(:second))),
        else: remove(row)

      {:ok, week(ctx, client_id, today, today)}
    end
  end

  @spec read_week_for_client(Ctx.t(), String.t(), keyword()) :: result()
  def read_week_for_client(ctx, client_id, opts \\ []) do
    with :ok <- access(ctx, client_id),
         {:ok, client} <- ClientAccess.authorize_client(ctx, client_id),
         {:ok, on} <- on_date(opts[:on], local_today(Repo.preload(client, :business))) do
      {:ok, week(ctx, client_id, on, local_today(Repo.preload(client, :business)))}
    end
  end

  @spec add_schedule_for_client(Ctx.t(), String.t(), map()) :: result()
  def add_schedule_for_client(ctx, client_id, attrs) do
    write(ctx, client_id, fn today ->
      attrs = encode(attrs)

      with {:ok, row} <- chosen_workout(ctx, client_id, attrs),
           do: merge_schedule(ctx, client_id, row.id, Map.put(attrs, "from_date", today), today)
    end)
  end

  @spec update_schedule_for_client(Ctx.t(), String.t(), String.t(), map()) :: result()
  def update_schedule_for_client(ctx, client_id, id, attrs),
    do: write(ctx, client_id, &update_schedule(ctx, client_id, id, attrs, &1))

  defp update_schedule(ctx, client_id, id, attrs, today) do
    with {:ok, row} <- schedule(ctx, client_id, id),
         true <- Timing.future?(row, today) || {:error, :not_found} do
      next = Map.merge(timing_attrs(row), encode(attrs)) |> Map.put("from_date", today)

      with {:ok, desired} <- validate_schedule(ctx, row, next),
           do: {:ok, merge_changed_schedule(ctx, row, desired, next, today)}
    end
  end

  @spec remove_schedule_for_client(Ctx.t(), String.t(), String.t(), integer() | nil) :: result()
  def remove_schedule_for_client(ctx, client_id, id, weekday \\ nil),
    do: write(ctx, client_id, &remove_schedule(ctx, client_id, id, weekday, &1))

  defp remove_schedule(ctx, client_id, id, weekday, today) do
    with {:ok, row} <- schedule(ctx, client_id, id),
         true <- Timing.future?(row, today) || {:error, :not_found},
         :ok <- valid_weekday(weekday) do
      mask = if weekday, do: row.weekdays_mask &&& bnot(Timing.bit(weekday)), else: 0

      if mask == 0,
        do: end_schedule(row, today),
        else: change_schedule(row, Map.put(timing_attrs(row), "weekdays_mask", mask), today)

      {:ok, week(ctx, client_id, today, today)}
    end
  end

  @spec undo_for_client(Ctx.t(), String.t(), String.t()) :: result()
  def undo_for_client(ctx, client_id, token) do
    with :ok <- access(ctx, client_id) do
      Repo.transaction(fn ->
        today = local_today(lock_client(ctx, client_id))
        unwrap(Undo.restore(ctx, client_id, token, today))
        week(ctx, client_id, today, today)
      end)
    end
  end

  defp library_write(ctx, operation),
    do: with(:ok <- Ctx.ensure_coach(ctx), do: Repo.transaction(fn -> unwrap(operation.()) end))

  defp write(ctx, client_id, operation) do
    with :ok <- access(ctx, client_id) do
      Repo.transaction(fn ->
        today = local_today(lock_client(ctx, client_id))
        before = Undo.snapshot(ctx, client_id)
        value = unwrap(operation.(today))
        %{data: value, undo_token: Undo.token(ctx, client_id, before, today)}
      end)
    end
  end

  defp access(ctx, client_id),
    do: with(:ok <- Ctx.ensure_coach(ctx), do: ClientAccess.authorize_client_id(ctx, client_id))

  defp lock_client(ctx, id),
    do:
      Client.for_business(ctx.business_id)
      |> where([c], c.id == ^id)
      |> lock("FOR UPDATE")
      |> preload(:business)
      |> Repo.one()

  defp local_today(client), do: Client.local_date(client, DateTime.utc_now())
  defp on_date(nil, today), do: {:ok, today}
  defp on_date(%Date{} = on, _), do: {:ok, on}

  defp on_date(value, _) do
    case Date.from_iso8601(value) do
      {:ok, on} -> {:ok, on}
      _ -> {:error, :invalid_date}
    end
  end

  defp found(nil), do: {:error, :not_found}
  defp found(row), do: {:ok, row}
  defp unwrap({:ok, value}), do: value
  defp unwrap({:error, reason}), do: Repo.rollback(reason)
  defp save(cs), do: unwrap(Repo.update(cs))
  defp remove(row), do: unwrap(Repo.delete(row))
  defp encode(value), do: value |> Jason.encode!() |> Jason.decode!()
  defp valid_weekday(nil), do: :ok
  defp valid_weekday(day) when is_integer(day) and day in 1..7, do: :ok
  defp valid_weekday(_), do: {:error, :invalid_date}
  defp search(q, value) when value in [nil, ""], do: q
  defp search(q, value), do: where(q, [r], ilike(r.name, ^Easy.Search.like_pattern(value)))
  defp facet(q, _, value) when value in [nil, ""], do: q
  defp facet(q, key, value), do: where(q, [r], field(r, ^key) == ^value)
  defp tag(q, _, value) when value in [nil, ""], do: q
  defp tag(q, key, value), do: where(q, [r], ^value in field(r, ^key))

  defp page(q, opts) do
    limit = CursorPage.limit(opts)

    with :ok <- CursorPage.validate_options(opts),
         {:ok, paged} <- CursorPage.query(q, opts[:cursor] || "start", limit),
         do: {:ok, CursorPage.finish(Repo.all(paged), limit, Repo.aggregate(q, :count))}
  end

  defp list_owned(ctx, client_id, opts),
    do:
      Workout.for_owner(ctx.business_id, client_id)
      |> Workout.active()
      |> Workout.include_content(ctx.business_id)
      |> search(opts[:search])
      |> facet(:type, opts[:type])
      |> page(opts)

  defp workout(ctx, client_id, id, active \\ true) do
    q = Workout.for_owner(ctx.business_id, client_id) |> Workout.include_content(ctx.business_id)
    q = if active, do: Workout.active(q), else: q
    q = if Repo.in_transaction?(), do: lock(q, "FOR UPDATE"), else: q
    q |> Repo.get(id) |> found()
  end

  defp insert_workout(ctx, client_id, attrs, source \\ nil) do
    with {:ok, row} <- Workout.insert_changeset(ctx.business_id, client_id, attrs) |> Repo.insert(),
         :ok <- replace_groups(ctx, row, encode(attrs)["groups"] || [], if(source, do: source.groups, else: []), true) do
      workout(ctx, client_id, row.id)
    end
  end

  defp edit_workout(ctx, row, attrs) do
    attrs = encode(attrs)
    cs = Workout.update_changeset(row, attrs)
    next_groups = Map.get(attrs, "groups", row.groups)

    with {:ok, next} <- Ecto.Changeset.apply_action(cs, :update),
         :ok <- content_shape(next.type, next_groups),
         {:ok, saved} <- Repo.update(cs) do
      if Map.has_key?(attrs, "groups"), do: unwrap_ok(replace_groups(ctx, saved, attrs["groups"], row.groups))
      workout(ctx, row.client_id, saved.id)
    end
  end

  defp content_shape(:prescribed, _groups), do: :ok
  defp content_shape(_type, []), do: :ok
  defp content_shape(_type, _groups), do: {:error, :invalid_prescription}

  defp unwrap_ok(:ok), do: :ok
  defp unwrap_ok({:error, reason}), do: Repo.rollback(reason)

  defp replace_groups(ctx, row, groups, old, fresh \\ false) do
    cond do
      not is_list(groups) ->
        {:error, :invalid_prescription}

      row.type != :prescribed and groups != [] ->
        {:error, :invalid_prescription}

      true ->
        Repo.delete_all(from(g in ExerciseGroup, where: g.business_id == ^ctx.business_id and g.workout_id == ^row.id))

        Enum.with_index(groups)
        |> Enum.each(fn {attrs, position} ->
          insert_group(ctx, row, Map.put(attrs, "position", position), old, fresh)
        end)

        :ok
    end
  end

  defp insert_group(ctx, workout, attrs, old, fresh) do
    prior = Enum.find(old, &(&1.id == attrs["id"]))
    group = ExerciseGroup.insert_changeset(ctx.business_id, workout.id, attrs)
    group = if prior && not fresh, do: Ecto.Changeset.put_change(group, :id, prior.id), else: group
    group = unwrap(Repo.insert(group))
    exercises = attrs["exercises"] || []
    if exercises == [], do: Repo.rollback(:invalid_prescription)

    Enum.with_index(exercises)
    |> Enum.each(fn {item, position} ->
      insert_item(ctx, group, Map.put(item, "position", position), Enum.flat_map(old, & &1.exercises), fresh)
    end)
  end

  defp insert_item(ctx, group, attrs, old, fresh) do
    exercise = unwrap(Exercise.visible(ctx.business_id) |> Repo.get(attrs["exercise_id"]) |> found())
    prior = Enum.find(old, &(&1.id == attrs["id"] and &1.exercise_id == exercise.id))
    snapshot = if prior, do: prior.exercise_snapshot, else: exercise_snapshot(exercise)

    cs =
      WorkoutExercise.insert_changeset(ctx.business_id, group.id, attrs)
      |> Ecto.Changeset.put_change(:exercise_snapshot, snapshot)

    cs = if prior && not fresh, do: Ecto.Changeset.put_change(cs, :id, prior.id), else: cs

    with {:ok, item} <- Ecto.Changeset.apply_action(cs, :insert),
         true <- Targets.valid?(item, snapshot, group.rounds) || {:error, :invalid_prescription} do
      unwrap(Repo.insert(cs))
    else
      {:error, reason} -> Repo.rollback(reason)
    end
  end

  defp exercise_snapshot(row),
    do:
      row
      |> Map.take([
        :id,
        :name,
        :kind,
        :goals,
        :places,
        :metrics,
        :count_label,
        :grade_scale,
        :unilateral,
        :equipment,
        :muscles,
        :media
      ])
      |> Map.put(:is_builtin, is_nil(row.business_id))
      |> encode()

  defp content(row) do
    groups =
      Enum.map(row.groups, fn g ->
        %{
          id: g.id,
          name: g.name,
          rounds: g.rounds,
          exercises: Enum.map(g.exercises, &Map.take(&1, [:id, :exercise_id, :targets_mode, :targets, :rest]))
        }
      end)

    row |> Map.take([:name, :description, :type, :video]) |> Map.put(:groups, groups) |> encode()
  end

  defp update_owned(ctx, client_id, id, attrs, today) do
    with {:ok, row} <- workout(ctx, client_id, id) do
      rows = schedules(ctx, client_id, id)

      if Enum.any?(rows, &Timing.last_fact(&1, today)),
        do: copy_owned(ctx, row, rows, attrs, today),
        else: edit_workout(ctx, row, attrs)
    end
  end

  defp copy_owned(ctx, row, rows, attrs, today) do
    with {:ok, copy} <- insert_workout(ctx, row.client_id, Map.merge(content(row), encode(attrs)), row) do
      Enum.each(rows, &move_schedule(&1, copy.id, today))
      save(Ecto.Changeset.change(row, archived_at: DateTime.utc_now(:second)))
      {:ok, copy}
    end
  end

  defp schedules(ctx, client_id, workout_id),
    do: WorkoutSchedule.for_client(ctx.business_id, client_id) |> where([s], s.workout_id == ^workout_id) |> Repo.all()

  defp schedule(ctx, client_id, id),
    do: WorkoutSchedule.for_client(ctx.business_id, client_id) |> Repo.get(id) |> found()

  defp timing_attrs(row),
    do: row |> Map.take([:weekdays_mask, :from_date, :until_date, :time, :place, :meeting_url, :coach_id]) |> encode()

  defp chosen_workout(ctx, client_id, %{"library_workout_id" => id}),
    do: with({:ok, source} <- workout(ctx, nil, id), do: insert_workout(ctx, client_id, content(source), source))

  defp chosen_workout(ctx, client_id, %{"workout_id" => id}), do: workout(ctx, client_id, id)
  defp chosen_workout(_, _, _), do: {:error, :invalid_prescription}

  defp validate_schedule(ctx, row, attrs) do
    cs = WorkoutSchedule.update_changeset(row, attrs)
    id = Ecto.Changeset.get_field(cs, :coach_id)

    if id && not Repo.exists?(Coach.for_business(ctx.business_id) |> Coach.active() |> where([c], c.id == ^id)),
      do: {:error, :coach_not_active},
      else: Ecto.Changeset.apply_action(cs, :insert)
  end

  defp merge_schedule(ctx, client_id, workout_id, attrs, today) do
    cs = WorkoutSchedule.insert_changeset(ctx.business_id, client_id, workout_id, attrs)

    with {:ok, desired} <- Ecto.Changeset.apply_action(cs, :insert),
         {:ok, _} <- validate_schedule(ctx, desired, attrs) do
      existing =
        schedules(ctx, client_id, workout_id)
        |> Enum.find(&(Timing.future?(&1, today) and occasion(&1) == occasion(desired)))

      if existing,
        do:
          {:ok,
           change_schedule(
             existing,
             Map.put(timing_attrs(existing), "weekdays_mask", existing.weekdays_mask ||| desired.weekdays_mask),
             today
           )},
        else: Repo.insert(cs)
    end
  end

  defp merge_changed_schedule(ctx, row, desired, attrs, today) do
    other =
      schedules(ctx, row.client_id, row.workout_id)
      |> Enum.find(&(&1.id != row.id and Timing.future?(&1, today) and occasion(&1) == occasion(desired)))

    if other do
      end_schedule(row, today)

      change_schedule(
        other,
        Map.put(timing_attrs(other), "weekdays_mask", other.weekdays_mask ||| desired.weekdays_mask),
        today
      )
    else
      change_schedule(row, attrs, today)
    end
  end

  defp occasion(row), do: Map.take(row, [:time, :place, :meeting_url, :coach_id])

  defp end_schedule(row, today) do
    case Timing.last_fact(row, today) do
      nil -> remove(row)
      last -> save(Ecto.Changeset.change(row, until_date: last))
    end
  end

  defp change_schedule(row, attrs, today) do
    if Timing.last_fact(row, today) do
      end_schedule(row, today)

      WorkoutSchedule.insert_changeset(
        row.business_id,
        row.client_id,
        row.workout_id,
        Map.put(attrs, "from_date", today)
      )
      |> Repo.insert()
      |> unwrap()
    else
      WorkoutSchedule.update_changeset(row, attrs) |> Repo.update() |> unwrap()
    end
  end

  defp move_schedule(row, workout_id, today) do
    if Timing.future?(row, today) do
      if Timing.last_fact(row, today) do
        end_schedule(row, today)

        WorkoutSchedule.insert_changeset(
          row.business_id,
          row.client_id,
          workout_id,
          Map.put(timing_attrs(row), "from_date", today)
        )
        |> Repo.insert()
        |> unwrap()
      else
        Ecto.Changeset.change(row, workout_id: workout_id) |> Repo.update() |> unwrap()
      end
    end
  end

  defp week(ctx, client_id, on, today) do
    current = Date.compare(on, today) != :lt

    schedules =
      WorkoutSchedule.for_client(ctx.business_id, client_id)
      |> order_by([s], asc_nulls_last: s.time, asc: s.id)
      |> Repo.all()
      |> Enum.filter(fn s -> if current, do: Timing.future?(s, on), else: Timing.applies?(s, on) end)

    workouts =
      Workout.for_owner(ctx.business_id, client_id)
      |> Workout.include_content(ctx.business_id)
      |> order_by([w], asc: w.name, asc: w.id)

    workouts =
      if current,
        do: Workout.active(workouts),
        else: where(workouts, [w], w.id in ^Enum.map(schedules, & &1.workout_id))

    coaches =
      Coach.for_business(ctx.business_id)
      |> Coach.active()
      |> order_by([c], asc: c.full_name, asc: c.id)
      |> Repo.all()
      |> Enum.map(&%{id: &1.id, name: Coach.full_name(&1)})

    %{today: today, workouts: Repo.all(workouts), schedules: schedules, coaches: coaches}
  end
end
