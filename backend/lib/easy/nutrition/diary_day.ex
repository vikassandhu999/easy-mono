defmodule Easy.Nutrition.DiaryDay do
  use Ecto.Schema
  import Ecto.Query
  alias Easy.Nutrition.Day

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id
  @type t() :: %__MODULE__{}

  schema "nutrition_diary_days" do
    field :local_date, :date
    field :target_calories, :float
    field :target_protein_g, :float
    field :target_carbs_g, :float
    field :target_fat_g, :float
    field :target_fiber_g, :float
    belongs_to :business, Easy.Orgs.Business
    belongs_to :client, Easy.Clients.Client
    timestamps(type: :utc_datetime)
  end

  @spec for_date(String.t(), String.t(), Date.t()) :: Ecto.Query.t()
  def for_date(business_id, client_id, date) do
    from(day in __MODULE__,
      where: day.business_id == ^business_id and day.client_id == ^client_id,
      where: day.local_date == ^date
    )
  end

  @spec target_attrs(map() | nil) :: map()
  def target_attrs(nil), do: %{}
  def target_attrs(plan), do: Map.take(plan, [:target_calories, :target_protein_g, :target_carbs_g, :target_fat_g, :target_fiber_g])

  @spec targets(map() | nil) :: Day.targets()
  def targets(nil), do: %{calories: nil, protein_g: nil, carbs_g: nil, fat_g: nil, fiber_g: nil}

  def targets(day) do
    %{
      calories: day.target_calories,
      protein_g: day.target_protein_g,
      carbs_g: day.target_carbs_g,
      fat_g: day.target_fat_g,
      fiber_g: day.target_fiber_g
    }
  end
end
