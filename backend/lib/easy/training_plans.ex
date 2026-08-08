defmodule Easy.TrainingPlans do
  alias Easy.Clients
  alias Easy.Clients.Client
  alias Easy.Ctx
  alias Easy.Orgs.Coach
  alias Easy.Repo
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
      |> TrainingPlan.include_client(business_id)
      |> Repo.get(plan_id)

    with {:ok, plan} <- ok_or_not_found(plan),
         :ok <- Clients.authorize_client_id(ctx, plan.client_id) do
      {:ok, plan}
    end
  end

  @spec get_client_plan_full(Ctx.t(), String.t()) ::
          {:ok, TrainingPlan.t()} | {:error, :not_found}
  def get_client_plan_full(%Ctx{} = ctx, plan_id) do
    with {:ok, client_id} <- Ctx.fetch_client_id(ctx) do
      business_id = ctx.business_id

      TrainingPlan
      |> TrainingPlan.for_client(business_id, client_id)
      |> TrainingPlan.include_workouts(business_id)
      |> Repo.get(plan_id)
      |> ok_or_not_found()
    end
  end

  @spec get_client_active_plan_day(Ctx.t(), Date.t()) ::
          {:ok, map()} | {:error, :not_found}
  def get_client_active_plan_day(%Ctx{} = ctx, date) do
    with {:ok, client_id} <- Ctx.fetch_client_id(ctx) do
      get_active_plan_day_for_client(ctx.business_id, client_id, date)
    end
  end

  @spec list_template_plans(Ctx.t(), keyword()) ::
          {:ok, %{count: non_neg_integer(), plans: [TrainingPlan.t()]}}
  def list_template_plans(%Ctx{} = ctx, opts \\ []) do
    offset = Keyword.get(opts, :offset, 0)
    limit = min(Keyword.get(opts, :limit, 20), 20)
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
      TrainingPlan.include_workouts(query, business_id)
    end

    {:ok, paginated(base, offset, limit, preload_fun)}
  end

  @spec list_client_plans(Ctx.t(), keyword()) ::
          {:ok, %{count: non_neg_integer(), plans: [TrainingPlan.t()]}} | {:error, :not_found}
  def list_client_plans(%Ctx{} = ctx, opts \\ []) do
    offset = Keyword.get(opts, :offset, 0)
    limit = min(Keyword.get(opts, :limit, 20), 20)
    status = Keyword.get(opts, :status)

    with {:ok, client_id} <- Ctx.fetch_client_id(ctx) do
      business_id = ctx.business_id

      base =
        TrainingPlan
        |> TrainingPlan.for_client(business_id, client_id)
        |> TrainingPlan.for_status(status)

      preload_fun = fn query ->
        query
        |> TrainingPlan.include_workouts(business_id)
        |> TrainingPlan.include_client(business_id)
      end

      {:ok, paginated(base, offset, limit, preload_fun)}
    end
  end

  @spec list_plans_for_client(Ctx.t(), String.t(), keyword()) ::
          {:ok, %{count: non_neg_integer(), plans: [TrainingPlan.t()]}} | {:error, :not_found}
  def list_plans_for_client(%Ctx{} = ctx, client_id, opts \\ []) do
    offset = Keyword.get(opts, :offset, 0)
    limit = min(Keyword.get(opts, :limit, 20), 20)
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
        |> TrainingPlan.include_client(business_id)
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

  @spec update_plan_schedule(Ctx.t(), String.t(), map()) ::
          {:ok, %{optional(String.t()) => String.t() | nil}}
          | {:error, :not_found | :invalid_schedule}
  def update_plan_schedule(%Ctx{} = ctx, plan_id, attrs) do
    with {:ok, plan} <- get_plan(ctx, plan_id),
         {:ok, schedule} <- build_schedule(attrs),
         :ok <- ensure_workouts_in_plan(ctx.business_id, plan.id, schedule) do
      Repo.transaction(fn -> write_schedule!(ctx.business_id, plan.id, schedule) end)
    end
  end

  defp build_schedule(attrs) do
    if Enum.all?(TrainingWorkout.days(), &Map.has_key?(attrs, &1)) do
      {:ok, Map.new(TrainingWorkout.days(), fn day -> {Atom.to_string(day), attrs[day]} end)}
    else
      {:error, :invalid_schedule}
    end
  end

  defp ensure_workouts_in_plan(business_id, plan_id, schedule) do
    ids = schedule |> Map.values() |> Enum.reject(&is_nil/1) |> Enum.uniq()

    if Enum.all?(ids, &match?({:ok, _}, Ecto.UUID.cast(&1))) and
         plan_owns_workouts?(business_id, plan_id, ids) do
      :ok
    else
      {:error, :not_found}
    end
  end

  defp plan_owns_workouts?(_business_id, _plan_id, []), do: true

  defp plan_owns_workouts?(business_id, plan_id, ids) do
    found =
      TrainingWorkout
      |> TrainingWorkout.for_business(business_id)
      |> TrainingWorkout.for_plan(plan_id)
      |> where([w], w.id in ^ids)
      |> select([w], w.id)
      |> Repo.all()

    MapSet.new(found) == MapSet.new(ids)
  end

  defp write_schedule!(business_id, plan_id, schedule) do
    TrainingWorkout
    |> TrainingWorkout.for_business(business_id)
    |> TrainingWorkout.for_plan(plan_id)
    |> Repo.update_all(set: [weekdays: []])

    schedule
    |> Enum.reject(fn {_weekday, workout_id} -> is_nil(workout_id) end)
    |> Enum.group_by(fn {_weekday, workout_id} -> workout_id end, fn {weekday, _} -> weekday end)
    |> Enum.each(fn {workout_id, weekdays} ->
      TrainingWorkout
      |> TrainingWorkout.for_business(business_id)
      |> TrainingWorkout.for_plan(plan_id)
      |> where([w], w.id == ^workout_id)
      |> Repo.update_all(set: [weekdays: Enum.sort_by(weekdays, &weekday_order/1)])
    end)

    schedule
  end

  defp weekday_order(weekday), do: Enum.find_index(TrainingWorkout.day_names(), &(&1 == weekday))

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

        workout =
          TrainingWorkout
          |> TrainingWorkout.for_business(business_id)
          |> TrainingWorkout.for_plan(plan.id)
          |> TrainingWorkout.for_weekday(day)
          |> TrainingWorkout.include_exercises(business_id)
          |> limit(1)
          |> Repo.one()

        {:ok, %{plan: plan, workout: workout, date: date, day: day}}
    end
  end

  defp clone_plan(plan, attrs, relationship_changes) do
    creator_id = Keyword.get(relationship_changes, :creator_id, plan.creator_id)

    plan =
      Repo.preload(plan,
        workouts:
          TrainingWorkout
          |> TrainingWorkout.for_business(plan.business_id)
          |> TrainingWorkout.include_exercises(plan.business_id)
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
         :ok <- copy_workouts(plan.workouts, new_plan) do
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

  # Bulk copy: rows are clones of already-valid persisted rows, so the whole
  # plan costs 2 INSERTs (workouts, elements) instead of one per row.
  defp copy_workouts(workouts, new_plan) do
    now = DateTime.utc_now(:second)
    first_inserted_at = DateTime.add(now, -length(workouts), :second)

    workout_rows =
      workouts
      |> Enum.with_index()
      |> Enum.map(fn {workout, index} ->
        %{
          id: Ecto.UUID.generate(),
          name: workout.name,
          weekdays: workout.weekdays,
          business_id: workout.business_id,
          training_plan_id: new_plan.id,
          inserted_at: DateTime.add(first_inserted_at, index, :second),
          updated_at: now
        }
      end)

    workout_id_map =
      workouts
      |> Enum.zip(workout_rows)
      |> Map.new(fn {old, row} -> {old.id, row.id} end)

    element_rows =
      Enum.flat_map(workouts, fn workout ->
        Enum.map(workout.workout_elements, fn element ->
          %{
            id: Ecto.UUID.generate(),
            position: element.position,
            exercise_id: element.exercise_id,
            planned_sets: element.planned_sets,
            business_id: workout.business_id,
            training_workout_id: Map.fetch!(workout_id_map, workout.id),
            inserted_at: now,
            updated_at: now
          }
        end)
      end)

    Repo.insert_all(TrainingWorkout, workout_rows)
    Repo.insert_all(TrainingWorkoutExercise, element_rows)
    :ok
  end

  defp generate_copy_name(original_name, business_id) do
    existing_names =
      TrainingPlan
      |> TrainingPlan.for_business(business_id)
      |> TrainingPlan.templates()
      |> select([t], t.name)
      |> Repo.all()

    Easy.CopyName.next(original_name, existing_names)
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
