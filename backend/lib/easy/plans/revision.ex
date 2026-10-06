defmodule Easy.Plans.Revision do
  use Ecto.Schema
  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id
  @type t :: %__MODULE__{}
  schema "plan_revisions" do
    field :domain, Ecto.Enum, values: [:training, :nutrition]
    field :number, :integer
    field :effective_on, :date
    field :content, :map
    belongs_to :plan, Easy.Plans.Plan
    field :created_by, :binary_id
    timestamps(type: :utc_datetime, updated_at: false)
  end
end
