defmodule Easy.Training.TrainingPlan do
  use Ecto.Schema

  alias Easy.Clients.Client
  alias Easy.Orgs
  alias Easy.Training.{PlanItem, Workout}

  import Ecto.Changeset
  import Ecto.Query

  @type t() :: %__MODULE__{}

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  @statuses [:active, :archived]
  @rest_days ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]
  @trusted_fields [:business_id, :author_id, :client_id, :original_template_id]

  @cast_fields [
    :name,
    :description,
    :status,
    :start_date,
    :end_date,
    :rest_days
  ]

  @spec statuses() :: [atom()]
  def statuses, do: @statuses

  schema "training_plans" do
    field :name, :string
    field :description, :string
    field :status, Ecto.Enum, values: @statuses, default: :active
    field :start_date, :date
    field :end_date, :date
    field :rest_days, {:array, :string}, default: []

    belongs_to :business, Orgs.Business
    belongs_to :author, Orgs.Coach
    belongs_to :client, Client
    belongs_to :original_template, __MODULE__

    has_many :workouts, Workout, preload_order: [asc: :name]
    has_many :plan_items, PlanItem

    timestamps(type: :utc_datetime_usec)
  end

  @spec create_changeset(String.t(), String.t(), map()) :: Ecto.Changeset.t()
  def create_changeset(business_id, author_id, attrs) do
    %__MODULE__{}
    |> cast(attrs, @cast_fields)
    |> put_change(:business_id, business_id)
    |> put_change(:author_id, author_id)
    |> reject_trusted_fields(attrs)
    |> validate_fields()
    |> constrain_relationships()
  end

  @spec update_changeset(t(), map()) :: Ecto.Changeset.t()
  def update_changeset(plan, attrs) do
    plan
    |> cast(attrs, @cast_fields)
    |> reject_trusted_fields(attrs)
    |> validate_fields()
    |> constrain_relationships()
  end

  defp reject_trusted_fields(changeset, attrs) do
    Enum.reduce(@trusted_fields, changeset, fn field, changeset ->
      if Map.has_key?(attrs, field) || Map.has_key?(attrs, Atom.to_string(field)) do
        add_error(changeset, field, "cannot be set directly")
      else
        changeset
      end
    end)
  end

  defp validate_fields(changeset) do
    changeset
    |> validate_required([:name, :rest_days])
    |> validate_length(:name, max: 255)
    |> validate_length(:description, max: 5000)
    |> validate_assigned_dates()
    |> validate_rest_days()
    |> check_constraint(:start_date,
      name: :valid_date_range,
      message: "end date must be after start date"
    )
    |> check_constraint(:start_date,
      name: :assigned_plans_have_dates,
      message: "assigned plans must have start and end dates"
    )
  end

  defp constrain_relationships(changeset) do
    changeset
    |> foreign_key_constraint(:business_id)
    |> foreign_key_constraint(:author_id)
    |> foreign_key_constraint(:client_id)
    |> foreign_key_constraint(:original_template_id)
  end

  defp validate_assigned_dates(changeset) do
    start_date = get_field(changeset, :start_date)
    end_date = get_field(changeset, :end_date)
    client_id = get_field(changeset, :client_id)

    cond do
      is_nil(client_id) ->
        changeset

      is_nil(start_date) || is_nil(end_date) ->
        changeset
        |> add_error(:start_date, "assigned plan must have a start date")
        |> add_error(:end_date, "assigned plan must have an end date")

      Date.compare(end_date, start_date) == :lt ->
        add_error(changeset, :end_date, "must be after or equal to start date")

      true ->
        changeset
    end
  end

  defp validate_rest_days(changeset) do
    validate_change(changeset, :rest_days, fn
      :rest_days, days when is_list(days) ->
        cond do
          not Enum.all?(days, &(&1 in @rest_days)) ->
            [rest_days: "must contain valid day names"]

          length(days) != length(Enum.uniq(days)) ->
            [rest_days: "must not contain duplicates"]

          true ->
            []
        end

      :rest_days, _days ->
        [rest_days: "must be a list"]
    end)
  end

  @spec for_business(Ecto.Queryable.t(), String.t()) :: Ecto.Query.t()
  def for_business(query \\ __MODULE__, business_id) do
    from(t in query, where: t.business_id == ^business_id)
  end

  @spec for_client(Ecto.Queryable.t(), String.t() | nil) :: Ecto.Query.t()
  def for_client(query \\ __MODULE__, client_id)
  def for_client(query, nil), do: query
  def for_client(query, client_id), do: from(t in query, where: t.client_id == ^client_id)

  @spec templates(Ecto.Queryable.t()) :: Ecto.Query.t()
  def templates(query \\ __MODULE__) do
    from(t in query, where: is_nil(t.client_id))
  end

  @spec with_status(Ecto.Queryable.t(), atom() | nil) :: Ecto.Query.t()
  def with_status(query \\ __MODULE__, status)
  def with_status(query, nil), do: query
  def with_status(query, status), do: from(t in query, where: t.status == ^status)

  @spec for_search(Ecto.Queryable.t(), String.t() | nil) :: Ecto.Query.t()
  def for_search(query \\ __MODULE__, term)
  def for_search(query, nil), do: query
  def for_search(query, ""), do: query
  def for_search(query, term), do: from(t in query, where: ilike(t.name, ^"%#{term}%"))

  @spec newest(Ecto.Queryable.t()) :: Ecto.Query.t()
  def newest(query \\ __MODULE__) do
    from(t in query, order_by: [desc: t.inserted_at, desc: t.id])
  end

  @spec with_workouts(Ecto.Queryable.t(), String.t()) :: Ecto.Query.t()
  def with_workouts(query, business_id) do
    workout_query =
      Workout
      |> Workout.for_business(business_id)
      |> Workout.ordered()
      |> Workout.with_elements(business_id)

    from(t in query, preload: [workouts: ^workout_query])
  end

  @spec with_plan_items(Ecto.Queryable.t(), String.t()) :: Ecto.Query.t()
  def with_plan_items(query, business_id) do
    item_query = PlanItem |> PlanItem.for_business(business_id)
    from(t in query, preload: [plan_items: ^item_query])
  end
end
