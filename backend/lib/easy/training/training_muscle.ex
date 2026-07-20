defmodule Easy.Training.TrainingMuscle do
  use Ecto.Schema

  import Ecto.Changeset
  import Ecto.Query

  @type t() :: %__MODULE__{}

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  schema "training_muscles" do
    field :name, :string
    field :description, :string

    timestamps(type: :utc_datetime)
  end

  @cast_fields [:name, :description]

  @spec insert_changeset(map()) :: Ecto.Changeset.t()
  def insert_changeset(attrs) do
    %__MODULE__{}
    |> cast(attrs, @cast_fields)
    |> validate_required([:name])
    |> validate_length(:name, max: 255)
    |> validate_length(:description, max: 5000)
    |> unique_constraint(:name)
  end

  @spec update_changeset(t(), map()) :: Ecto.Changeset.t()
  def update_changeset(muscle, attrs) do
    muscle
    |> cast(attrs, @cast_fields)
    |> validate_length(:name, max: 255)
    |> validate_length(:description, max: 5000)
    |> unique_constraint(:name)
  end

  @spec for_search(Ecto.Queryable.t(), String.t() | nil) :: Ecto.Query.t()
  def for_search(query \\ __MODULE__, term)
  def for_search(query, nil), do: query
  def for_search(query, ""), do: query
  def for_search(query, term), do: from(m in query, where: ilike(m.name, ^Easy.Search.like_pattern(term)))

  @spec alphabetical(Ecto.Queryable.t()) :: Ecto.Query.t()
  def alphabetical(query \\ __MODULE__) do
    from(m in query, order_by: [asc: m.name])
  end
end
