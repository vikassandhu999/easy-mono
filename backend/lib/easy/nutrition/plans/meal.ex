defmodule Easy.Nutrition.Plans.Meal do
  use Ecto.Schema
  alias Easy.Orgs
  alias Easy.Nutrition.Plans

  @type t() :: %__MODULE__{}

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  schema "meals" do
    field :name, :string

    field :macros, :map

    belongs_to :creator, Orgs.Coach, foreign_key: :creator_id
    belongs_to :plan, Plans.Plan
    has_many :plan_items, Easy.Nutrition.Plans.PlanItem

    timestamps(type: :utc_datetime)
  end
end
