defmodule Easy.Training.Exercise do
  use Ecto.Schema

  alias Easy.Orgs
  alias Easy.Repo
  alias Easy.Training.{ExerciseMuscle, ExerciseEquipment}

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

    has_many :exercise_muscles, ExerciseMuscle, on_replace: :delete
    has_many :muscles, through: [:exercise_muscles, :muscle]

    has_many :exercise_equipment, ExerciseEquipment, on_replace: :delete
    has_many :equipment, through: [:exercise_equipment, :equipment]

    timestamps(type: :utc_datetime_usec)
  end

  @cast_fields [:name, :description, :instructions, :mechanics, :force, :images]

  @spec insert_changeset(String.t() | nil, map()) :: Ecto.Changeset.t()
  def insert_changeset(business_id, attrs) do
    %__MODULE__{}
    |> cast(attrs, @cast_fields)
    |> maybe_put_business_id(business_id)
    |> validate_required([:name])
    |> validate_length(:name, max: 255)
    |> validate_length(:description, max: 5000)
    |> validate_length(:instructions, max: 10000)
    |> put_muscle_ids(attrs)
    |> put_equipment_ids(attrs)
    |> unique_constraint([:name, :business_id], name: :exercises_name_business_id_index)
    |> foreign_key_constraint(:business_id)
  end

  @spec update_changeset(t(), map()) :: Ecto.Changeset.t()
  def update_changeset(exercise, attrs) do
    exercise
    |> cast(attrs, @cast_fields)
    |> validate_length(:name, max: 255)
    |> validate_length(:description, max: 5000)
    |> validate_length(:instructions, max: 10000)
    |> put_muscle_ids(attrs)
    |> put_equipment_ids(attrs)
    |> unique_constraint([:name, :business_id], name: :exercises_name_business_id_index)
    |> foreign_key_constraint(:business_id)
  end

  defp maybe_put_business_id(changeset, nil), do: changeset

  defp maybe_put_business_id(changeset, business_id),
    do: put_change(changeset, :business_id, business_id)

  defp put_muscle_ids(changeset, %{muscle_ids: muscle_ids}) when is_list(muscle_ids) do
    exercise_muscles =
      Enum.map(muscle_ids, fn muscle_id -> %{muscle_id: muscle_id, role: :primary} end)

    put_assoc(changeset, :exercise_muscles, exercise_muscles)
  end

  defp put_muscle_ids(changeset, %{"muscle_ids" => muscle_ids}) when is_list(muscle_ids) do
    exercise_muscles =
      Enum.map(muscle_ids, fn muscle_id -> %{muscle_id: muscle_id, role: :primary} end)

    put_assoc(changeset, :exercise_muscles, exercise_muscles)
  end

  defp put_muscle_ids(changeset, _), do: changeset

  defp put_equipment_ids(changeset, %{equipment_ids: equipment_ids})
       when is_list(equipment_ids) do
    exercise_equipment =
      Enum.map(equipment_ids, fn equipment_id -> %{equipment_id: equipment_id} end)

    put_assoc(changeset, :exercise_equipment, exercise_equipment)
  end

  defp put_equipment_ids(changeset, %{"equipment_ids" => equipment_ids})
       when is_list(equipment_ids) do
    exercise_equipment =
      Enum.map(equipment_ids, fn equipment_id -> %{equipment_id: equipment_id} end)

    put_assoc(changeset, :exercise_equipment, exercise_equipment)
  end

  defp put_equipment_ids(changeset, _), do: changeset

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
      from(em in ExerciseMuscle, where: em.muscle_id in ^muscle_ids, select: em.exercise_id)

    from(e in query, where: e.id in subquery(exercise_ids))
  end

  @spec newest(Ecto.Queryable.t()) :: Ecto.Query.t()
  def newest(query \\ __MODULE__) do
    from(e in query, order_by: [desc: e.inserted_at, desc: e.id])
  end

  @spec with_preloads(Ecto.Queryable.t()) :: Ecto.Query.t()
  def with_preloads(query \\ __MODULE__) do
    muscles_query =
      from(em in ExerciseMuscle,
        join: m in assoc(em, :muscle),
        preload: [muscle: m]
      )

    equipment_query =
      from(ee in ExerciseEquipment,
        join: eq in assoc(ee, :equipment),
        preload: [equipment: eq]
      )

    from(e in query,
      preload: [
        exercise_muscles: ^muscles_query,
        exercise_equipment: ^equipment_query
      ]
    )
  end

  @spec system(Ecto.Queryable.t()) :: Ecto.Query.t()
  def system(query \\ __MODULE__), do: from(e in query, where: is_nil(e.business_id))

  @spec create(String.t() | nil, map()) :: {:ok, t()} | {:error, Ecto.Changeset.t()}
  def create(business_id, attrs) do
    insert_changeset(business_id, attrs)
    |> Repo.insert()
    |> preload_result()
  end

  @spec update(t(), map()) :: {:ok, t()} | {:error, Ecto.Changeset.t()}
  def update(exercise, attrs) do
    update_changeset(exercise, attrs)
    |> Repo.update()
    |> preload_result()
  end

  @spec delete(t()) :: {:ok, t()} | {:error, Ecto.Changeset.t()}
  def delete(exercise), do: Repo.delete(exercise)

  @spec duplicate(t(), String.t()) :: {:ok, t()} | {:error, :not_found | Ecto.Changeset.t()}
  def duplicate(exercise, business_id) do
    with :ok <- authorize_access(exercise, business_id) do
      exercise = Repo.preload(exercise, [:exercise_muscles, :exercise_equipment])

      attrs = %{
        name: generate_copy_name(exercise.name, business_id),
        description: exercise.description,
        instructions: exercise.instructions,
        mechanics: exercise.mechanics,
        force: exercise.force,
        muscle_ids: Enum.map(exercise.exercise_muscles, & &1.muscle_id),
        equipment_ids: Enum.map(exercise.exercise_equipment, & &1.equipment_id)
      }

      create(business_id, attrs)
    end
  end

  defp authorize_access(%__MODULE__{business_id: nil}, _business_id), do: :ok
  defp authorize_access(%__MODULE__{business_id: business_id}, business_id), do: :ok
  defp authorize_access(_exercise, _business_id), do: {:error, :not_found}

  defp generate_copy_name(original_name, business_id) do
    base_name =
      original_name
      |> String.replace(~r/\s*\(Copy\s*\d*\)\s*$/, "")
      |> String.trim()

    existing_names =
      from(e in __MODULE__,
        where: e.business_id == ^business_id,
        where: e.name == ^base_name or like(e.name, ^"#{base_name} (Copy%)"),
        select: e.name
      )
      |> Repo.all()
      |> MapSet.new()

    find_available_copy_name(base_name, existing_names, 1)
  end

  defp find_available_copy_name(base_name, existing_names, attempt) when attempt <= 100 do
    candidate = if attempt == 1, do: "#{base_name} (Copy)", else: "#{base_name} (Copy #{attempt})"

    if MapSet.member?(existing_names, candidate) do
      find_available_copy_name(base_name, existing_names, attempt + 1)
    else
      candidate
    end
  end

  defp find_available_copy_name(base_name, _existing_names, _attempt) do
    "#{base_name} (Copy #{System.system_time(:second)})"
  end

  defp preload_result({:ok, record}) do
    muscles_query =
      from(em in ExerciseMuscle,
        join: m in assoc(em, :muscle),
        preload: [muscle: m]
      )

    equipment_query =
      from(ee in ExerciseEquipment,
        join: eq in assoc(ee, :equipment),
        preload: [equipment: eq]
      )

    {:ok,
     Repo.preload(record,
       exercise_muscles: muscles_query,
       exercise_equipment: equipment_query
     )}
  end

  defp preload_result(error), do: error
end
