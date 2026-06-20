defmodule Easy.Training.PlanItem do
  use Ecto.Schema

  alias Easy.Orgs
  alias Easy.Training.{TrainingPlan, Workout}

  import Ecto.Changeset
  import Ecto.Query

  @type t() :: %__MODULE__{}

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  @days ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]
  @workout_types ["primary", "alternative"]

  schema "training_plan_items" do
    field :day, :string
    field :workout_type, :string

    belongs_to :training_plan, TrainingPlan
    belongs_to :workout, Workout
    belongs_to :business, Orgs.Business
    belongs_to :creator, Orgs.Coach

    timestamps(type: :utc_datetime_usec)
  end

  @cast_fields [:day, :workout_type, :workout_id]

  @spec insert_changeset(String.t(), String.t(), String.t(), map()) :: Ecto.Changeset.t()
  def insert_changeset(training_plan_id, business_id, creator_id, attrs) do
    %__MODULE__{}
    |> cast(attrs, @cast_fields)
    |> put_change(:training_plan_id, training_plan_id)
    |> put_change(:business_id, business_id)
    |> put_change(:creator_id, creator_id)
    |> common_validations()
    |> foreign_key_constraint(:training_plan_id)
    |> foreign_key_constraint(:business_id)
    |> foreign_key_constraint(:creator_id)
  end

  @update_fields [:day, :workout_type, :workout_id]

  @spec update_changeset(t(), map()) :: Ecto.Changeset.t()
  def update_changeset(plan_item, attrs) do
    plan_item
    |> cast(attrs, @update_fields)
    |> common_validations()
  end

  defp common_validations(changeset) do
    changeset
    |> validate_required([:day, :workout_type, :workout_id])
    |> validate_inclusion(:day, @days)
    |> validate_inclusion(:workout_type, @workout_types)
    |> unique_constraint([:training_plan_id, :day, :workout_type],
      name: :training_plan_items_plan_id_day_workout_type_index,
      message: "already has a workout of this type on this day"
    )
    |> foreign_key_constraint(:workout_id)
  end

  @spec for_plan(Ecto.Queryable.t(), String.t()) :: Ecto.Query.t()
  def for_plan(query \\ __MODULE__, plan_id) do
    from(p in query, where: p.training_plan_id == ^plan_id)
  end

  @spec for_business(Ecto.Queryable.t(), String.t()) :: Ecto.Query.t()
  def for_business(query \\ __MODULE__, business_id) do
    from(p in query, where: p.business_id == ^business_id)
  end

  @spec for_day(Ecto.Queryable.t(), String.t()) :: Ecto.Query.t()
  def for_day(query \\ __MODULE__, day) do
    from(p in query, where: p.day == ^day)
  end

  @spec with_workout(Ecto.Queryable.t(), String.t()) :: Ecto.Query.t()
  def with_workout(query, business_id) do
    workout_query = Workout |> Workout.for_business(business_id)
    from(p in query, preload: [workout: ^workout_query])
  end
end
