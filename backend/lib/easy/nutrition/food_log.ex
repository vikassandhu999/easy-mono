defmodule Easy.Nutrition.FoodLog do
  use Ecto.Schema

  alias Easy.Clients.Client
  alias Easy.Nutrition.Food
  alias Easy.Nutrition.Meal
  alias Easy.Nutrition.MealItem
  alias Easy.Nutrition.Plan
  alias Easy.Nutrition.PlanItem
  alias Easy.Nutrition.Recipe
  alias Easy.Orgs
  alias Easy.Repo

  import Ecto.Changeset
  import Ecto.Query

  @type t() :: %__MODULE__{}

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  @spec meal_slots() :: [String.t()]
  def meal_slots, do: PlanItem.meal_types()

  schema "food_logs" do
    field :date, :date
    field :meal_slot, :string
    field :amount, :float
    field :unit, :string
    field :weight_g, :float
    field :notes, :string
    field :macros_snapshot, :map
    field :food_name_snapshot, :string

    belongs_to :client, Client
    belongs_to :business, Orgs.Business
    belongs_to :food, Food
    belongs_to :recipe, Recipe
    belongs_to :meal_item, MealItem

    timestamps(type: :utc_datetime)
  end

  @cast_fields [
    :date,
    :meal_slot,
    :amount,
    :unit,
    :weight_g,
    :notes,
    :food_id,
    :recipe_id,
    :meal_item_id
  ]
  @internal_fields @cast_fields ++ [:macros_snapshot, :food_name_snapshot]

  # Changesets

  @spec insert_changeset(String.t(), String.t(), map()) :: Ecto.Changeset.t()
  def insert_changeset(business_id, client_id, attrs) do
    %__MODULE__{}
    |> cast(attrs, @cast_fields)
    |> put_change(:business_id, business_id)
    |> put_change(:client_id, client_id)
    |> validate_required([:date, :meal_slot, :business_id, :client_id])
    |> validate_inclusion(:meal_slot, PlanItem.meal_types())
    |> validate_food_or_recipe()
  end

  @spec bulk_insert_changeset(String.t(), String.t(), map()) :: Ecto.Changeset.t()
  def bulk_insert_changeset(business_id, client_id, attrs) do
    %__MODULE__{}
    |> cast(attrs, @internal_fields)
    |> put_change(:business_id, business_id)
    |> put_change(:client_id, client_id)
    |> validate_required([:date, :meal_slot, :business_id, :client_id])
    |> validate_inclusion(:meal_slot, PlanItem.meal_types())
    |> validate_food_or_recipe()
  end

  @spec update_changeset(t(), map()) :: Ecto.Changeset.t()
  def update_changeset(food_log, attrs) do
    food_log
    |> cast(attrs, [:amount, :unit, :weight_g, :notes])
  end

  defp validate_food_or_recipe(changeset) do
    food_id = get_field(changeset, :food_id)
    recipe_id = get_field(changeset, :recipe_id)

    cond do
      is_nil(food_id) and is_nil(recipe_id) ->
        add_error(changeset, :food_id, "either food_id or recipe_id must be present")

      not is_nil(food_id) and not is_nil(recipe_id) ->
        add_error(changeset, :recipe_id, "cannot set both food_id and recipe_id")

      true ->
        changeset
    end
  end

  defp resolve_snapshots(changeset, business_id) do
    food_id = get_field(changeset, :food_id)
    recipe_id = get_field(changeset, :recipe_id)

    cond do
      not is_nil(food_id) ->
        case Food |> Food.for_business_or_system(business_id) |> Repo.get(food_id) do
          nil -> add_error(changeset, :food_id, "food not found")
          food -> put_snapshots(changeset, food.name, food.macros)
        end

      not is_nil(recipe_id) ->
        case Recipe |> Recipe.for_business(business_id) |> Repo.get(recipe_id) do
          nil -> add_error(changeset, :recipe_id, "recipe not found")
          recipe -> put_snapshots(changeset, recipe.name, recipe.macros)
        end

      true ->
        changeset
    end
  end

  defp put_snapshots(changeset, name, macros) do
    changeset
    |> put_change(:macros_snapshot, macros)
    |> put_change(:food_name_snapshot, name)
  end

  # Queries

  @spec for_client(Ecto.Queryable.t(), String.t()) :: Ecto.Query.t()
  def for_client(query \\ __MODULE__, client_id) do
    from(fl in query, where: fl.client_id == ^client_id)
  end

  @spec for_business(Ecto.Queryable.t(), String.t()) :: Ecto.Query.t()
  def for_business(query \\ __MODULE__, business_id) do
    from(fl in query, where: fl.business_id == ^business_id)
  end

  @spec for_date(Ecto.Queryable.t(), Date.t()) :: Ecto.Query.t()
  def for_date(query \\ __MODULE__, date) do
    from(fl in query, where: fl.date == ^date)
  end

  @spec for_date_range(Ecto.Queryable.t(), Date.t(), Date.t()) :: Ecto.Query.t()
  def for_date_range(query \\ __MODULE__, from_date, to_date) do
    from(fl in query, where: fl.date >= ^from_date and fl.date <= ^to_date)
  end

  @spec for_meal_slot(Ecto.Queryable.t(), String.t() | nil) :: Ecto.Query.t()
  def for_meal_slot(query \\ __MODULE__, meal_slot)
  def for_meal_slot(query, nil), do: query

  def for_meal_slot(query, meal_slot) do
    from(fl in query, where: fl.meal_slot == ^meal_slot)
  end

  @spec ordered(Ecto.Queryable.t()) :: Ecto.Query.t()
  def ordered(query \\ __MODULE__) do
    from(fl in query, order_by: [asc: fl.date, asc: fl.meal_slot, asc: fl.inserted_at])
  end

  @spec with_food(Ecto.Queryable.t()) :: Ecto.Query.t()
  def with_food(query \\ __MODULE__) do
    from(fl in query, preload: [:food])
  end

  @spec with_recipe(Ecto.Queryable.t()) :: Ecto.Query.t()
  def with_recipe(query \\ __MODULE__) do
    from(fl in query, preload: [:recipe])
  end

  @spec with_associations(Ecto.Queryable.t()) :: Ecto.Query.t()
  def with_associations(query \\ __MODULE__) do
    from(fl in query, preload: [:food, :recipe])
  end

  # Actions

  @spec create(String.t(), String.t(), map()) :: {:ok, t()} | {:error, Ecto.Changeset.t()}
  def create(business_id, client_id, attrs) do
    changeset = insert_changeset(business_id, client_id, attrs)

    if changeset.valid? do
      changeset
      |> resolve_snapshots(business_id)
      |> Repo.insert()
    else
      {:error, %{changeset | action: :insert}}
    end
  end

  @spec update(t(), map()) :: {:ok, t()} | {:error, Ecto.Changeset.t()}
  def update(food_log, attrs) do
    update_changeset(food_log, attrs)
    |> Repo.update()
  end

  @spec delete(t()) :: {:ok, t()} | {:error, Ecto.Changeset.t()}
  def delete(food_log) do
    Repo.delete(food_log)
  end

  @spec log_meal(String.t(), String.t(), Date.t(), String.t(), String.t()) ::
          {:ok, [t()]} | {:error, any()}
  def log_meal(business_id, client_id, date, meal_slot, meal_id) do
    case Repo.transaction(fn ->
           do_log_meal(business_id, client_id, date, meal_slot, meal_id)
         end) do
      {:ok, logs} -> {:ok, Repo.preload(logs, [:food, :recipe])}
      error -> error
    end
  end

  @spec log_day(String.t(), String.t(), Date.t(), String.t()) ::
          {:ok, [t()]} | {:error, any()}
  def log_day(business_id, client_id, date, plan_id) do
    plan =
      Plan
      |> Plan.for_business(business_id)
      |> Plan.for_client(client_id)
      |> Repo.get(plan_id)

    case plan do
      nil ->
        {:error, :not_found}

      _ ->
        day = Easy.Utils.weekday_name(date)

        plan_items =
          PlanItem
          |> PlanItem.for_plan(plan_id)
          |> PlanItem.for_business(business_id)
          |> PlanItem.for_day(day)
          |> Repo.all()

        case Repo.transaction(fn ->
               Enum.flat_map(plan_items, fn plan_item ->
                 do_log_meal(business_id, client_id, date, plan_item.meal_type, plan_item.meal_id)
               end)
             end) do
          {:ok, logs} -> {:ok, Repo.preload(logs, [:food, :recipe])}
          error -> error
        end
    end
  end

  # Internal (no transaction wrapper — called inside an existing transaction)

  defp do_log_meal(business_id, client_id, date, meal_slot, meal_id) do
    meal =
      Meal
      |> Meal.for_business(business_id)
      |> Repo.get(meal_id)

    case meal do
      nil ->
        Repo.rollback(:not_found)

      %{plan_id: plan_id} ->
        plan_belongs_to_client =
          Plan
          |> Plan.for_business(business_id)
          |> Plan.for_client(client_id)
          |> Repo.get(plan_id)

        if is_nil(plan_belongs_to_client), do: Repo.rollback(:not_found)

        items =
          MealItem
          |> MealItem.for_meal(meal_id)
          |> MealItem.for_business(business_id)
          |> MealItem.ordered()
          |> MealItem.with_food_and_recipe()
          |> Repo.all()

        already_logged =
          __MODULE__
          |> for_business(business_id)
          |> for_client(client_id)
          |> for_date(date)
          |> for_meal_slot(meal_slot)
          |> where([fl], not is_nil(fl.meal_item_id))
          |> select([fl], fl.meal_item_id)
          |> Repo.all()
          |> MapSet.new()

        Enum.reduce(items, [], fn item, acc ->
          if MapSet.member?(already_logged, item.id) do
            acc
          else
            attrs = build_attrs_from_meal_item(item, date, meal_slot)

            case bulk_insert_changeset(business_id, client_id, attrs) |> Repo.insert() do
              {:ok, log} -> [log | acc]
              {:error, reason} -> Repo.rollback(reason)
            end
          end
        end)
        |> Enum.reverse()
    end
  end

  defp build_attrs_from_meal_item(item, date, meal_slot) do
    {food_name, macros} = resolve_snapshot(item)

    %{
      "date" => date,
      "meal_slot" => meal_slot,
      "food_id" => item.food_id,
      "recipe_id" => item.recipe_id,
      "meal_item_id" => item.id,
      "amount" => item.amount,
      "unit" => item.unit,
      "weight_g" => item.weight_g,
      "macros_snapshot" => macros,
      "food_name_snapshot" => food_name
    }
  end

  defp resolve_snapshot(%MealItem{} = item) do
    case {item.food, item.recipe} do
      {%Food{} = f, _} -> {f.name, f.macros}
      {_, %Recipe{} = r} -> {r.name, r.macros}
      _ -> {nil, nil}
    end
  end
end
