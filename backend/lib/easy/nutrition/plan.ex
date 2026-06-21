defmodule Easy.Nutrition.Plan do
  use Ecto.Schema

  alias Easy.Clients.Client
  alias Easy.Nutrition.Meal
  alias Easy.Orgs

  import Ecto.Changeset
  import Ecto.Query

  @type t() :: %__MODULE__{}

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  @plan_statuses [:active, :archived]

  @spec statuses() :: [atom()]
  def statuses, do: @plan_statuses

  schema "nutrition_plans" do
    field :name, :string
    field :description, :string
    field :tags, {:array, :string}, default: []

    field :target_calories, :float
    field :target_protein_g, :float
    field :target_carbs_g, :float
    field :target_fat_g, :float
    field :target_fiber_g, :float

    field :status, Ecto.Enum, values: @plan_statuses, default: :active

    field :start_date, :date
    field :end_date, :date

    belongs_to :creator, Orgs.Coach, foreign_key: :creator_id
    belongs_to :business, Orgs.Business
    belongs_to :client, Client
    belongs_to :source_template, __MODULE__, foreign_key: :source_template_id
    has_many :meals, Meal, foreign_key: :nutrition_plan_id
    has_many :plan_items, Easy.Nutrition.PlanItem, foreign_key: :nutrition_plan_id

    timestamps(type: :utc_datetime)
  end

  @cast_fields [
    :name,
    :description,
    :tags,
    :target_calories,
    :target_protein_g,
    :target_carbs_g,
    :target_fat_g,
    :target_fiber_g,
    :status,
    :start_date,
    :end_date
  ]

  # Changesets

  @spec insert_changeset(String.t(), String.t(), map()) :: Ecto.Changeset.t()
  def insert_changeset(business_id, creator_id, attrs) do
    %__MODULE__{}
    |> cast(attrs, @cast_fields)
    |> put_change(:business_id, business_id)
    |> put_change(:creator_id, creator_id)
    |> validate_required([:name, :business_id, :creator_id])
    |> validate_date_range()
    |> exclusion_constraint(:start_date,
      name: :nutrition_plans_no_overlapping_active,
      message: "overlaps an existing active plan for this client"
    )
  end

  @spec update_changeset(t(), map()) :: Ecto.Changeset.t()
  def update_changeset(plan, attrs) do
    plan
    |> cast(attrs, @cast_fields)
    |> validate_date_range()
    |> exclusion_constraint(:start_date,
      name: :nutrition_plans_no_overlapping_active,
      message: "overlaps an existing active plan for this client"
    )
  end

  defp validate_date_range(changeset) do
    case {get_field(changeset, :start_date), get_field(changeset, :end_date)} do
      {%Date{} = s, %Date{} = e} ->
        if Date.compare(s, e) == :gt do
          add_error(changeset, :end_date, "must be on or after start_date")
        else
          changeset
        end

      _ ->
        changeset
    end
  end

  # Queries

  @spec for_business(Ecto.Queryable.t(), String.t()) :: Ecto.Query.t()
  def for_business(query \\ __MODULE__, business_id) do
    from(p in query, where: p.business_id == ^business_id)
  end

  @spec for_client(Ecto.Queryable.t(), String.t()) :: Ecto.Query.t()
  def for_client(query \\ __MODULE__, client_id) do
    from(p in query, where: p.client_id == ^client_id)
  end

  @spec with_status(Ecto.Queryable.t(), atom() | nil) :: Ecto.Query.t()
  def with_status(query \\ __MODULE__, status)
  def with_status(query, nil), do: query

  def with_status(query, status) do
    from(p in query, where: p.status == ^status)
  end

  @spec templates(Ecto.Queryable.t()) :: Ecto.Query.t()
  def templates(query \\ __MODULE__) do
    from(p in query, where: is_nil(p.client_id))
  end

  @spec newest(Ecto.Queryable.t()) :: Ecto.Query.t()
  def newest(query \\ __MODULE__) do
    from(p in query, order_by: [desc: p.inserted_at])
  end

  @spec active_for_client(Ecto.Queryable.t(), String.t(), Date.t()) :: Ecto.Query.t()
  def active_for_client(query \\ __MODULE__, client_id, date) do
    from(p in query,
      where: p.client_id == ^client_id,
      where: p.status == :active,
      where: is_nil(p.start_date) or p.start_date <= ^date,
      where: is_nil(p.end_date) or p.end_date >= ^date
    )
  end
end
