defmodule Easy.TrainingPlans do
  alias Easy.Clients
  alias Easy.Clients.Client
  alias Easy.Ctx
  alias Easy.Orgs.Coach
  alias Easy.Repo
  alias Easy.Training.ScheduleEntry
  alias Easy.Training.TrainingPlan
  alias Easy.Training.TrainingWorkout
  alias Easy.Training.TrainingWorkoutExercise

  import Ecto.Changeset
  import Ecto.Query

  @spec get_plan_full(Ctx.t(), String.t()) ::
          {:ok, TrainingPlan.t()} | {:error, :not_found}
  def get_plan_full(%Ctx{} = ctx, plan_id) do
    business_id = ctx.business_id

    plan =
      TrainingPlan
      |> TrainingPlan.for_business(business_id)
      |> TrainingPlan.include_workouts(business_id)
      |> TrainingPlan.include_schedule_entries(business_id)
      |> preload(client: ^Client.for_business(business_id))
      |> Repo.get(plan_id)

    with {:ok, plan} <- ok_or_not_found(plan),
         :ok <- Clients.authorize_client_id(ctx, plan.client_id) do
      {:ok, plan}
    end
  end

  @spec get_client_plan_full(Ctx.t(), String.t()) ::
          {:ok, TrainingPlan.t()} | {:error, :not_found}
  def get_client_plan_full(%Ctx{} = ctx, plan_id) do
    with {:ok, client} <- get_client(ctx) do
      business_id = ctx.business_id

      TrainingPlan
      |> TrainingPlan.for_client(business_id, client.id)
      |> TrainingPlan.include_workouts(business_id)
      |> TrainingPlan.include_schedule_entries(business_id)
      |> Repo.get(plan_id)
      |> ok_or_not_found()
    end
  end

  @spec get_client_active_plan_day(Ctx.t(), Date.t()) ::
          {:ok, map()} | {:error, :not_found}
  def get_client_active_plan_day(%Ctx{} = ctx, date) do
    with {:ok, client} <- get_client(ctx) do
      get_active_plan_day_for_client(ctx.business_id, client.id, date)
    end
  end

  @spec list_template_plans(Ctx.t(), keyword()) ::
          {:ok, %{count: non_neg_integer(), plans: [TrainingPlan.t()]}}
  def list_template_plans(%Ctx{} = ctx, opts \\ []) do
    offset = Keyword.get(opts, :offset, 0)
    limit = min(Keyword.get(opts, :limit, 20), 100)
    status = Keyword.get(opts, :status)
    search = String.trim(Keyword.get(opts, :search, "") || "")
    business_id = ctx.business_id

    base =
      TrainingPlan
      |> TrainingPlan.for_business(business_id)
      |> TrainingPlan.templates()
      |> TrainingPlan.for_status(status)
      |> TrainingPlan.for_search(search)

    preload_fun = fn query ->
      query
      |> TrainingPlan.include_workouts(business_id)
      |> TrainingPlan.include_schedule_entries(business_id)
    end

    {:ok, paginated(base, offset, limit, preload_fun)}
  end

  @spec list_client_plans(Ctx.t(), keyword()) ::
          {:ok, %{count: non_neg_integer(), plans: [TrainingPlan.t()]}} | {:error, :not_found}
  def list_client_plans(%Ctx{} = ctx, opts \\ []) do
    offset = Keyword.get(opts, :offset, 0)
    limit = min(Keyword.get(opts, :limit, 20), 100)
    status = Keyword.get(opts, :status)

    with {:ok, client} <- get_client(ctx) do
      business_id = ctx.business_id

      base =
        TrainingPlan
        |> TrainingPlan.for_client(business_id, client.id)
        |> TrainingPlan.for_status(status)

      preload_fun = fn query ->
        query
        |> TrainingPlan.include_workouts(business_id)
        |> TrainingPlan.include_schedule_entries(business_id)
        |> preload(client: ^Client.for_business(business_id))
      end

      {:ok, paginated(base, offset, limit, preload_fun)}
    end
  end

  @spec list_plans_for_client(Ctx.t(), String.t(), keyword()) ::
          {:ok, %{count: non_neg_integer(), plans: [TrainingPlan.t()]}} | {:error, :not_found}
  def list_plans_for_client(%Ctx{} = ctx, client_id, opts \\ []) do
    offset = Keyword.get(opts, :offset, 0)
    limit = min(Keyword.get(opts, :limit, 20), 100)
    status = Keyword.get(opts, :status)
    business_id = ctx.business_id

    with {:ok, _client} <- Clients.authorize_client(ctx, client_id) do
      base =
        TrainingPlan
        |> TrainingPlan.for_client(business_id, client_id)
        |> TrainingPlan.for_status(status)

      preload_fun = fn query ->
        query
        |> TrainingPlan.include_workouts(business_id)
        |> TrainingPlan.include_schedule_entries(business_id)
        |> preload(client: ^Client.for_business(business_id))
      end

      {:ok, paginated(base, offset, limit, preload_fun)}
    end
  end

  @spec create_plan(Ctx.t(), map()) ::
          {:ok, TrainingPlan.t()} | {:error, :not_found | Ecto.Changeset.t()}
  def create_plan(%Ctx{} = ctx, attrs) do
    with {:ok, coach} <- get_coach(ctx) do
      ctx.business_id
      |> TrainingPlan.insert_changeset(coach.id, attrs)
      |> Repo.insert()
      |> preload_plan()
    end
  end

  @spec update_plan(Ctx.t(), String.t(), map()) ::
          {:ok, TrainingPlan.t()} | {:error, :not_found | Ecto.Changeset.t()}
  def update_plan(%Ctx{} = ctx, plan_id, attrs) do
    with {:ok, plan} <- get_plan(ctx, plan_id) do
      plan
      |> TrainingPlan.update_changeset(attrs)
      |> Repo.update()
      |> preload_plan()
    end
  end

  @spec delete_plan(Ctx.t(), String.t()) ::
          {:ok, TrainingPlan.t()} | {:error, :not_found | Ecto.Changeset.t()}
  def delete_plan(%Ctx{} = ctx, plan_id) do
    with {:ok, plan} <- get_plan(ctx, plan_id) do
      Repo.delete(plan)
    end
  end

  @spec duplicate_plan(Ctx.t(), String.t()) ::
          {:ok, TrainingPlan.t()} | {:error, :not_found | Ecto.Changeset.t()}
  def duplicate_plan(%Ctx{} = ctx, plan_id) do
    with {:ok, coach} <- get_coach(ctx),
         {:ok, plan} <- get_plan_full(ctx, plan_id) do
      attrs = %{
        name: generate_copy_name(plan.name, plan.business_id),
        description: plan.description
      }

      clone_plan(plan, attrs, creator_id: coach.id, source_template_id: plan.id)
    end
  end

  @spec assign_plan_to_client(Ctx.t(), String.t(), String.t(), map()) ::
          {:ok, TrainingPlan.t()} | {:error, Ecto.Changeset.t() | :not_found}
  def assign_plan_to_client(%Ctx{} = ctx, client_id, plan_id, attrs) do
    with {:ok, coach} <- get_coach(ctx),
         {:ok, plan} <- get_plan_full(ctx, plan_id),
         {:ok, _client} <- Clients.authorize_client(ctx, client_id) do
      clone_attrs = %{
        name: plan.name,
        description: plan.description,
        start_date: Map.get(attrs, :start_date),
        end_date: Map.get(attrs, :end_date)
      }

      with {:ok, assigned} <-
             clone_plan(plan, clone_attrs,
               creator_id: coach.id,
               client_id: client_id,
               source_template_id: plan.id
             ) do
        :ok = Clients.advance_stage_to_coaching(ctx, client_id)
        {:ok, assigned}
      end
    end
  end

  @spec get_schedule(Ctx.t(), String.t()) ::
          {:ok, %{optional(String.t()) => ScheduleEntry.t()}} | {:error, :not_found}
  def get_schedule(%Ctx{} = ctx, plan_id) do
    with {:ok, plan} <- get_plan(ctx, plan_id) do
      schedule =
        ScheduleEntry
        |> ScheduleEntry.for_business(ctx.business_id)
        |> ScheduleEntry.for_plan(plan.id)
        |> ScheduleEntry.include_workout(ctx.business_id)
        |> Repo.all()
        |> Map.new(fn entry -> {entry.day_of_week, entry} end)

      {:ok, schedule}
    end
  end

  @spec set_day_schedule(Ctx.t(), String.t(), String.t(), String.t() | nil) ::
          {:ok, ScheduleEntry.t() | nil} | {:error, :not_found | :invalid_day | Ecto.Changeset.t()}
  def set_day_schedule(%Ctx{} = ctx, plan_id, day, workout_id) do
    with {:ok, coach} <- get_coach(ctx),
         {:ok, plan} <- get_plan(ctx, plan_id),
         :ok <- validate_schedule_day(day) do
      Repo.transaction(fn ->
        set_day_schedule!(ctx.business_id, coach.id, plan.id, day, workout_id)
      end)
    end
  end

  defp set_day_schedule!(business_id, coach_id, plan_id, day, workout_id) do
    ScheduleEntry
    |> ScheduleEntry.for_business(business_id)
    |> ScheduleEntry.for_plan(plan_id)
    |> ScheduleEntry.for_day(day)
    |> Repo.delete_all()

    insert_schedule_entry!(business_id, coach_id, plan_id, day, workout_id)
  end

  defp insert_schedule_entry!(_business_id, _coach_id, _plan_id, _day, nil), do: nil

  defp insert_schedule_entry!(business_id, coach_id, plan_id, day, workout_id) do
    with :ok <- ensure_workout_for_plan(plan_id, business_id, workout_id),
         {:ok, entry} <-
           ScheduleEntry.insert_changeset(business_id, coach_id, plan_id, workout_id, %{
             day_of_week: day
           })
           |> Repo.insert() do
      Repo.preload(entry, workout: TrainingWorkout |> TrainingWorkout.for_business(business_id))
    else
      {:error, reason} -> Repo.rollback(reason)
    end
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

  defp get_plan(%Ctx{} = ctx, plan_id) do
    plan =
      TrainingPlan
      |> TrainingPlan.for_business(ctx.business_id)
      |> Repo.get(plan_id)

    with {:ok, plan} <- ok_or_not_found(plan),
         :ok <- Clients.authorize_client_id(ctx, plan.client_id) do
      {:ok, plan}
    end
  end

  defp get_active_plan_day_for_client(business_id, client_id, date) do
    plan =
      TrainingPlan
      |> TrainingPlan.for_business(business_id)
      |> TrainingPlan.active_for_client(client_id, date)
      |> Repo.one()

    case plan do
      nil ->
        {:error, :not_found}

      plan ->
        day = Easy.Utils.weekday_name(date)

        schedule_entry =
          ScheduleEntry
          |> ScheduleEntry.for_business(business_id)
          |> ScheduleEntry.for_plan(plan.id)
          |> ScheduleEntry.for_day(day)
          |> ScheduleEntry.include_workout(business_id)
          |> Repo.one()

        workout = schedule_entry && schedule_entry.workout

        {:ok, %{plan: plan, schedule_entry: schedule_entry, workout: workout, date: date, day: day}}
    end
  end

  defp ensure_workout_for_plan(plan_id, business_id, workout_id) do
    if workout_for_plan?(plan_id, business_id, workout_id), do: :ok, else: {:error, :not_found}
  end

  defp validate_schedule_day(day) do
    valid = ScheduleEntry.days() |> Enum.map(&Atom.to_string/1)
    if day in valid, do: :ok, else: {:error, :invalid_day}
  end

  defp workout_for_plan?(plan_id, business_id, workout_id) do
    TrainingWorkout
    |> TrainingWorkout.for_business(business_id)
    |> TrainingWorkout.for_plan(plan_id)
    |> where([w], w.id == ^workout_id)
    |> Repo.exists?()
  end

  defp clone_plan(plan, attrs, relationship_changes) do
    creator_id = Keyword.get(relationship_changes, :creator_id, plan.creator_id)

    plan =
      Repo.preload(plan,
        workouts:
          TrainingWorkout
          |> TrainingWorkout.for_business(plan.business_id)
          |> TrainingWorkout.include_exercises(plan.business_id),
        plan_items: ScheduleEntry |> ScheduleEntry.for_business(plan.business_id)
      )

    Repo.transaction(fn ->
      relationship_changes_without_creator = Keyword.delete(relationship_changes, :creator_id)

      changeset =
        TrainingPlan.insert_changeset(plan.business_id, creator_id, attrs)
        |> put_relationship_changes(relationship_changes_without_creator)

      insert_plan_copy!(changeset, plan)
    end)
  end

  defp insert_plan_copy!(changeset, plan) do
    with {:ok, new_plan} <- Repo.insert(changeset),
         {:ok, workout_id_map} <- copy_workouts(plan.workouts, new_plan),
         :ok <- copy_plan_items(plan.plan_items, new_plan, workout_id_map) do
      reload_plan(new_plan)
    else
      {:error, reason} -> Repo.rollback(reason)
    end
  end

  defp put_relationship_changes(changeset, relationship_changes) do
    Enum.reduce(relationship_changes, changeset, fn {field, value}, changeset ->
      put_change(changeset, field, value)
    end)
  end

  defp copy_workouts(workouts, new_plan) do
    Enum.reduce_while(workouts, {:ok, %{}}, fn workout, {:ok, id_map} ->
      case copy_workout_into(workout, new_plan.id) do
        {:ok, new_workout} -> {:cont, {:ok, Map.put(id_map, workout.id, new_workout.id)}}
        {:error, reason} -> {:halt, {:error, reason}}
      end
    end)
  end

  defp copy_workout_into(workout, dest_plan_id) do
    attrs = %{name: workout.name, notes: workout.notes}

    with {:ok, new_workout} <-
           TrainingWorkout.insert_changeset(workout.business_id, nil, dest_plan_id, attrs)
           |> Repo.insert(),
         :ok <-
           copy_workout_elements(workout.workout_elements, new_workout.id, workout.business_id) do
      {:ok, new_workout}
    end
  end

  defp copy_workout_elements(elements, new_workout_id, business_id) do
    Enum.reduce_while(elements, :ok, fn element, :ok ->
      result =
        TrainingWorkoutExercise.insert_changeset(
          business_id,
          new_workout_id,
          TrainingWorkoutExercise.copy_attrs(element)
        )
        |> Repo.insert()

      case result do
        {:ok, _} -> {:cont, :ok}
        {:error, reason} -> {:halt, {:error, reason}}
      end
    end)
  end

  defp copy_plan_items(plan_items, new_plan, workout_id_map) do
    Enum.reduce_while(plan_items, :ok, fn item, :ok ->
      new_workout_id =
        Map.get(workout_id_map, item.training_workout_id, item.training_workout_id)

      result =
        ScheduleEntry.insert_changeset(
          new_plan.business_id,
          item.creator_id,
          new_plan.id,
          new_workout_id,
          %{day_of_week: item.day_of_week}
        )
        |> Repo.insert()

      case result do
        {:ok, _} -> {:cont, :ok}
        {:error, reason} -> {:halt, {:error, reason}}
      end
    end)
  end

  defp generate_copy_name(original_name, business_id) do
    base_name = String.replace(original_name, ~r/\s*\(Copy\s*\d*\)\s*$/, "") |> String.trim()

    existing_names =
      TrainingPlan
      |> TrainingPlan.for_business(business_id)
      |> where([t], t.name == ^base_name or like(t.name, ^"#{base_name} (Copy%)"))
      |> select([t], t.name)
      |> Repo.all()
      |> MapSet.new()

    find_available_name(base_name, existing_names, 1)
  end

  defp find_available_name(base_name, existing_names, attempt) when attempt <= 100 do
    candidate = if attempt == 1, do: "#{base_name} (Copy)", else: "#{base_name} (Copy #{attempt})"

    if MapSet.member?(existing_names, candidate) do
      find_available_name(base_name, existing_names, attempt + 1)
    else
      candidate
    end
  end

  defp find_available_name(base_name, _existing_names, _attempt) do
    "#{base_name} (Copy #{System.system_time(:second)})"
  end

  defp preload_plan({:ok, %TrainingPlan{} = plan}), do: {:ok, reload_plan(plan)}
  defp preload_plan(error), do: error

  defp reload_plan(%TrainingPlan{} = plan) do
    business_id = plan.business_id

    Repo.preload(plan,
      workouts:
        TrainingWorkout
        |> TrainingWorkout.for_business(business_id)
        |> TrainingWorkout.include_exercises(business_id),
      plan_items: ScheduleEntry |> ScheduleEntry.for_business(business_id),
      client: Client.for_business(business_id)
    )
  end

  defp paginated(base, offset, limit, preload_fun) do
    %{
      count: Repo.aggregate(base, :count, :id),
      plans:
        base
        |> TrainingPlan.newest()
        |> Easy.Utils.paginate(offset, limit)
        |> preload_fun.()
        |> Repo.all()
    }
  end

  defp ok_or_not_found(nil), do: {:error, :not_found}
  defp ok_or_not_found(record), do: {:ok, record}
end
