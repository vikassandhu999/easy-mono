defmodule Easy.ClientDays do
  import Ecto.Query
  alias Easy.Clients.Client
  alias Easy.Ctx
  alias Easy.CursorPage
  alias Easy.LocalCalendar
  alias Easy.Nutrition
  alias Easy.Nutrition.{NutritionLog, NutritionPreset, NutritionSchedule, NutritionTargets, TargetSchedule, Timing}
  alias Easy.Orgs.Coach
  alias Easy.Repo
  alias Easy.Workouts.{Exercise, Workout, WorkoutLog, WorkoutSchedule}

  @spec read_client_day(Ctx.t(), Date.t()) :: {:ok, map()} | {:error, atom()}
  def read_client_day(ctx, %Date{} = date) do
    Repo.snapshot(fn ->
      with {:ok, client} <- client(ctx) do
        {:ok, day(ctx, client, date)}
      end
    end)
  end

  @spec list_client_week_markers(Ctx.t(), Date.t()) :: {:ok, map()} | {:error, atom()}
  def list_client_week_markers(ctx, %Date{} = from) do
    Repo.snapshot(fn ->
      with {:ok, client} <- client(ctx) do
        until = Date.add(from, 6)

        nutrition =
          NutritionLog.for_client(ctx.business_id, client.id)
          |> where([l], l.logged_on >= ^from and l.logged_on <= ^until)
          |> order_by([l], asc: l.logged_on, asc: l.id)
          |> select([l], l.logged_on)
          |> Repo.all()

        workouts =
          WorkoutLog.for_client(ctx.business_id, client.id)
          |> where([l], l.date >= ^from and l.date <= ^until and l.state != :discarded)
          |> order_by([l], asc: l.date, asc: l.id)
          |> select([l], l.date)
          |> Repo.all()

        recorded = MapSet.new(nutrition ++ workouts)

        {:ok,
         %{
           data:
             Enum.map(0..6, fn offset ->
               date = Date.add(from, offset)
               %{date: date, has_records: MapSet.member?(recorded, date)}
             end)
         }}
      end
    end)
  end

  @spec list_client_exercises(Ctx.t(), keyword()) :: {:ok, map()} | {:error, atom()}
  def list_client_exercises(ctx, opts \\ []) do
    with {:ok, _} <- client(ctx) do
      query = Exercise.visible(ctx.business_id)
      query = search_exercises(query, opts[:search])
      limit = CursorPage.limit(opts)

      with {:ok, paged} <- CursorPage.query(query, opts[:cursor] || "start", limit) do
        {:ok, CursorPage.finish(Repo.all(paged), limit, Repo.aggregate(query, :count))}
      end
    end
  end

  defp search_exercises(query, search) when search in [nil, ""], do: query
  defp search_exercises(query, search), do: where(query, [e], ilike(e.name, ^Easy.Search.like_pattern(search)))

  defp client(ctx) do
    with {:ok, id} <- Ctx.fetch_client_id(ctx) do
      case Client.for_business(ctx.business_id) |> Repo.get(id) do
        nil -> {:error, :not_found}
        row -> {:ok, Repo.preload(row, :business)}
      end
    end
  end

  defp day(ctx, client, date) do
    nutrition_logs = nutrition_records(ctx, client.id, date)
    workout_logs = workout_records(ctx, client.id, date)
    active = WorkoutLog.for_client(ctx.business_id, client.id) |> where([l], l.state == :active) |> WorkoutLog.include_content(ctx.business_id) |> Repo.one()
    nutrition_schedules = nutrition_schedules(ctx, client.id, date)
    workout_schedules = workout_schedules(ctx, client.id, date)
    preset_ids = Enum.map(nutrition_schedules, & &1.nutrition_preset_id) ++ Enum.map(nutrition_logs, & &1.nutrition_preset_id)
    workout_ids = Enum.map(workout_schedules, & &1.workout_id) ++ Enum.map(workout_logs ++ List.wrap(active), & &1.workout_id)
    timezone = LocalCalendar.applied_timezone(client.timezone, client.business.timezone)

    %{
      date: date,
      today: LocalCalendar.to_local_date(DateTime.utc_now(), timezone),
      nutrition_schedules: nutrition_schedules,
      presets: presets(ctx, client.id, preset_ids),
      workout_schedules: workout_schedules,
      workouts: workouts(ctx, client.id, workout_ids),
      coaches: coaches(ctx, workout_schedules),
      target_set: target_set(ctx, client.id, date),
      nutrients: Nutrition.list_nutrients(),
      nutrition_logs: nutrition_logs,
      workout_logs: workout_logs,
      active_workout: active
    }
  end

  defp nutrition_records(ctx, client_id, date) do
    NutritionLog.for_client(ctx.business_id, client_id)
    |> where([l], l.logged_on == ^date or l.scheduled_date == ^date)
    |> order_by([l], asc_nulls_last: l.logged_at, asc: l.id)
    |> NutritionLog.include_food_logs(ctx.business_id)
    |> Repo.all()
  end

  defp workout_records(ctx, client_id, date) do
    WorkoutLog.for_client(ctx.business_id, client_id)
    |> where([l], (l.date == ^date or l.scheduled_date == ^date) and l.state != :discarded)
    |> order_by([l], asc_nulls_last: l.time, asc: l.id)
    |> WorkoutLog.include_content(ctx.business_id)
    |> Repo.all()
  end

  defp presets(ctx, client_id, ids),
    do:
      NutritionPreset.for_client(ctx.business_id, client_id)
      |> where([p], p.id in ^Enum.reject(ids, &is_nil/1))
      |> NutritionPreset.alphabetical()
      |> NutritionPreset.include_content(ctx.business_id)
      |> Repo.all()

  defp workouts(ctx, client_id, ids),
    do:
      Workout.for_owner(ctx.business_id, client_id)
      |> where([w], w.id in ^Enum.reject(ids, &is_nil/1))
      |> order_by([w], asc: w.name, asc: w.id)
      |> Workout.include_content(ctx.business_id)
      |> Repo.all()

  defp coaches(ctx, workout_schedules) do
    coach_ids = workout_schedules |> Enum.map(& &1.coach_id) |> Enum.reject(&is_nil/1)

    Coach.for_business(ctx.business_id)
    |> where([c], c.id in ^coach_ids)
    |> order_by([c], asc: c.full_name, asc: c.id)
    |> Repo.all()
    |> Enum.map(&%{id: &1.id, name: Coach.full_name(&1)})
  end

  defp nutrition_schedules(ctx, client_id, date) do
    bit = Timing.bit(Date.day_of_week(date))
    starts = dynamic([s], is_nil(s.date) and s.from_date <= ^date)
    ends = dynamic([s], is_nil(s.until_date) or s.until_date >= ^date)
    repeating = dynamic([s], ^starts and ^ends)
    repeating = dynamic([s], ^repeating and fragment("(? & ?) <> 0", s.weekdays_mask, ^bit))
    applies = dynamic([s], s.date == ^date or ^repeating)

    NutritionSchedule.for_client(ctx.business_id, client_id)
    |> where(^applies)
    |> NutritionSchedule.by_time()
    |> Repo.all()
  end

  defp workout_schedules(ctx, client_id, date) do
    bit = Timing.bit(Date.day_of_week(date))

    WorkoutSchedule.for_client(ctx.business_id, client_id)
    |> where([s], s.from_date <= ^date and (is_nil(s.until_date) or s.until_date >= ^date))
    |> where([s], fragment("(? & ?) <> 0", s.weekdays_mask, ^bit))
    |> order_by([s], asc_nulls_last: s.time, asc: s.id)
    |> Repo.all()
  end

  defp target_set(ctx, client_id, date) do
    TargetSchedule.for_client(ctx.business_id, client_id)
    |> TargetSchedule.by_weekdays()
    |> Repo.all()
    |> Enum.find(&Timing.applies?(&1, date))
    |> case do
      nil -> nil
      schedule -> NutritionTargets.for_client(ctx.business_id, client_id) |> Repo.get(schedule.nutrition_targets_id)
    end
  end
end
