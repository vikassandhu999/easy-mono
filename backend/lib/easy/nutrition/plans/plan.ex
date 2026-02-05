defmodule Easy.Nutrition.Plans.Plan do
  use Ecto.Schema
  alias Easy.Orgs
  alias Easy.Nutrition.Plans
  alias Easy.Clients

  @type t() :: %__MODULE__{}

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  schema "plans" do
    field :name, :string
    field :description, :string
    field :tags, {:array, :string}, default: []

    field :macros_goal, :map

    field :type, Ecto.Enum, values: [:template, :personal], default: :template
    field :status, Ecto.Enum, values: [:draft, :active, :archived], default: :draft

    belongs_to :creator, Orgs.Coach, foreign_key: :creator_id
    belongs_to :business, Orgs.Business
    belongs_to :client, Clients.Client
    belongs_to :source_template, Plans.Plan, foreign_key: :source_template_id
    has_many :meals, Plans.Meal
    has_many :plan_items, Plans.PlanItem

    timestamps(type: :utc_datetime)
  end
end
