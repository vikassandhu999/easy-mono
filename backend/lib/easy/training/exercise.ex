defmodule Easy.Training.Exercise do
  use Ecto.Schema

  alias Ecto.Changeset
  alias Easy.Training.Equipment
  alias Easy.Training.Muscle
  alias Easy.Orgs

  import Ecto.Changeset
  import Ecto.Query

  @type t() :: %__MODULE__{}

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  schema "exercises" do
    field :name, :string
    field :description, :string
    field :instructions, :string
    field :mechanics, Ecto.Enum, values: [:compound, :isolation, :isometric]
    field :force, Ecto.Enum, values: [:push, :pull, :static]
    field :images, {:array, :string}, default: []
    field :import_id, :string

    belongs_to :business, Orgs.Business

    many_to_many :muscles, Muscle, join_through: "exercise_muscles", on_replace: :delete
    many_to_many :equipment, Equipment, join_through: "exercise_equipment", on_replace: :delete

    timestamps(type: :utc_datetime_usec)
  end

  @cast_fields [:name, :description, :instructions, :mechanics, :force, :images]

  @spec create_changset(Ecto.UUID.t(), map(), [Muscle.t()] | nil, [Equipment.t()] | nil) :: Changeset.t()
  def create_changset(business_id, attrs, muscles, equipment) do
    %__MODULE__{}
    |> cast(attrs, @cast_fields)
    |> put_change(:business_id, business_id)
    |> validate_required([:name])
    |> validate_length(:name, max: 255)
    |> validate_length(:description, max: 5000)
    |> validate_length(:instructions, max: 10000)
    |> maybe_put_muscles(muscles)
    |> maybe_put_equipment(equipment)
    |> unique_constraint([:name, :business_id], name: :exercises_name_business_id_index)
    |> foreign_key_constraint(:business_id)
  end

  @spec update_changeset(t(), map(), [Muscle.t()] | nil, [Equipment.t()] | nil) :: Ecto.Changeset.t()
  def update_changeset(exercise, attrs, muscles, equipment) do
    exercise
    |> cast(attrs, @cast_fields)
    |> validate_length(:name, max: 255)
    |> validate_length(:description, max: 5000)
    |> validate_length(:instructions, max: 10000)
    |> maybe_put_muscles(muscles)
    |> maybe_put_equipment(equipment)
    |> unique_constraint([:name, :business_id], name: :exercises_name_business_id_index)
    |> foreign_key_constraint(:business_id)
  end

  @spec maybe_put_muscles(Changeset.t(), [Muscle.t()] | nil) :: Changeset.t()
  defp maybe_put_muscles(exercise, nil), do: exercise
  defp maybe_put_muscles(exercise, muscles), do: put_assoc(exercise, :muscles, muscles)

  @spec maybe_put_equipment(Changeset.t(), [Equipment.t()] | nil) :: Changeset.t()
  defp maybe_put_equipment(exercise, nil), do: exercise
  defp maybe_put_equipment(exercise, equipment), do: put_assoc(exercise, :equipment, equipment)

  @spec for_business(Ecto.Queryable.t(), String.t()) :: Ecto.Query.t()
  def for_business(query \\ __MODULE__, business_id) do
    from(e in query, where: e.business_id == ^business_id or is_nil(e.business_id))
  end

  @spec for_business_only(Ecto.Queryable.t(), String.t()) :: Ecto.Query.t()
  def for_business_only(query \\ __MODULE__, business_id) do
    from(e in query, where: e.business_id == ^business_id)
  end

  @spec search(Ecto.Queryable.t(), String.t() | nil) :: Ecto.Query.t()
  def search(query \\ __MODULE__, term)
  def search(query, nil), do: query
  def search(query, ""), do: query
  def search(query, term), do: from(e in query, where: ilike(e.name, ^"%#{term}%"))

  @spec with_muscle_ids(Ecto.Queryable.t(), [String.t()] | nil) :: Ecto.Query.t()
  def with_muscle_ids(query \\ __MODULE__, muscle_ids)
  def with_muscle_ids(query, nil), do: query
  def with_muscle_ids(query, []), do: query

  def with_muscle_ids(query, muscle_ids) do
    exercise_ids =
      from(em in "exercise_muscles", where: em.muscle_id in ^muscle_ids, select: em.exercise_id)

    from(e in query, where: e.id in subquery(exercise_ids))
  end

  @spec newest(Ecto.Queryable.t()) :: Ecto.Query.t()
  def newest(query \\ __MODULE__) do
    from(e in query, order_by: [desc: e.inserted_at, desc: e.id])
  end

  @spec with_preloads(Ecto.Queryable.t(), String.t()) :: Ecto.Query.t()
  def with_preloads(query, _business_id) do
    from(e in query,
      preload: [
        muscles: ^from(m in Muscle, order_by: m.name),
        equipment: ^from(eq in Equipment, order_by: eq.name)
      ]
    )
  end

  @spec system(Ecto.Queryable.t()) :: Ecto.Query.t()
  def system(query \\ __MODULE__), do: from(e in query, where: is_nil(e.business_id))
end
