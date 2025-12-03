defmodule Easy.Nutrition.NutritionPlan do
  use Easy.Nutrition.Schema

  alias Easy.Organizations.{Business, Coach}
  alias Easy.Clients.Client
  alias Easy.Nutrition.Meal

  schema "nutrition_plans" do
    field :name, :string

    field :description, :string
    field :thumbnail_url, :string

    field :is_template, :boolean, default: true

    field :status, Ecto.Enum, values: [:active, :draft, :archived], default: :active

    field :duration_weeks, :integer

    field :start_date, :date

    field :tags, {:array, :string}, default: []

    belongs_to :client, Client

    belongs_to :original_template, __MODULE__, foreign_key: :original_template_id

    belongs_to :business, Business
    belongs_to :author, Coach

    has_many :meals, Meal,
      foreign_key: :nutrition_plan_id,
      on_delete: :delete_all,
      preload_order: [asc: :day_number, asc: :position]

    timestamps()
  end

  @doc false
  def changeset(nutrition_plan, attrs) do
    nutrition_plan
    |> cast(attrs, [
      :name,
      :description,
      :thumbnail_url,
      :is_template,
      :status,
      :duration_weeks,
      :start_date,
      :tags,
      :client_id,
      :original_template_id
    ])
    |> validate_required([:name, :status, :business_id, :author_id])
    |> validate_number(:duration_weeks, greater_than: 0)
    |> foreign_key_constraint(:business_id)
    |> foreign_key_constraint(:author_id)
    |> cast_assoc(:meals, with: &Meal.changeset/2)
  end
end
