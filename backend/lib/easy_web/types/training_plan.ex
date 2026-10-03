defmodule EasyWeb.Types.TrainingPlanClient do
  use EasyWeb.Type

  @type t :: %{
          required(:id) => String.t(),
          required(:full_name) => String.t(),
          required(:preferred_name) => String.t() | nil
        }
end

defmodule EasyWeb.Types.TrainingSchedule do
  use EasyWeb.Type

  @type t :: %{
          required(:monday) => String.t() | nil,
          required(:tuesday) => String.t() | nil,
          required(:wednesday) => String.t() | nil,
          required(:thursday) => String.t() | nil,
          required(:friday) => String.t() | nil,
          required(:saturday) => String.t() | nil,
          required(:sunday) => String.t() | nil
        }
end

defmodule EasyWeb.Types.TrainingPlanExercise do
  use EasyWeb.Type

  @type t :: %{
          required(:id) => String.t(),
          required(:name) => String.t(),
          required(:mechanics) => :compound | :isolation | :isometric | nil,
          required(:force) => :push | :pull | :static | nil,
          required(:tracking_type) =>
            :weight_reps
            | :bodyweight_reps
            | :weighted_bodyweight
            | :assisted_bodyweight
            | :reps_only
            | :duration
            | :weight_duration
            | :distance_duration
            | :weight_distance
            | nil,
          required(:images) => [String.t()]
        }
end

defmodule EasyWeb.Types.TrainingPlanPlannedSet do
  use EasyWeb.Type

  @type t :: %{
          required(:set_type) => :working | :warmup | :dropset | nil,
          required(:reps) => String.t() | nil,
          required(:load_value) => Decimal.t() | nil,
          required(:load_unit) => :kg | :lbs | :bodyweight | :none | nil,
          required(:duration_seconds) => non_neg_integer() | nil,
          required(:distance_value) => Decimal.t() | nil,
          required(:distance_unit) => :meters | :km | :miles | :none | nil,
          required(:rpe) => Decimal.t() | nil,
          required(:rest_seconds) => non_neg_integer() | nil,
          required(:notes) => String.t() | nil
        }
end

defmodule EasyWeb.Types.TrainingPlanWorkoutExercise do
  use EasyWeb.Type

  @type t :: %{
          required(:id) => String.t(),
          required(:position) => non_neg_integer(),
          required(:exercise_id) => String.t(),
          required(:workout_id) => String.t(),
          required(:exercise) => EasyWeb.Types.TrainingPlanExercise.t(),
          required(:planned_sets) => [EasyWeb.Types.TrainingPlanPlannedSet.t()],
          required(:inserted_at) => DateTime.t(),
          required(:updated_at) => DateTime.t()
        }
end

defmodule EasyWeb.Types.TrainingPlanWorkout do
  use EasyWeb.Type

  @type t :: %{
          required(:id) => String.t(),
          required(:name) => String.t(),
          required(:position) => non_neg_integer(),
          required(:weekdays) => [String.t()],
          required(:training_plan_id) => String.t(),
          required(:workout_elements) => [EasyWeb.Types.TrainingPlanWorkoutExercise.t()],
          required(:inserted_at) => DateTime.t(),
          required(:updated_at) => DateTime.t()
        }
end

defmodule EasyWeb.Types.TrainingPlanPlannedSetInput do
  use EasyWeb.Type

  @type t :: %{
          optional(:set_type) => :working | :warmup | :dropset | nil,
          optional(:reps) => String.t() | nil,
          optional(:load_value) => Decimal.t() | nil,
          optional(:load_unit) => :kg | :lbs | :bodyweight | :none | nil,
          optional(:duration_seconds) => non_neg_integer() | nil,
          optional(:distance_value) => Decimal.t() | nil,
          optional(:distance_unit) => :meters | :km | :miles | :none | nil,
          optional(:rpe) => number() | nil,
          optional(:rest_seconds) => non_neg_integer() | nil,
          optional(:notes) => String.t() | nil
        }
end

defmodule EasyWeb.Types.TrainingPlanExerciseInput do
  use EasyWeb.Type

  @type t :: %{
          optional(:id) => String.t(),
          optional(:local_ref) => String.t(),
          required(:exercise_id) => String.t(),
          required(:position) => non_neg_integer(),
          required(:prescribed_sets) => [EasyWeb.Types.TrainingPlanPlannedSetInput.t()]
        }
end

defmodule EasyWeb.Types.TrainingPlanWorkoutInput do
  use EasyWeb.Type

  @type t :: %{
          optional(:id) => String.t(),
          optional(:local_ref) => String.t(),
          required(:name) => String.t(),
          required(:position) => non_neg_integer(),
          required(:prescribed_exercises) => [EasyWeb.Types.TrainingPlanExerciseInput.t()]
        }
end

defmodule EasyWeb.Types.TrainingPlanScheduleInput do
  use EasyWeb.Type

  @type t :: %{
          required(:weekday) => :monday | :tuesday | :wednesday | :thursday | :friday | :saturday | :sunday,
          optional(:workout_id) => String.t(),
          optional(:workout_ref) => String.t()
        }
end

defmodule EasyWeb.Types.TrainingPlanCoverage do
  use EasyWeb.Type

  alias Easy.Training.{TrainingPlan, TrainingWorkout}

  @type t :: %{
          required(:date) => Date.t(),
          required(:weekday) => :monday | :tuesday | :wednesday | :thursday | :friday | :saturday | :sunday,
          required(:plan) => EasyWeb.Types.TrainingPlan.t(),
          required(:workout) => EasyWeb.Types.TrainingPlanWorkout.t() | nil
        }

  @spec format(nil) :: nil
  def format(nil), do: nil

  @spec format(%{
          required(:date) => Date.t(),
          required(:weekday) => atom(),
          required(:plan) => TrainingPlan.t(),
          required(:workout) => TrainingWorkout.t() | nil
        }) :: t()
  def format(%{
        date: date,
        weekday: weekday,
        plan: %{schedule: _schedule} = plan,
        workout: workout
      }) do
    %{date: date, weekday: weekday, plan: plan, workout: workout}
  end

  def format(%{
        date: date,
        weekday: weekday,
        plan: %TrainingPlan{} = plan,
        workout: workout
      }) do
    %{
      date: date,
      weekday: weekday,
      plan: EasyWeb.Types.TrainingPlan.format(plan),
      workout: format_workout(workout, plan.workout_schedule)
    }
  end

  defp format_workout(nil, _schedule), do: nil

  defp format_workout(workout, schedule),
    do: EasyWeb.Types.TrainingPlan.format_workout(workout, schedule)
end

defmodule EasyWeb.Types.TrainingPlan do
  use EasyWeb.Type

  alias Easy.Clients.Client

  alias Easy.Training.{
    PlannedSet,
    PrescribedExercise,
    TrainingExercise,
    TrainingWorkout,
    WorkoutSchedule
  }

  alias Easy.Training.TrainingPlan, as: TrainingPlanSchema

  @type t :: %{
          required(:id) => String.t(),
          required(:kind) => :template | :client_plan,
          required(:name) => String.t(),
          required(:description) => String.t() | nil,
          required(:revision) => pos_integer(),
          required(:archived_at) => DateTime.t() | nil,
          required(:status) => :active | :archived,
          required(:lifecycle) => :incomplete | :waiting | :upcoming | :current | :ended | :archived | nil,
          required(:start_date) => Date.t() | nil,
          required(:end_date) => Date.t() | nil,
          required(:stopped_on) => Date.t() | nil,
          required(:client_id) => String.t() | nil,
          required(:client) => EasyWeb.Types.TrainingPlanClient.t() | nil,
          required(:creator_id) => String.t(),
          required(:source_template_id) => String.t() | nil,
          required(:workout_count) => non_neg_integer(),
          required(:workouts) => [EasyWeb.Types.TrainingPlanWorkout.t()],
          required(:schedule) => EasyWeb.Types.TrainingSchedule.t(),
          required(:inserted_at) => DateTime.t(),
          required(:updated_at) => DateTime.t()
        }

  @type create :: %{
          required(:name) => String.t(),
          optional(:description) => String.t() | nil
        }

  @type update :: %{
          required(:expected_revision) => pos_integer(),
          optional(:name) => String.t(),
          optional(:description) => String.t() | nil,
          optional(:start_date) => Date.t() | nil,
          optional(:end_date) => Date.t() | nil
        }

  @type assign :: %{
          optional(:expected_revision) => pos_integer(),
          optional(:start_date) => Date.t() | nil,
          optional(:end_date) => Date.t() | nil
        }

  @type replace_prescription :: %{
          required(:expected_revision) => pos_integer(),
          required(:workouts) => [EasyWeb.Types.TrainingPlanWorkoutInput.t()],
          required(:schedule) => [EasyWeb.Types.TrainingPlanScheduleInput.t()]
        }

  @type list_query :: %{
          optional(:cursor) => String.t(),
          optional(:offset) => non_neg_integer(),
          optional(:limit) => pos_integer(),
          optional(:search) => String.t(),
          optional(:archived) => boolean()
        }

  @type client_list_query :: %{
          optional(:cursor) => String.t(),
          optional(:offset) => non_neg_integer(),
          optional(:limit) => pos_integer(),
          optional(:search) => String.t()
        }

  @type client_scoped_list_query :: %{
          optional(:search) => String.t(),
          optional(:cursor) => String.t(),
          optional(:offset) => non_neg_integer(),
          optional(:limit) => pos_integer(),
          optional(:status) => :active | :archived
        }

  @type coverage_query :: %{optional(:date) => Date.t()}

  @spec format(TrainingPlanSchema.t() | t()) :: t()
  def format(%{
        id: id,
        kind: kind,
        name: name,
        description: description,
        revision: revision,
        archived_at: archived_at,
        status: status,
        lifecycle: lifecycle,
        start_date: start_date,
        end_date: end_date,
        stopped_on: stopped_on,
        client_id: client_id,
        client: client,
        creator_id: creator_id,
        source_template_id: source_template_id,
        workouts: workouts,
        schedule: schedule,
        inserted_at: inserted_at,
        updated_at: updated_at
      }) do
    %{
      id: id,
      kind: kind,
      name: name,
      description: description,
      revision: revision,
      archived_at: archived_at,
      status: status,
      lifecycle: lifecycle,
      start_date: start_date,
      end_date: end_date,
      stopped_on: stopped_on,
      client_id: client_id,
      client: client,
      creator_id: creator_id,
      source_template_id: source_template_id,
      workout_count: length(workouts),
      workouts: workouts,
      schedule: schedule,
      inserted_at: inserted_at,
      updated_at: updated_at
    }
  end

  def format(%TrainingPlanSchema{workouts: workouts, workout_schedule: schedule} = plan)
      when is_list(workouts) and is_list(schedule) do
    %{
      id: plan.id,
      kind: plan.kind,
      name: plan.name,
      description: plan.description,
      revision: plan.revision,
      archived_at: plan.archived_at,
      status: if(plan.archived_at, do: :archived, else: :active),
      lifecycle: plan.lifecycle,
      start_date: plan.start_date,
      end_date: plan.end_date,
      stopped_on: Easy.PlanCoverage.stopped_on(plan, plan_today(plan)),
      client_id: plan.client_id,
      client: format_client(plan),
      creator_id: plan.creator_id,
      source_template_id: plan.source_template_id,
      workout_count: length(workouts),
      workouts: Enum.map(workouts, &format_workout(&1, schedule)),
      schedule: format_schedule(schedule),
      inserted_at: plan.inserted_at,
      updated_at: plan.updated_at
    }
  end

  @spec format_workout(TrainingWorkout.t(), [WorkoutSchedule.t()]) ::
          EasyWeb.Types.TrainingPlanWorkout.t()
  def format_workout(%TrainingWorkout{prescribed_exercises: elements} = workout, schedule)
      when is_list(elements) and is_list(schedule) do
    weekdays =
      for %WorkoutSchedule{training_workout_id: workout_id, weekday: weekday} <- schedule,
          workout_id == workout.id,
          do: Atom.to_string(weekday)

    %{
      id: workout.id,
      name: workout.name,
      position: workout.position,
      weekdays: weekdays,
      training_plan_id: workout.training_plan_id,
      workout_elements: Enum.map(elements, &format_element/1),
      inserted_at: workout.inserted_at,
      updated_at: workout.updated_at
    }
  end

  defp format_element(%PrescribedExercise{exercise: %TrainingExercise{} = exercise, prescribed_sets: sets} = element)
       when is_list(sets) do
    %{
      id: element.id,
      position: element.position,
      exercise_id: element.exercise_id,
      workout_id: element.training_workout_id,
      exercise: format_exercise(exercise),
      planned_sets: Enum.map(sets, &format_set/1),
      inserted_at: element.inserted_at,
      updated_at: element.updated_at
    }
  end

  defp format_exercise(%TrainingExercise{} = exercise) do
    %{
      id: exercise.id,
      name: exercise.name,
      mechanics: exercise.mechanics,
      force: exercise.force,
      tracking_type: exercise.tracking_type,
      images: exercise.images
    }
  end

  defp format_set(%PlannedSet{} = set) do
    %{
      set_type: set.set_type,
      reps: set.reps,
      load_value: set.load_value,
      load_unit: set.load_unit,
      duration_seconds: set.duration_seconds,
      distance_value: set.distance_value,
      distance_unit: set.distance_unit,
      rpe: set.rpe,
      rest_seconds: set.rest_seconds,
      notes: set.notes
    }
  end

  defp plan_today(%{client: %Client{} = client}), do: Client.local_date(client, DateTime.utc_now())
  defp plan_today(_plan), do: Date.utc_today()

  defp format_client(%TrainingPlanSchema{kind: :template}), do: nil

  defp format_client(%TrainingPlanSchema{kind: :client_plan, client: %Client{} = client}) do
    %{id: client.id, full_name: client.full_name, preferred_name: client.preferred_name}
  end

  defp format_schedule(schedule) when is_list(schedule) do
    scheduled =
      Map.new(schedule, fn %WorkoutSchedule{} = row ->
        {Atom.to_string(row.weekday), row.training_workout_id}
      end)

    Map.new(WorkoutSchedule.weekday_names(), &{&1, scheduled[&1]})
  end
end

defmodule EasyWeb.Types.TrainingPlanIndex do
  use EasyWeb.Type

  @type t :: %{
          required(:data) => [EasyWeb.Types.TrainingPlan.t()],
          required(:count) => non_neg_integer(),
          required(:next_cursor) => String.t() | nil
        }
end
