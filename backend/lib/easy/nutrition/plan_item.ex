defmodule Easy.Nutrition.PlanItem do
  use Ecto.Schema

  alias Easy.Orgs
  alias Easy.Repo

  import Ecto.Changeset
  import Ecto.Query

  @type t() :: %__MODULE__{}

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  schema "plan_items" do
    field :day, :string
    field :meal_type, :string

    belongs_to :creator, Orgs.Coach
    belongs_to :business, Orgs.Business
    belongs_to :meal, Easy.Nutrition.Meal
    belongs_to :plan, Easy.Nutrition.Plan

    timestamps(type: :utc_datetime)
  end

  @cast_fields [:day, :meal_type, :meal_id]

  # Changesets

  @spec insert_changeset(String.t(), String.t(), String.t(), map()) :: Ecto.Changeset.t()
  def insert_changeset(plan_id, business_id, creator_id, attrs) do
    %__MODULE__{}
    |> cast(attrs, @cast_fields)
    |> put_change(:plan_id, plan_id)
    |> put_change(:business_id, business_id)
    |> put_change(:creator_id, creator_id)
    |> validate_required([:day, :meal_type, :meal_id, :plan_id, :business_id, :creator_id])
  end

  @spec update_changeset(t(), map()) :: Ecto.Changeset.t()
  def update_changeset(plan_item, attrs) do
    plan_item
    |> cast(attrs, @cast_fields)
  end

  # Queries

  @spec for_plan(Ecto.Queryable.t(), String.t()) :: Ecto.Query.t()
  def for_plan(query \\ __MODULE__, plan_id) do
    from(p in query, where: p.plan_id == ^plan_id)
  end

  @spec for_business(Ecto.Queryable.t(), String.t()) :: Ecto.Query.t()
  def for_business(query \\ __MODULE__, business_id) do
    from(p in query, where: p.business_id == ^business_id)
  end

  @spec for_day(Ecto.Queryable.t(), String.t()) :: Ecto.Query.t()
  def for_day(query \\ __MODULE__, day) do
    from(p in query, where: p.day == ^day)
  end

  @spec with_meal(Ecto.Queryable.t()) :: Ecto.Query.t()
  def with_meal(query \\ __MODULE__) do
    from(p in query, preload: [:meal])
  end

  # Actions

  @spec create(String.t(), String.t(), String.t(), map()) ::
          {:ok, t()} | {:error, Ecto.Changeset.t()}
  def create(plan_id, business_id, creator_id, attrs) do
    insert_changeset(plan_id, business_id, creator_id, attrs)
    |> Repo.insert()
  end

  @spec update(t(), map()) :: {:ok, t()} | {:error, Ecto.Changeset.t()}
  def update(plan_item, attrs) do
    update_changeset(plan_item, attrs)
    |> Repo.update()
  end

  @spec delete(t()) :: {:ok, t()} | {:error, Ecto.Changeset.t()}
  def delete(plan_item) do
    Repo.delete(plan_item)
  end
end
