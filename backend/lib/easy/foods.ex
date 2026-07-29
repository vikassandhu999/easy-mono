defmodule Easy.Foods do
  alias Easy.Ctx
  alias Easy.LibraryMedia
  alias Easy.Nutrition.{Food, Meal, MealItem, Plan, RecipeIngredient}
  alias Easy.Orgs.Coach
  alias Easy.Repo

  import Ecto.Query

  @spec get_visible_food(Ctx.t(), String.t()) :: {:ok, Food.t()} | {:error, :not_found}
  def get_visible_food(%Ctx{} = ctx, food_id) do
    Food
    |> Food.for_business_or_system(ctx.business_id)
    |> Food.include_media()
    |> Repo.get(food_id)
    |> ok_or_not_found()
  end

  @spec get_business_food(Ctx.t(), String.t()) :: {:ok, Food.t()} | {:error, :not_found}
  def get_business_food(%Ctx{} = ctx, food_id) do
    Food
    |> Food.for_business(ctx.business_id)
    |> Food.include_media()
    |> Repo.get(food_id)
    |> ok_or_not_found()
  end

  @spec list_visible_foods(Ctx.t(), keyword()) ::
          {:ok, %{count: non_neg_integer(), foods: [Food.t()]}}
  def list_visible_foods(%Ctx{} = ctx, opts \\ []) do
    search = String.trim(Keyword.get(opts, :search, "") || "")
    categories = Keyword.get(opts, :categories)
    offset = Keyword.get(opts, :offset, 0)
    limit = min(Keyword.get(opts, :limit, 20), 100)

    base =
      Food
      |> Food.for_business_or_system(ctx.business_id)
      |> Food.search(search)
      |> Food.for_categories(categories)

    ordered = if search == "", do: Food.newest(base), else: base

    {:ok,
     %{
       count: Repo.aggregate(base, :count, :id),
       foods: ordered |> Easy.Utils.paginate(offset, limit) |> Food.include_media() |> Repo.all()
     }}
  end

  @spec list_food_categories(Ctx.t()) :: {:ok, [String.t()]}
  def list_food_categories(%Ctx{} = ctx) do
    {:ok,
     Food
     |> Food.for_business_or_system(ctx.business_id)
     |> Food.distinct_categories()
     |> Repo.all()}
  end

  @spec create_food(Ctx.t(), map()) ::
          {:ok, Food.t()} | {:error, :not_found | Ecto.Changeset.t()}
  def create_food(%Ctx{} = ctx, attrs) do
    with {:ok, coach} <- get_coach(ctx),
         :ok <- LibraryMedia.authorize_attach(ctx, attrs[:media_id]),
         {:ok, food} <- ctx.business_id |> Food.insert_changeset(coach.id, attrs) |> Repo.insert() do
      {:ok, Repo.preload(food, :media)}
    end
  end

  @spec update_food(Ctx.t(), String.t(), map()) ::
          {:ok, Food.t()} | {:error, :not_found | :read_only_source | Ecto.Changeset.t()}
  def update_food(%Ctx{} = ctx, food_id, attrs) do
    with {:ok, food} <- get_visible_food(ctx, food_id),
         :ok <- ensure_editable(food),
         :ok <- LibraryMedia.authorize_attach(ctx, attrs[:media_id]),
         {:ok, updated} <- food |> Food.update_changeset(attrs) |> Repo.update() do
      {:ok, Repo.preload(updated, :media, force: true)}
    end
  end

  @spec delete_food(Ctx.t(), String.t()) ::
          {:ok, Food.t()} | {:error, :not_found | :read_only_source | :in_use | Ecto.Changeset.t()}
  def delete_food(%Ctx{} = ctx, food_id) do
    with {:ok, food} <- get_visible_food(ctx, food_id),
         :ok <- ensure_editable(food),
         :ok <- ensure_food_not_in_use(food.id) do
      Repo.delete(food)
    end
  end

  # `food_id` is `ON DELETE SET NULL` everywhere, but nulling it is only safe in the
  # diary: a log entry keeps `food_name` and its frozen macros, so history survives.
  # A meal item would violate the food-xor-recipe check (raising, not erroring), and
  # a recipe ingredient would silently drop that food's macros from the recipe total.
  # So a food still used by a plan or recipe is a conflict, not a cascade.
  defp ensure_food_not_in_use(food_id) do
    in_use? =
      Repo.exists?(from(mi in MealItem, where: mi.food_id == ^food_id)) or
        Repo.exists?(from(ri in RecipeIngredient, where: ri.food_id == ^food_id))

    if in_use?, do: {:error, :in_use}, else: :ok
  end

  @spec get_food_impact(Ctx.t(), String.t()) ::
          {:ok, %{templates: [map()], active_client_plans: [map()]}} | {:error, :not_found}
  def get_food_impact(%Ctx{} = ctx, food_id) do
    with {:ok, _food} <- get_visible_food(ctx, food_id) do
      plans =
        from(p in Plan,
          join: m in Meal,
          on: m.nutrition_plan_id == p.id,
          join: mi in MealItem,
          on: mi.nutrition_meal_id == m.id,
          where: p.business_id == ^ctx.business_id and mi.food_id == ^food_id,
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

  @spec copy_food(Ctx.t(), String.t()) ::
          {:ok, Food.t()} | {:error, :not_found | Ecto.Changeset.t()}
  def copy_food(%Ctx{} = ctx, food_id) do
    with {:ok, food} <- get_visible_food(ctx, food_id) do
      attrs = %{
        "name" => food.name,
        "brand" => food.brand,
        "barcode" => food.barcode,
        "category" => food.category,
        "calories_per_100g" => food.calories_per_100g,
        "protein_g_per_100g" => food.protein_g_per_100g,
        "carbs_g_per_100g" => food.carbs_g_per_100g,
        "fat_g_per_100g" => food.fat_g_per_100g,
        "fiber_g_per_100g" => food.fiber_g_per_100g,
        "sugar_g_per_100g" => food.sugar_g_per_100g,
        "allergens" => food.allergens,
        "dietary_tags" => food.dietary_tags,
        "notes" => food.notes,
        "image_url" => food.image_url,
        "media_id" => food.media_id,
        "serving_sizes" => Enum.map(food.serving_sizes, &serving_size_attrs/1)
      }

      create_food(ctx, attrs)
    end
  end

  defp serving_size_attrs(s) do
    %{"label" => s.label, "amount" => s.amount, "unit" => s.unit, "weight_g" => s.weight_g, "is_default" => s.is_default}
  end

  defp ensure_editable(%Food{source: source}) when source in [:system, :imported],
    do: {:error, :read_only_source}

  defp ensure_editable(_food), do: :ok

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
