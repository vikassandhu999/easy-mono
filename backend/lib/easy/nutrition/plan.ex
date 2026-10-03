defmodule Easy.Nutrition.Plan do
  use Ecto.Schema

  alias Easy.Clients.Client
  alias Easy.Identity.User
  alias Easy.Nutrition.Menu
  alias Easy.Orgs

  import Ecto.Changeset
  import Ecto.Query

  @type t() :: %__MODULE__{}
  @type kind :: :template | :client_plan
  @type lifecycle :: :active | :incomplete | :waiting | :upcoming | :current | :ended | :archived

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  @kinds [:template, :client_plan]
  @lifecycles [:active, :incomplete, :waiting, :upcoming, :current, :ended, :archived]
  @template_fields [
    :name,
    :description,
    :target_calories,
    :target_protein_g,
    :target_carbs_g,
    :target_fat_g,
    :target_fiber_g
  ]
  @target_fields [
    :target_calories,
    :target_protein_g,
    :target_carbs_g,
    :target_fat_g,
    :target_fiber_g
  ]

  schema "nutrition_plans" do
    field(:kind, Ecto.Enum, values: @kinds)
    field(:name, :string)
    field(:description, :string)
    field(:revision, :integer, default: 1)
    field(:archived_at, :utc_datetime)
    field(:lifecycle, Ecto.Enum, values: @lifecycles, virtual: true)
    field(:assigned_client_count, :integer, virtual: true, default: 0)
    field(:target_calories, :float)
    field(:target_protein_g, :float)
    field(:target_carbs_g, :float)
    field(:target_fat_g, :float)
    field(:target_fiber_g, :float)
    field(:start_date, :date)
    field(:end_date, :date)

    belongs_to(:creator, User, foreign_key: :creator_id)
    belongs_to(:business, Orgs.Business)
    belongs_to(:client, Client)
    belongs_to(:source_template, __MODULE__, foreign_key: :source_template_id)
    embeds_one(:menu, Menu, on_replace: :delete)

    timestamps(type: :utc_datetime)
  end

  @spec current_or_upcoming(Ecto.Queryable.t(), Date.t()) :: Ecto.Query.t()
  def current_or_upcoming(query \\ __MODULE__, date) do
    query
    |> scheduled()
    |> where([plan], is_nil(plan.end_date) or plan.end_date >= ^date)
    |> order_by([plan], asc: plan.start_date, asc: plan.id)
  end

  @spec lifecycles() :: [lifecycle()]
  def lifecycles, do: @lifecycles

  @spec lifecycle(t(), Date.t()) :: lifecycle()

  def lifecycle(%__MODULE__{archived_at: archived_at}, _date) when not is_nil(archived_at),
    do: :archived

  def lifecycle(%__MODULE__{kind: :template}, _date), do: :active

  def lifecycle(%__MODULE__{start_date: nil}, _date), do: :incomplete

  def lifecycle(%__MODULE__{} = plan, date), do: Easy.PlanCoverage.lifecycle(plan, date)

  @spec insert_changeset(String.t(), String.t(), map(), Menu.t()) :: Ecto.Changeset.t()
  def insert_changeset(business_id, creator_id, attrs, menu \\ Menu.empty()) do
    %__MODULE__{}
    |> cast(attrs, @template_fields)
    |> change(kind: :template, business_id: business_id, creator_id: creator_id, revision: 1)
    |> put_embed(:menu, menu)
    |> validate_common_fields()
    |> validate_required([:kind, :business_id, :creator_id, :revision])
    |> apply_constraints()
  end

  @spec copy_changeset(String.t(), String.t(), t(), String.t()) :: Ecto.Changeset.t()
  def copy_changeset(business_id, creator_id, template, name) do
    attrs = template |> Map.take(@template_fields) |> Map.put(:name, name)
    insert_changeset(business_id, creator_id, attrs, template.menu)
  end

  @spec assign_changeset(String.t(), String.t(), String.t(), t(), map()) :: Ecto.Changeset.t()
  def assign_changeset(business_id, creator_id, client_id, source_template, attrs) do
    %__MODULE__{}
    |> cast(attrs, [:start_date, :end_date])
    |> change(Map.take(source_template, @template_fields))
    |> change(
      kind: :client_plan,
      business_id: business_id,
      creator_id: creator_id,
      client_id: client_id,
      source_template_id: source_template.id,
      revision: 1
    )
    |> put_embed(:menu, source_template.menu)
    |> validate_common_fields()
    |> validate_required([:kind, :business_id, :creator_id, :client_id, :revision])
    |> validate_date_range()
    |> apply_constraints()
  end

  @spec update_changeset(t(), map()) :: Ecto.Changeset.t()
  def update_changeset(plan, attrs) do
    fields =
      if plan.kind == :template,
        do: @template_fields,
        else: @template_fields ++ [:start_date, :end_date]

    plan
    |> cast(attrs, fields)
    |> put_change(:revision, plan.revision + 1)
    |> validate_common_fields()
    |> validate_date_range()
    |> apply_constraints()
  end

  @spec menu_changeset(t(), Menu.t()) :: Ecto.Changeset.t()
  def menu_changeset(plan, menu) do
    plan
    |> change(revision: plan.revision + 1)
    |> put_embed(:menu, menu)
    |> apply_constraints()
  end

  @spec lifecycle_changeset(t(), DateTime.t() | nil) :: Ecto.Changeset.t()
  def lifecycle_changeset(plan, archived_at) do
    plan
    |> change(archived_at: archived_at, revision: plan.revision + 1)
    |> apply_constraints()
  end

  defp validate_common_fields(changeset) do
    changeset
    |> update_change(:name, &Easy.Utils.trim/1)
    |> validate_required([:name])
    |> validate_length(:name, max: 255)
    |> validate_length(:description, max: 5000)
    |> validate_targets()
  end

  defp validate_targets(changeset) do
    Enum.reduce(@target_fields, changeset, fn field, changeset ->
      validate_number(changeset, field, greater_than_or_equal_to: 0)
    end)
  end

  defp validate_date_range(changeset) do
    start_date = get_field(changeset, :start_date)
    end_date = get_field(changeset, :end_date)

    if start_date && end_date && Date.compare(end_date, start_date) == :lt do
      add_error(changeset, :end_date, "must be after or equal to start date")
    else
      changeset
    end
  end

  defp apply_constraints(changeset) do
    changeset
    |> foreign_key_constraint(:business_id)
    |> foreign_key_constraint(:creator_id)
    |> foreign_key_constraint(:client_id)
    |> foreign_key_constraint(:source_template_id,
      name: :nutrition_plans_source_template_business_id_fkey
    )
    |> check_constraint(:kind, name: :nutrition_plans_kind_check)
    |> check_constraint(:kind, name: :nutrition_plans_kind_fields_check)
    |> check_constraint(:revision, name: :nutrition_plans_revision_check)
    |> check_constraint(:start_date, name: :nutrition_plans_period_check)
    |> check_constraint(:target_calories, name: :nutrition_plans_targets_check)
    |> unique_constraint(:client_id,
      name: :nutrition_plans_one_incomplete_client_plan_index,
      message: "already has an incomplete Client Plan"
    )
  end

  @spec for_business(Ecto.Queryable.t(), String.t()) :: Ecto.Query.t()
  def for_business(query \\ __MODULE__, business_id),
    do: from(plan in query, where: plan.business_id == ^business_id)

  @spec for_kind(Ecto.Queryable.t(), kind()) :: Ecto.Query.t()
  def for_kind(query \\ __MODULE__, kind), do: from(plan in query, where: plan.kind == ^kind)

  @spec templates(Ecto.Queryable.t()) :: Ecto.Query.t()
  def templates(query \\ __MODULE__), do: for_kind(query, :template)

  @spec for_client(Ecto.Queryable.t(), String.t(), String.t()) :: Ecto.Query.t()
  def for_client(query \\ __MODULE__, business_id, client_id),
    do: from(plan in query, where: plan.business_id == ^business_id and plan.client_id == ^client_id)

  @spec for_archived(Ecto.Queryable.t(), boolean() | nil) :: Ecto.Query.t()
  def for_archived(query \\ __MODULE__, archived)
  def for_archived(query, nil), do: query
  def for_archived(query, true), do: from(plan in query, where: not is_nil(plan.archived_at))
  def for_archived(query, false), do: from(plan in query, where: is_nil(plan.archived_at))

  @spec for_search(Ecto.Queryable.t(), String.t()) :: Ecto.Query.t()
  def for_search(query \\ __MODULE__, term)
  def for_search(query, ""), do: query

  def for_search(query, term),
    do: from(plan in query, where: ilike(plan.name, ^Easy.Search.like_pattern(term)))

  @spec covering(Ecto.Queryable.t(), Date.t()) :: Ecto.Query.t()
  def covering(query \\ __MODULE__, date), do: query |> active_in_window(date, date) |> Easy.PlanCoverage.in_force(date)

  @spec active_in_window(Ecto.Queryable.t(), Date.t(), Date.t()) :: Ecto.Query.t()
  def active_in_window(query \\ __MODULE__, from_date, to_date) do
    query
    |> scheduled()
    |> where([plan], plan.start_date <= ^to_date)
    |> where([plan], is_nil(plan.end_date) or plan.end_date >= ^from_date)
  end

  @spec covering_intervals(Ecto.Queryable.t(), String.t()) :: Ecto.Query.t()
  def covering_intervals(query \\ __MODULE__, business_id) do
    query
    |> for_business(business_id)
    |> for_kind(:client_plan)
    |> scheduled()
  end

  defp scheduled(query) do
    query
    |> for_archived(false)
    |> where([plan], not is_nil(plan.start_date))
  end

  @spec newest(Ecto.Queryable.t()) :: Ecto.Query.t()
  def newest(query \\ __MODULE__),
    do: from(plan in query, order_by: [desc: plan.inserted_at, desc: plan.id])

  @spec join_assigned_client_count(Ecto.Queryable.t(), String.t()) :: Ecto.Query.t()
  def join_assigned_client_count(query \\ __MODULE__, business_id) do
    counts =
      from(copy in __MODULE__,
        where:
          copy.business_id == ^business_id and copy.kind == :client_plan and
            not is_nil(copy.source_template_id) and is_nil(copy.archived_at),
        group_by: copy.source_template_id,
        select: %{template_id: copy.source_template_id, plans: count(copy.client_id, :distinct)}
      )

    from(p in query,
      left_join: c in subquery(counts),
      on: c.template_id == p.id,
      select: %{p | assigned_client_count: coalesce(c.plans, 0)}
    )
  end

  @spec for_menu_item(Ecto.Queryable.t(), :food | :recipe, String.t(), map() | nil) :: Ecto.Query.t()
  def for_menu_item(query, kind, id, portion \\ nil) do
    field = if kind == :food, do: :food_id, else: :recipe_id
    item = %{field => id}
    item = if portion, do: Map.put(item, :portion, portion), else: item
    fragment_value = %{meals: [%{meal_items: [item]}]}
    from(plan in query, where: fragment("? @> ?::jsonb", plan.menu, ^fragment_value))
  end

  @spec include_client(Ecto.Queryable.t(), String.t()) :: Ecto.Query.t()
  def include_client(query \\ __MODULE__, business_id) do
    client_query = Client.for_business(Client, business_id) |> preload([:business, :terms])
    from(plan in query, preload: [client: ^client_query])
  end
end
