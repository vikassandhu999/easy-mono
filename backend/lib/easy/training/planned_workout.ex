defmodule Easy.Training.PlannedWorkout do
  use Ecto.Schema

  alias Easy.Orgs
  alias Easy.Repo
  alias Easy.Training.{TrainingPlan, WorkoutElement}

  import Ecto.Changeset
  import Ecto.Query

  @type t() :: %__MODULE__{}

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  schema "planned_workouts" do
    field :name, :string
    field :notes, :string
    field :day_number, :integer

    belongs_to :business, Orgs.Business
    belongs_to :training_plan, TrainingPlan

    has_many :workout_elements, WorkoutElement,
      preload_order: [asc: :position],
      on_delete: :delete_all

    timestamps(type: :utc_datetime_usec)
  end

  @cast_fields [:name, :notes, :day_number]

  @spec day_name(integer()) :: String.t() | nil
  def day_name(1), do: "Monday"
  def day_name(2), do: "Tuesday"
  def day_name(3), do: "Wednesday"
  def day_name(4), do: "Thursday"
  def day_name(5), do: "Friday"
  def day_name(6), do: "Saturday"
  def day_name(7), do: "Sunday"
  def day_name(_), do: nil

  @spec insert_changeset(String.t(), String.t(), map()) :: Ecto.Changeset.t()
  def insert_changeset(training_plan_id, business_id, attrs) do
    %__MODULE__{}
    |> cast(attrs, @cast_fields)
    |> put_change(:training_plan_id, training_plan_id)
    |> put_change(:business_id, business_id)
    |> validate_required([:name, :day_number, :training_plan_id, :business_id])
    |> validate_length(:notes, max: 5000)
    |> validate_number(:day_number, greater_than_or_equal_to: 1, less_than_or_equal_to: 7)
    |> check_constraint(:day_number,
      name: :day_number_valid_weekday,
      message: "must be between 1 (Monday) and 7 (Sunday)"
    )
    |> foreign_key_constraint(:training_plan_id)
    |> foreign_key_constraint(:business_id)
  end

  @spec update_changeset(t(), map()) :: Ecto.Changeset.t()
  def update_changeset(workout, attrs) do
    workout
    |> cast(attrs, @cast_fields)
    |> validate_length(:notes, max: 5000)
    |> validate_number(:day_number, greater_than_or_equal_to: 1, less_than_or_equal_to: 7)
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
    from(w in query, order_by: [asc: w.day_number])
  end

  @spec with_elements(Ecto.Queryable.t()) :: Ecto.Query.t()
  def with_elements(query \\ __MODULE__) do
    element_query = WorkoutElement |> WorkoutElement.ordered() |> WorkoutElement.with_exercise()
    from(w in query, preload: [workout_elements: ^element_query])
  end

  @spec accessible?(String.t(), String.t()) :: boolean()
  def accessible?(business_id, workout_id) do
    __MODULE__
    |> for_business(business_id)
    |> Repo.get(workout_id)
    |> is_struct(__MODULE__)
  end

  @spec create(String.t(), String.t(), map()) :: {:ok, t()} | {:error, Ecto.Changeset.t()}
  def create(training_plan_id, business_id, attrs) do
    insert_changeset(training_plan_id, business_id, attrs)
    |> Repo.insert()
  end

  @spec update(t(), map()) :: {:ok, t()} | {:error, Ecto.Changeset.t()}
  def update(workout, attrs) do
    update_changeset(workout, attrs)
    |> Repo.update()
  end

  @spec delete(t()) :: {:ok, t()} | {:error, Ecto.Changeset.t()}
  def delete(workout), do: Repo.delete(workout)

  @spec duplicate(t(), integer() | nil) :: {:ok, t()} | {:error, Ecto.Changeset.t()}
  def duplicate(workout, day_number) do
    workout = Repo.preload(workout, :workout_elements)

    Repo.transaction(fn ->
      attrs = %{name: workout.name, notes: workout.notes, day_number: day_number}

      new_workout =
        case insert_changeset(workout.training_plan_id, workout.business_id, attrs)
             |> Repo.insert() do
          {:ok, w} -> w
          {:error, reason} -> Repo.rollback(reason)
        end

      Enum.each(workout.workout_elements, fn element ->
        element_attrs = %{
          position: element.position,
          superset_group_id: element.superset_group_id,
          notes: element.notes,
          exercise_id: element.exercise_id,
          planned_sets: copy_sets(element.planned_sets)
        }

        case WorkoutElement.insert_changeset(new_workout.id, workout.business_id, element_attrs)
             |> Repo.insert() do
          {:ok, _} -> :ok
          {:error, reason} -> Repo.rollback(reason)
        end
      end)

      Repo.preload(new_workout, workout_elements: WorkoutElement.with_exercise())
    end)
  end

  defp copy_sets(sets) when is_list(sets) do
    Enum.map(sets, fn set ->
      %{
        target_reps: set.target_reps,
        load_value: set.load_value,
        load_unit: set.load_unit,
        intensity_target: set.intensity_target,
        tempo: set.tempo,
        rest_seconds: set.rest_seconds,
        duration_seconds: set.duration_seconds,
        distance_value: set.distance_value,
        distance_unit: set.distance_unit,
        set_type: set.set_type,
        notes: set.notes
      }
    end)
  end

  defp copy_sets(_), do: []
end
