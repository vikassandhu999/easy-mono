defmodule Easy.Recipes do
  alias Easy.Nutrition.Food
  alias Easy.Nutrition.Recipe
  alias Easy.Nutrition.RecipeIngredient
  alias Easy.Orgs.Coach
  alias Easy.Repo

  import Ecto.Changeset
  import Ecto.Query

  @spec fetch_recipe(String.t(), String.t()) :: {:ok, Recipe.t()} | {:error, :not_found}
  def fetch_recipe(business_id, recipe_id) do
    Recipe
    |> Recipe.for_business(business_id)
    |> with_ingredients(business_id)
    |> Repo.get(recipe_id)
    |> ok_or_not_found()
  end

  @spec fetch_recipe_plain(String.t(), String.t()) :: {:ok, Recipe.t()} | {:error, :not_found}
  def fetch_recipe_plain(business_id, recipe_id) do
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
    business_id
    |> Recipe.insert_changeset(coach_id, attrs)
    |> validate_ingredient_foods(business_id)
    |> Repo.insert()
  end

  @spec create_recipe_for_coach_user(String.t(), String.t(), map()) ::
          {:ok, Recipe.t()} | {:error, :not_found | Ecto.Changeset.t()}
  def create_recipe_for_coach_user(business_id, user_id, attrs) do
    with {:ok, coach} <- fetch_coach_for_user(business_id, user_id) do
      create_recipe(business_id, coach.id, attrs)
    end
  end

  @spec update_recipe(Recipe.t(), map()) ::
          {:ok, Recipe.t()} | {:error, Ecto.Changeset.t()}
  def update_recipe(%Recipe{} = recipe, attrs) do
    recipe
    |> Recipe.update_changeset(attrs)
    |> validate_ingredient_foods(recipe.business_id)
    |> Repo.update()
  end

  @spec update_recipe(String.t(), String.t(), map()) ::
          {:ok, Recipe.t()} | {:error, :not_found | Ecto.Changeset.t()}
  def update_recipe(business_id, recipe_id, attrs) do
    with {:ok, recipe} <- fetch_recipe(business_id, recipe_id) do
      update_recipe(recipe, attrs)
    end
  end

  @spec delete_recipe(Recipe.t()) :: {:ok, Recipe.t()} | {:error, Ecto.Changeset.t()}
  def delete_recipe(%Recipe{} = recipe), do: Repo.delete(recipe)

  @spec delete_recipe(String.t(), String.t()) ::
          {:ok, Recipe.t()} | {:error, :not_found | Ecto.Changeset.t()}
  def delete_recipe(business_id, recipe_id) do
    with {:ok, recipe} <- fetch_recipe_plain(business_id, recipe_id) do
      delete_recipe(recipe)
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

  defp fetch_coach_for_user(business_id, user_id) do
    Coach
    |> Coach.for_business(business_id)
    |> Coach.for_user(user_id)
    |> Repo.one()
    |> ok_or_not_found()
  end

  defp ok_or_not_found(nil), do: {:error, :not_found}
  defp ok_or_not_found(record), do: {:ok, record}
end
