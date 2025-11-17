defmodule Easy.Nutrition do
  import Ecto.Query, warn: false

  alias Easy.Repo
  alias Easy.Organizations.Coach

  alias Easy.Nutrition.Recipe

  def create_recipe(business_id, coach_id, attrs) do
    with {:ok, _coach} <- validate_coach_in_business(coach_id, business_id) do
      attrs_with_ids =
        attrs
        |> Map.put(:business_id, business_id)
        |> Map.put(:created_by_id, coach_id)

      %Recipe{}
      |> Recipe.changeset(attrs_with_ids)
      |> Repo.insert()
    end
  end

  def get_recipe(id, preload \\ []) do
    case Repo.get(Recipe, id) do
      nil -> nil
      recipe -> Repo.preload(recipe, preload)
    end
  end

  def list_recipes(business_id, opts \\ []) do
    limit = Keyword.get(opts, :limit, 50)
    offset = Keyword.get(opts, :offset, 0)
    status = Keyword.get(opts, :status, "active")
    order_by = Keyword.get(opts, :order_by, :name)

    from(r in Recipe,
      where: r.business_id == ^business_id,
      where: r.status == ^status,
      order_by: ^order_by,
      limit: ^limit,
      offset: ^offset
    )
    |> Repo.all()
  end

  def update_recipe(%Recipe{} = recipe, coach_id, attrs) do
    with {:ok, _coach} <- validate_coach_in_business(coach_id, recipe.business_id) do
      recipe
      |> Recipe.changeset(attrs)
      |> Repo.update()
    end
  end

  def delete_recipe(%Recipe{} = recipe, coach_id) do
    with {:ok, _coach} <- validate_coach_in_business(coach_id, recipe.business_id) do
      if recipe_in_use?(recipe.id) do
        {:error, :recipe_in_use}
      else
        Repo.delete(recipe)
      end
    end
  end

  def search_recipes(business_id, query) when is_binary(query) do
    search_pattern = "%#{query}%"

    from(r in Recipe,
      where: r.business_id == ^business_id,
      where: r.status == "active",
      where: ilike(r.name, ^search_pattern),
      order_by: r.name
    )
    |> Repo.all()
  end

  alias Easy.Nutrition.Meal

  def validate_coach_in_business(coach_id, business_id) do
    query =
      from c in Coach,
        where: c.id == ^coach_id and c.business_id == ^business_id

    case Repo.one(query) do
      nil -> {:error, :unauthorized}
      coach -> {:ok, coach}
    end
  end

  def validate_resource_in_business(resource, business_id) when is_struct(resource) do
    if resource.business_id == business_id do
      :ok
    else
      {:error, :unauthorized}
    end
  end

  def validate_recipe_in_business(recipe_id, business_id) do
    query =
      from r in Recipe,
        where: r.id == ^recipe_id and r.business_id == ^business_id

    case Repo.one(query) do
      nil -> {:error, :unauthorized}
      recipe -> {:ok, recipe}
    end
  end

  def validate_meal_in_business(meal_id, business_id) do
    query =
      from m in Meal,
        where: m.id == ^meal_id and m.business_id == ^business_id

    case Repo.one(query) do
      nil -> {:error, :unauthorized}
      meal -> {:ok, meal}
    end
  end

  # Fetches a recipe by ID
  defp fetch_recipe(recipe_id) do
    case Repo.get(Recipe, recipe_id) do
      nil -> {:error, :recipe_not_found}
      recipe -> {:ok, recipe}
    end
  end

  defp validate_same_business(business_id1, business_id2) do
    if business_id1 == business_id2 do
      :ok
    else
      {:error, :business_mismatch}
    end
  end

  defp maybe_validate_coach(nil, _business_id), do: :ok

  defp maybe_validate_coach(coach_id, business_id) do
    case validate_coach_in_business(coach_id, business_id) do
      {:ok, _coach} -> :ok
      error -> error
    end
  end

  defp recipe_in_use?(recipe_id) do
    meal_recipe_query =
      from mr in "meal_recipes",
        where: mr.recipe_id == ^recipe_id,
        select: count(mr.id)

    count = Repo.one(meal_recipe_query) || 0
    count > 0
  end
end
