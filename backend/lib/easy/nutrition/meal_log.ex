defmodule Easy.Nutrition.MealLog do
  use Ecto.Schema

  alias Easy.Clients.Client
  alias Easy.Nutrition.Food
  alias Easy.Nutrition.FoodLogEntry
  alias Easy.Nutrition.MacroCalc
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

  schema "meal_logs" do
    field :date, :date
    field :meal_slot, :string
    field :planned_snapshot, :map
    field :planned_calories, :float
    field :logged_calories, :float, default: 0.0

    belongs_to :client, Client
    belongs_to :business, Orgs.Business

    has_many :food_log_entries, FoodLogEntry

    timestamps(type: :utc_datetime)
  end

  # Changesets

  @spec insert_changeset(String.t(), String.t(), map()) :: Ecto.Changeset.t()
  def insert_changeset(business_id, client_id, attrs) do
    %__MODULE__{}
    |> cast(attrs, [:date, :meal_slot])
    |> put_change(:business_id, business_id)
    |> put_change(:client_id, client_id)
    |> validate_required([:date, :meal_slot, :business_id, :client_id])
    |> validate_inclusion(:meal_slot, PlanItem.meal_types())
    |> unique_constraint([:client_id, :date, :meal_slot])
  end

  # Queries

  @spec for_client(Ecto.Queryable.t(), String.t()) :: Ecto.Query.t()
  def for_client(query \\ __MODULE__, client_id) do
    from(ml in query, where: ml.client_id == ^client_id)
  end

  @spec for_business(Ecto.Queryable.t(), String.t()) :: Ecto.Query.t()
  def for_business(query \\ __MODULE__, business_id) do
    from(ml in query, where: ml.business_id == ^business_id)
  end

  @spec for_date(Ecto.Queryable.t(), Date.t()) :: Ecto.Query.t()
  def for_date(query \\ __MODULE__, date) do
    from(ml in query, where: ml.date == ^date)
  end

  @spec for_date_range(Ecto.Queryable.t(), Date.t(), Date.t()) :: Ecto.Query.t()
  def for_date_range(query \\ __MODULE__, from_date, to_date) do
    from(ml in query, where: ml.date >= ^from_date and ml.date <= ^to_date)
  end

  @spec ordered(Ecto.Queryable.t()) :: Ecto.Query.t()
  def ordered(query \\ __MODULE__) do
    from(ml in query, order_by: [asc: ml.date, asc: ml.meal_slot])
  end

  @spec with_entries(Ecto.Queryable.t()) :: Ecto.Query.t()
  def with_entries(query \\ __MODULE__) do
    entry_query =
      from(e in FoodLogEntry, order_by: [asc: e.planned_item_index, asc: e.inserted_at])

    from(ml in query, preload: [food_log_entries: ^entry_query])
  end

  # Actions

  @spec find_or_create(String.t(), String.t(), Date.t(), String.t()) ::
          {:ok, t()} | {:error, Ecto.Changeset.t()}
  def find_or_create(business_id, client_id, date, meal_slot) do
    case get_existing(business_id, client_id, date, meal_slot) do
      %__MODULE__{} = existing ->
        {:ok, existing}

      nil ->
        snapshot = build_planned_snapshot(business_id, client_id, date, meal_slot)
        planned_cal = snapshot && snapshot[:total_calories]

        attrs = %{date: date, meal_slot: meal_slot}

        case insert_changeset(business_id, client_id, attrs)
             |> put_change(:planned_snapshot, snapshot)
             |> put_change(:planned_calories, planned_cal && planned_cal * 1.0)
             |> Repo.insert() do
          {:ok, meal_log} ->
            {:ok, meal_log}

          {:error, %{errors: errors} = changeset} ->
            if Keyword.has_key?(errors, :client_id) do
              # Unique constraint violation -- concurrent insert won the race, re-fetch
              case get_existing(business_id, client_id, date, meal_slot) do
                %__MODULE__{} = existing -> {:ok, existing}
                nil -> {:error, changeset}
              end
            else
              {:error, changeset}
            end
        end
    end
  end

  defp get_existing(business_id, client_id, date, meal_slot) do
    __MODULE__
    |> for_business(business_id)
    |> for_client(client_id)
    |> for_date(date)
    |> where([ml], ml.meal_slot == ^meal_slot)
    |> Repo.one()
  end

  @spec recalculate_logged_calories(t()) :: {:ok, t()} | {:error, Ecto.Changeset.t()}
  def recalculate_logged_calories(%__MODULE__{} = meal_log) do
    total =
      FoodLogEntry
      |> FoodLogEntry.for_meal_log(meal_log.id)
      |> select([e], coalesce(sum(e.calories), 0.0))
      |> Repo.one()

    meal_log
    |> change(%{logged_calories: total * 1.0})
    |> Repo.update()
  end

  # Orchestration actions

  @spec log_entry(String.t(), String.t(), map()) ::
          {:ok, FoodLogEntry.t()} | {:error, any()}
  def log_entry(business_id, client_id, attrs) do
    date = parse_date(attrs)
    meal_slot = attrs["meal_slot"] || attrs[:meal_slot]

    with {:ok, date} <- require_date(date) do
      Repo.transaction(fn ->
        case find_or_create(business_id, client_id, date, meal_slot) do
          {:ok, meal_log} ->
            case FoodLogEntry.create(meal_log.id, business_id, attrs) do
              {:ok, entry} ->
                {:ok, _} = recalculate_logged_calories(meal_log)
                entry

              {:error, reason} ->
                Repo.rollback(reason)
            end

          {:error, reason} ->
            Repo.rollback(reason)
        end
      end)
    end
  end

  @spec update_entry(FoodLogEntry.t(), map()) ::
          {:ok, FoodLogEntry.t()} | {:error, any()}
  def update_entry(%FoodLogEntry{} = entry, attrs) do
    Repo.transaction(fn ->
      case FoodLogEntry.update(entry, attrs) do
        {:ok, updated} ->
          meal_log = Repo.get!(__MODULE__, entry.meal_log_id)
          {:ok, _} = recalculate_logged_calories(meal_log)
          updated

        {:error, reason} ->
          Repo.rollback(reason)
      end
    end)
  end

  @spec delete_entry(FoodLogEntry.t()) :: {:ok, FoodLogEntry.t()} | {:error, any()}
  def delete_entry(%FoodLogEntry{} = entry) do
    Repo.transaction(fn ->
      case FoodLogEntry.delete(entry) do
        {:ok, deleted} ->
          meal_log = Repo.get!(__MODULE__, entry.meal_log_id)
          {:ok, _} = recalculate_logged_calories(meal_log)
          deleted

        {:error, reason} ->
          Repo.rollback(reason)
      end
    end)
  end

  @spec log_meal(String.t(), String.t(), Date.t(), String.t(), String.t()) ::
          {:ok, [FoodLogEntry.t()]} | {:error, any()}
  def log_meal(business_id, client_id, date, meal_slot, meal_id) do
    Repo.transaction(fn ->
      do_log_meal(business_id, client_id, date, meal_slot, meal_id)
    end)
  end

  @spec log_day(String.t(), String.t(), Date.t(), String.t()) ::
          {:ok, [FoodLogEntry.t()]} | {:error, any()}
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

        Repo.transaction(fn ->
          Enum.flat_map(plan_items, fn plan_item ->
            do_log_meal(business_id, client_id, date, plan_item.meal_type, plan_item.meal_id)
          end)
        end)
    end
  end

  @spec daily_summaries([t()]) :: [map()]
  def daily_summaries(meal_logs) do
    meal_logs
    |> Enum.group_by(& &1.date)
    |> Enum.map(fn {date, day_logs} ->
      all_entries = Enum.flat_map(day_logs, & &1.food_log_entries)

      %{
        date: date,
        meals_logged: length(day_logs),
        total_entries: length(all_entries),
        planned_calories: sum_non_nil(day_logs, :planned_calories),
        logged_calories: sum_non_nil(day_logs, :logged_calories),
        replacements: Enum.count(all_entries, &(&1.source == :replacement)),
        unplanned_count: Enum.count(all_entries, &(&1.source == :unplanned))
      }
    end)
    |> Enum.sort_by(& &1.date, Date)
  end

  defp sum_non_nil(structs, field) do
    structs
    |> Enum.map(&Map.get(&1, field))
    |> Enum.reject(&is_nil/1)
    |> case do
      [] -> nil
      vals -> Enum.sum(vals) |> Float.round(1)
    end
  end

  # Internal: runs inside an existing transaction (no nested Repo.transaction)
  defp do_log_meal(business_id, client_id, date, meal_slot, meal_id) do
    meal_log =
      case find_or_create(business_id, client_id, date, meal_slot) do
        {:ok, ml} -> ml
        {:error, reason} -> Repo.rollback(reason)
      end

    meal = load_meal_with_items(business_id, client_id, meal_id)
    if is_nil(meal), do: Repo.rollback(:not_found)

    already_logged = FoodLogEntry.logged_indices(meal_log.id)

    items =
      meal.meal_items
      |> Enum.sort_by(& &1.position)
      |> Enum.with_index()

    entries =
      Enum.reduce(items, [], fn {item, index}, acc ->
        if MapSet.member?(already_logged, index) do
          acc
        else
          attrs = build_entry_attrs(item, index)

          case FoodLogEntry.create(meal_log.id, business_id, attrs) do
            {:ok, entry} -> [entry | acc]
            {:error, reason} -> Repo.rollback(reason)
          end
        end
      end)
      |> Enum.reverse()

    case recalculate_logged_calories(meal_log) do
      {:ok, _} -> entries
      {:error, reason} -> Repo.rollback(reason)
    end
  end

  defp load_meal_with_items(business_id, client_id, meal_id) do
    meal =
      Meal
      |> Meal.for_business(business_id)
      |> Repo.get(meal_id)

    case meal do
      nil ->
        nil

      %{plan_id: plan_id} ->
        plan_belongs =
          Plan
          |> Plan.for_business(business_id)
          |> Plan.for_client(client_id)
          |> Repo.get(plan_id)

        if is_nil(plan_belongs) do
          nil
        else
          Repo.preload(meal,
            meal_items: MealItem |> MealItem.ordered() |> MealItem.with_food_and_recipe()
          )
        end
    end
  end

  defp build_entry_attrs(%MealItem{} = item, index) do
    food_or_recipe = item.food || item.recipe

    %{
      "food_name" => food_or_recipe && food_or_recipe.name,
      "food_id" => item.food_id,
      "recipe_id" => item.recipe_id,
      "amount" => item.amount,
      "unit" => item.unit,
      "weight_g" => item.weight_g,
      "source" => "planned",
      "planned_item_index" => index
    }
  end

  defp parse_date(%{"date" => date}) when is_binary(date) do
    case Date.from_iso8601(date) do
      {:ok, d} -> d
      _ -> nil
    end
  end

  defp parse_date(%{"date" => %Date{} = date}), do: date
  defp parse_date(%{date: %Date{} = date}), do: date
  defp parse_date(_), do: nil

  defp require_date(%Date{} = date), do: {:ok, date}

  defp require_date(nil),
    do: {:error, Easy.Error.unprocessable(%{fields: %{date: ["is invalid"]}})}

  # Planned snapshot builder

  @spec build_planned_snapshot(String.t(), String.t(), Date.t(), String.t()) :: map() | nil
  defp build_planned_snapshot(business_id, client_id, date, meal_slot) do
    plan =
      Plan
      |> Plan.for_business(business_id)
      |> Plan.active_for_client(client_id, date)
      |> Plan.newest()
      |> limit(1)
      |> Repo.one()

    if is_nil(plan), do: nil, else: snapshot_meal(plan, date, meal_slot)
  end

  defp snapshot_meal(plan, date, meal_slot) do
    day = Easy.Utils.weekday_name(date)

    plan_item =
      PlanItem
      |> PlanItem.for_plan(plan.id)
      |> PlanItem.for_business(plan.business_id)
      |> PlanItem.for_day(day)
      |> where([pi], pi.meal_type == ^meal_slot)
      |> Repo.one()

    if is_nil(plan_item), do: nil, else: do_snapshot(plan_item)
  end

  defp do_snapshot(plan_item) do
    meal =
      Meal
      |> Meal.for_business(plan_item.business_id)
      |> Repo.get(plan_item.meal_id)

    if is_nil(meal) do
      nil
    else
      meal = Repo.preload(meal, meal_items: [:food, :recipe])

      items =
        meal.meal_items
        |> Enum.sort_by(& &1.position)
        |> Enum.map(&snapshot_item/1)

      %{
        meal_name: meal.name,
        items: items,
        total_calories: sum_field(items, :calories),
        total_protein_g: sum_field(items, :protein_g),
        total_carbs_g: sum_field(items, :carbs_g),
        total_fat_g: sum_field(items, :fat_g)
      }
    end
  end

  defp snapshot_item(%MealItem{} = item) do
    {name, macros, cooked_weight_g} = resolve_food_or_recipe(item)
    weight_g = item.weight_g || 0.0
    computed = MacroCalc.compute_all(macros, weight_g, cooked_weight_g)

    %{
      food_name: name,
      amount: item.amount,
      unit: item.unit,
      weight_g: weight_g,
      calories: computed.calories,
      protein_g: computed.protein_g,
      carbs_g: computed.carbs_g,
      fat_g: computed.fat_g
    }
  end

  defp resolve_food_or_recipe(%MealItem{food: %Food{} = f}) do
    {f.name, f.macros || %{}, nil}
  end

  defp resolve_food_or_recipe(%MealItem{recipe: %Recipe{} = r}) do
    {r.name, r.macros || %{}, r.cooked_weight_g}
  end

  defp resolve_food_or_recipe(_), do: {nil, %{}, nil}

  defp sum_field(items, field) do
    items
    |> Enum.reduce(0.0, &(Map.get(&1, field, 0.0) + &2))
    |> Float.round(1)
  end
end
