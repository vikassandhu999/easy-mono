defmodule Easy.Nutrition.Library do
  alias Easy.CopyName
  alias Easy.Ctx
  alias Easy.CursorPage
  alias Easy.Nutrition.{Food, FoodWriter, PlanReader, Recipe}
  alias Easy.Nutrition.LibraryUsage
  alias Easy.Nutrition.RecipeWriter
  alias Easy.Repo
  alias Easy.Utils

  import Ecto.Query

  @type plan_reference :: %{id: String.t(), name: String.t(), client_id: String.t() | nil}
  @type recipe_impact :: %{templates: [plan_reference()], client_plans: [plan_reference()]}
  @type food_impact :: %{
          recipes: [%{id: String.t(), name: String.t()}],
          templates: [plan_reference()],
          client_plans: [plan_reference()]
        }

  # Foods

  @spec list_food_usage(Ctx.t(), String.t(), keyword()) :: {:ok, map()} | {:error, atom()}
  def list_food_usage(ctx, id, opts), do: LibraryUsage.page(ctx, :food, id, opts)

  @spec list_recipe_usage(Ctx.t(), String.t(), keyword()) :: {:ok, map()} | {:error, atom()}
  def list_recipe_usage(ctx, id, opts), do: LibraryUsage.page(ctx, :recipe, id, opts)

  @spec get_food(Ctx.t(), String.t()) :: {:ok, Food.t()} | {:error, :not_found}
  def get_food(%Ctx{} = ctx, food_id) do
    Food
    |> Food.for_business_or_system(ctx.business_id)
    |> Food.include_media()
    |> Repo.get(food_id)
    |> ok_or_not_found()
  end

  @spec list_foods(Ctx.t(), keyword()) :: {:ok, %{count: non_neg_integer(), foods: [Food.t()]}}
  def list_foods(%Ctx{} = ctx, opts \\ []) do
    search = String.trim(Keyword.get(opts, :search, "") || "")

    base =
      Food
      |> Food.for_business_or_system(ctx.business_id)
      |> Food.search(search)
      |> Food.for_categories(Keyword.get(opts, :categories))

    {:ok,
     %{
       count: Repo.aggregate(base, :count, :id),
       foods: base |> Food.newest() |> Utils.paginate(opts) |> Food.include_media() |> Repo.all()
     }}
  end

  @spec list_food_page(Ctx.t(), keyword()) :: {:ok, CursorPage.t(Food.t())} | {:error, :invalid_cursor | :conflict}
  def list_food_page(%Ctx{} = ctx, opts) do
    base =
      Food
      |> Food.for_business_or_system(ctx.business_id)
      |> Food.search(String.trim(Keyword.get(opts, :search, "") || ""))
      |> Food.for_categories(Keyword.get(opts, :categories))

    cursor_page(base, opts, &Food.include_media/1)
  end

  @spec list_recipe_page(Ctx.t(), keyword()) :: {:ok, CursorPage.t(Recipe.t())} | {:error, :invalid_cursor | :conflict}
  def list_recipe_page(%Ctx{} = ctx, opts) do
    base =
      Recipe
      |> Recipe.for_business(ctx.business_id)
      |> Recipe.search(String.trim(Keyword.get(opts, :search, "") || ""))

    cursor_page(base, opts, &Recipe.include_ingredients(&1, ctx.business_id))
  end

  defp cursor_page(base, opts, preload) do
    Repo.snapshot(fn ->
      limit = CursorPage.limit(opts)

      with {:ok, query} <- CursorPage.query(exclude(base, :order_by), Keyword.get(opts, :cursor), limit) do
        rows = query |> preload.() |> Repo.all()
        {:ok, CursorPage.finish(rows, limit, Repo.aggregate(base, :count, :id))}
      end
    end)
  end

  @spec list_food_categories(Ctx.t()) :: {:ok, [String.t()]}
  def list_food_categories(%Ctx{} = ctx) do
    {:ok,
     Food
     |> Food.for_business_or_system(ctx.business_id)
     |> Food.distinct_categories()
     |> Repo.all()}
  end

  @spec create_food(Ctx.t(), map()) :: {:ok, Food.t()} | {:error, :not_found | Ecto.Changeset.t()}
  def create_food(%Ctx{} = ctx, attrs) do
    with {:ok, food} <- FoodWriter.create(ctx, attrs) do
      {:ok, Repo.preload(food, :media)}
    end
  end

  @spec update_food(Ctx.t(), String.t(), pos_integer(), map()) ::
          {:ok, Food.t()} | {:error, FoodWriter.update_error()}
  def update_food(%Ctx{} = ctx, food_id, expected_revision, attrs) do
    with {:ok, food} <- FoodWriter.update(ctx, food_id, expected_revision, attrs) do
      {:ok, Repo.preload(food, :media, force: true)}
    end
  end

  @spec delete_food(Ctx.t(), String.t()) :: {:ok, Food.t()} | {:error, FoodWriter.update_error()}
  defdelegate delete_food(ctx, food_id), to: FoodWriter, as: :delete

  @spec get_food_impact(Ctx.t(), String.t()) ::
          {:ok, food_impact()} | {:error, :not_found | :conflict}
  def get_food_impact(%Ctx{} = ctx, food_id) do
    Repo.snapshot(fn ->
      with :ok <- ensure_exists(Food.for_business_or_system(ctx.business_id), food_id) do
        {:ok,
         Map.put(
           menu_usage(ctx, :food, food_id),
           :recipes,
           recipe_usage(ctx.business_id, food_id)
         )}
      end
    end)
  end

  @spec copy_food(Ctx.t(), String.t()) ::
          {:ok, Food.t()} | {:error, :not_found | Ecto.Changeset.t()}
  def copy_food(%Ctx{} = ctx, food_id) do
    with {:ok, food} <- get_food(ctx, food_id) do
      create_food(ctx, Food.copy_attrs(food))
    end
  end

  # Recipes

  @spec get_recipe(Ctx.t(), String.t()) :: {:ok, Recipe.t()} | {:error, :not_found | :conflict}
  def get_recipe(%Ctx{} = ctx, recipe_id) do
    Repo.snapshot(fn ->
      Recipe
      |> Recipe.for_business(ctx.business_id)
      |> Recipe.include_ingredients(ctx.business_id)
      |> Repo.get(recipe_id)
      |> ok_or_not_found()
    end)
  end

  @spec list_recipes(Ctx.t(), keyword()) ::
          {:ok, %{count: non_neg_integer(), recipes: [Recipe.t()]}} | {:error, :conflict}
  def list_recipes(%Ctx{} = ctx, opts \\ []) do
    search = String.trim(Keyword.get(opts, :search, "") || "")
    base = Recipe |> Recipe.for_business(ctx.business_id) |> Recipe.search(search)

    Repo.snapshot(fn ->
      {:ok,
       %{
         count: Repo.aggregate(base, :count, :id),
         recipes:
           base
           |> Recipe.newest()
           |> Utils.paginate(opts)
           |> Recipe.include_ingredients(ctx.business_id)
           |> Repo.all()
       }}
    end)
  end

  @spec create_recipe(Ctx.t(), map()) ::
          {:ok, Recipe.t()} | {:error, RecipeWriter.write_error() | :conflict}
  def create_recipe(%Ctx{} = ctx, attrs) do
    with {:ok, recipe} <- RecipeWriter.create(ctx, attrs) do
      get_recipe(ctx, recipe.id)
    end
  end

  @spec update_recipe(Ctx.t(), String.t(), pos_integer(), map()) ::
          {:ok, Recipe.t()} | {:error, RecipeWriter.write_error() | :conflict}
  def update_recipe(%Ctx{} = ctx, recipe_id, expected_revision, attrs) do
    with {:ok, recipe} <- RecipeWriter.update(ctx, recipe_id, expected_revision, attrs) do
      get_recipe(ctx, recipe.id)
    end
  end

  @spec delete_recipe(Ctx.t(), String.t()) ::
          {:ok, Recipe.t()} | {:error, :not_found | :in_use | Ecto.Changeset.t()}
  defdelegate delete_recipe(ctx, recipe_id), to: RecipeWriter, as: :delete

  @spec get_recipe_impact(Ctx.t(), String.t()) ::
          {:ok, recipe_impact()} | {:error, :not_found | :conflict}
  def get_recipe_impact(%Ctx{} = ctx, recipe_id) do
    Repo.snapshot(fn ->
      with :ok <- ensure_exists(Recipe.for_business(ctx.business_id), recipe_id) do
        {:ok, menu_usage(ctx, :recipe, recipe_id)}
      end
    end)
  end

  @spec copy_recipe(Ctx.t(), String.t()) ::
          {:ok, Recipe.t()} | {:error, RecipeWriter.write_error() | :conflict}
  def copy_recipe(%Ctx{} = ctx, recipe_id) do
    with {:ok, recipe} <- get_recipe(ctx, recipe_id) do
      names = Repo.all(from(r in Recipe.for_business(ctx.business_id), select: r.name))
      name = CopyName.next(recipe.name, names)
      create_recipe(ctx, Recipe.copy_attrs(recipe, name))
    end
  end

  # Impact queries

  defp recipe_usage(business_id, food_id) do
    from(recipe in Recipe.using_food(business_id, food_id),
      order_by: [asc: recipe.name, asc: recipe.id],
      select: %{id: recipe.id, name: recipe.name}
    )
    |> Repo.all()
  end

  defp menu_usage(ctx, kind, id) do
    plans = PlanReader.library_usage(ctx, kind, id)

    %{
      templates: plans |> Enum.filter(&(&1.kind == :template)) |> Enum.map(&Map.delete(&1, :kind)),
      client_plans: plans |> Enum.filter(&(&1.kind == :client_plan)) |> Enum.map(&Map.delete(&1, :kind))
    }
  end

  # Shared guards

  defp ensure_exists(query, id) do
    if Repo.exists?(where(query, [item], item.id == ^id)), do: :ok, else: {:error, :not_found}
  end

  defp ok_or_not_found(nil), do: {:error, :not_found}
  defp ok_or_not_found(record), do: {:ok, record}
end
