defmodule Easy.Training.TrainingPlan do
  use Ecto.Schema

  alias Easy.Clients.Client
  alias Easy.Identity.User
  alias Easy.Orgs
  alias Easy.Training.{TrainingWorkout, WorkoutSchedule}

  import Ecto.Changeset
  import Ecto.Query

  @type t() :: %__MODULE__{}
  @type kind :: :template | :client_plan
  @type status :: :active | :archived
  @type lifecycle :: :incomplete | :upcoming | :current | :ended | :archived

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  @kinds [:template, :client_plan]
  @lifecycles [:incomplete, :upcoming, :current, :ended, :archived]
  @template_fields [:name, :description]
  @client_plan_fields [:client_id, :source_template_id, :start_date, :end_date]

  schema "training_plans" do
    field :kind, Ecto.Enum, values: @kinds
    field :name, :string
    field :description, :string
    field :revision, :integer, default: 1
    field :archived_at, :utc_datetime
    field :status, Ecto.Enum, values: [:active, :archived], virtual: true, default: :active
    field :lifecycle, Ecto.Enum, values: @lifecycles, virtual: true
    field :start_date, :date
    field :end_date, :date

    belongs_to :creator, User, foreign_key: :creator_id
    belongs_to :business, Orgs.Business
    belongs_to :client, Client
    belongs_to :source_template, __MODULE__, foreign_key: :source_template_id
    has_many :workouts, TrainingWorkout, foreign_key: :training_plan_id
    has_many :workout_schedule, WorkoutSchedule, foreign_key: :training_plan_id

    timestamps(type: :utc_datetime)
  end

  @spec kinds() :: [kind()]
  def kinds, do: @kinds

  @spec statuses() :: [status()]
  def statuses, do: [:active, :archived]

  @spec lifecycles() :: [lifecycle()]
  def lifecycles, do: @lifecycles

  @spec lifecycle(t(), Date.t()) :: lifecycle() | nil
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
    %__MODULE__{}
    |> cast(attrs, @template_fields)
    |> put_change(:kind, :template)
    |> put_change(:business_id, business_id)
    |> put_change(:creator_id, creator_id)
    |> put_change(:revision, 1)
    |> reject_fields_invalid_for_kind(:template)
    |> validate_common_fields()
    |> validate_required([:kind, :business_id, :creator_id, :revision])
    |> apply_constraints()
  end

  @spec insert_changeset(String.t(), String.t(), String.t(), t(), map()) ::
          Ecto.Changeset.t()
  def insert_changeset(business_id, creator_id, client_id, source_template, attrs) do
    %__MODULE__{}
    |> cast(attrs, [:start_date, :end_date])
    |> put_change(:kind, :client_plan)
    |> put_change(:name, source_template.name)
    |> put_change(:description, source_template.description)
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

    plan
    |> cast(attrs, fields)
    |> put_change(:revision, plan.revision + 1)
    |> reject_fields_invalid_for_kind(plan.kind)
    |> validate_common_fields()
    |> validate_date_range()
    |> apply_constraints()
  end

  @spec revision_changeset(t()) :: Ecto.Changeset.t()
  def revision_changeset(plan) do
    plan
    |> change(revision: plan.revision + 1)
    |> apply_constraints()
  end

  @spec lifecycle_changeset(t(), DateTime.t() | nil) :: Ecto.Changeset.t()
  def lifecycle_changeset(plan, archived_at) do
    plan
    |> revision_changeset()
    |> put_change(:archived_at, archived_at)
  end

  defp reject_fields_invalid_for_kind(changeset, :template) do
    reject_fields(changeset, @client_plan_fields, "is not valid for a Training Template")
  end

  defp reject_fields_invalid_for_kind(changeset, :client_plan) do
    reject_fields(changeset, [:client_id, :source_template_id], "cannot be changed on a Client Plan")
  end

  defp reject_fields(changeset, fields, message) do
    Enum.reduce(fields, changeset, fn field, changeset ->
      if Map.has_key?(changeset.params, Atom.to_string(field)) do
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
  end

  defp apply_constraints(changeset) do
    changeset
    |> foreign_key_constraint(:business_id)
    |> foreign_key_constraint(:creator_id)
    |> foreign_key_constraint(:client_id)
    |> foreign_key_constraint(:source_template_id,
      name: :training_plans_source_template_business_id_fkey
    )
    |> check_constraint(:kind, name: :training_plans_kind_check)
    |> check_constraint(:kind, name: :training_plans_kind_fields_check)
    |> check_constraint(:revision, name: :training_plans_revision_check)
    |> check_constraint(:start_date, name: :training_plans_period_check)
    |> unique_constraint(:client_id, name: :training_plans_one_incomplete_client_plan_index)
    |> exclusion_constraint(:start_date, name: :training_plans_no_overlapping_coverage)
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

  @spec for_kind(Ecto.Queryable.t(), kind() | nil) :: Ecto.Query.t()
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

  @spec for_status(Ecto.Queryable.t(), status() | String.t() | nil) :: Ecto.Query.t()
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
    |> scheduled()
  end

  defp scheduled(query) do
    query
    |> for_kind(:client_plan)
    |> for_archived(false)
    |> where([plan], not is_nil(plan.start_date))
  end

  @spec covering(Ecto.Queryable.t(), String.t(), Date.t()) :: Ecto.Query.t()
  def covering(query \\ __MODULE__, client_id, date) do
    query
    |> active_in_window(date, date)
    |> where([plan], plan.client_id == ^client_id)
  end

  @spec active_for_client(Ecto.Queryable.t(), String.t(), Date.t()) :: Ecto.Query.t()
  def active_for_client(query \\ __MODULE__, client_id, date), do: covering(query, client_id, date)

  @spec active_for_clients(Ecto.Queryable.t(), String.t(), [String.t()], Date.t()) :: Ecto.Query.t()
  def active_for_clients(query \\ __MODULE__, business_id, client_ids, date) do
    query
    |> for_business(business_id)
    |> active_in_window(date, date)
    |> where([plan], plan.client_id in ^client_ids)
  end

  @spec newest(Ecto.Queryable.t()) :: Ecto.Query.t()
  def newest(query \\ __MODULE__),
    do: from(plan in query, order_by: [desc: plan.inserted_at, desc: plan.id])

  @spec include_workouts(Ecto.Queryable.t(), String.t()) :: Ecto.Query.t()
  def include_workouts(query \\ __MODULE__, business_id) do
    workout_query =
      TrainingWorkout
      |> TrainingWorkout.for_business(business_id)
      |> TrainingWorkout.by_position()
      |> TrainingWorkout.include_prescribed_exercises(business_id)

    schedule_query =
      WorkoutSchedule
      |> WorkoutSchedule.for_business(business_id)
      |> WorkoutSchedule.by_weekday()

    from(plan in query,
      preload: [workouts: ^workout_query, workout_schedule: ^schedule_query]
    )
  end

  @spec include_client(Ecto.Queryable.t(), String.t()) :: Ecto.Query.t()
  def include_client(query \\ __MODULE__, business_id) do
    client_query = Client.for_business(Client, business_id)
    from(plan in query, preload: [client: ^client_query])
  end
end
