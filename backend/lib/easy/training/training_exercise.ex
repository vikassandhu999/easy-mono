defmodule Easy.Training.TrainingExercise do
  use Ecto.Schema

  alias Ecto.Changeset
  alias Easy.Training.TrainingEquipment
  alias Easy.Training.TrainingMuscle
  alias Easy.Orgs

  import Ecto.Changeset
  import Ecto.Query

  @type t() :: %__MODULE__{}

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  @sources ~w(system imported custom)
  @tracking_types ~w(weight_reps bodyweight_reps weighted_bodyweight assisted_bodyweight
                     reps_only duration weight_duration distance_duration weight_distance)
  @mechanics ~w(compound isolation isometric)
  @forces ~w(push pull static)

  schema "training_exercises" do
    field :source, :string, default: "custom"
    field :tracking_type, :string, default: "weight_reps"
    field :name, :string
    field :description, :string
    field :instructions, :string
    field :mechanics, :string
    field :force, :string
    field :images, {:array, :string}, default: []
    field :import_id, :string

    belongs_to :creator, Easy.Orgs.Coach, foreign_key: :creator_id
    belongs_to :business, Orgs.Business

    many_to_many :muscles, TrainingMuscle,
      join_through: "training_exercise_muscles",
      join_keys: [exercise_id: :id, muscle_id: :id],
      on_replace: :delete

    many_to_many :equipment, TrainingEquipment,
      join_through: "training_exercise_equipment",
      join_keys: [exercise_id: :id, equipment_id: :id],
      on_replace: :delete

    timestamps(type: :utc_datetime)
  end

  @cast_fields [:source, :tracking_type, :name, :description, :instructions, :mechanics, :force, :images, :import_id]

  @spec insert_changeset(String.t(), String.t() | nil, map(), [TrainingMuscle.t()] | nil, [TrainingEquipment.t()] | nil) :: Changeset.t()
  def insert_changeset(business_id, coach_id, attrs, muscles \\ nil, equipment \\ nil) do
    %__MODULE__{}
    |> cast(attrs, @cast_fields)
    |> put_change(:business_id, business_id)
    |> put_change(:creator_id, coach_id)
    |> validate_required([:name])
    |> validate_enums()
    |> unique_constraint([:name, :business_id], name: :training_exercises_name_business_id_index)
    |> maybe_put_assoc(:muscles, muscles)
    |> maybe_put_assoc(:equipment, equipment)
  end

  @spec update_changeset(t(), map(), [TrainingMuscle.t()] | nil, [TrainingEquipment.t()] | nil) :: Ecto.Changeset.t()
  def update_changeset(exercise, attrs, muscles \\ nil, equipment \\ nil) do
    exercise
    |> cast(attrs, @cast_fields)
    |> validate_required([:name])
    |> validate_enums()
    |> unique_constraint([:name, :business_id], name: :training_exercises_name_business_id_index)
    |> maybe_put_assoc(:muscles, muscles)
    |> maybe_put_assoc(:equipment, equipment)
  end

  defp validate_enums(cs) do
    cs
    |> validate_inclusion(:source, @sources)
    |> validate_inclusion(:tracking_type, @tracking_types)
    |> validate_inclusion(:mechanics, @mechanics)
    |> validate_inclusion(:force, @forces)
  end

  defp maybe_put_assoc(cs, _key, nil), do: cs
  defp maybe_put_assoc(cs, key, records), do: put_assoc(cs, key, records)

  @spec for_business(Ecto.Queryable.t(), String.t()) :: Ecto.Query.t()
  def for_business(query \\ __MODULE__, business_id) do
    from(e in query, where: e.business_id == ^business_id)
  end

  @spec owned_or_system(Ecto.Queryable.t(), String.t()) :: Ecto.Query.t()
  def owned_or_system(query \\ __MODULE__, business_id) do
    from(e in query, where: e.business_id == ^business_id or is_nil(e.business_id))
  end

  @spec for_search(Ecto.Queryable.t(), String.t() | nil) :: Ecto.Query.t()
  def for_search(query \\ __MODULE__, term)
  def for_search(query, nil), do: query
  def for_search(query, ""), do: query
  def for_search(query, term), do: from(e in query, where: ilike(e.name, ^"%#{term}%"))

  @spec for_muscle_ids(Ecto.Queryable.t(), [String.t()] | nil) :: Ecto.Query.t()
  def for_muscle_ids(query \\ __MODULE__, muscle_ids)
  def for_muscle_ids(query, nil), do: query
  def for_muscle_ids(query, []), do: query

  def for_muscle_ids(query, muscle_ids) do
    exercise_ids =
      from(em in "training_exercise_muscles", where: em.muscle_id in ^muscle_ids, select: em.exercise_id)

    from(e in query, where: e.id in subquery(exercise_ids))
  end

  @spec newest_first(Ecto.Queryable.t()) :: Ecto.Query.t()
  def newest_first(query \\ __MODULE__) do
    from(e in query, order_by: [desc: e.inserted_at, desc: e.id])
  end

  @spec load_muscles_and_equipment(Ecto.Queryable.t()) :: Ecto.Query.t()
  def load_muscles_and_equipment(query) do
    from(e in query,
      preload: [
        muscles: ^from(m in TrainingMuscle, order_by: m.name),
        equipment: ^from(eq in TrainingEquipment, order_by: eq.name)
      ]
    )
  end
end
