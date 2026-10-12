defmodule Easy.Nutrition.Nutrient do
  use Ecto.Schema
  import Ecto.Query
  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id
  @type t :: %__MODULE__{}
  @catalogue [
    {"energy_kcal", "Energy", "kcal"},
    {"protein_g", "Protein", "g"},
    {"carbs_g", "Carbs (total)", "g"},
    {"fat_g", "Fat", "g"},
    {"fiber_g", "Fiber", "g"},
    {"sugar_g", "Sugar", "g"},
    {"sodium_mg", "Sodium", "mg"},
    {"calcium_mg", "Calcium", "mg"},
    {"iron_mg", "Iron", "mg"},
    {"potassium_mg", "Potassium", "mg"},
    {"vitamin_c_mg", "Vitamin C", "mg"},
    {"vitamin_d_ug", "Vitamin D", "µg"}
  ]
  schema "nutrients" do
    field :code, :string
    field :name, :string
    field :unit, :string
    belongs_to :business, Easy.Orgs.Business
    timestamps(type: :utc_datetime)
  end

  @spec catalogue() :: [map()]
  def catalogue, do: Enum.map(@catalogue, fn {code, name, unit} -> %{code: code, name: name, unit: unit} end)
  @spec codes() :: [String.t()]
  def codes, do: Enum.map(@catalogue, &elem(&1, 0))
  @spec for_business(Ecto.Queryable.t(), String.t()) :: Ecto.Query.t()
  def for_business(query \\ __MODULE__, id), do: from(n in query, where: n.business_id == ^id)
end
