defmodule Easy.Nutrition.Meal do
  use Ecto.Schema

  alias Easy.Nutrition.MealItem
  alias Easy.Orgs

  import Ecto.Changeset
  import Ecto.Query

  @type t() :: %__MODULE__{}

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  schema "meals" do
    field :name, :string

    field :macros, :map

    belongs_to :creator, Orgs.Coach, foreign_key: :creator_id
    belongs_to :business, Orgs.Business
    belongs_to :plan, Easy.Nutrition.Plan
    has_many :plan_items, Easy.Nutrition.PlanItem
    has_many :meal_items, MealItem

    timestamps(type: :utc_datetime)
  end

  @cast_fields [:name, :macros]

  # Changesets

  @spec insert_changeset(String.t(), String.t(), String.t(), map()) :: Ecto.Changeset.t()
  def insert_changeset(plan_id, business_id, creator_id, attrs) do
    %__MODULE__{}
    |> cast(attrs, @cast_fields)
    |> put_change(:plan_id, plan_id)
    |> put_change(:business_id, business_id)
    |> put_change(:creator_id, creator_id)
    |> validate_required([:name, :plan_id, :business_id, :creator_id])
  end

  @spec update_changeset(t(), map()) :: Ecto.Changeset.t()
  def update_changeset(meal, attrs) do
    meal
    |> cast(attrs, @cast_fields)
  end

  # Queries

  @spec for_plan(Ecto.Queryable.t(), String.t()) :: Ecto.Query.t()
  def for_plan(query \\ __MODULE__, plan_id) do
    from(m in query, where: m.plan_id == ^plan_id)
  end

  @spec for_business(Ecto.Queryable.t(), String.t()) :: Ecto.Query.t()
  def for_business(query \\ __MODULE__, business_id) do
    from(m in query, where: m.business_id == ^business_id)
  end

  @spec ordered(Ecto.Queryable.t()) :: Ecto.Query.t()
  def ordered(query \\ __MODULE__) do
    from(m in query, order_by: [asc: m.inserted_at])
  end

  @spec with_items(Ecto.Queryable.t()) :: Ecto.Query.t()
  def with_items(query \\ __MODULE__) do
    meal_item_query = MealItem |> MealItem.ordered() |> MealItem.with_food_and_recipe()
    from(m in query, preload: [meal_items: ^meal_item_query])
  end
end
