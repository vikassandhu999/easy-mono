defmodule Easy.Training.Workout do
  use Ecto.Schema

  alias Easy.Orgs
  alias Easy.Training.{TrainingPlan, WorkoutElement}

  import Ecto.Changeset
  import Ecto.Query

  @type t() :: %__MODULE__{}

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  schema "workouts" do
    field :name, :string
    field :notes, :string

    belongs_to :business, Orgs.Business
    belongs_to :training_plan, TrainingPlan

    has_many :workout_elements, WorkoutElement,
      preload_order: [asc: :position],
      on_delete: :delete_all

    has_many :plan_items, Easy.Training.PlanItem

    timestamps(type: :utc_datetime_usec)
  end

  @cast_fields [:name, :notes]

  @spec insert_changeset(String.t(), String.t(), map()) :: Ecto.Changeset.t()
  def insert_changeset(training_plan_id, business_id, attrs) do
    %__MODULE__{}
    |> cast(attrs, @cast_fields)
    |> put_change(:training_plan_id, training_plan_id)
    |> put_change(:business_id, business_id)
    |> validate_required([:name])
    |> validate_length(:notes, max: 5000)
    |> foreign_key_constraint(:training_plan_id)
    |> foreign_key_constraint(:business_id)
  end

  @spec update_changeset(t(), map()) :: Ecto.Changeset.t()
  def update_changeset(workout, attrs) do
    workout
    |> cast(attrs, @cast_fields)
    |> validate_length(:notes, max: 5000)
    |> foreign_key_constraint(:training_plan_id)
    |> foreign_key_constraint(:business_id)
  end

  @spec for_business(Ecto.Queryable.t(), String.t()) :: Ecto.Query.t()
  def for_business(query \\ __MODULE__, business_id) do
    from(w in query, where: w.business_id == ^business_id)
  end

  @spec for_plan(Ecto.Queryable.t(), String.t()) :: Ecto.Query.t()
  def for_plan(query \\ __MODULE__, plan_id) do
    from(w in query, where: w.training_plan_id == ^plan_id)
  end

  @spec ordered(Ecto.Queryable.t()) :: Ecto.Query.t()
  def ordered(query \\ __MODULE__) do
    from(w in query, order_by: [asc: w.name, asc: w.id])
  end

  @spec with_elements(Ecto.Queryable.t(), String.t()) :: Ecto.Query.t()
  def with_elements(query, business_id) do
    element_query =
      WorkoutElement
      |> WorkoutElement.for_business(business_id)
      |> WorkoutElement.ordered()
      |> WorkoutElement.with_exercise(business_id)

    from(w in query, preload: [workout_elements: ^element_query])
  end
end
