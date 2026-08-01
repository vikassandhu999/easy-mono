defmodule Easy.Training.TrainingEquipment do
  use Ecto.Schema

  import Ecto.Query

  @type t() :: %__MODULE__{}

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  schema "training_equipment" do
    field :name, :string
    field :description, :string

    timestamps(type: :utc_datetime)
  end

  @spec for_search(Ecto.Queryable.t(), String.t() | nil) :: Ecto.Query.t()
  def for_search(query \\ __MODULE__, term)
  def for_search(query, nil), do: query
  def for_search(query, ""), do: query
  def for_search(query, term), do: from(e in query, where: ilike(e.name, ^Easy.Search.like_pattern(term)))

  @spec alphabetical(Ecto.Queryable.t()) :: Ecto.Query.t()
  def alphabetical(query \\ __MODULE__) do
    from(e in query, order_by: [asc: e.name])
  end
end
