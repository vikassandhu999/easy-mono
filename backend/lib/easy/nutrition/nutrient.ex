defmodule Easy.Nutrition.Nutrient do
  use Ecto.Schema
  import Ecto.Query
  # One shared registry, seeded by migration; no business owns a nutrient (N21).
  @primary_key {:code, :string, autogenerate: false}
  @type t :: %__MODULE__{}
  schema "nutrients" do
    field :name, :string
    field :unit, :string
    field :position, :integer
  end

  @spec for_codes(Ecto.Queryable.t(), [String.t()]) :: Ecto.Query.t()
  def for_codes(query \\ __MODULE__, codes), do: from(n in query, where: n.code in ^codes)
  @spec ordered(Ecto.Queryable.t()) :: Ecto.Query.t()
  def ordered(query \\ __MODULE__), do: from(n in query, order_by: [asc: n.position, asc: n.code])
end
