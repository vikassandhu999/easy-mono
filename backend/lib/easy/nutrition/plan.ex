defmodule Easy.Nutrition.Plan do
  use Ecto.Schema

  alias Easy.Clients.Client
  alias Easy.Nutrition.Meal
  alias Easy.Nutrition.MealItem
  alias Easy.Nutrition.PlanItem
  alias Easy.Orgs
  alias Easy.Repo

  import Ecto.Changeset
  import Ecto.Query

  @type t() :: %__MODULE__{}

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  @plan_types [:template, :personal]
  @plan_statuses [:draft, :active, :archived]

  @spec types() :: [atom()]
  def types, do: @plan_types

  @spec statuses() :: [atom()]
  def statuses, do: @plan_statuses

  schema "plans" do
    field :name, :string
    field :description, :string
    field :tags, {:array, :string}, default: []

    field :macros_goal, :map

    field :type, Ecto.Enum, values: @plan_types, default: :template
    field :status, Ecto.Enum, values: @plan_statuses, default: :draft

    belongs_to :creator, Orgs.Coach, foreign_key: :creator_id
    belongs_to :business, Orgs.Business
    belongs_to :client, Client
    belongs_to :source_template, __MODULE__, foreign_key: :source_template_id
    has_many :meals, Meal
    has_many :plan_items, PlanItem

    timestamps(type: :utc_datetime)
  end

  @cast_fields [:name, :description, :tags, :macros_goal, :type, :status]

  # Changesets

  @spec insert_changeset(String.t(), String.t(), map()) :: Ecto.Changeset.t()
  def insert_changeset(business_id, creator_id, attrs) do
    %__MODULE__{}
    |> cast(attrs, @cast_fields)
    |> put_change(:business_id, business_id)
    |> put_change(:creator_id, creator_id)
    |> validate_required([:name, :business_id, :creator_id])
  end

  @spec update_changeset(t(), map()) :: Ecto.Changeset.t()
  def update_changeset(plan, attrs) do
    plan
    |> cast(attrs, [:name, :description, :tags, :macros_goal, :status])
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

  @spec with_client(Ecto.Queryable.t(), String.t() | nil) :: Ecto.Query.t()
  def with_client(query \\ __MODULE__, client_id)
  def with_client(query, nil), do: query

  def with_client(query, client_id) do
    from(p in query, where: p.client_id == ^client_id)
  end

  @spec with_status(Ecto.Queryable.t(), atom() | nil) :: Ecto.Query.t()
  def with_status(query \\ __MODULE__, status)
  def with_status(query, nil), do: query

  def with_status(query, status) do
    from(p in query, where: p.status == ^status)
  end

  @spec with_type(Ecto.Queryable.t(), atom() | nil) :: Ecto.Query.t()
  def with_type(query \\ __MODULE__, type)
  def with_type(query, nil), do: query

  def with_type(query, type) do
    from(p in query, where: p.type == ^type)
  end

  @spec newest(Ecto.Queryable.t()) :: Ecto.Query.t()
  def newest(query \\ __MODULE__) do
    from(p in query, order_by: [desc: p.inserted_at])
  end

  @spec with_meals(Ecto.Queryable.t()) :: Ecto.Query.t()
  def with_meals(query \\ __MODULE__) do
    meal_query = Meal |> Meal.ordered() |> Meal.with_items()
    from(p in query, preload: [meals: ^meal_query])
  end

  @spec with_plan_items(Ecto.Queryable.t()) :: Ecto.Query.t()
  def with_plan_items(query \\ __MODULE__) do
    plan_item_query = PlanItem |> PlanItem.with_meal()
    from(p in query, preload: [plan_items: ^plan_item_query])
  end

  # Actions

  @spec create(String.t(), String.t(), map()) :: {:ok, t()} | {:error, Ecto.Changeset.t()}
  def create(business_id, creator_id, attrs) do
    insert_changeset(business_id, creator_id, attrs)
    |> Repo.insert()
  end

  @spec update(t(), map()) :: {:ok, t()} | {:error, Ecto.Changeset.t()}
  def update(plan, attrs) do
    update_changeset(plan, attrs)
    |> Repo.update()
  end

  @spec delete(t()) :: {:ok, t()} | {:error, Ecto.Changeset.t()}
  def delete(plan) do
    Repo.delete(plan)
  end

  @spec shopping_list(t()) :: {:ok, [map()]} | {:error, any()}
  def shopping_list(plan) do
    plan = Repo.preload(plan, meals: Meal |> Meal.ordered() |> Meal.with_items())

    items =
      plan.meals
      |> Enum.flat_map(& &1.meal_items)
      |> Enum.reduce(%{}, fn item, acc ->
        key = {item.food_id, item.recipe_id, item.unit}
        entry = Map.get(acc, key, build_shopping_item(item))

        Map.put(acc, key, %{
          entry
          | amount: add_number(entry.amount, item.amount),
            weight_g: add_number(entry.weight_g, item.weight_g)
        })
      end)
      |> Map.values()

    {:ok, items}
  end

  @spec macros(t()) :: {:ok, map()} | {:error, any()}
  def macros(plan) do
    plan = Repo.preload(plan, meals: Meal |> Meal.ordered())

    totals =
      Enum.reduce(plan.meals, %{}, fn meal, acc ->
        merge_macros(acc, meal.macros || %{})
      end)

    {:ok, totals}
  end

  @spec copy_day(t(), String.t(), String.t(), String.t()) ::
          {:ok, [PlanItem.t()]} | {:error, any()}
  def copy_day(plan, source_day, target_day, creator_id) do
    with :ok <- validate_copy_day(source_day, target_day) do
      Repo.transaction(fn ->
        source_items =
          PlanItem
          |> PlanItem.for_plan(plan.id)
          |> PlanItem.for_day(source_day)
          |> Repo.all()

        PlanItem
        |> PlanItem.for_plan(plan.id)
        |> PlanItem.for_day(target_day)
        |> Repo.delete_all()

        Enum.map(source_items, fn item ->
          attrs = %{day: target_day, meal_type: item.meal_type, meal_id: item.meal_id}

          case PlanItem.insert_changeset(plan.id, plan.business_id, creator_id, attrs)
               |> Repo.insert() do
            {:ok, new_item} -> new_item
            {:error, reason} -> Repo.rollback(reason)
          end
        end)
      end)
    end
  end

  @spec assign_to_client(t(), String.t(), String.t()) :: {:ok, t()} | {:error, any()}
  def assign_to_client(plan, client_id, creator_id) do
    copy_plan(plan, creator_id,
      type: :personal,
      client_id: client_id,
      source_template_id: plan.id,
      status: plan.status
    )
  end

  @spec duplicate(t(), String.t()) :: {:ok, t()} | {:error, any()}
  def duplicate(plan, creator_id) do
    copy_plan(plan, creator_id,
      name: "#{plan.name} (Copy)",
      type: plan.type,
      client_id: nil,
      source_template_id: plan.source_template_id || plan.id,
      status: :draft
    )
  end

  @spec copy_plan(t(), String.t(), keyword()) :: {:ok, t()} | {:error, any()}
  defp copy_plan(plan, creator_id, opts) do
    Repo.transaction(fn ->
      plan =
        plan
        |> Repo.preload(meals: [:meal_items], plan_items: [])

      attrs = %{
        name: Keyword.get(opts, :name, plan.name),
        description: plan.description,
        tags: plan.tags,
        macros_goal: plan.macros_goal,
        type: Keyword.get(opts, :type, plan.type),
        status: Keyword.get(opts, :status, plan.status)
      }

      changeset =
        insert_changeset(plan.business_id, creator_id, attrs)
        |> put_change(:client_id, Keyword.get(opts, :client_id))
        |> put_change(:source_template_id, Keyword.get(opts, :source_template_id))

      with {:ok, new_plan} <- Repo.insert(changeset),
           {:ok, meal_map} <-
             copy_meals(plan.meals, new_plan.id, new_plan.business_id, creator_id),
           {:ok, _} <-
             copy_plan_items(
               plan.plan_items,
               new_plan.id,
               new_plan.business_id,
               creator_id,
               meal_map
             ) do
        Repo.preload(new_plan,
          meals: Meal |> Meal.ordered() |> Meal.with_items(),
          plan_items: PlanItem.with_meal()
        )
      else
        {:error, reason} -> Repo.rollback(reason)
      end
    end)
  end

  defp copy_meals(meals, new_plan_id, business_id, creator_id) do
    Enum.reduce_while(meals, {:ok, %{}}, fn meal, {:ok, acc} ->
      attrs = %{
        name: meal.name,
        macros: meal.macros
      }

      case Meal.insert_changeset(new_plan_id, business_id, creator_id, attrs) |> Repo.insert() do
        {:ok, new_meal} ->
          case copy_meal_items(meal.meal_items, new_meal.id, business_id) do
            {:ok, _} -> {:cont, {:ok, Map.put(acc, meal.id, new_meal)}}
            {:error, reason} -> {:halt, {:error, reason}}
          end

        {:error, reason} ->
          {:halt, {:error, reason}}
      end
    end)
  end

  defp copy_meal_items(meal_items, new_meal_id, business_id) do
    Enum.reduce_while(meal_items, {:ok, []}, fn meal_item, {:ok, acc} ->
      attrs = %{
        weight_g: meal_item.weight_g,
        amount: meal_item.amount,
        unit: meal_item.unit,
        position: meal_item.position,
        recipe_id: meal_item.recipe_id,
        food_id: meal_item.food_id
      }

      case MealItem.insert_changeset(new_meal_id, business_id, attrs) |> Repo.insert() do
        {:ok, new_item} -> {:cont, {:ok, [new_item | acc]}}
        {:error, reason} -> {:halt, {:error, reason}}
      end
    end)
  end

  defp copy_plan_items(plan_items, new_plan_id, business_id, creator_id, meal_map) do
    Enum.reduce_while(plan_items, {:ok, []}, fn plan_item, {:ok, acc} ->
      meal_id = meal_map |> Map.fetch!(plan_item.meal_id) |> Map.get(:id)

      attrs = %{
        day: plan_item.day,
        meal_type: plan_item.meal_type,
        meal_id: meal_id
      }

      case PlanItem.insert_changeset(new_plan_id, business_id, creator_id, attrs)
           |> Repo.insert() do
        {:ok, new_plan_item} -> {:cont, {:ok, [new_plan_item | acc]}}
        {:error, reason} -> {:halt, {:error, reason}}
      end
    end)
  end

  defp build_shopping_item(item) do
    {label, type} =
      cond do
        not is_nil(item.food) -> {item.food.name, :food}
        not is_nil(item.recipe) -> {item.recipe.name, :recipe}
        not is_nil(item.food_id) -> {nil, :food}
        not is_nil(item.recipe_id) -> {nil, :recipe}
        true -> {nil, :unknown}
      end

    %{
      type: type,
      name: label,
      food_id: item.food_id,
      recipe_id: item.recipe_id,
      unit: item.unit,
      amount: 0,
      weight_g: 0
    }
  end

  defp add_number(left, right) do
    (left || 0) + (right || 0)
  end

  defp merge_macros(acc, macros) when is_map(macros) do
    Enum.reduce(macros, acc, fn {key, value}, totals ->
      key = to_string(key)

      if is_number(value) do
        Map.update(totals, key, value, &(&1 + value))
      else
        totals
      end
    end)
  end

  defp validate_copy_day(nil, _target_day) do
    {:error, Easy.Error.unprocessable(%{fields: %{source_day: ["can't be blank"]}})}
  end

  defp validate_copy_day(_source_day, nil) do
    {:error, Easy.Error.unprocessable(%{fields: %{target_day: ["can't be blank"]}})}
  end

  defp validate_copy_day(source_day, target_day) when source_day == target_day do
    {:error, Easy.Error.unprocessable(%{fields: %{target_day: ["must differ from source_day"]}})}
  end

  defp validate_copy_day(_source_day, _target_day), do: :ok
end
