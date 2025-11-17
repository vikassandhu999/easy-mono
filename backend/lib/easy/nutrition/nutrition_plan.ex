defmodule Easy.Nutrition.NutritionPlan do
  use Ecto.Schema

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  schema "nutrition_plans" do
    field :name, :string

    field :description, :string
    field :thumbnail_url, :string

    field :is_template, :boolean, default: true

    field :status, Ecto.Enum, values: [:active, :draft, :archived], default: :active

    field :duration_weeks, :integer

    field :start_date, :date

    field :tags, {:array, :string}, default: []

    belongs_to :client, Easy.Clients.Client, type: :binary_id

    belongs_to :original_plan, __MODULE__, foreign_key: :original_plan_id, type: :binary_id

    belongs_to :business, Easy.Organizations.Business, type: :binary_id
    belongs_to :creator, Easy.Organizations.Coach, type: :binary_id

    has_many :meals, Easy.Nutrition.Meal,
      foreign_key: :nutrition_plan_id,
      on_delete: :delete_all

    timestamps()
  end

  @doc false
  def changeset(nutrition_plan, attrs) do
    nutrition_plan
    |> Ecto.Changeset.cast(attrs, [
      :name,
      :description,
      :thumbnail_url,
      :is_template,
      :status,
      :duration_weeks,
      :start_date,
      :tags,
      :client_id,
      :original_plan_id,
      :business_id,
      :creator_id
    ])
    |> Ecto.Changeset.validate_required([:name, :status])
    |> Ecto.Changeset.validate_number(:duration_weeks, greater_than: 0)
    |> Ecto.Changeset.cast_assoc(:meals, with: &Easy.Nutrition.Meal.changeset/2)
  end
end
