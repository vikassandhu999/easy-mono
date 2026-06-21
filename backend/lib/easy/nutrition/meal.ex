defmodule Easy.Nutrition.Meal do
  use Ecto.Schema

  alias Easy.Orgs

  import Ecto.Changeset
  import Ecto.Query

  @type t() :: %__MODULE__{}

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  @meal_slots [
    "breakfast",
    "morning_snack",
    "lunch",
    "afternoon_snack",
    "dinner",
    "evening_snack"
  ]

  schema "nutrition_meals" do
    field :name, :string
    field :notes, :string
    field :default_meal_slot, :string

    belongs_to :creator, Orgs.Coach, foreign_key: :creator_id
    belongs_to :business, Orgs.Business
    belongs_to :plan, Easy.Nutrition.Plan, foreign_key: :nutrition_plan_id
    has_many :meal_items, Easy.Nutrition.MealItem, foreign_key: :nutrition_meal_id

    timestamps(type: :utc_datetime)
  end

  @cast_fields [:name, :notes, :default_meal_slot]

  @spec insert_changeset(String.t(), String.t(), String.t(), map()) :: Ecto.Changeset.t()
  def insert_changeset(plan_id, business_id, creator_id, attrs) do
    %__MODULE__{}
    |> cast(attrs, @cast_fields)
    |> put_change(:nutrition_plan_id, plan_id)
    |> put_change(:business_id, business_id)
    |> put_change(:creator_id, creator_id)
    |> validate_required([:name, :nutrition_plan_id, :business_id, :creator_id])
    |> validate_inclusion(:default_meal_slot, @meal_slots)
  end

  @spec update_changeset(t(), map()) :: Ecto.Changeset.t()
  def update_changeset(meal, attrs) do
    meal
    |> cast(attrs, @cast_fields)
    |> validate_inclusion(:default_meal_slot, @meal_slots)
  end

  @spec for_plan(Ecto.Queryable.t(), String.t()) :: Ecto.Query.t()
  def for_plan(query \\ __MODULE__, plan_id) do
    from(m in query, where: m.nutrition_plan_id == ^plan_id)
  end

  @spec for_business(Ecto.Queryable.t(), String.t()) :: Ecto.Query.t()
  def for_business(query \\ __MODULE__, business_id) do
    from(m in query, where: m.business_id == ^business_id)
  end

  @spec ordered(Ecto.Queryable.t()) :: Ecto.Query.t()
  def ordered(query \\ __MODULE__) do
    from(m in query, order_by: [asc: m.inserted_at])
  end
end
