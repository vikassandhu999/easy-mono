defmodule Easy.Nutrition.Plans.PlanItem do
  use Ecto.Schema
  alias Easy.Orgs
  alias Easy.Nutrition.Plans

  @type t() :: %__MODULE__{}

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  schema "plan_items" do
    field :day, :string
    field :meal_type, :string

    belongs_to :creator, Orgs.Coach
    belongs_to :meal, Plans.Meal
    belongs_to :plan, Plans.Plan

    timestamps(type: :utc_datetime)
  end
end
