defmodule Easy.Nutrition.Plan do
  use Ecto.Schema

  alias Easy.Clients.Client
  alias Easy.Identity.User
  alias Easy.Nutrition.{DayPattern, Meal, PlanDay, WeekSchedule}
  alias Easy.Orgs

  import Ecto.Changeset
  import Ecto.Query

  @type t() :: %__MODULE__{}

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  @kinds [:template, :client_plan]
  @lifecycles [:incomplete, :upcoming, :current, :ended, :archived]
  @template_fields [:name, :description, :target_calories, :target_protein_g, :target_carbs_g, :target_fat_g, :target_fiber_g]
  @client_plan_fields [:client_id, :source_template_id, :start_date, :end_date]
  @target_fields [:target_calories, :target_protein_g, :target_carbs_g, :target_fat_g, :target_fiber_g]

  schema "nutrition_plans" do
    field :kind, Ecto.Enum, values: @kinds
    field :name, :string
    field :description, :string
    field :revision, :integer, default: 1
    field :archived_at, :utc_datetime
    field :status, Ecto.Enum, values: [:active, :archived], virtual: true, default: :active
    field :assigned_client_count, :integer, virtual: true, default: 0
    field :target_calories, :float
    field :target_protein_g, :float
    field :target_carbs_g, :float
    field :target_fat_g, :float
    field :target_fiber_g, :float
    field :start_date, :date
    field :end_date, :date

    belongs_to :creator, User, foreign_key: :creator_id
    belongs_to :business, Orgs.Business
    belongs_to :client, Client
    belongs_to :source_template, __MODULE__, foreign_key: :source_template_id
    has_many :day_patterns, DayPattern, foreign_key: :nutrition_plan_id
    has_many :week_schedule, WeekSchedule, foreign_key: :nutrition_plan_id
    has_many :days, PlanDay, foreign_key: :nutrition_plan_id
    has_many :meals, Meal, foreign_key: :nutrition_plan_id

    timestamps(type: :utc_datetime)
  end

  @spec kinds() :: [atom()]
  def kinds, do: @kinds

  @spec statuses() :: [atom()]
  def statuses, do: [:active, :archived]

  @spec lifecycles() :: [atom()]
  def lifecycles, do: @lifecycles

  @spec lifecycle(t(), Date.t()) :: :incomplete | :upcoming | :current | :ended | :archived | nil
  def lifecycle(plan, date \\ Date.utc_today())
  def lifecycle(%__MODULE__{kind: :template}, _date), do: nil
  def lifecycle(%__MODULE__{archived_at: archived_at}, _date) when not is_nil(archived_at), do: :archived
  def lifecycle(%__MODULE__{start_date: nil}, _date), do: :incomplete

  def lifecycle(%__MODULE__{start_date: start_date, end_date: end_date}, date) do
    cond do
      Date.after?(start_date, date) -> :upcoming
      end_date && Date.before?(end_date, date) -> :ended
      true -> :current
    end
  end

  @spec insert_changeset(String.t(), String.t(), map()) :: Ecto.Changeset.t()
  def insert_changeset(business_id, creator_id, attrs) do
    supplied_fields = attrs |> Map.keys() |> Enum.map(&to_string/1) |> MapSet.new()

    %__MODULE__{}
    |> cast(attrs, @template_fields)
    |> put_change(:kind, :template)
    |> put_change(:business_id, business_id)
    |> put_change(:creator_id, creator_id)
    |> put_change(:revision, 1)
    |> reject_template_relationship_fields(supplied_fields)
    |> validate_common_fields()
    |> validate_required([:kind, :business_id, :creator_id, :revision])
    |> apply_constraints()
  end

  @spec insert_changeset(String.t(), String.t(), String.t(), t(), map()) :: Ecto.Changeset.t()
  def insert_changeset(business_id, creator_id, client_id, source_template, attrs) do
    %__MODULE__{}
    |> cast(attrs, [:start_date, :end_date])
    |> put_change(:kind, :client_plan)
    |> put_change(:name, source_template.name)
    |> put_change(:description, source_template.description)
    |> put_change(:target_calories, source_template.target_calories)
    |> put_change(:target_protein_g, source_template.target_protein_g)
    |> put_change(:target_carbs_g, source_template.target_carbs_g)
    |> put_change(:target_fat_g, source_template.target_fat_g)
    |> put_change(:target_fiber_g, source_template.target_fiber_g)
    |> put_change(:business_id, business_id)
    |> put_change(:creator_id, creator_id)
    |> put_change(:client_id, client_id)
    |> put_change(:source_template_id, source_template.id)
    |> put_change(:revision, 1)
    |> validate_common_fields()
    |> validate_required([:kind, :business_id, :creator_id, :client_id, :revision])
    |> validate_date_range()
    |> apply_constraints()
  end

  @spec update_changeset(t(), map()) :: Ecto.Changeset.t()
  def update_changeset(plan, attrs) do
    fields = if plan.kind == :template, do: @template_fields, else: @template_fields ++ [:start_date, :end_date]
    supplied_fields = attrs |> Map.keys() |> Enum.map(&to_string/1) |> MapSet.new()

    plan
    |> cast(attrs, fields)
    |> reject_fields_invalid_for_kind(plan.kind, supplied_fields)
    |> validate_common_fields()
    |> validate_date_range()
    |> apply_constraints()
  end

  @spec lifecycle_changeset(t(), map()) :: Ecto.Changeset.t()
  def lifecycle_changeset(plan, attrs) do
    plan
    |> change(attrs)
    |> apply_constraints()
  end

  defp reject_fields_invalid_for_kind(changeset, :template, supplied_fields) do
    reject_fields(changeset, @client_plan_fields, supplied_fields, "is not valid for a Nutrition Template")
  end

  defp reject_fields_invalid_for_kind(changeset, :client_plan, supplied_fields) do
    reject_fields(
      changeset,
      [:client_id, :source_template_id],
      supplied_fields,
      "cannot be changed on a Client Nutrition Plan"
    )
  end

  defp reject_template_relationship_fields(changeset, supplied_fields) do
    reject_fields(
      changeset,
      @client_plan_fields,
      supplied_fields,
      "is not valid for a Nutrition Template"
    )
  end

  defp reject_fields(changeset, fields, supplied_fields, message) do
    Enum.reduce(fields, changeset, fn field, changeset ->
      if MapSet.member?(supplied_fields, Atom.to_string(field)) do
        add_error(changeset, field, message)
      else
        changeset
      end
    end)
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

  defp apply_constraints(changeset) do
    changeset
    |> foreign_key_constraint(:business_id)
    |> foreign_key_constraint(:creator_id)
    |> foreign_key_constraint(:client_id)
    |> foreign_key_constraint(:source_template_id, name: :nutrition_plans_source_template_business_id_fkey)
    |> check_constraint(:kind, name: :nutrition_plans_kind_check)
    |> check_constraint(:kind, name: :nutrition_plans_kind_fields_check)
    |> check_constraint(:revision, name: :nutrition_plans_revision_check)
    |> check_constraint(:start_date, name: :nutrition_plans_period_check)
    |> check_constraint(:target_calories, name: :nutrition_plans_targets_check)
    |> unique_constraint(:client_id, name: :nutrition_plans_one_incomplete_client_plan_index)
    |> exclusion_constraint(:start_date, name: :nutrition_plans_no_overlapping_coverage)
  end

  @spec validate_date_range(Ecto.Changeset.t()) :: Ecto.Changeset.t()
  def validate_date_range(changeset) do
    start_date = get_field(changeset, :start_date)
    end_date = get_field(changeset, :end_date)

    if start_date && end_date && Date.compare(end_date, start_date) == :lt do
      add_error(changeset, :end_date, "must be after or equal to start date")
    else
      changeset
    end
  end

  @spec for_business(Ecto.Queryable.t(), String.t()) :: Ecto.Query.t()
  def for_business(query \\ __MODULE__, business_id),
    do: from(plan in query, where: plan.business_id == ^business_id)

  @spec for_kind(Ecto.Queryable.t(), atom() | nil) :: Ecto.Query.t()
  def for_kind(query \\ __MODULE__, kind)
  def for_kind(query, nil), do: query
  def for_kind(query, kind), do: from(plan in query, where: plan.kind == ^kind)

  @spec templates(Ecto.Queryable.t()) :: Ecto.Query.t()
  def templates(query \\ __MODULE__), do: for_kind(query, :template)

  @spec for_client(Ecto.Queryable.t(), String.t(), String.t() | nil) :: Ecto.Query.t()
  def for_client(query \\ __MODULE__, business_id, client_id)
  def for_client(query, _business_id, nil), do: query

  def for_client(query, business_id, client_id),
    do: from(plan in query, where: plan.business_id == ^business_id and plan.client_id == ^client_id)

  @spec for_archived(Ecto.Queryable.t(), boolean() | nil) :: Ecto.Query.t()
  def for_archived(query \\ __MODULE__, archived)
  def for_archived(query, nil), do: query
  def for_archived(query, true), do: from(plan in query, where: not is_nil(plan.archived_at))
  def for_archived(query, false), do: from(plan in query, where: is_nil(plan.archived_at))

  @spec for_status(Ecto.Queryable.t(), atom() | nil) :: Ecto.Query.t()
  def for_status(query \\ __MODULE__, status)
  def for_status(query, nil), do: query
  def for_status(query, ""), do: query
  def for_status(query, :active), do: for_archived(query, false)
  def for_status(query, :archived), do: for_archived(query, true)

  @spec for_search(Ecto.Queryable.t(), String.t() | nil) :: Ecto.Query.t()
  def for_search(query \\ __MODULE__, term)
  def for_search(query, nil), do: query
  def for_search(query, ""), do: query

  def for_search(query, term),
    do: from(plan in query, where: ilike(plan.name, ^Easy.Search.like_pattern(term)))

  @spec covering(Ecto.Queryable.t(), String.t(), Date.t()) :: Ecto.Query.t()
  def covering(query \\ __MODULE__, client_id, date) do
    from(plan in query,
      where: plan.kind == :client_plan,
      where: plan.client_id == ^client_id,
      where: is_nil(plan.archived_at),
      where: not is_nil(plan.start_date) and plan.start_date <= ^date,
      where: is_nil(plan.end_date) or plan.end_date >= ^date
    )
  end

  @spec active_for_client(Ecto.Queryable.t(), String.t(), Date.t()) :: Ecto.Query.t()
  def active_for_client(query \\ __MODULE__, client_id, date), do: covering(query, client_id, date)

  @spec active_for_clients(Ecto.Queryable.t(), String.t(), [String.t()], Date.t()) :: Ecto.Query.t()
  def active_for_clients(query \\ __MODULE__, business_id, client_ids, date) do
    from(plan in query,
      where: plan.business_id == ^business_id,
      where: plan.kind == :client_plan,
      where: plan.client_id in ^client_ids,
      where: is_nil(plan.archived_at),
      where: not is_nil(plan.start_date) and plan.start_date <= ^date,
      where: is_nil(plan.end_date) or plan.end_date >= ^date
    )
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
        select: %{template_id: copy.source_template_id, clients: count(copy.client_id, :distinct)}
      )

    from(p in query,
      left_join: c in subquery(counts),
      on: c.template_id == p.id,
      select: %{p | assigned_client_count: coalesce(c.clients, 0)}
    )
  end

  @spec include_menu(Ecto.Queryable.t(), String.t()) :: Ecto.Query.t()
  def include_menu(query \\ __MODULE__, business_id) do
    pattern_query =
      DayPattern
      |> DayPattern.for_business(business_id)
      |> DayPattern.by_position()

    schedule_query =
      WeekSchedule
      |> WeekSchedule.for_business(business_id)
      |> WeekSchedule.by_weekday()

    from(plan in query,
      preload: [day_patterns: ^pattern_query, week_schedule: ^schedule_query]
    )
  end

  @spec include_client(Ecto.Queryable.t(), String.t()) :: Ecto.Query.t()
  def include_client(query \\ __MODULE__, business_id) do
    client_query = Client.for_business(Client, business_id)
    from(plan in query, preload: [client: ^client_query])
  end
end
