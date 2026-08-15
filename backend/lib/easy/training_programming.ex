defmodule Easy.Training.Programming do
  alias Easy.Clients
  alias Easy.Ctx
  alias Easy.Orgs.Business
  alias Easy.Repo
  alias Easy.Training.{Library, PlannedSet, PrescribedExercise, TrainingPlan, TrainingWorkout, WorkoutSchedule}
  alias Easy.Utils

  import Ecto.Changeset
  import Ecto.Query

  @weekdays [:monday, :tuesday, :wednesday, :thursday, :friday, :saturday, :sunday]
  @max_position 2_147_483_647

  @spec create_template(Ctx.t(), map()) ::
          {:ok, TrainingPlan.t()} | {:error, :not_found | Ecto.Changeset.t()}
  def create_template(%Ctx{} = ctx, attrs) do
    with :ok <- ensure_coach(ctx) do
      ctx.business_id
      |> TrainingPlan.insert_changeset(ctx.user_id, attrs)
      |> Repo.insert()
      |> preload_template(ctx.business_id)
    end
  end

  @spec list_templates(Ctx.t(), keyword()) ::
          {:ok, %{count: non_neg_integer(), templates: [TrainingPlan.t()]}} | {:error, :not_found}
  def list_templates(%Ctx{} = ctx, opts \\ []) do
    offset = max(Keyword.get(opts, :offset, 0), 0)
    limit = opts |> Keyword.get(:limit, 20) |> max(1) |> min(100)
    search = opts |> Keyword.get(:search, "") |> to_string() |> String.trim()
    archived = Keyword.get(opts, :archived)

    with :ok <- ensure_coach(ctx) do
      query =
        ctx
        |> template_query()
        |> TrainingPlan.for_archived(archived)
        |> TrainingPlan.for_search(search)

      templates =
        query
        |> TrainingPlan.newest()
        |> Utils.paginate(offset, limit)
        |> TrainingPlan.include_workouts(ctx.business_id)
        |> Repo.all()

      {:ok, %{count: Repo.aggregate(query, :count, :id), templates: templates}}
    end
  end

  @spec list_plans_for_client(Ctx.t(), String.t(), keyword()) ::
          {:ok, %{count: non_neg_integer(), plans: [TrainingPlan.t()]}} | {:error, :not_found}
  def list_plans_for_client(%Ctx{} = ctx, client_id, opts \\ []) do
    offset = max(Keyword.get(opts, :offset, 0), 0)
    limit = opts |> Keyword.get(:limit, 20) |> max(1) |> min(100)
    archived = Keyword.get(opts, :archived)

    with :ok <- ensure_coach(ctx),
         {:ok, _client} <- Clients.authorize_client(ctx, client_id) do
      query =
        TrainingPlan
        |> TrainingPlan.for_kind(:client_plan)
        |> TrainingPlan.for_client(ctx.business_id, client_id)
        |> TrainingPlan.for_archived(archived)

      plans =
        query
        |> TrainingPlan.newest()
        |> Utils.paginate(offset, limit)
        |> TrainingPlan.include_workouts(ctx.business_id)
        |> TrainingPlan.include_client(ctx.business_id)
        |> Repo.all()

      {:ok, %{count: Repo.aggregate(query, :count, :id), plans: plans}}
    end
  end

  @spec get_template(Ctx.t(), String.t()) :: {:ok, TrainingPlan.t()} | {:error, :not_found}
  def get_template(%Ctx{} = ctx, template_id) do
    with :ok <- ensure_coach(ctx) do
      ctx
      |> template_query()
      |> TrainingPlan.include_workouts(ctx.business_id)
      |> Repo.get(template_id)
      |> ok_or_not_found()
    end
  end

  @spec duplicate_template(Ctx.t(), String.t()) ::
          {:ok, TrainingPlan.t()} | {:error, :not_found | Ecto.Changeset.t()}
  def duplicate_template(%Ctx{} = ctx, template_id) do
    with :ok <- ensure_coach(ctx) do
      result =
        Repo.transaction(fn ->
          lock_business_for_duplicate_name(ctx.business_id)
          duplicate_locked_template(ctx, template_id)
        end)

      finalize_template_mutation(result, ctx, true)
    end
  end

  @spec assign_template_to_client(Ctx.t(), String.t(), String.t(), map()) ::
          {:ok, TrainingPlan.t()} | {:error, :not_found | Ecto.Changeset.t()}
  def assign_template_to_client(%Ctx{} = ctx, client_id, template_id, attrs) do
    with :ok <- ensure_coach(ctx) do
      result = Repo.transaction(fn -> assign_visible_template(ctx, client_id, template_id, attrs) end)

      finalize_plan_mutation(result, ctx, true)
    end
  end

  @spec get_plan(Ctx.t(), String.t()) :: {:ok, TrainingPlan.t()} | {:error, :not_found}
  def get_plan(%Ctx{} = ctx, plan_id) do
    with :ok <- ensure_coach(ctx),
         {:ok, plan} <-
           ctx
           |> plan_query()
           |> TrainingPlan.include_workouts(ctx.business_id)
           |> TrainingPlan.include_client(ctx.business_id)
           |> Repo.get(plan_id)
           |> ok_or_not_found(),
         :ok <- authorize_plan(ctx, plan) do
      {:ok, plan}
    end
  end

  @spec update_template(Ctx.t(), String.t(), pos_integer(), map()) ::
          {:ok, TrainingPlan.t()}
          | {:error, :not_found | Ecto.Changeset.t()}
  def update_template(%Ctx{} = ctx, template_id, expected_revision, attrs) do
    mutate_template(ctx, template_id, expected_revision, fn template ->
      template
      |> TrainingPlan.update_changeset(attrs)
      |> put_change(:revision, template.revision + 1)
      |> Repo.update()
    end)
  end

  @spec update_plan(Ctx.t(), String.t(), pos_integer(), map()) ::
          {:ok, TrainingPlan.t()} | {:error, :not_found | Ecto.Changeset.t()}
  def update_plan(%Ctx{} = ctx, plan_id, expected_revision, attrs) do
    mutate_plan(ctx, plan_id, expected_revision, fn plan ->
      plan
      |> TrainingPlan.update_changeset(attrs)
      |> put_change(:revision, plan.revision + 1)
      |> Repo.update()
    end)
  end

  @spec replace_prescription(Ctx.t(), String.t(), pos_integer(), map()) ::
          {:ok, TrainingPlan.t()} | {:error, :not_found | Ecto.Changeset.t()}
  def replace_prescription(%Ctx{} = ctx, plan_id, expected_revision, attrs) do
    mutate_plan(ctx, plan_id, expected_revision, fn plan ->
      replace_locked_prescription(ctx, plan, attrs)
    end)
  end

  @spec archive_template(Ctx.t(), String.t(), pos_integer()) ::
          {:ok, TrainingPlan.t()} | {:error, :not_found | Ecto.Changeset.t()}
  def archive_template(%Ctx{} = ctx, template_id, expected_revision) do
    mutate_template(ctx, template_id, expected_revision, &archive/1)
  end

  @spec archive_plan(Ctx.t(), String.t(), pos_integer()) ::
          {:ok, TrainingPlan.t()} | {:error, :not_found | Ecto.Changeset.t()}
  def archive_plan(%Ctx{} = ctx, plan_id, expected_revision) do
    mutate_plan(ctx, plan_id, expected_revision, &archive/1)
  end

  @spec restore_template(Ctx.t(), String.t(), pos_integer()) ::
          {:ok, TrainingPlan.t()} | {:error, :not_found | Ecto.Changeset.t()}
  def restore_template(%Ctx{} = ctx, template_id, expected_revision) do
    mutate_template(ctx, template_id, expected_revision, &restore/1)
  end

  @spec restore_plan(Ctx.t(), String.t(), pos_integer()) ::
          {:ok, TrainingPlan.t()} | {:error, :not_found | Ecto.Changeset.t()}
  def restore_plan(%Ctx{} = ctx, plan_id, expected_revision) do
    mutate_plan(ctx, plan_id, expected_revision, &restore/1)
  end

  @spec delete_template(Ctx.t(), String.t(), pos_integer()) ::
          {:ok, TrainingPlan.t()} | {:error, :not_found | Ecto.Changeset.t()}
  def delete_template(%Ctx{} = ctx, template_id, expected_revision) do
    mutate_template(ctx, template_id, expected_revision, &Repo.delete/1, reload?: false)
  end

  @spec delete_plan(Ctx.t(), String.t(), pos_integer()) ::
          {:ok, TrainingPlan.t()} | {:error, :not_found | Ecto.Changeset.t()}
  def delete_plan(%Ctx{} = ctx, plan_id, expected_revision) do
    mutate_plan(ctx, plan_id, expected_revision, &Repo.delete/1, reload?: false)
  end

  defp mutate_template(ctx, template_id, expected_revision, mutation, opts \\ []) do
    with :ok <- ensure_coach(ctx) do
      result = Repo.transaction(fn -> mutate_locked_template(ctx, template_id, expected_revision, mutation) end)
      finalize_template_mutation(result, ctx, Keyword.get(opts, :reload?, true))
    end
  end

  defp mutate_plan(ctx, plan_id, expected_revision, mutation, opts \\ []) do
    with :ok <- ensure_coach(ctx) do
      result = Repo.transaction(fn -> mutate_locked_plan(ctx, plan_id, expected_revision, mutation) end)
      finalize_plan_mutation(result, ctx, Keyword.get(opts, :reload?, true))
    end
  end

  defp mutate_locked_template(ctx, template_id, expected_revision, mutation) do
    template = ctx |> template_query() |> lock("FOR UPDATE") |> Repo.get(template_id)
    mutate_revisioned(template, expected_revision, mutation)
  end

  defp duplicate_locked_template(ctx, template_id) do
    ctx
    |> get_locked_active_template(template_id)
    |> preload_duplicate_source()
    |> then(&duplicate_template_rows(ctx, &1))
  end

  defp assign_locked_template(ctx, client_id, template_id, attrs) do
    ctx
    |> get_locked_active_template(template_id)
    |> preload_duplicate_source()
    |> then(&assign_template_rows(ctx, client_id, &1, attrs))
  end

  defp get_locked_active_template(ctx, template_id) do
    template =
      ctx
      |> template_query()
      |> TrainingPlan.for_archived(false)
      |> lock("FOR UPDATE")
      |> Repo.get(template_id)

    template || Repo.rollback(:not_found)
  end

  defp assign_visible_template(ctx, client_id, template_id, attrs) do
    case Clients.authorize_client(ctx, client_id) do
      {:ok, _client} -> assign_locked_template(ctx, client_id, template_id, attrs)
      {:error, reason} -> Repo.rollback(reason)
    end
  end

  defp assign_template_rows(ctx, client_id, template, attrs) do
    with {:ok, copy} <-
           TrainingPlan.insert_changeset(
             ctx.business_id,
             ctx.user_id,
             client_id,
             template,
             attrs
           )
           |> Repo.insert(),
         {:ok, workout_ids} <- duplicate_workout_rows(ctx, template.workouts, copy),
         :ok <- duplicate_schedule_rows(ctx, template.workout_schedule, copy, workout_ids),
         :ok <- Clients.advance_stage_to_coaching(ctx, client_id) do
      copy
    else
      {:error, reason} -> Repo.rollback(reason)
    end
  end

  defp duplicate_template_rows(ctx, template) do
    attrs = %{
      name: duplicate_template_name(template.name, ctx.business_id),
      description: template.description
    }

    with {:ok, copy} <- TrainingPlan.insert_changeset(ctx.business_id, ctx.user_id, attrs) |> Repo.insert(),
         {:ok, workout_ids} <- duplicate_workout_rows(ctx, template.workouts, copy),
         :ok <- duplicate_schedule_rows(ctx, template.workout_schedule, copy, workout_ids) do
      copy
    else
      {:error, reason} -> Repo.rollback(reason)
    end
  end

  defp preload_duplicate_source(template) do
    TrainingPlan
    |> TrainingPlan.for_business(template.business_id)
    |> TrainingPlan.include_workouts(template.business_id)
    |> Repo.get(template.id)
  end

  defp duplicate_workout_rows(ctx, workouts, copy) do
    Enum.reduce_while(workouts, {:ok, %{}}, fn workout, {:ok, workout_ids} ->
      attrs = %{name: workout.name, position: workout.position}

      with {:ok, copied_workout} <- TrainingWorkout.insert_changeset(ctx.business_id, copy.id, attrs) |> Repo.insert(),
           :ok <- duplicate_prescribed_exercise_rows(ctx, workout.prescribed_exercises, copied_workout) do
        {:cont, {:ok, Map.put(workout_ids, workout.id, copied_workout.id)}}
      else
        {:error, reason} -> {:halt, {:error, reason}}
      end
    end)
  end

  defp duplicate_prescribed_exercise_rows(ctx, prescribed_exercises, copied_workout) do
    Enum.reduce_while(prescribed_exercises, :ok, fn prescribed_exercise, :ok ->
      attrs = %{
        exercise_id: prescribed_exercise.exercise_id,
        position: prescribed_exercise.position,
        prescribed_sets: Enum.map(prescribed_exercise.prescribed_sets, &PlannedSet.to_attrs/1)
      }

      case PrescribedExercise.insert_changeset(ctx.business_id, copied_workout.id, attrs) |> Repo.insert() do
        {:ok, _row} -> {:cont, :ok}
        {:error, reason} -> {:halt, {:error, reason}}
      end
    end)
  end

  defp duplicate_schedule_rows(ctx, schedule, copy, workout_ids) do
    Enum.reduce_while(schedule, :ok, fn row, :ok ->
      attrs = %{weekday: row.weekday}
      copied_workout_id = Map.fetch!(workout_ids, row.training_workout_id)

      case WorkoutSchedule.insert_changeset(ctx.business_id, copy.id, copied_workout_id, attrs) |> Repo.insert() do
        {:ok, _row} -> {:cont, :ok}
        {:error, reason} -> {:halt, {:error, reason}}
      end
    end)
  end

  defp mutate_locked_plan(ctx, plan_id, expected_revision, mutation) do
    plan = ctx |> plan_query() |> lock("FOR UPDATE") |> Repo.get(plan_id)

    case authorize_locked_plan(ctx, plan) do
      :ok -> mutate_revisioned(plan, expected_revision, mutation)
      :error -> Repo.rollback(:not_found)
    end
  end

  defp authorize_locked_plan(_ctx, nil), do: :error
  defp authorize_locked_plan(ctx, plan), do: if(authorize_plan(ctx, plan) == :ok, do: :ok, else: :error)

  defp mutate_revisioned(nil, _expected_revision, _mutation), do: Repo.rollback(:not_found)

  defp mutate_revisioned(%TrainingPlan{revision: revision} = plan, expected_revision, _mutation)
       when revision != expected_revision,
       do: Repo.rollback(stale_revision_changeset(plan))

  defp mutate_revisioned(plan, _expected_revision, mutation) do
    case mutation.(plan) do
      {:ok, changed} -> changed
      {:error, reason} -> Repo.rollback(reason)
    end
  end

  defp finalize_template_mutation({:ok, template}, ctx, true), do: get_template(ctx, template.id)
  defp finalize_template_mutation({:ok, template}, _ctx, false), do: {:ok, template}
  defp finalize_template_mutation({:error, reason}, _ctx, _reload?), do: {:error, reason}

  defp finalize_plan_mutation({:ok, plan}, ctx, true), do: get_plan(ctx, plan.id)
  defp finalize_plan_mutation({:ok, plan}, _ctx, false), do: {:ok, plan}
  defp finalize_plan_mutation({:error, reason}, _ctx, _reload?), do: {:error, reason}

  defp replace_locked_prescription(ctx, plan, attrs) do
    with {:ok, prescription} <- validate_prescription(ctx, plan, attrs),
         {:ok, workouts} <- persist_prescription_workouts(ctx, plan, prescription),
         :ok <- persist_workout_schedule(ctx, plan, prescription.schedule, workouts) do
      plan
      |> TrainingPlan.lifecycle_changeset(%{revision: plan.revision + 1})
      |> Repo.update()
    end
  end

  defp validate_prescription(ctx, plan, attrs) do
    workouts = Map.get(attrs, :workouts)
    schedule = Map.get(attrs, :schedule)

    with :ok <- validate_prescription_collections(plan, workouts, schedule),
         {:ok, schedule} <- validate_schedule(plan, schedule, workouts),
         {:ok, existing} <- validate_persisted_nodes(plan, workouts),
         :ok <- validate_local_references(plan, workouts),
         :ok <- validate_positions(plan, workouts),
         :ok <- validate_exercise_visibility(ctx, workouts) do
      {:ok, %{workouts: workouts, schedule: schedule, existing: existing}}
    end
  end

  defp validate_prescription_collections(plan, workouts, schedule) do
    valid? =
      is_list(workouts) and is_list(schedule) and
        Enum.all?(workouts, &valid_workout_collection?/1)

    if valid?, do: :ok, else: {:error, prescription_error(plan, :workouts, "is invalid")}
  end

  defp valid_workout_collection?(workout) when is_map(workout),
    do: is_list(Map.get(workout, :prescribed_exercises))

  defp valid_workout_collection?(_workout), do: false

  defp validate_schedule(plan, schedule, workouts) do
    normalized = Enum.map(schedule, &normalize_schedule_entry/1)
    weekdays = Enum.map(normalized, &Map.get(&1, :weekday))
    requested_ids = workouts |> Enum.map(&Map.get(&1, :id)) |> compact_set()
    requested_refs = workouts |> Enum.map(&Map.get(&1, :local_ref)) |> compact_set()

    valid? =
      length(normalized) == length(WorkoutSchedule.weekdays()) and
        MapSet.new(weekdays) == MapSet.new(WorkoutSchedule.weekdays()) and
        Enum.all?(normalized, &valid_schedule_reference?(&1, requested_ids, requested_refs))

    if valid?,
      do: {:ok, normalized},
      else: {:error, prescription_error(plan, :workout_schedule, "must contain each weekday exactly once")}
  end

  defp normalize_schedule_entry(entry) when is_map(entry) do
    %{
      weekday: normalize_weekday(Map.get(entry, :weekday)),
      workout_id: Map.get(entry, :workout_id),
      workout_ref: Map.get(entry, :workout_ref)
    }
  end

  defp normalize_schedule_entry(_entry), do: %{weekday: nil, workout_id: nil, workout_ref: nil}

  defp normalize_weekday(weekday) when weekday in @weekdays, do: weekday

  defp normalize_weekday(weekday) when is_binary(weekday) do
    Enum.find(WorkoutSchedule.weekdays(), &(Atom.to_string(&1) == weekday))
  end

  defp normalize_weekday(_weekday), do: nil

  defp valid_schedule_reference?(entry, requested_ids, requested_refs) do
    case {entry.workout_id, entry.workout_ref} do
      {nil, nil} -> true
      {id, nil} -> valid_uuid?(id) and MapSet.member?(requested_ids, id)
      {nil, ref} -> valid_local_ref?(ref) and MapSet.member?(requested_refs, ref)
      {_id, _ref} -> false
    end
  end

  defp validate_persisted_nodes(plan, workouts) do
    existing_workouts =
      TrainingWorkout
      |> TrainingWorkout.for_business(plan.business_id)
      |> TrainingWorkout.for_plan(plan.id)
      |> Repo.all()
      |> Map.new(&{&1.id, &1})

    existing_exercises =
      PrescribedExercise
      |> PrescribedExercise.for_business(plan.business_id)
      |> where([item], item.training_workout_id in ^Map.keys(existing_workouts))
      |> Repo.all()
      |> Map.new(&{&1.id, &1})

    if persisted_nodes_valid?(workouts, existing_workouts, existing_exercises) do
      {:ok, %{workouts: existing_workouts, exercises: existing_exercises}}
    else
      {:error, prescription_error(plan, :workouts, "contains an unknown persisted node")}
    end
  end

  defp persisted_nodes_valid?(workouts, existing_workouts, existing_exercises) do
    workout_ids = workouts |> Enum.map(&Map.get(&1, :id)) |> Enum.reject(&is_nil/1)
    exercise_ids = prescribed_inputs(workouts) |> Enum.map(&Map.get(&1, :id)) |> Enum.reject(&is_nil/1)

    unique?(workout_ids) and unique?(exercise_ids) and
      Enum.all?(workout_ids, &(valid_uuid?(&1) and Map.has_key?(existing_workouts, &1))) and
      Enum.all?(workouts, &persisted_exercises_belong_to_workout?(&1, existing_exercises))
  end

  defp persisted_exercises_belong_to_workout?(workout, existing_exercises) do
    Enum.all?(Map.get(workout, :prescribed_exercises), fn input ->
      case Map.get(input, :id) do
        nil -> true
        id -> persisted_exercise_belongs?(Map.get(existing_exercises, id), workout)
      end
    end)
  end

  defp persisted_exercise_belongs?(%PrescribedExercise{training_workout_id: workout_id}, workout),
    do: workout_id == Map.get(workout, :id)

  defp persisted_exercise_belongs?(_item, _workout), do: false

  defp validate_local_references(plan, workouts) do
    nodes = workouts ++ prescribed_inputs(workouts)
    refs = nodes |> Enum.map(&Map.get(&1, :local_ref)) |> Enum.reject(&is_nil/1)
    identities_valid? = Enum.all?(nodes, &valid_node_identity?/1)

    if identities_valid? and unique?(refs),
      do: :ok,
      else: {:error, prescription_error(plan, :workouts, "contains invalid or duplicate local references")}
  end

  defp valid_node_identity?(node) do
    case {Map.get(node, :id), Map.get(node, :local_ref)} do
      {id, nil} -> valid_uuid?(id)
      {nil, ref} -> valid_local_ref?(ref)
      {_id, _ref} -> false
    end
  end

  defp validate_positions(plan, workouts) do
    workouts_valid? = unique_nonnegative_positions?(workouts)
    exercises_valid? = Enum.all?(workouts, &(Map.get(&1, :prescribed_exercises) |> unique_nonnegative_positions?()))

    if workouts_valid? and exercises_valid?,
      do: :ok,
      else: {:error, prescription_error(plan, :workouts, "positions must be unique nonnegative integers")}
  end

  defp unique_nonnegative_positions?(nodes) do
    positions = Enum.map(nodes, &Map.get(&1, :position))

    Enum.all?(positions, &valid_position?/1) and unique?(positions)
  end

  defp valid_position?(position), do: is_integer(position) and position >= 0 and position <= @max_position

  defp validate_exercise_visibility(ctx, workouts) do
    exercise_ids = prescribed_inputs(workouts) |> Enum.map(&Map.get(&1, :exercise_id))

    if Enum.all?(exercise_ids, &valid_uuid?/1) do
      case Library.get_exercises(ctx, exercise_ids) do
        {:ok, _exercises} -> :ok
        {:error, :not_found} -> {:error, :not_found}
      end
    else
      {:error, :not_found}
    end
  end

  defp persist_prescription_workouts(ctx, plan, prescription) do
    with :ok <- delete_workout_schedule(plan),
         :ok <- stage_retained_workouts(plan, prescription),
         :ok <- delete_omitted_workouts(plan, prescription.workouts) do
      persist_workout_inputs(ctx, plan, prescription)
    end
  end

  defp persist_workout_inputs(ctx, plan, prescription) do
    Enum.reduce_while(prescription.workouts, {:ok, %{}}, fn input, {:ok, saved} ->
      persist_workout_input(ctx, plan, input, prescription.existing, saved)
    end)
  end

  defp persist_workout_input(ctx, plan, input, existing, saved) do
    case persist_workout(ctx, plan, input, existing) do
      {:ok, workout} -> {:cont, {:ok, Map.put(saved, node_key(input), workout)}}
      {:error, changeset} -> {:halt, {:error, changeset}}
    end
  end

  defp delete_workout_schedule(plan) do
    WorkoutSchedule
    |> WorkoutSchedule.for_business(plan.business_id)
    |> WorkoutSchedule.for_plan(plan.id)
    |> Repo.delete_all()

    :ok
  end

  defp stage_retained_workouts(plan, prescription) do
    retained =
      prescription.workouts
      |> Enum.map(&Map.get(&1, :id))
      |> Enum.reject(&is_nil/1)
      |> Enum.map(&Map.fetch!(prescription.existing.workouts, &1))

    current_positions = Enum.map(Map.values(prescription.existing.workouts), & &1.position)
    requested_positions = Enum.map(prescription.workouts, &Map.get(&1, :position))

    stage_positions(plan, retained, current_positions ++ requested_positions, fn workout, position ->
      TrainingWorkout
      |> TrainingWorkout.for_business(plan.business_id)
      |> TrainingWorkout.for_plan(plan.id)
      |> where([row], row.id == ^workout.id)
      |> Repo.update_all(set: [position: position])
    end)
  end

  defp delete_omitted_workouts(plan, workouts) do
    requested_ids = workouts |> Enum.map(&Map.get(&1, :id)) |> Enum.reject(&is_nil/1)

    TrainingWorkout
    |> TrainingWorkout.for_business(plan.business_id)
    |> TrainingWorkout.for_plan(plan.id)
    |> where([workout], workout.id not in ^requested_ids)
    |> Repo.delete_all()

    :ok
  end

  defp persist_workout(ctx, plan, input, existing) do
    result =
      case Map.get(input, :id) do
        nil ->
          TrainingWorkout.insert_changeset(ctx.business_id, plan.id, input) |> Repo.insert()

        id ->
          existing.workouts
          |> Map.fetch!(id)
          |> TrainingWorkout.update_changeset(input)
          |> force_requested_position(input)
          |> Repo.update()
      end

    case result do
      {:ok, workout} -> persist_prescribed_exercises(ctx, workout, input, existing)
      {:error, changeset} -> {:error, changeset}
    end
  end

  defp persist_prescribed_exercises(ctx, workout, workout_input, existing) do
    inputs = Map.get(workout_input, :prescribed_exercises)

    with :ok <- stage_retained_exercises(workout, inputs, existing),
         :ok <- delete_omitted_exercises(workout, inputs) do
      persist_prescribed_exercise_inputs(ctx, workout, inputs, existing)
    end
  end

  defp persist_prescribed_exercise_inputs(ctx, workout, inputs, existing) do
    Enum.reduce_while(inputs, {:ok, workout}, fn input, {:ok, workout} ->
      persist_prescribed_exercise_input(ctx, workout, input, existing)
    end)
  end

  defp persist_prescribed_exercise_input(ctx, workout, input, existing) do
    case persist_prescribed_exercise(ctx, workout, input, existing) do
      {:ok, _item} -> {:cont, {:ok, workout}}
      {:error, changeset} -> {:halt, {:error, changeset}}
    end
  end

  defp stage_retained_exercises(workout, inputs, existing) do
    retained =
      inputs
      |> Enum.map(&Map.get(&1, :id))
      |> Enum.reject(&is_nil/1)
      |> Enum.map(&Map.fetch!(existing.exercises, &1))

    existing_for_workout =
      existing.exercises
      |> Map.values()
      |> Enum.filter(&(&1.training_workout_id == workout.id))

    current_positions = Enum.map(existing_for_workout, & &1.position)
    requested_positions = Enum.map(inputs, &Map.get(&1, :position))

    stage_positions(workout, retained, current_positions ++ requested_positions, fn item, position ->
      PrescribedExercise
      |> PrescribedExercise.for_business(workout.business_id)
      |> PrescribedExercise.for_workout(workout.id)
      |> where([row], row.id == ^item.id)
      |> Repo.update_all(set: [position: position])
    end)
  end

  defp delete_omitted_exercises(workout, inputs) do
    requested_ids = inputs |> Enum.map(&Map.get(&1, :id)) |> Enum.reject(&is_nil/1)

    PrescribedExercise
    |> PrescribedExercise.for_business(workout.business_id)
    |> PrescribedExercise.for_workout(workout.id)
    |> where([item], item.id not in ^requested_ids)
    |> Repo.delete_all()

    :ok
  end

  defp persist_prescribed_exercise(ctx, workout, input, existing) do
    case Map.get(input, :id) do
      nil ->
        PrescribedExercise.insert_changeset(ctx.business_id, workout.id, input) |> Repo.insert()

      id ->
        existing.exercises
        |> Map.fetch!(id)
        |> PrescribedExercise.update_changeset(input)
        |> force_requested_position(input)
        |> Repo.update()
    end
  end

  defp force_requested_position(changeset, input) do
    force_change(changeset, :position, Map.fetch!(input, :position))
  end

  defp persist_workout_schedule(ctx, plan, schedule, workouts) do
    Enum.reduce_while(schedule, :ok, fn entry, :ok ->
      case persist_schedule_entry(ctx, plan, entry, workouts) do
        :ok -> {:cont, :ok}
        {:error, changeset} -> {:halt, {:error, changeset}}
      end
    end)
  end

  defp persist_schedule_entry(ctx, plan, entry, workouts) do
    case scheduled_workout(entry, workouts) do
      nil -> :ok
      workout -> insert_schedule_entry(ctx, plan, workout, entry)
    end
  end

  defp insert_schedule_entry(ctx, plan, workout, entry) do
    case WorkoutSchedule.insert_changeset(ctx.business_id, plan.id, workout.id, entry) |> Repo.insert() do
      {:ok, _row} -> :ok
      {:error, changeset} -> {:error, changeset}
    end
  end

  defp scheduled_workout(%{workout_id: nil, workout_ref: nil}, _workouts), do: nil
  defp scheduled_workout(%{workout_id: id}, workouts) when not is_nil(id), do: Map.fetch!(workouts, {:id, id})
  defp scheduled_workout(%{workout_ref: ref}, workouts), do: Map.fetch!(workouts, {:ref, ref})

  defp prescribed_inputs(workouts), do: Enum.flat_map(workouts, &Map.get(&1, :prescribed_exercises))
  defp node_key(%{id: id}) when not is_nil(id), do: {:id, id}
  defp node_key(%{local_ref: ref}), do: {:ref, ref}
  defp compact_set(values), do: values |> Enum.reject(&is_nil/1) |> MapSet.new()
  defp unique?(values), do: length(values) == MapSet.size(MapSet.new(values))
  defp valid_uuid?(value), do: match?({:ok, _uuid}, Ecto.UUID.cast(value))
  defp valid_local_ref?(value), do: is_binary(value) and value == String.trim(value) and value != "" and byte_size(value) <= 100

  defp stage_positions(_owner, [], _positions, _update), do: :ok

  defp stage_positions(owner, retained, positions, update) do
    count = length(retained)
    used = MapSet.new(positions)

    case free_stage_positions(used, count) do
      {:ok, positions} ->
        retained
        |> Enum.zip(positions)
        |> Enum.each(fn {row, position} -> update.(row, position) end)

        :ok

      :error ->
        {:error, prescription_error(owner, :workouts, "positions are too large to safely reorder")}
    end
  end

  defp free_stage_positions(used, count) do
    positions =
      0..min(@max_position, MapSet.size(used) + count)
      |> Stream.reject(&MapSet.member?(used, &1))
      |> Enum.take(count)

    if length(positions) == count, do: {:ok, positions}, else: :error
  end

  defp prescription_error(plan, field, message), do: plan |> change() |> add_error(field, message)

  defp archive(plan) do
    if plan.archived_at do
      {:ok, plan}
    else
      plan
      |> TrainingPlan.lifecycle_changeset(%{
        archived_at: DateTime.utc_now(:second),
        revision: plan.revision + 1
      })
      |> Repo.update()
    end
  end

  defp restore(plan) do
    if plan.archived_at do
      plan
      |> TrainingPlan.lifecycle_changeset(%{archived_at: nil, revision: plan.revision + 1})
      |> Repo.update()
    else
      {:ok, plan}
    end
  end

  defp duplicate_template_name(original_name, business_id) do
    existing_names =
      TrainingPlan
      |> TrainingPlan.for_business(business_id)
      |> TrainingPlan.templates()
      |> select([template], template.name)
      |> Repo.all()

    Easy.CopyName.next(original_name, existing_names)
  end

  defp lock_business_for_duplicate_name(business_id) do
    Business
    |> where([business], business.id == ^business_id)
    |> select([business], business.id)
    |> lock("FOR UPDATE")
    |> Repo.one()
  end

  defp template_query(%Ctx{} = ctx) do
    TrainingPlan
    |> TrainingPlan.for_business(ctx.business_id)
    |> TrainingPlan.templates()
  end

  defp plan_query(%Ctx{} = ctx), do: TrainingPlan.for_business(TrainingPlan, ctx.business_id)

  defp authorize_plan(_ctx, %TrainingPlan{kind: :template}), do: :ok

  defp authorize_plan(ctx, %TrainingPlan{kind: :client_plan, client_id: client_id}),
    do: Clients.authorize_client_id(ctx, client_id)

  defp stale_revision_changeset(plan) do
    plan
    |> change()
    |> add_error(:revision, "is stale")
    |> Map.put(:action, :stale_revision)
  end

  defp ensure_coach(%Ctx{coach_id: coach_id}) when not is_nil(coach_id), do: :ok
  defp ensure_coach(%Ctx{}), do: {:error, :not_found}

  defp ok_or_not_found(nil), do: {:error, :not_found}
  defp ok_or_not_found(value), do: {:ok, value}

  defp preload_template({:ok, template}, business_id) do
    template =
      TrainingPlan
      |> TrainingPlan.for_business(business_id)
      |> TrainingPlan.include_workouts(business_id)
      |> Repo.get(template.id)

    {:ok, template}
  end

  defp preload_template(error, _business_id), do: error
end
