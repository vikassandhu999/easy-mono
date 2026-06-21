defmodule Easy.Foods do
  alias Easy.Nutrition.{Food, Meal, MealItem, Plan}
  alias Easy.Orgs.Coach
  alias Easy.Repo

  import Ecto.Query

  @spec get_visible_food(String.t(), String.t()) :: {:ok, Food.t()} | {:error, :not_found}
  def get_visible_food(business_id, food_id) do
    Food
    |> Food.for_business_or_system(business_id)
    |> Repo.get(food_id)
    |> ok_or_not_found()
  end

  @spec get_business_food(String.t(), String.t()) :: {:ok, Food.t()} | {:error, :not_found}
  def get_business_food(business_id, food_id) do
    Food
    |> Food.for_business(business_id)
    |> Repo.get(food_id)
    |> ok_or_not_found()
  end

  @spec list_visible_foods(String.t(), String.t() | nil, non_neg_integer(), pos_integer()) ::
          {:ok, %{count: non_neg_integer(), foods: [Food.t()]}}
  def list_visible_foods(business_id, search, offset, limit) do
    search = String.trim(search || "")
    base = Food |> Food.for_business_or_system(business_id) |> Food.search(search)
    ordered = if search == "", do: Food.newest(base), else: base

    {:ok,
     %{
       count: Repo.aggregate(base, :count, :id),
       foods: ordered |> Easy.Utils.paginate(offset, limit) |> Repo.all()
     }}
  end

  @spec create_food(String.t(), String.t(), map()) ::
          {:ok, Food.t()} | {:error, Ecto.Changeset.t()}
  def create_food(business_id, coach_id, attrs) do
    business_id
    |> Food.insert_changeset(coach_id, attrs)
    |> Repo.insert()
  end

  @spec create_food_for_coach_user(String.t(), String.t(), map()) ::
          {:ok, Food.t()} | {:error, :not_found | Ecto.Changeset.t()}
  def create_food_for_coach_user(business_id, user_id, attrs) do
    with {:ok, coach} <- get_coach_for_user(business_id, user_id) do
      create_food(business_id, coach.id, attrs)
    end
  end

  @spec update_food(String.t(), String.t(), map()) ::
          {:ok, Food.t()} | {:error, :not_found | :read_only_source | Ecto.Changeset.t()}
  def update_food(business_id, food_id, attrs) do
    with {:ok, food} <- get_visible_food(business_id, food_id),
         :ok <- ensure_editable(food) do
      food
      |> Food.update_changeset(attrs)
      |> Repo.update()
    end
  end

  @spec delete_food(String.t(), String.t()) ::
          {:ok, Food.t()} | {:error, :not_found | :read_only_source | Ecto.Changeset.t()}
  def delete_food(business_id, food_id) do
    with {:ok, food} <- get_visible_food(business_id, food_id),
         :ok <- ensure_editable(food) do
      Repo.delete(food)
    end
  end

  @spec get_food_impact(String.t(), String.t()) ::
          {:ok, %{templates: [map()], active_client_plans: [map()]}} | {:error, :not_found}
  def get_food_impact(business_id, food_id) do
    with {:ok, _food} <- get_visible_food(business_id, food_id) do
      plans =
        from(p in Plan,
          join: m in Meal,
          on: m.nutrition_plan_id == p.id,
          join: mi in MealItem,
          on: mi.nutrition_meal_id == m.id,
          where: p.business_id == ^business_id and mi.food_id == ^food_id,
          distinct: p.id,
          select: %{id: p.id, name: p.name, client_id: p.client_id, status: p.status}
        )
        |> Repo.all()

      {:ok, split_plan_impact(plans)}
    end
  end

  @spec split_plan_impact([map()]) :: %{templates: [map()], active_client_plans: [map()]}
  def split_plan_impact(plans) do
    %{
      templates: for(p <- plans, is_nil(p.client_id), do: %{id: p.id, name: p.name}),
      active_client_plans:
        for(
          p <- plans,
          not is_nil(p.client_id),
          p.status == :active,
          do: %{id: p.id, name: p.name, client_id: p.client_id}
        )
    }
  end

  @spec copy_food_for_coach_user(String.t(), String.t(), String.t()) ::
          {:ok, Food.t()} | {:error, :not_found | Ecto.Changeset.t()}
  def copy_food_for_coach_user(business_id, user_id, food_id) do
    with {:ok, coach} <- get_coach_for_user(business_id, user_id) do
      copy_food(business_id, food_id, coach.id)
    end
  end

  @spec copy_food(String.t(), String.t(), String.t()) ::
          {:ok, Food.t()} | {:error, :not_found | Ecto.Changeset.t()}
  def copy_food(business_id, food_id, coach_id) do
    with {:ok, food} <- get_visible_food(business_id, food_id) do
      attrs = %{
        "name" => food.name,
        "brand" => food.brand,
        "barcode" => food.barcode,
        "category" => food.category,
        "source" => "custom",
        "calories_per_100g" => food.calories_per_100g,
        "protein_g_per_100g" => food.protein_g_per_100g,
        "carbs_g_per_100g" => food.carbs_g_per_100g,
        "fat_g_per_100g" => food.fat_g_per_100g,
        "fiber_g_per_100g" => food.fiber_g_per_100g,
        "allergens" => food.allergens,
        "dietary_tags" => food.dietary_tags,
        "notes" => food.notes,
        "image_url" => food.image_url,
        "serving_sizes" => Enum.map(food.serving_sizes, &serving_size_attrs/1)
      }

      create_food(business_id, coach_id, attrs)
    end
  end

  defp serving_size_attrs(s) do
    %{"label" => s.label, "amount" => s.amount, "unit" => s.unit, "weight_g" => s.weight_g, "is_default" => s.is_default}
  end

  defp ensure_editable(%Food{source: source}) when source in ["system", "imported"],
    do: {:error, :read_only_source}

  defp ensure_editable(_food), do: :ok

  defp get_coach_for_user(business_id, user_id) do
    Coach
    |> Coach.for_business(business_id)
    |> Coach.for_user(user_id)
    |> Repo.one()
    |> ok_or_not_found()
  end

  defp ok_or_not_found(nil), do: {:error, :not_found}
  defp ok_or_not_found(record), do: {:ok, record}
end
