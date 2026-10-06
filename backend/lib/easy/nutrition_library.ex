defmodule Easy.Nutrition.Library do
  alias Easy.Ctx
  alias Easy.CursorPage
  alias Easy.Nutrition.Food
  alias Easy.Nutrition.LibraryUsage
  alias Easy.Nutrition.Nutrients
  alias Easy.Nutrition.Recipe
  alias Easy.Repo
  alias Easy.Revision
  alias Easy.Utils
  import Ecto.Query

  @spec get_food(Ctx.t(), String.t()) :: {:ok, Food.t()} | {:error, atom()}
  def get_food(ctx, id), do: Food.for_business_or_system(ctx.business_id) |> preload(:media) |> Repo.get(id) |> found()
  @spec get_recipe(Ctx.t(), String.t()) :: {:ok, Recipe.t()} | {:error, term()}
  def get_recipe(ctx, id) do
    with {:ok, recipe} <- Recipe.for_business(ctx.business_id) |> Repo.get(id) |> found(),
         do: hydrate_recipe(ctx, recipe)
  end

  @spec list_foods(Ctx.t(), keyword()) :: {:ok, map()}
  def list_foods(ctx, opts \\ []) do
    q = base_foods(ctx, opts)

    {:ok,
     %{
       count: Repo.aggregate(q, :count),
       foods: q |> order_by([x], desc: x.inserted_at, desc: x.id) |> Utils.paginate(opts) |> preload(:media) |> Repo.all()
     }}
  end

  @spec list_recipes(Ctx.t(), keyword()) :: {:ok, map()} | {:error, term()}
  def list_recipes(ctx, opts \\ []) do
    q = base_recipes(ctx, opts)

    with {:ok, rows} <-
           q
           |> order_by([x], desc: x.inserted_at, desc: x.id)
           |> Utils.paginate(opts)
           |> Repo.all()
           |> Easy.Result.traverse(&hydrate_recipe(ctx, &1)),
         do: {:ok, %{count: Repo.aggregate(q, :count), recipes: rows}}
  end

  @spec list_food_page(Ctx.t(), keyword()) :: {:ok, map()} | {:error, term()}
  def list_food_page(ctx, opts), do: page(base_foods(ctx, opts) |> preload(:media), opts, &{:ok, &1})
  @spec list_recipe_page(Ctx.t(), keyword()) :: {:ok, map()} | {:error, term()}
  def list_recipe_page(ctx, opts), do: page(base_recipes(ctx, opts), opts, &hydrate_recipe(ctx, &1))

  defp page(q, opts, hydrate) do
    limit = CursorPage.limit(opts)

    with :ok <- CursorPage.validate_options(opts),
         {:ok, paged} <- CursorPage.query(exclude(q, :order_by), opts[:cursor] || "start", limit),
         {:ok, rows} <- Easy.Result.traverse(Repo.all(paged), hydrate),
         do: {:ok, CursorPage.finish(rows, limit, Repo.aggregate(q, :count))}
  end

  defp base_foods(ctx, opts) do
    q = Food.for_business_or_system(ctx.business_id) |> active() |> Food.search(opts[:search] || "")
    if opts[:categories] in [nil, []], do: q, else: where(q, [f], f.category in ^opts[:categories])
  end

  defp base_recipes(ctx, opts), do: Recipe.for_business(ctx.business_id) |> active() |> search(opts[:search])
  defp active(q), do: where(q, [x], is_nil(x.archived_at))
  defp search(q, s) when s in [nil, ""], do: q
  defp search(q, s), do: where(q, [x], ilike(x.name, ^Easy.Search.like_pattern(String.trim(s))))
  @spec list_food_categories(Ctx.t()) :: {:ok, [String.t()]}
  def list_food_categories(ctx),
    do:
      {:ok,
       Repo.all(
         from(f in base_foods(ctx, []),
           where: not is_nil(f.category) and f.category != "",
           distinct: f.category,
           select: f.category,
           order_by: f.category
         )
       )}

  @spec create_food(Ctx.t(), map()) :: {:ok, Food.t()} | {:error, term()}
  def create_food(ctx, attrs) do
    with :ok <- Ctx.ensure_coach(ctx),
         cs <- Food.insert_changeset(ctx.business_id, ctx.coach_id, attrs),
         :ok <- authorize_media(ctx, cs),
         {:ok, row} <- Repo.insert(cs),
         do: get_food(ctx, row.id)
  end

  @spec update_food(Ctx.t(), String.t(), pos_integer(), map()) :: {:ok, Food.t()} | {:error, term()}
  def update_food(ctx, id, expected, attrs) do
    with :ok <- Ctx.ensure_coach(ctx),
         {:ok, row} <-
           Revision.locked(Food.for_business_or_system(ctx.business_id), id, expected, &save_food(ctx, &1, attrs)),
         do: get_food(ctx, row.id)
  end

  defp save_food(_ctx, %{source: :system}, _attrs), do: {:error, :read_only_source}

  defp save_food(ctx, row, attrs) do
    cs = Food.update_changeset(row, attrs)
    with :ok <- authorize_media(ctx, cs), do: Repo.update(cs)
  end

  defp authorize_media(ctx, cs), do: Easy.LibraryMedia.authorize_attach(ctx, Ecto.Changeset.get_change(cs, :media_id))
  @spec create_recipe(Ctx.t(), map()) :: {:ok, Recipe.t()} | {:error, term()}
  def create_recipe(ctx, attrs) do
    with :ok <- Ctx.ensure_coach(ctx),
         {:ok, recipe} <-
           Recipe.insert_changeset(ctx.business_id, ctx.coach_id, attrs) |> Ecto.Changeset.apply_action(:insert),
         {:ok, _} <- hydrate_recipe(ctx, recipe),
         {:ok, row} <- Repo.insert(recipe),
         do: get_recipe(ctx, row.id)
  end

  @spec update_recipe(Ctx.t(), String.t(), pos_integer(), map()) :: {:ok, Recipe.t()} | {:error, term()}
  def update_recipe(ctx, id, expected, attrs) do
    with :ok <- Ctx.ensure_coach(ctx),
         {:ok, row} <- Revision.locked(Recipe.for_business(ctx.business_id), id, expected, &save_recipe(ctx, &1, attrs)),
         do: get_recipe(ctx, row.id)
  end

  defp save_recipe(ctx, row, attrs) do
    cs = Recipe.update_changeset(row, attrs)

    with {:ok, updated} <- Ecto.Changeset.apply_action(cs, :update),
         {:ok, _} <- hydrate_recipe(ctx, updated),
         do: Repo.update(cs)
  end

  @spec delete_food(Ctx.t(), String.t()) :: {:ok, Food.t()} | {:error, term()}
  def delete_food(ctx, id), do: archive(ctx, Food.for_business(ctx.business_id), id)
  @spec delete_recipe(Ctx.t(), String.t()) :: {:ok, Recipe.t()} | {:error, term()}
  def delete_recipe(ctx, id), do: archive(ctx, Recipe.for_business(ctx.business_id), id)

  defp archive(ctx, q, id) do
    with :ok <- Ctx.ensure_coach(ctx),
         do:
           Revision.locked(q, id, :any, fn row ->
             Repo.update(Ecto.Changeset.change(row, archived_at: DateTime.utc_now(:second), revision: row.revision + 1))
           end)
  end

  @spec copy_food(Ctx.t(), String.t()) :: {:ok, Food.t()} | {:error, term()}
  def copy_food(ctx, id) do
    with {:ok, row} <- get_food(ctx, id),
         do:
           create_food(
             ctx,
             row
             |> Map.take([
               :name,
               :brand,
               :category,
               :nutrients,
               :servings,
               :default_serving_id,
               :notes,
               :media_id,
               :allergens,
               :dietary_tags,
               :tags
             ])
             |> Map.put(:name, row.name <> " (copy)")
           )
  end

  @spec copy_recipe(Ctx.t(), String.t()) :: {:ok, Recipe.t()} | {:error, term()}
  def copy_recipe(ctx, id) do
    with {:ok, row} <- get_recipe(ctx, id),
         do:
           create_recipe(
             ctx,
             row
             |> Map.take([
               :name,
               :description,
               :instructions,
               :ingredients,
               :servings_count,
               :cooked_weight_g,
               :allergens,
               :dietary_tags,
               :tags
             ])
             |> Map.put(:name, row.name <> " (copy)")
           )
  end

  @spec resolve(Ctx.t(), map(), map()) :: {:ok, map()} | {:error, term()}
  def resolve(ctx, %{"type" => "food", "id" => id}, portion) do
    with {:ok, food} <- get_food(ctx, id),
         {:ok, grams} <- portion_grams(portion, food.servings),
         do:
           {:ok,
            %{
              "name" => food.name,
              "grams" => grams,
              "nutrients" => Nutrients.scale(food.nutrients, grams / 100),
              "food_components" => [
                %{
                  "food_id" => food.id,
                  "name" => food.name,
                  "grams" => grams,
                  "nutrients" => Nutrients.scale(food.nutrients, grams / 100)
                }
              ]
            }}
  end

  def resolve(ctx, %{"type" => "recipe", "id" => id}, portion) do
    with {:ok, recipe} <- get_recipe(ctx, id),
         true <- recipe.grams > 0 || {:error, :invalid_portion},
         {:ok, grams} <- portion_grams(portion, [%{"id" => "serving", "grams" => recipe.grams / recipe.servings_count}]),
         do:
           {:ok,
            %{
              "name" => recipe.name,
              "grams" => grams,
              "nutrients" => Nutrients.scale(recipe.nutrients, grams / 100),
              "food_components" => scale_components(recipe.food_components, grams / recipe.grams)
            }}
  end

  def resolve(_ctx, _source, _portion), do: {:error, :invalid_portion}
  @spec portion_grams(map(), [map()]) :: {:ok, number()} | {:error, atom()}
  def portion_grams(%{"type" => "grams", "grams" => n}, _) when is_number(n) and n > 0, do: {:ok, n}

  def portion_grams(%{"type" => "serving", "serving_id" => id, "amount" => n}, servings) when is_number(n) and n > 0 do
    case Enum.find(servings, &(&1["id"] == id)) do
      nil -> {:error, :invalid_portion}
      s -> {:ok, s["grams"] * n}
    end
  end

  def portion_grams(_, _), do: {:error, :invalid_portion}
  @spec hydrate_recipe(Ctx.t(), Recipe.t()) :: {:ok, Recipe.t()} | {:error, term()}
  def hydrate_recipe(ctx, recipe) do
    with {:ok, items} <-
           Easy.Result.traverse(recipe.ingredients, fn i ->
             resolve(ctx, %{"type" => "food", "id" => i["food_id"]}, i["portion"])
           end) do
      grams = recipe.cooked_weight_g || Enum.sum(Enum.map(items, & &1["grams"]))

      nutrients =
        if grams > 0, do: Nutrients.scale(Nutrients.sum(Enum.map(items, & &1["nutrients"])), 100 / grams), else: %{}

      {:ok,
       %{
         recipe
         | grams: grams / 1,
           nutrients: nutrients,
           food_components: Enum.flat_map(items, & &1["food_components"])
       }}
    end
  end

  @spec scale_components([map()], number()) :: [map()]
  def scale_components(components, factor),
    do:
      Enum.map(components, fn c ->
        c |> Map.update!("grams", &(&1 * factor)) |> Map.update!("nutrients", &Nutrients.scale(&1, factor))
      end)

  defp found(nil), do: {:error, :not_found}
  defp found(row), do: {:ok, row}
  @spec list_food_usage(Ctx.t(), String.t(), keyword()) :: {:ok, map()} | {:error, term()}
  def list_food_usage(ctx, id, opts), do: LibraryUsage.page(ctx, :food, id, opts)
  @spec list_recipe_usage(Ctx.t(), String.t(), keyword()) :: {:ok, map()} | {:error, term()}
  def list_recipe_usage(ctx, id, opts), do: LibraryUsage.page(ctx, :recipe, id, opts)
  @spec get_food_impact(Ctx.t(), String.t()) :: {:ok, map()} | {:error, term()}
  def get_food_impact(ctx, id), do: LibraryUsage.impact(ctx, :food, id)
  @spec get_recipe_impact(Ctx.t(), String.t()) :: {:ok, map()} | {:error, term()}
  def get_recipe_impact(ctx, id), do: LibraryUsage.impact(ctx, :recipe, id)
end
