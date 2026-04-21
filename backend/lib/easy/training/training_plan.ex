defmodule Easy.Training.TrainingPlan do
  use Ecto.Schema

  alias Easy.Clients
  alias Easy.Orgs
  alias Easy.Repo
  alias Easy.Training.{PlanItem, Workout, WorkoutElement}

  import Ecto.Changeset
  import Ecto.Query

  @type t() :: %__MODULE__{}

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  @statuses [:active, :archived]

  @valid_days ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]

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
    belongs_to :client, Clients.Client
    belongs_to :original_template, __MODULE__

    has_many :workouts, Workout, preload_order: [asc: :name]
    has_many :plan_items, PlanItem

    timestamps(type: :utc_datetime_usec)
  end

  @cast_fields [
    :name,
    :description,
    :status,
    :client_id,
    :start_date,
    :end_date,
    :rest_days,
    :original_template_id
  ]

  @spec insert_changeset(String.t(), String.t(), map()) :: Ecto.Changeset.t()
  def insert_changeset(business_id, author_id, attrs) do
    %__MODULE__{}
    |> cast(attrs, @cast_fields)
    |> put_change(:business_id, business_id)
    |> put_change(:author_id, author_id)
    |> validate_required([:name, :business_id, :author_id])
    |> validate_length(:name, max: 255)
    |> validate_length(:description, max: 5000)
    |> validate_date_range()
    |> validate_rest_days()
    |> check_constraint(:start_date,
      name: :valid_date_range,
      message: "end date must be after start date"
    )
    |> check_constraint(:start_date,
      name: :assigned_plans_have_dates,
      message: "assigned plans must have start and end dates"
    )
    |> foreign_key_constraint(:business_id)
    |> foreign_key_constraint(:author_id)
    |> foreign_key_constraint(:client_id)
    |> foreign_key_constraint(:original_template_id)
  end

  @spec update_changeset(t(), map()) :: Ecto.Changeset.t()
  def update_changeset(plan, attrs) do
    plan
    |> cast(attrs, @cast_fields)
    |> validate_length(:name, max: 255)
    |> validate_length(:description, max: 5000)
    |> validate_date_range()
    |> validate_rest_days()
    |> foreign_key_constraint(:client_id)
    |> foreign_key_constraint(:original_template_id)
  end

  defp validate_date_range(changeset) do
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
    validate_change(changeset, :rest_days, fn :rest_days, days ->
      cond do
        not Enum.all?(days, &(&1 in @valid_days)) ->
          [rest_days: "must contain valid day names"]

        length(days) != length(Enum.uniq(days)) ->
          [rest_days: "must not contain duplicates"]

        true ->
          []
      end
    end)
  end

  @spec for_business(Ecto.Queryable.t(), String.t()) :: Ecto.Query.t()
  def for_business(query \\ __MODULE__, business_id) do
    from(t in query, where: t.business_id == ^business_id)
  end

  @spec for_client(Ecto.Queryable.t(), String.t()) :: Ecto.Query.t()
  def for_client(query \\ __MODULE__, client_id) do
    from(t in query, where: t.client_id == ^client_id)
  end

  @spec templates(Ecto.Queryable.t()) :: Ecto.Query.t()
  def templates(query \\ __MODULE__) do
    from(t in query, where: is_nil(t.client_id))
  end

  @spec with_status(Ecto.Queryable.t(), atom() | nil) :: Ecto.Query.t()
  def with_status(query \\ __MODULE__, status)
  def with_status(query, nil), do: query
  def with_status(query, status), do: from(t in query, where: t.status == ^status)

  @spec search(Ecto.Queryable.t(), String.t() | nil) :: Ecto.Query.t()
  def search(query \\ __MODULE__, term)
  def search(query, nil), do: query
  def search(query, ""), do: query
  def search(query, term), do: from(t in query, where: ilike(t.name, ^"%#{term}%"))

  @spec newest(Ecto.Queryable.t()) :: Ecto.Query.t()
  def newest(query \\ __MODULE__) do
    from(t in query, order_by: [desc: t.inserted_at])
  end

  @spec with_workouts(Ecto.Queryable.t()) :: Ecto.Query.t()
  def with_workouts(query \\ __MODULE__) do
    workout_query = Workout |> Workout.ordered() |> Workout.with_elements()
    from(t in query, preload: [workouts: ^workout_query])
  end

  @spec with_plan_items(Ecto.Queryable.t()) :: Ecto.Query.t()
  def with_plan_items(query \\ __MODULE__) do
    from(t in query, preload: [:plan_items])
  end

  @spec accessible?(String.t(), String.t()) :: boolean()
  def accessible?(business_id, plan_id) do
    __MODULE__
    |> for_business(business_id)
    |> Repo.get(plan_id)
    |> is_struct(__MODULE__)
  end

  @spec create(String.t(), String.t(), map()) :: {:ok, t()} | {:error, Ecto.Changeset.t()}
  def create(business_id, author_id, attrs) do
    insert_changeset(business_id, author_id, attrs)
    |> Repo.insert()
  end

  @spec update(t(), map()) :: {:ok, t()} | {:error, Ecto.Changeset.t()}
  def update(plan, attrs) do
    update_changeset(plan, attrs)
    |> Repo.update()
  end

  @spec delete(t()) :: {:ok, t()} | {:error, Ecto.Changeset.t()}
  def delete(plan), do: Repo.delete(plan)

  @spec duplicate(t()) :: {:ok, t()} | {:error, Ecto.Changeset.t()}
  def duplicate(plan) do
    copy_name = generate_copy_name(plan.name, plan.business_id)
    plan = Repo.preload(plan, workouts: [:workout_elements], plan_items: [])

    Repo.transaction(fn ->
      attrs = %{
        name: copy_name,
        description: plan.description,
        rest_days: plan.rest_days,
        original_template_id: plan.id
      }

      case insert_changeset(plan.business_id, plan.author_id, attrs) |> Repo.insert() do
        {:ok, new_plan} ->
          workout_id_map = copy_workouts(plan.workouts, new_plan)
          copy_plan_items(plan.plan_items, new_plan, workout_id_map)

          new_plan
          |> Repo.preload(
            workouts: Workout.with_elements(),
            plan_items: []
          )

        {:error, reason} ->
          Repo.rollback(reason)
      end
    end)
  end

  @spec assign_to_client(t(), String.t(), String.t() | nil, String.t() | nil) ::
          {:ok, t()} | {:error, Ecto.Changeset.t()}
  def assign_to_client(plan, client_id, start_date, end_date) do
    plan = Repo.preload(plan, workouts: [:workout_elements], plan_items: [])

    Repo.transaction(fn ->
      attrs = %{
        name: plan.name,
        description: plan.description,
        rest_days: plan.rest_days,
        client_id: client_id,
        start_date: start_date,
        end_date: end_date,
        original_template_id: plan.id
      }

      case insert_changeset(plan.business_id, plan.author_id, attrs) |> Repo.insert() do
        {:ok, new_plan} ->
          workout_id_map = copy_workouts(plan.workouts, new_plan)
          copy_plan_items(plan.plan_items, new_plan, workout_id_map)

          new_plan
          |> Repo.preload(
            workouts: Workout.with_elements(),
            plan_items: []
          )

        {:error, reason} ->
          Repo.rollback(reason)
      end
    end)
  end

  defp copy_workouts(workouts, new_plan) do
    Enum.reduce(workouts, %{}, fn workout, id_map ->
      workout_attrs = %{name: workout.name, notes: workout.notes}

      new_workout =
        case Workout.insert_changeset(new_plan.id, new_plan.business_id, workout_attrs)
             |> Repo.insert() do
          {:ok, w} -> w
          {:error, reason} -> Repo.rollback(reason)
        end

      Enum.each(workout.workout_elements, fn element ->
        element_attrs = %{
          position: element.position,
          superset_group_id: element.superset_group_id,
          notes: element.notes,
          exercise_id: element.exercise_id,
          planned_sets: copy_sets(element.planned_sets)
        }

        case WorkoutElement.insert_changeset(new_workout.id, new_plan.business_id, element_attrs)
             |> Repo.insert() do
          {:ok, _} -> :ok
          {:error, reason} -> Repo.rollback(reason)
        end
      end)

      Map.put(id_map, workout.id, new_workout.id)
    end)
  end

  defp copy_plan_items(plan_items, new_plan, workout_id_map) do
    Enum.each(plan_items, fn item ->
      new_workout_id = Map.get(workout_id_map, item.workout_id, item.workout_id)

      attrs = %{
        "day" => item.day,
        "workout_type" => item.workout_type,
        "workout_id" => new_workout_id
      }

      case PlanItem.insert_changeset(new_plan.id, new_plan.business_id, item.creator_id, attrs)
           |> Repo.insert() do
        {:ok, _} -> :ok
        {:error, reason} -> Repo.rollback(reason)
      end
    end)
  end

  defp copy_sets(sets) when is_list(sets) do
    Enum.map(sets, fn set ->
      %{
        target_reps: set.target_reps,
        load_value: set.load_value,
        load_unit: set.load_unit,
        intensity_target: set.intensity_target,
        tempo: set.tempo,
        rest_seconds: set.rest_seconds,
        duration_seconds: set.duration_seconds,
        distance_value: set.distance_value,
        distance_unit: set.distance_unit,
        set_type: set.set_type,
        notes: set.notes
      }
    end)
  end

  defp copy_sets(_), do: []

  defp generate_copy_name(original_name, business_id) do
    base_name = String.replace(original_name, ~r/\s*\(Copy\s*\d*\)\s*$/, "") |> String.trim()

    existing_names =
      __MODULE__
      |> for_business(business_id)
      |> where([t], t.name == ^base_name or like(t.name, ^"#{base_name} (Copy%)"))
      |> select([t], t.name)
      |> Repo.all()
      |> MapSet.new()

    find_available_name(base_name, existing_names, 1)
  end

  defp find_available_name(base_name, existing_names, attempt) when attempt <= 100 do
    candidate = if attempt == 1, do: "#{base_name} (Copy)", else: "#{base_name} (Copy #{attempt})"

    if MapSet.member?(existing_names, candidate) do
      find_available_name(base_name, existing_names, attempt + 1)
    else
      candidate
    end
  end

  defp find_available_name(base_name, _existing_names, _attempt) do
    "#{base_name} (Copy #{System.system_time(:second)})"
  end
end
