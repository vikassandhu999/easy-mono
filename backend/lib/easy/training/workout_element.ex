defmodule Easy.Training.WorkoutElement do
  use Ecto.Schema

  alias Easy.Orgs
  alias Easy.Repo
  alias Easy.Training.{Workout, PlannedSet, Exercise}

  import Ecto.Changeset
  import Ecto.Query

  @type t() :: %__MODULE__{}

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  schema "workout_elements" do
    field :position, :integer
    field :superset_group_id, :string
    field :notes, :string

    belongs_to :business, Orgs.Business
    belongs_to :workout, Workout
    belongs_to :exercise, Exercise

    embeds_many :planned_sets, PlannedSet, on_replace: :delete

    timestamps(type: :utc_datetime_usec)
  end

  @cast_fields [:position, :superset_group_id, :notes, :exercise_id]

  @spec copy_attrs(t()) :: map()
  def copy_attrs(%__MODULE__{} = element) do
    %{
      position: element.position,
      superset_group_id: element.superset_group_id,
      notes: element.notes,
      exercise_id: element.exercise_id,
      planned_sets: Enum.map(element.planned_sets, &PlannedSet.to_attrs/1)
    }
  end

  @spec to_snapshot(t()) :: map()
  def to_snapshot(%__MODULE__{} = element) do
    %{
      "element_id" => element.id,
      "position" => element.position,
      "superset_group_id" => element.superset_group_id,
      "notes" => element.notes,
      "exercise_id" => element.exercise_id,
      "exercise_name" => element.exercise.name,
      "planned_sets" => Enum.map(element.planned_sets, &PlannedSet.to_snapshot/1)
    }
  end

  @spec insert_changeset(String.t(), String.t(), map()) :: Ecto.Changeset.t()
  def insert_changeset(workout_id, business_id, attrs) do
    %__MODULE__{}
    |> cast(attrs, @cast_fields)
    |> put_change(:workout_id, workout_id)
    |> put_change(:business_id, business_id)
    |> common_validations()
  end

  @spec update_changeset(t(), map()) :: Ecto.Changeset.t()
  def update_changeset(element, attrs) do
    element
    |> cast(attrs, @cast_fields)
    |> common_validations()
  end

  defp common_validations(changeset) do
    changeset
    |> cast_embed(:planned_sets, with: &PlannedSet.changeset/2)
    |> validate_required([:position, :exercise_id])
    |> validate_length(:planned_sets, min: 1)
    |> validate_length(:notes, max: 5000)
    |> validate_number(:position, greater_than_or_equal_to: 0)
    |> validate_exercise_in_business()
    |> unique_constraint([:position, :workout_id],
      name: :workout_elements_position_workout_id_index
    )
    |> foreign_key_constraint(:workout_id)
    |> foreign_key_constraint(:exercise_id)
    |> foreign_key_constraint(:business_id)
  end

  defp validate_exercise_in_business(%{valid?: false} = changeset), do: changeset

  defp validate_exercise_in_business(changeset) do
    business_id = get_field(changeset, :business_id)
    exercise_id = get_field(changeset, :exercise_id)

    cond do
      is_nil(business_id) || is_nil(exercise_id) ->
        changeset

      Exercise |> Exercise.for_business(business_id) |> Repo.get(exercise_id) ->
        changeset

      true ->
        add_error(changeset, :exercise_id, "does not exist")
    end
  end

  @spec for_business(Ecto.Queryable.t(), String.t()) :: Ecto.Query.t()
  def for_business(query \\ __MODULE__, business_id) do
    from(e in query, where: e.business_id == ^business_id)
  end

  @spec for_workout(Ecto.Queryable.t(), String.t()) :: Ecto.Query.t()
  def for_workout(query \\ __MODULE__, workout_id) do
    from(e in query, where: e.workout_id == ^workout_id)
  end

  @spec ordered(Ecto.Queryable.t()) :: Ecto.Query.t()
  def ordered(query \\ __MODULE__) do
    from(e in query, order_by: [asc: e.position])
  end

  @spec with_exercise(Ecto.Queryable.t()) :: Ecto.Query.t()
  def with_exercise(query \\ __MODULE__) do
    from(e in query, preload: [:exercise])
  end

  @spec create(String.t(), String.t(), map()) :: {:ok, t()} | {:error, Ecto.Changeset.t()}
  def create(workout_id, business_id, attrs) do
    insert_changeset(workout_id, business_id, attrs)
    |> Repo.insert()
    |> preload_result()
  end

  @spec update(t(), map()) :: {:ok, t()} | {:error, Ecto.Changeset.t()}
  def update(element, attrs) do
    update_changeset(element, attrs)
    |> Repo.update()
    |> preload_result()
  end

  @spec delete(t()) :: {:ok, t()} | {:error, Ecto.Changeset.t()}
  def delete(element), do: Repo.delete(element)

  defp preload_result({:ok, record}), do: {:ok, Repo.preload(record, [:exercise])}
  defp preload_result(error), do: error
end
