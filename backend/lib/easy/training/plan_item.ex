defmodule Easy.Training.PlanItem do
  use Ecto.Schema

  alias Easy.Orgs
  alias Easy.Repo
  alias Easy.Training.{TrainingPlan, Workout}

  import Ecto.Changeset
  import Ecto.Query

  @type t() :: %__MODULE__{}

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  @days ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]
  @workout_types ["primary", "alternative"]

  @spec days() :: [String.t()]
  def days, do: @days

  @spec workout_types() :: [String.t()]
  def workout_types, do: @workout_types

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
    |> validate_required([:day, :workout_type, :workout_id])
    |> validate_inclusion(:day, @days)
    |> validate_inclusion(:workout_type, @workout_types)
    |> unique_constraint([:training_plan_id, :day, :workout_type],
      name: :training_plan_items_plan_id_day_workout_type_index,
      message: "already has a workout of this type on this day"
    )
    |> foreign_key_constraint(:training_plan_id)
    |> foreign_key_constraint(:workout_id)
    |> foreign_key_constraint(:business_id)
    |> foreign_key_constraint(:creator_id)
  end

  @update_fields [:day, :workout_type]

  @spec update_changeset(t(), map()) :: Ecto.Changeset.t()
  def update_changeset(plan_item, attrs) do
    plan_item
    |> cast(attrs, @update_fields)
    |> validate_inclusion(:day, @days)
    |> validate_inclusion(:workout_type, @workout_types)
    |> unique_constraint([:training_plan_id, :day, :workout_type],
      name: :training_plan_items_plan_id_day_workout_type_index,
      message: "already has a workout of this type on this day"
    )
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

  @spec for_workout_type(Ecto.Queryable.t(), String.t()) :: Ecto.Query.t()
  def for_workout_type(query \\ __MODULE__, workout_type) do
    from(p in query, where: p.workout_type == ^workout_type)
  end

  @spec with_workout(Ecto.Queryable.t()) :: Ecto.Query.t()
  def with_workout(query \\ __MODULE__) do
    from(p in query, preload: [:workout])
  end

  @spec create(String.t(), String.t(), String.t(), map()) ::
          {:ok, t()} | {:error, Ecto.Changeset.t()}
  def create(training_plan_id, business_id, creator_id, attrs) do
    insert_changeset(training_plan_id, business_id, creator_id, attrs)
    |> Repo.insert()
  end

  @spec update(t(), map()) :: {:ok, t()} | {:error, Ecto.Changeset.t()}
  def update(plan_item, attrs) do
    update_changeset(plan_item, attrs)
    |> Repo.update()
  end

  @spec delete(t()) :: {:ok, t()} | {:error, Ecto.Changeset.t()}
  def delete(plan_item) do
    Repo.delete(plan_item)
  end
end
