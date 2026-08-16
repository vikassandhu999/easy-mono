defmodule Easy.Recipes do
  alias Easy.Ctx
  alias Easy.Nutrition.Food
  alias Easy.Nutrition.Meal
  alias Easy.Nutrition.MealItem
  alias Easy.Nutrition.Plan
  alias Easy.Nutrition.Recipe
  alias Easy.Orgs.Coach
  alias Easy.Repo

  import Ecto.Changeset
  import Ecto.Query

  @spec get_recipe(Ctx.t(), String.t()) :: {:ok, Recipe.t()} | {:error, :not_found}
  def get_recipe(%Ctx{} = ctx, recipe_id) do
    Recipe
    |> Recipe.for_business(ctx.business_id)
    |> Recipe.include_ingredients(ctx.business_id)
    |> Repo.get(recipe_id)
    |> ok_or_not_found()
  end

  @spec get_recipe_plain(Ctx.t(), String.t()) :: {:ok, Recipe.t()} | {:error, :not_found}
  def get_recipe_plain(%Ctx{} = ctx, recipe_id) do
    Recipe
    |> Recipe.for_business(ctx.business_id)
    |> Repo.get(recipe_id)
    |> ok_or_not_found()
  end

  @spec list_recipes(Ctx.t(), keyword()) ::
          {:ok, %{count: non_neg_integer(), recipes: [Recipe.t()]}}
  def list_recipes(%Ctx{} = ctx, opts \\ []) do
    search = String.trim(Keyword.get(opts, :search, "") || "")
    offset = Keyword.get(opts, :offset, 0)
    limit = min(Keyword.get(opts, :limit, 20), 20)

    base = Recipe |> Recipe.for_business(ctx.business_id) |> Recipe.search(search)
    ordered = if search == "", do: Recipe.newest(base), else: base

    {:ok,
     %{
       count: Repo.aggregate(base, :count, :id),
       recipes:
         ordered
         |> Easy.Utils.paginate(offset, limit)
         |> Recipe.include_ingredients(ctx.business_id)
         |> Repo.all()
     }}
  end

  @spec create_recipe(Ctx.t(), map()) ::
          {:ok, Recipe.t()} | {:error, :not_found | Ecto.Changeset.t()}
  def create_recipe(%Ctx{} = ctx, attrs) do
    with {:ok, coach} <- get_coach(ctx),
         {:ok, recipe} <-
           ctx.business_id
           |> Recipe.insert_changeset(coach.id, attrs)
           |> validate_ingredient_foods(ctx.business_id)
           |> Repo.insert() do
      get_recipe(ctx, recipe.id)
    end
  end

  @spec update_recipe(Ctx.t(), String.t(), map()) ::
          {:ok, Recipe.t()} | {:error, :not_found | Ecto.Changeset.t()}
  def update_recipe(%Ctx{} = ctx, recipe_id, attrs) do
    with {:ok, recipe} <- get_recipe(ctx, recipe_id),
         {:ok, updated} <-
           recipe
           |> Recipe.update_changeset(attrs)
           |> validate_ingredient_foods(ctx.business_id)
           |> Repo.update() do
      get_recipe(ctx, updated.id)
    end
  end

  @spec delete_recipe(Ctx.t(), String.t()) ::
          {:ok, Recipe.t()} | {:error, :not_found | :in_use | Ecto.Changeset.t()}
  def delete_recipe(%Ctx{} = ctx, recipe_id) do
    with {:ok, recipe} <- get_recipe_plain(ctx, recipe_id),
         :ok <- ensure_recipe_not_in_use(ctx.business_id, recipe.id) do
      Repo.delete(recipe)
    end
  end

  # Same rule as Foods.delete_food/2: a meal item pointing at neither a food nor a
  # recipe violates the xor check, so a recipe still used by a plan is a conflict.
  # Log entries nilify safely — they keep food_name and frozen macros.
  defp ensure_recipe_not_in_use(business_id, recipe_id) do
    if Repo.exists?(from(mi in MealItem.for_business(business_id), where: mi.recipe_id == ^recipe_id)),
      do: {:error, :in_use},
      else: :ok
  end

  @spec get_recipe_impact(Ctx.t(), String.t()) ::
          {:ok, %{templates: [map()], active_client_plans: [map()]}} | {:error, :not_found}
  def get_recipe_impact(%Ctx{} = ctx, recipe_id) do
    with {:ok, _recipe} <- get_recipe_plain(ctx, recipe_id) do
      plans =
        from(p in Plan,
          join: m in Meal,
          on: m.nutrition_plan_id == p.id,
          join: mi in MealItem,
          on: mi.nutrition_meal_id == m.id,
          where: p.business_id == ^ctx.business_id and mi.recipe_id == ^recipe_id,
          distinct: p.id,
          select: %{id: p.id, name: p.name, client_id: p.client_id, status: p.status}
        )
        |> Repo.all()

      {:ok, Easy.Nutrition.Library.split_plan_impact(plans)}
    end
  end

  @spec copy_recipe(Ctx.t(), String.t()) ::
          {:ok, Recipe.t()} | {:error, :not_found | Ecto.Changeset.t()}
  def copy_recipe(%Ctx{} = ctx, recipe_id) do
    with {:ok, recipe} <- get_recipe(ctx, recipe_id) do
      scalars =
        recipe
        |> Map.take(Recipe.scalar_fields())
        |> Map.new(fn {field, value} -> {Atom.to_string(field), value} end)
        |> Map.put("name", generate_copy_name(recipe.name, ctx.business_id))

      attrs =
        Map.merge(scalars, %{
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
        })

      create_recipe(ctx, attrs)
    end
  end

  defp generate_copy_name(original_name, business_id) do
    existing_names =
      Recipe
      |> Recipe.for_business(business_id)
      |> select([r], r.name)
      |> Repo.all()

    Easy.CopyName.next(original_name, existing_names)
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

  defp get_coach(%Ctx{} = ctx) do
    Coach
    |> Coach.for_business(ctx.business_id)
    |> Coach.for_user(ctx.user_id)
    |> Repo.one()
    |> ok_or_not_found()
  end

  defp ok_or_not_found(nil), do: {:error, :not_found}
  defp ok_or_not_found(record), do: {:ok, record}
end
