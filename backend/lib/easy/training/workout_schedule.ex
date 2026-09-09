defmodule Easy.Training.WorkoutSchedule do
  use Ecto.Schema

  alias Easy.Orgs
  alias Easy.Training.{TrainingPlan, TrainingWorkout}

  import Ecto.Changeset
  import Ecto.Query

  @type t() :: %__MODULE__{}
  @type weekday :: :monday | :tuesday | :wednesday | :thursday | :friday | :saturday | :sunday

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id
  @weekdays [:monday, :tuesday, :wednesday, :thursday, :friday, :saturday, :sunday]

  schema "training_workout_schedule" do
    field :weekday, Ecto.Enum, values: @weekdays

    belongs_to :business, Orgs.Business
    belongs_to :plan, TrainingPlan, foreign_key: :training_plan_id
    belongs_to :workout, TrainingWorkout, foreign_key: :training_workout_id

    timestamps(type: :utc_datetime)
  end

  @spec weekdays() :: [weekday()]
  def weekdays, do: @weekdays

  @spec weekday_names() :: [String.t()]
  def weekday_names, do: Enum.map(@weekdays, &Atom.to_string/1)

  @spec insert_changeset(String.t(), String.t(), String.t(), map()) :: Ecto.Changeset.t()
  def insert_changeset(business_id, plan_id, workout_id, attrs) do
    %__MODULE__{}
    |> cast(attrs, [:weekday])
    |> put_change(:business_id, business_id)
    |> put_change(:training_plan_id, plan_id)
    |> put_change(:training_workout_id, workout_id)
    |> validate_required([:weekday, :business_id, :training_plan_id, :training_workout_id])
    |> check_constraint(:weekday, name: :training_workout_schedule_weekday_check)
    |> unique_constraint(:weekday,
      name: :training_workout_schedule_training_plan_id_weekday_index
    )
    |> foreign_key_constraint(:training_plan_id,
      name: :training_workout_schedule_plan_business_id_fkey
    )
    |> foreign_key_constraint(:training_workout_id,
      name: :training_workout_schedule_workout_plan_business_id_fkey
    )
  end

  @spec for_plan(Ecto.Queryable.t(), String.t()) :: Ecto.Query.t()
  def for_plan(query \\ __MODULE__, plan_id),
    do: from(row in query, where: row.training_plan_id == ^plan_id)

  @spec for_business(Ecto.Queryable.t(), String.t()) :: Ecto.Query.t()
  def for_business(query \\ __MODULE__, business_id),
    do: from(row in query, where: row.business_id == ^business_id)

  @spec by_weekday(Ecto.Queryable.t()) :: Ecto.Query.t()
  def by_weekday(query \\ __MODULE__) do
    weekdays = weekday_names()

    from(row in query,
      order_by: [
        asc:
          fragment(
            "array_position(?::text[], ?)",
            ^weekdays,
            row.weekday
          ),
        asc: row.id
      ]
    )
  end
end
