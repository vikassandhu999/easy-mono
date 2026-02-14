defmodule Easy.Training.Equipment do
  use Ecto.Schema

  alias Easy.Repo

  import Ecto.Changeset
  import Ecto.Query

  @type t() :: %__MODULE__{}

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  schema "equipment" do
    field :name, :string
    field :description, :string

    timestamps(type: :utc_datetime_usec)
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
  def update_changeset(equipment, attrs) do
    equipment
    |> cast(attrs, @cast_fields)
    |> validate_length(:name, max: 255)
    |> validate_length(:description, max: 5000)
    |> unique_constraint(:name)
  end

  @spec search(Ecto.Queryable.t(), String.t() | nil) :: Ecto.Query.t()
  def search(query \\ __MODULE__, term)
  def search(query, nil), do: query
  def search(query, ""), do: query
  def search(query, term), do: from(e in query, where: ilike(e.name, ^"%#{term}%"))

  @spec alphabetical(Ecto.Queryable.t()) :: Ecto.Query.t()
  def alphabetical(query \\ __MODULE__) do
    from(e in query, order_by: [asc: e.name])
  end

  @spec create(map()) :: {:ok, t()} | {:error, Ecto.Changeset.t()}
  def create(attrs) do
    insert_changeset(attrs)
    |> Repo.insert()
  end

  @spec update(t(), map()) :: {:ok, t()} | {:error, Ecto.Changeset.t()}
  def update(equipment, attrs) do
    update_changeset(equipment, attrs)
    |> Repo.update()
  end

  @spec delete(t()) :: {:ok, t()} | {:error, Ecto.Changeset.t()}
  def delete(equipment), do: Repo.delete(equipment)
end
