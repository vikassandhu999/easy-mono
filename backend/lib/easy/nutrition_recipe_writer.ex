defmodule Easy.Nutrition.RecipeWriter do
  alias Easy.Ctx
  alias Easy.Nutrition.{ItemResolver, PlanReader, Portion, Recipe, RecipeIngredient}
  alias Easy.Repo
  alias Easy.Result
  alias Easy.Revision

  import Ecto.Changeset

  @type write_error :: :not_found | :invalid_portion | :in_use | Ecto.Changeset.t()

  @spec create(Ctx.t(), map()) :: {:ok, Recipe.t()} | {:error, write_error()}
  def create(%Ctx{} = ctx, attrs) do
    with :ok <- Ctx.ensure_coach(ctx) do
      insert_recipe(ctx, attrs)
    end
  end

  @spec update(Ctx.t(), String.t(), pos_integer(), map()) ::
          {:ok, Recipe.t()} | {:error, write_error()}
  def update(%Ctx{} = ctx, recipe_id, expected_revision, attrs) do
    with :ok <- Ctx.ensure_coach(ctx) do
      Revision.locked(
        Recipe.for_business(ctx.business_id),
        recipe_id,
        expected_revision,
        &update_locked_recipe(ctx, &1, attrs)
      )
    end
  end

  @spec delete(Ctx.t(), String.t()) ::
          {:ok, Recipe.t()} | {:error, :not_found | :in_use | Ecto.Changeset.t()}
  def delete(%Ctx{} = ctx, recipe_id) do
    with :ok <- Ctx.ensure_coach(ctx) do
      Revision.locked(
        Recipe.for_business(ctx.business_id),
        recipe_id,
        :any,
        &delete_locked_recipe(ctx, &1)
      )
    end
  end

  # Recipe mutations

  defp insert_recipe(ctx, attrs) do
    changeset = Recipe.insert_changeset(ctx.business_id, ctx.coach_id, attrs)

    Repo.transact(fn ->
      with {:ok, recipe} <- Repo.insert(changeset),
           {:ok, _ingredients} <- replace_ingredients(ctx, recipe, ingredient_attrs(changeset)) do
        {:ok, recipe}
      end
    end)
  end

  defp update_locked_recipe(ctx, recipe, attrs) do
    changeset = Recipe.update_changeset(recipe, attrs)

    with :ok <- ensure_cooked_weight_removable(ctx, recipe, changeset),
         {:ok, updated} <- Repo.update(changeset),
         {:ok, _ingredients} <- replace_ingredients(ctx, updated, ingredient_attrs(changeset)) do
      {:ok, updated}
    end
  end

  defp ingredient_attrs(changeset), do: Map.get(changeset.params || %{}, "recipe_ingredients", :unchanged)

  defp delete_locked_recipe(ctx, recipe) do
    if PlanReader.library_item_used?(ctx, :recipe, recipe.id) do
      {:error, :in_use}
    else
      Repo.delete(recipe)
    end
  end

  # A Menu gram Portion only resolves through cooked weight, so it pins the field.
  defp ensure_cooked_weight_removable(ctx, recipe, changeset) do
    if removing_cooked_weight?(recipe, changeset) and
         PlanReader.library_item_used?(ctx, :recipe, recipe.id, %{kind: :gram}) do
      {:error, :in_use}
    else
      :ok
    end
  end

  defp removing_cooked_weight?(%{cooked_weight_g: cooked}, changeset)
       when is_number(cooked) and cooked > 0 do
    fetch_change(changeset, :cooked_weight_g) == {:ok, nil}
  end

  defp removing_cooked_weight?(_recipe, _changeset), do: false

  # Ingredient replacement: the request carries the complete collection, positions
  # come from its order.

  defp replace_ingredients(_ctx, _recipe, :unchanged), do: {:ok, :unchanged}

  defp replace_ingredients(ctx, recipe, ingredients) when is_list(ingredients) do
    with {:ok, specs} <- Result.traverse(ingredients, &RecipeIngredient.item_reference/1),
         {:ok, resolved} <- ItemResolver.resolve_for_write(ctx, specs) do
      changesets =
        Enum.with_index(specs, fn spec, position ->
          item = Map.fetch!(resolved, spec)

          RecipeIngredient.insert_changeset(recipe.business_id, recipe.id, position, %{
            food_id: item.item.id,
            portion: Portion.format(item.portion)
          })
        end)

      replace_ingredient_rows(recipe, changesets)
    end
  end

  defp replace_ingredients(_ctx, recipe, _ingredients) do
    {:error, recipe |> change() |> add_error(:recipe_ingredients, "is invalid")}
  end

  defp replace_ingredient_rows(recipe, changesets) do
    if Enum.any?(changesets, &(not &1.valid?)) do
      {:error, Recipe.ingredient_errors(recipe, changesets)}
    else
      recipe.business_id
      |> RecipeIngredient.for_recipe(recipe.id)
      |> Repo.delete_all()

      Result.traverse(changesets, &Repo.insert/1)
    end
  end
end
