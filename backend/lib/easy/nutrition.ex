defmodule Easy.Nutrition do
  import Ecto.Query, warn: false

  alias Easy.Repo
  alias Easy.Utils
  alias Easy.Nutrition.{Ingredient, Recipe}

  @default_limit 50
  @max_limit 100

  def list_ingredients(business_id, params \\ %{}) do
    limit = params |> fetch_param(:limit) |> parse_integer() |> clamp_limit()
    offset = params |> fetch_param(:offset) |> parse_integer() |> normalize_offset()
    search = params |> fetch_param(:search) |> parse_search()

    base_query =
      from i in Ingredient,
        where: i.business_id == ^business_id,
        order_by: [desc: i.inserted_at]

    query =
      if search do
        from i in base_query, where: ilike(i.name, ^"%#{search}%")
      else
        base_query
      end

    total = Repo.aggregate(query, :count)

    query =
      from i in query,
        offset: ^offset,
        limit: ^limit

    {Repo.all(query), %{limit: limit, offset: offset, total: total}}
  end

  def fetch_ingredient(business_id, ingredient_id) do
    case Repo.get_by(Ingredient, id: ingredient_id, business_id: business_id) do
      nil -> {:error, :not_found}
      ingredient -> {:ok, ingredient}
    end
  end

  def create_ingredient(business_id, coach_id, attrs) do
    attrs =
      attrs
      |> Map.put("business_id", business_id)
      |> Map.put("creator_id", coach_id)

    %Ingredient{}
    |> Ingredient.changeset(attrs)
    |> Repo.insert()
  end

  def update_ingredient(%Ingredient{} = ingredient, attrs) do
    ingredient
    |> Ingredient.changeset(attrs)
    |> Repo.update()
  end

  def delete_ingredient(%Ingredient{} = ingredient) do
    Repo.delete(ingredient)
  end

  def change_ingredient(%Ingredient{} = ingredient, attrs \\ %{}) do
    Ingredient.changeset(ingredient, attrs)
  end

  def create_recipe(business_id, coach_id, attrs) when is_binary(business_id) do
    attrs =
      attrs
      |> Map.put("business_id", business_id)
      |> Map.put("creator_id", coach_id)

    create_recipe(attrs)
  end

  def create_recipe(attrs) when is_map(attrs) do
    attrs = normalize_ingredient_orders(attrs)

    %Recipe{}
    |> Recipe.changeset(attrs)
    |> Repo.insert()
    |> handle_recipe_result()
  end

  def update_recipe(%Recipe{} = recipe, attrs) do
    attrs = normalize_ingredient_orders(attrs)

    recipe
    |> Repo.preload(:recipe_ingredients)
    |> Recipe.changeset(attrs)
    |> Repo.update()
    |> handle_recipe_result()
  end

  def change_recipe(%Recipe{} = recipe, attrs \\ %{}) do
    Recipe.changeset(recipe, attrs)
  end

  defp handle_recipe_result({:ok, recipe}), do: {:ok, repo_preload_recipe(recipe)}
  defp handle_recipe_result({:error, changeset}), do: {:error, changeset}

  defp normalize_ingredient_orders(%{} = attrs) do
    cond do
      Map.has_key?(attrs, :recipe_ingredients) ->
        Map.update!(attrs, :recipe_ingredients, &inject_default_orders/1)

      Map.has_key?(attrs, "recipe_ingredients") ->
        Map.update!(attrs, "recipe_ingredients", &inject_default_orders/1)

      true ->
        attrs
    end
  end

  defp normalize_ingredient_orders(attrs), do: attrs

  defp inject_default_orders(ingredients) when is_list(ingredients) do
    ingredients
    |> Enum.with_index()
    |> Enum.map(fn {ingredient_attrs, index} ->
      if order_present?(ingredient_attrs) do
        ingredient_attrs
      else
        maybe_put_order(ingredient_attrs, index)
      end
    end)
  end

  defp inject_default_orders(ingredients), do: ingredients

  defp order_present?(%{} = attrs) do
    present?(attrs, :order) || present?(attrs, "order")
  end

  defp order_present?(_), do: true

  defp present?(attrs, key) do
    Map.has_key?(attrs, key) && not is_nil(Map.get(attrs, key))
  end

  defp maybe_put_order(%{} = attrs, index) do
    key = if has_atom_keys?(attrs), do: :order, else: "order"
    Map.put(attrs, key, index)
  end

  defp maybe_put_order(value, _index), do: value

  defp has_atom_keys?(attrs) do
    Enum.any?(Map.keys(attrs), &is_atom/1)
  end

  defp repo_preload_recipe(recipe) do
    Repo.preload(recipe, [
      :business,
      :creator,
      recipe_ingredients: [:ingredient, :unit]
    ])
  end

  defp fetch_param(params, key) when is_atom(key) do
    Map.get(params, key) || Map.get(params, Atom.to_string(key))
  end

  defp parse_integer(value) when is_integer(value), do: value
  defp parse_integer(value) when is_binary(value), do: Utils.safe_int(value)
  defp parse_integer(_), do: nil

  defp clamp_limit(nil), do: @default_limit

  defp clamp_limit(limit) when is_integer(limit) do
    limit
    |> max(1)
    |> min(@max_limit)
  end

  defp normalize_offset(nil), do: 0

  defp normalize_offset(offset) when is_integer(offset) do
    max(offset, 0)
  end

  defp parse_search(nil), do: nil
  defp parse_search(search) when is_binary(search), do: Utils.parse_search(search)
  defp parse_search(_), do: nil
end
