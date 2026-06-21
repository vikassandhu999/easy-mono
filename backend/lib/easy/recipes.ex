defmodule Easy.Recipes do
  alias Easy.Nutrition.Food
  alias Easy.Nutrition.Recipe
  alias Easy.Nutrition.RecipeIngredient
  alias Easy.Nutrition.{Meal, MealItem, Plan}
  alias Easy.Orgs.Coach
  alias Easy.Repo

  import Ecto.Changeset
  import Ecto.Query

  @spec get_recipe(String.t(), String.t()) :: {:ok, Recipe.t()} | {:error, :not_found}
  def get_recipe(business_id, recipe_id) do
    Recipe
    |> Recipe.for_business(business_id)
    |> with_ingredients(business_id)
    |> Repo.get(recipe_id)
    |> ok_or_not_found()
  end

  @spec get_recipe_plain(String.t(), String.t()) :: {:ok, Recipe.t()} | {:error, :not_found}
  def get_recipe_plain(business_id, recipe_id) do
    Recipe
    |> Recipe.for_business(business_id)
    |> Repo.get(recipe_id)
    |> ok_or_not_found()
  end

  @spec list_recipes(String.t(), String.t() | nil, non_neg_integer(), pos_integer()) ::
          {:ok, %{count: non_neg_integer(), recipes: [Recipe.t()]}}
  def list_recipes(business_id, search, offset, limit) do
    search = String.trim(search || "")
    base = Recipe |> Recipe.for_business(business_id) |> Recipe.search(search)
    ordered = if search == "", do: Recipe.newest(base), else: base

    {:ok,
     %{
       count: Repo.aggregate(base, :count, :id),
       recipes:
         ordered
         |> Easy.Utils.paginate(offset, limit)
         |> with_ingredients(business_id)
         |> Repo.all()
     }}
  end

  @spec create_recipe(String.t(), String.t(), map()) ::
          {:ok, Recipe.t()} | {:error, Ecto.Changeset.t()}
  def create_recipe(business_id, coach_id, attrs) do
    with {:ok, recipe} <-
           business_id
           |> Recipe.insert_changeset(coach_id, attrs)
           |> validate_ingredient_foods(business_id)
           |> Repo.insert() do
      get_recipe(business_id, recipe.id)
    end
  end

  @spec create_recipe_for_coach_user(String.t(), String.t(), map()) ::
          {:ok, Recipe.t()} | {:error, :not_found | Ecto.Changeset.t()}
  def create_recipe_for_coach_user(business_id, user_id, attrs) do
    with {:ok, coach} <- get_coach_for_user(business_id, user_id) do
      create_recipe(business_id, coach.id, attrs)
    end
  end

  @spec update_recipe(String.t(), String.t(), map()) ::
          {:ok, Recipe.t()} | {:error, :not_found | Ecto.Changeset.t()}
  def update_recipe(business_id, recipe_id, attrs) do
    with {:ok, recipe} <- get_recipe(business_id, recipe_id),
         {:ok, updated} <-
           recipe
           |> Recipe.update_changeset(attrs)
           |> validate_ingredient_foods(recipe.business_id)
           |> Repo.update() do
      get_recipe(business_id, updated.id)
    end
  end

  @spec delete_recipe(String.t(), String.t()) ::
          {:ok, Recipe.t()} | {:error, :not_found | Ecto.Changeset.t()}
  def delete_recipe(business_id, recipe_id) do
    with {:ok, recipe} <- get_recipe_plain(business_id, recipe_id) do
      Repo.delete(recipe)
    end
  end

  @spec get_recipe_impact(String.t(), String.t()) ::
          {:ok, %{templates: [map()], active_client_plans: [map()]}} | {:error, :not_found}
  def get_recipe_impact(business_id, recipe_id) do
    with {:ok, _recipe} <- get_recipe_plain(business_id, recipe_id) do
      plans =
        from(p in Plan,
          join: m in Meal,
          on: m.nutrition_plan_id == p.id,
          join: mi in MealItem,
          on: mi.nutrition_meal_id == m.id,
          where: p.business_id == ^business_id and mi.recipe_id == ^recipe_id,
          distinct: p.id,
          select: %{id: p.id, name: p.name, client_id: p.client_id, status: p.status}
        )
        |> Repo.all()

      {:ok, Easy.Foods.split_plan_impact(plans)}
    end
  end

  @spec copy_recipe_for_coach_user(String.t(), String.t(), String.t()) ::
          {:ok, Recipe.t()} | {:error, :not_found | Ecto.Changeset.t()}
  def copy_recipe_for_coach_user(business_id, user_id, recipe_id) do
    with {:ok, coach} <- get_coach_for_user(business_id, user_id) do
      copy_recipe(business_id, recipe_id, coach.id)
    end
  end

  @spec copy_recipe(String.t(), String.t(), String.t()) ::
          {:ok, Recipe.t()} | {:error, :not_found | Ecto.Changeset.t()}
  def copy_recipe(business_id, recipe_id, coach_id) do
    with {:ok, recipe} <- get_recipe(business_id, recipe_id) do
      attrs = %{
        "name" => recipe.name,
        "description" => recipe.description,
        "instructions" => recipe.instructions,
        "servings_count" => recipe.servings_count,
        "cooked_weight_g" => recipe.cooked_weight_g,
        "allergens" => recipe.allergens,
        "dietary_tags" => recipe.dietary_tags,
        "serving_sizes" =>
          Enum.map(recipe.serving_sizes, fn s ->
            %{
              "label" => s.label,
              "amount" => s.amount,
              "unit" => s.unit,
              "weight_g" => s.weight_g,
              "is_default" => s.is_default
            }
          end),
        "recipe_ingredients" =>
          Enum.map(recipe.recipe_ingredients, fn ri ->
            %{
              "food_id" => ri.food_id,
              "amount" => ri.amount,
              "unit" => ri.unit,
              "weight_g" => ri.weight_g,
              "position" => ri.position
            }
          end)
      }

      create_recipe(business_id, coach_id, attrs)
    end
  end

  defp validate_ingredient_foods(changeset, business_id) do
    with true <- changeset.valid?,
         ingredients when not is_nil(ingredients) <- get_change(changeset, :recipe_ingredients) do
      ingredients
      |> Enum.map(&get_field(&1, :food_id))
      |> Enum.reject(&is_nil/1)
      |> Enum.uniq()
      |> invalid_food_ids(business_id)
      |> maybe_add_ingredient_error(changeset)
    else
      _ -> changeset
    end
  end

  defp invalid_food_ids(food_ids, business_id) do
    valid_ids =
      Food
      |> Food.for_business_or_system(business_id)
      |> where([f], f.id in ^food_ids)
      |> select([f], f.id)
      |> Repo.all()
      |> MapSet.new()

    Enum.reject(food_ids, &MapSet.member?(valid_ids, &1))
  end

  defp maybe_add_ingredient_error([], changeset), do: changeset

  defp maybe_add_ingredient_error(_invalid_food_ids, changeset) do
    add_error(changeset, :recipe_ingredients, "has invalid food")
  end

  defp with_ingredients(query, business_id) do
    food_query = Food.for_business_or_system(Food, business_id)
    ingredient_query = from(ri in RecipeIngredient, preload: [food: ^food_query])

    from(r in query, preload: [foods: ^food_query, recipe_ingredients: ^ingredient_query])
  end

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
