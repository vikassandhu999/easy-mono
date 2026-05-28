defmodule Easy.TrainingPlans do
  alias Easy.Clients.Client
  alias Easy.Orgs.Coach
  alias Easy.Repo
  alias Easy.Training.PlanItem
  alias Easy.Training.TrainingPlan
  alias Easy.Training.Workout
  alias Easy.Training.WorkoutElement

  import Ecto.Changeset
  import Ecto.Query

  @spec get_plan(String.t(), String.t()) :: {:ok, TrainingPlan.t()} | {:error, :not_found}
  def get_plan(business_id, plan_id) do
    TrainingPlan
    |> TrainingPlan.for_business(business_id)
    |> Repo.get(plan_id)
    |> ok_or_not_found()
  end

  @spec get_plan_full(String.t(), String.t()) ::
          {:ok, TrainingPlan.t()} | {:error, :not_found}
  def get_plan_full(business_id, plan_id) do
    TrainingPlan
    |> TrainingPlan.for_business(business_id)
    |> TrainingPlan.with_workouts(business_id)
    |> TrainingPlan.with_plan_items(business_id)
    |> preload(client: ^Client.for_business(business_id))
    |> Repo.get(plan_id)
    |> ok_or_not_found()
  end

  @spec get_client_plan_full(String.t(), String.t(), String.t()) ::
          {:ok, TrainingPlan.t()} | {:error, :not_found}
  def get_client_plan_full(business_id, client_id, plan_id) do
    TrainingPlan
    |> TrainingPlan.for_business(business_id)
    |> TrainingPlan.for_client(client_id)
    |> TrainingPlan.with_workouts(business_id)
    |> TrainingPlan.with_plan_items(business_id)
    |> Repo.get(plan_id)
    |> ok_or_not_found()
  end

  @spec list_template_plans(
          String.t(),
          String.t() | nil,
          atom() | nil,
          non_neg_integer(),
          pos_integer()
        ) ::
          {:ok, %{count: non_neg_integer(), plans: [TrainingPlan.t()]}}
  def list_template_plans(business_id, search, status, offset, limit) do
    search = String.trim(search || "")

    base =
      TrainingPlan
      |> TrainingPlan.for_business(business_id)
      |> TrainingPlan.templates()
      |> TrainingPlan.with_status(status)
      |> TrainingPlan.search(search)

    {:ok,
     %{
       count: Repo.aggregate(base, :count, :id),
       plans:
         base
         |> TrainingPlan.newest()
         |> Easy.Utils.paginate(offset, limit)
         |> TrainingPlan.with_workouts(business_id)
         |> TrainingPlan.with_plan_items(business_id)
         |> Repo.all()
     }}
  end

  @spec list_client_plans(
          String.t(),
          String.t(),
          atom() | nil,
          non_neg_integer(),
          pos_integer()
        ) ::
          {:ok, %{count: non_neg_integer(), plans: [TrainingPlan.t()]}}
  def list_client_plans(business_id, client_id, status, offset, limit) do
    base =
      TrainingPlan
      |> TrainingPlan.for_business(business_id)
      |> TrainingPlan.for_client(client_id)
      |> TrainingPlan.with_status(status)

    {:ok,
     %{
       count: Repo.aggregate(base, :count, :id),
       plans:
         base
         |> TrainingPlan.newest()
         |> Easy.Utils.paginate(offset, limit)
         |> TrainingPlan.with_workouts(business_id)
         |> TrainingPlan.with_plan_items(business_id)
         |> preload(client: ^Client.for_business(business_id))
         |> Repo.all()
     }}
  end

  @spec list_client_plans_for_user(
          String.t(),
          String.t(),
          atom() | nil,
          non_neg_integer(),
          pos_integer()
        ) ::
          {:ok, %{count: non_neg_integer(), plans: [TrainingPlan.t()]}} | {:error, :not_found}
  def list_client_plans_for_user(business_id, user_id, status, offset, limit) do
    with {:ok, client} <- get_client_for_user(business_id, user_id) do
      list_client_plans(business_id, client.id, status, offset, limit)
    end
  end

  @spec list_client_plans_for_client(
          String.t(),
          String.t(),
          atom() | nil,
          non_neg_integer(),
          pos_integer()
        ) ::
          {:ok, %{count: non_neg_integer(), plans: [TrainingPlan.t()]}} | {:error, :not_found}
  def list_client_plans_for_client(business_id, client_id, status, offset, limit) do
    with {:ok, _client} <- get_client(business_id, client_id) do
      list_client_plans(business_id, client_id, status, offset, limit)
    end
  end

  @spec get_plan_item(String.t(), String.t()) :: {:ok, PlanItem.t()} | {:error, :not_found}
  def get_plan_item(business_id, plan_item_id) do
    PlanItem
    |> PlanItem.for_business(business_id)
    |> Repo.get(plan_item_id)
    |> ok_or_not_found()
  end

  @spec get_client_plan_full_for_user(String.t(), String.t(), String.t()) ::
          {:ok, TrainingPlan.t()} | {:error, :not_found}
  def get_client_plan_full_for_user(business_id, user_id, plan_id) do
    with {:ok, client} <- get_client_for_user(business_id, user_id) do
      get_client_plan_full(business_id, client.id, plan_id)
    end
  end

  @spec list_plan_items(String.t(), String.t()) ::
          {:ok, [PlanItem.t()]} | {:error, :not_found}
  def list_plan_items(business_id, plan_id) do
    with {:ok, plan} <- get_plan(business_id, plan_id) do
      plan_items =
        PlanItem
        |> PlanItem.for_business(business_id)
        |> PlanItem.for_plan(plan.id)
        |> PlanItem.with_workout(business_id)
        |> Repo.all()

      {:ok, plan_items}
    end
  end

  @spec create_training_plan(String.t(), String.t(), map()) ::
          {:ok, TrainingPlan.t()} | {:error, Ecto.Changeset.t()}
  def create_training_plan(business_id, author_id, attrs) do
    business_id
    |> TrainingPlan.insert_changeset(author_id, attrs)
    |> Repo.insert()
    |> preload_plan()
  end

  @spec create_training_plan_for_coach_user(String.t(), String.t(), map()) ::
          {:ok, TrainingPlan.t()} | {:error, :not_found | Ecto.Changeset.t()}
  def create_training_plan_for_coach_user(business_id, user_id, attrs) do
    with {:ok, coach} <- get_coach_for_user(business_id, user_id) do
      create_training_plan(business_id, coach.id, attrs)
    end
  end

  @spec update_training_plan(TrainingPlan.t(), map()) ::
          {:ok, TrainingPlan.t()} | {:error, Ecto.Changeset.t()}
  def update_training_plan(%TrainingPlan{} = plan, attrs) do
    plan
    |> TrainingPlan.update_changeset(attrs)
    |> check_rest_days_do_not_overlap_plan_items()
    |> Repo.update()
    |> preload_plan()
  end

  @spec update_training_plan(String.t(), String.t(), map()) ::
          {:ok, TrainingPlan.t()} | {:error, :not_found | Ecto.Changeset.t()}
  def update_training_plan(business_id, plan_id, attrs) do
    with {:ok, plan} <- get_plan(business_id, plan_id) do
      update_training_plan(plan, attrs)
    end
  end

  @spec delete_training_plan(TrainingPlan.t()) ::
          {:ok, TrainingPlan.t()} | {:error, Ecto.Changeset.t()}
  def delete_training_plan(%TrainingPlan{} = plan), do: Repo.delete(plan)

  @spec delete_training_plan(String.t(), String.t()) ::
          {:ok, TrainingPlan.t()} | {:error, :not_found | Ecto.Changeset.t()}
  def delete_training_plan(business_id, plan_id) do
    with {:ok, plan} <- get_plan(business_id, plan_id) do
      delete_training_plan(plan)
    end
  end

  @spec duplicate_training_plan(TrainingPlan.t()) ::
          {:ok, TrainingPlan.t()} | {:error, Ecto.Changeset.t()}
  def duplicate_training_plan(%TrainingPlan{} = plan) do
    attrs = %{
      name: generate_copy_name(plan.name, plan.business_id),
      description: plan.description,
      rest_days: plan.rest_days
    }

    clone_plan(plan, attrs, original_template_id: plan.id)
  end

  @spec duplicate_training_plan(String.t(), String.t()) ::
          {:ok, TrainingPlan.t()} | {:error, :not_found | Ecto.Changeset.t()}
  def duplicate_training_plan(business_id, plan_id) do
    with {:ok, plan} <- get_plan_full(business_id, plan_id) do
      duplicate_training_plan(plan)
    end
  end

  @spec assign_training_plan_to_client(
          TrainingPlan.t() | String.t(),
          String.t() | nil,
          Date.t() | String.t() | map() | nil,
          Date.t() | String.t() | map() | nil
        ) ::
          {:ok, TrainingPlan.t()} | {:error, Ecto.Changeset.t() | :not_found}
  def assign_training_plan_to_client(%TrainingPlan{}, nil, _start_date, _end_date),
    do: {:error, :not_found}

  def assign_training_plan_to_client(%TrainingPlan{}, "", _start_date, _end_date),
    do: {:error, :not_found}

  def assign_training_plan_to_client(%TrainingPlan{} = plan, client_id, start_date, end_date) do
    attrs = %{
      name: plan.name,
      description: plan.description,
      rest_days: plan.rest_days,
      start_date: start_date,
      end_date: end_date
    }

    clone_plan(plan, attrs, client_id: client_id, original_template_id: plan.id)
  end

  def assign_training_plan_to_client(business_id, plan_id, client_id, attrs) do
    with {:ok, plan} <- get_plan_full(business_id, plan_id),
         {:ok, _client} <- get_client(business_id, client_id) do
      assign_training_plan_to_client(
        plan,
        client_id,
        Map.get(attrs, "start_date"),
        Map.get(attrs, "end_date")
      )
    end
  end

  @spec create_plan_item(String.t(), String.t(), String.t(), map()) ::
          {:ok, PlanItem.t()} | {:error, :not_found | Ecto.Changeset.t()}
  def create_plan_item(training_plan_id, business_id, creator_id, attrs) do
    with {:ok, plan} <- get_plan(business_id, training_plan_id),
         :ok <- ensure_workout_for_plan(plan.id, business_id, Map.get(attrs, "workout_id")) do
      plan.id
      |> PlanItem.insert_changeset(business_id, creator_id, attrs)
      |> validate_day_is_not_rest_day()
      |> Repo.insert()
    end
  end

  @spec create_plan_item_for_coach_user(String.t(), String.t(), String.t(), map()) ::
          {:ok, PlanItem.t()} | {:error, :not_found | Ecto.Changeset.t()}
  def create_plan_item_for_coach_user(business_id, user_id, training_plan_id, attrs) do
    with {:ok, coach} <- get_coach_for_user(business_id, user_id) do
      create_plan_item(training_plan_id, business_id, coach.id, attrs)
    end
  end

  @spec update_plan_item(PlanItem.t(), map()) ::
          {:ok, PlanItem.t()} | {:error, Ecto.Changeset.t()}
  def update_plan_item(%PlanItem{} = plan_item, attrs) do
    plan_item
    |> PlanItem.update_changeset(attrs)
    |> validate_workout_belongs_to_plan()
    |> validate_day_is_not_rest_day()
    |> Repo.update()
  end

  @spec update_plan_item(String.t(), String.t(), map()) ::
          {:ok, PlanItem.t()} | {:error, :not_found | Ecto.Changeset.t()}
  def update_plan_item(business_id, plan_item_id, attrs) do
    with {:ok, plan_item} <- get_plan_item(business_id, plan_item_id) do
      update_plan_item(plan_item, attrs)
    end
  end

  @spec delete_plan_item(PlanItem.t()) :: {:ok, PlanItem.t()} | {:error, Ecto.Changeset.t()}
  def delete_plan_item(%PlanItem{} = plan_item), do: Repo.delete(plan_item)

  @spec delete_plan_item(String.t(), String.t()) ::
          {:ok, PlanItem.t()} | {:error, :not_found | Ecto.Changeset.t()}
  def delete_plan_item(business_id, plan_item_id) do
    with {:ok, plan_item} <- get_plan_item(business_id, plan_item_id) do
      delete_plan_item(plan_item)
    end
  end

  defp get_client(_business_id, nil), do: {:error, :not_found}
  defp get_client(_business_id, ""), do: {:error, :not_found}

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

  defp get_coach_for_user(business_id, user_id) do
    Coach
    |> Coach.for_business(business_id)
    |> Coach.for_user(user_id)
    |> Repo.one()
    |> ok_or_not_found()
  end

  defp ensure_workout_for_plan(_plan_id, _business_id, nil), do: :ok
  defp ensure_workout_for_plan(_plan_id, _business_id, ""), do: :ok

  defp ensure_workout_for_plan(plan_id, business_id, workout_id) do
    exists? =
      Workout
      |> Workout.for_business(business_id)
      |> Workout.for_plan(plan_id)
      |> where([w], w.id == ^workout_id)
      |> Repo.exists?()

    if exists?, do: :ok, else: {:error, :not_found}
  end

  defp validate_workout_belongs_to_plan(%{valid?: false} = changeset), do: changeset

  defp validate_workout_belongs_to_plan(changeset) do
    workout_id = get_field(changeset, :workout_id)
    plan_id = get_field(changeset, :training_plan_id)
    business_id = get_field(changeset, :business_id)

    if workout_id && plan_id && business_id &&
         not workout_for_plan?(plan_id, business_id, workout_id) do
      add_error(changeset, :workout_id, "must belong to the training plan")
    else
      changeset
    end
  end

  defp workout_for_plan?(plan_id, business_id, workout_id) do
    Workout
    |> Workout.for_business(business_id)
    |> Workout.for_plan(plan_id)
    |> where([w], w.id == ^workout_id)
    |> Repo.exists?()
  end

  defp validate_day_is_not_rest_day(%{valid?: false} = changeset), do: changeset

  defp validate_day_is_not_rest_day(changeset) do
    day = get_field(changeset, :day)
    plan_id = get_field(changeset, :training_plan_id)
    business_id = get_field(changeset, :business_id)

    if day && plan_id && business_id && rest_day?(business_id, plan_id, day) do
      add_error(changeset, :day, "cannot schedule workout on a rest day")
    else
      changeset
    end
  end

  defp rest_day?(business_id, plan_id, day) do
    TrainingPlan
    |> TrainingPlan.for_business(business_id)
    |> where([t], t.id == ^plan_id and fragment("? = ANY(?)", ^day, t.rest_days))
    |> Repo.exists?()
  end

  defp check_rest_days_do_not_overlap_plan_items(%{valid?: false} = changeset), do: changeset

  defp check_rest_days_do_not_overlap_plan_items(changeset) do
    rest_days = get_change(changeset, :rest_days)
    plan_id = get_field(changeset, :id)
    business_id = get_field(changeset, :business_id)

    if rest_days && plan_id && business_id && plan_items_on_days?(business_id, plan_id, rest_days) do
      add_error(changeset, :rest_days, "cannot include days with scheduled workouts")
    else
      changeset
    end
  end

  defp plan_items_on_days?(_business_id, _plan_id, []), do: false

  defp plan_items_on_days?(business_id, plan_id, days) do
    PlanItem
    |> PlanItem.for_business(business_id)
    |> PlanItem.for_plan(plan_id)
    |> where([p], p.day in ^days)
    |> Repo.exists?()
  end

  defp clone_plan(plan, attrs, relationship_changes) do
    plan =
      Repo.preload(plan,
        workouts:
          Workout
          |> Workout.for_business(plan.business_id)
          |> Workout.with_elements(plan.business_id),
        plan_items: PlanItem |> PlanItem.for_business(plan.business_id)
      )

    Repo.transaction(fn ->
      changeset =
        TrainingPlan.insert_changeset(plan.business_id, plan.author_id, attrs)
        |> put_relationship_changes(relationship_changes)

      case Repo.insert(changeset) do
        {:ok, new_plan} ->
          with {:ok, workout_id_map} <- copy_workouts(plan.workouts, new_plan),
               :ok <- copy_plan_items(plan.plan_items, new_plan, workout_id_map) do
            preload_plan!(new_plan)
          else
            {:error, reason} -> Repo.rollback(reason)
          end

        {:error, reason} ->
          Repo.rollback(reason)
      end
    end)
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
           dest_plan_id
           |> Workout.insert_changeset(workout.business_id, attrs)
           |> Repo.insert(),
         :ok <-
           copy_workout_elements(workout.workout_elements, new_workout.id, workout.business_id) do
      {:ok, new_workout}
    end
  end

  defp copy_workout_elements(elements, new_workout_id, business_id) do
    Enum.reduce_while(elements, :ok, fn element, :ok ->
      result =
        new_workout_id
        |> WorkoutElement.insert_changeset(business_id, WorkoutElement.copy_attrs(element))
        |> Repo.insert()

      case result do
        {:ok, _} -> {:cont, :ok}
        {:error, reason} -> {:halt, {:error, reason}}
      end
    end)
  end

  defp copy_plan_items(plan_items, new_plan, workout_id_map) do
    Enum.reduce_while(plan_items, :ok, fn item, :ok ->
      new_workout_id = Map.get(workout_id_map, item.workout_id, item.workout_id)

      attrs = %{
        "day" => item.day,
        "workout_type" => item.workout_type,
        "workout_id" => new_workout_id
      }

      result =
        new_plan.id
        |> PlanItem.insert_changeset(new_plan.business_id, item.creator_id, attrs)
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

  defp preload_plan({:ok, %TrainingPlan{} = plan}), do: {:ok, preload_plan!(plan)}
  defp preload_plan(error), do: error

  defp preload_plan!(%TrainingPlan{} = plan) do
    business_id = plan.business_id

    Repo.preload(plan,
      workouts:
        Workout |> Workout.for_business(business_id) |> Workout.with_elements(business_id),
      plan_items: PlanItem |> PlanItem.for_business(business_id),
      client: Client.for_business(business_id)
    )
  end

  defp ok_or_not_found(nil), do: {:error, :not_found}
  defp ok_or_not_found(record), do: {:ok, record}
end
