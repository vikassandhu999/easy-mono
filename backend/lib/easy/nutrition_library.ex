defmodule Easy.Nutrition.Library do
  alias Easy.Ctx
  alias Easy.LibraryMedia
  alias Easy.Nutrition.{Food, Meal, MealItem, NutrientTotals, Plan, RecipeIngredient}
  alias Easy.Orgs.Coach
  alias Easy.Repo
  alias Easy.Utils

  import Ecto.Changeset
  import Ecto.Query

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
    categories = Keyword.get(opts, :categories)
    offset = Keyword.get(opts, :offset, 0)
    limit = min(Keyword.get(opts, :limit, 20), 20)

    base =
      Food
      |> Food.for_business_or_system(ctx.business_id)
      |> Food.search(search)
      |> Food.for_categories(categories)

    ordered = if search == "", do: Food.newest(base), else: base

    {:ok,
     %{
       count: Repo.aggregate(base, :count, :id),
       foods: ordered |> Utils.paginate(offset, limit) |> Food.include_media() |> Repo.all()
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

  @spec create_food(Ctx.t(), map()) :: {:ok, Food.t()} | {:error, :not_found | Ecto.Changeset.t()}
  def create_food(%Ctx{} = ctx, attrs) do
    with {:ok, coach} <- get_coach(ctx),
         :ok <- LibraryMedia.authorize_attach(ctx, attrs[:media_id]),
         {:ok, food} <- ctx.business_id |> Food.insert_changeset(coach.id, attrs) |> Repo.insert() do
      {:ok, Repo.preload(food, :media)}
    end
  end

  @spec update_food(Ctx.t(), String.t(), pos_integer(), map()) ::
          {:ok, Food.t()} | {:error, :not_found | :read_only_source | Ecto.Changeset.t()}
  def update_food(%Ctx{} = ctx, food_id, expected_revision, attrs) do
    with :ok <- ensure_coach(ctx) do
      mutate_food(ctx, food_id, expected_revision, &update_locked_food(ctx, &1, attrs))
    end
  end

  @spec delete_food(Ctx.t(), String.t(), pos_integer()) ::
          {:ok, Food.t()} | {:error, :not_found | :read_only_source | :in_use | Ecto.Changeset.t()}
  def delete_food(%Ctx{} = ctx, food_id, expected_revision) do
    with :ok <- ensure_coach(ctx) do
      mutate_food(ctx, food_id, expected_revision, &delete_locked_food(ctx, &1), reload?: false)
    end
  end

  @spec get_food_impact(Ctx.t(), String.t()) ::
          {:ok, %{templates: [map()], active_client_plans: [map()]}} | {:error, :not_found}
  def get_food_impact(%Ctx{} = ctx, food_id) do
    with {:ok, _food} <- get_food(ctx, food_id) do
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

  @spec copy_food(Ctx.t(), String.t()) :: {:ok, Food.t()} | {:error, :not_found | Ecto.Changeset.t()}
  def copy_food(%Ctx{} = ctx, food_id) do
    with {:ok, food} <- get_food(ctx, food_id) do
      attrs = %{
        name: food.name,
        brand: food.brand,
        barcode: food.barcode,
        category: food.category,
        calories_per_100g: food.calories_per_100g,
        protein_g_per_100g: food.protein_g_per_100g,
        carbs_g_per_100g: food.carbs_g_per_100g,
        fat_g_per_100g: food.fat_g_per_100g,
        fiber_g_per_100g: food.fiber_g_per_100g,
        sugar_g_per_100g: food.sugar_g_per_100g,
        allergens: food.allergens,
        dietary_tags: food.dietary_tags,
        notes: food.notes,
        image_url: food.image_url,
        media_id: food.media_id,
        serving_sizes: Enum.map(food.serving_sizes, &serving_size_attrs/1)
      }

      create_food(ctx, attrs)
    end
  end

  @spec resolve_food_portion(Food.t(), map()) ::
          {:ok, %{grams: float(), amount: float() | nil, unit: String.t() | nil, label: String.t() | nil}}
          | {:error, :invalid_portion}
  def resolve_food_portion(_food, %{kind: :gram, grams: grams}) when is_number(grams) and grams > 0 do
    {:ok, %{grams: grams / 1, amount: nil, unit: nil, label: nil}}
  end

  def resolve_food_portion(%Food{serving_sizes: sizes}, %{kind: :serving, amount: amount, unit: unit, label: label})
      when is_number(amount) and amount > 0 and is_binary(unit) do
    case Enum.find(sizes, &(&1.unit == unit and &1.label == label)) do
      %{amount: serving_amount, weight_g: weight_g} when serving_amount > 0 and weight_g > 0 ->
        grams = amount / serving_amount * weight_g

        if grams > 0 do
          {:ok, %{grams: grams / 1, amount: amount / 1, unit: unit, label: label}}
        else
          {:error, :invalid_portion}
        end

      _missing ->
        {:error, :invalid_portion}
    end
  end

  def resolve_food_portion(_food, _portion), do: {:error, :invalid_portion}

  @spec food_nutrients(Food.t()) :: NutrientTotals.t()
  def food_nutrients(%Food{} = food), do: NutrientTotals.from_food(food)

  defp mutate_food(ctx, food_id, expected_revision, mutation, opts \\ []) do
    result =
      Repo.transaction(fn ->
        food =
          Food
          |> Food.for_business_or_system(ctx.business_id)
          |> lock("FOR UPDATE")
          |> Repo.get(food_id)

        mutate_revisioned(food, expected_revision, mutation)
      end)

    finalize_food(result, Keyword.get(opts, :reload?, true))
  end

  defp mutate_revisioned(nil, _expected_revision, _mutation), do: Repo.rollback(:not_found)

  defp mutate_revisioned(%Food{source: source}, _expected_revision, _mutation)
       when source in [:system, :imported],
       do: Repo.rollback(:read_only_source)

  defp mutate_revisioned(%Food{revision: revision} = food, expected_revision, _mutation)
       when revision != expected_revision,
       do: Repo.rollback(stale_revision_changeset(food))

  defp mutate_revisioned(food, _expected_revision, mutation) do
    case mutation.(food) do
      {:ok, changed} -> changed
      {:error, reason} -> Repo.rollback(reason)
    end
  end

  defp update_locked_food(ctx, food, attrs) do
    with :ok <- LibraryMedia.authorize_attach(ctx, attrs[:media_id]) do
      food
      |> Food.update_changeset(attrs)
      |> put_change(:revision, food.revision + 1)
      |> Repo.update()
    end
  end

  defp delete_locked_food(ctx, food) do
    with :ok <- ensure_food_not_in_use(ctx.business_id, food.id) do
      Repo.delete(food)
    end
  end

  defp finalize_food({:ok, food}, true), do: {:ok, Repo.preload(food, :media, force: true)}
  defp finalize_food({:ok, food}, false), do: {:ok, food}
  defp finalize_food({:error, reason}, _reload?), do: {:error, reason}

  # `food_id` is `ON DELETE SET NULL` everywhere, but nulling it is only safe in the
  # diary: a log entry keeps `food_name` and its frozen macros, so history survives.
  # A meal item would violate the food-xor-recipe check (raising, not erroring), and
  # a recipe ingredient would silently drop that food's macros from the recipe total.
  # So a food still used by a plan or recipe is a conflict, not a cascade.
  defp ensure_food_not_in_use(business_id, food_id) do
    in_use? =
      Repo.exists?(from(mi in MealItem.for_business(business_id), where: mi.food_id == ^food_id)) or
        Repo.exists?(from(ri in RecipeIngredient.for_business(business_id), where: ri.food_id == ^food_id))

    if in_use?, do: {:error, :in_use}, else: :ok
  end

  defp serving_size_attrs(serving) do
    %{
      label: serving.label,
      amount: serving.amount,
      unit: serving.unit,
      weight_g: serving.weight_g,
      is_default: serving.is_default
    }
  end

  defp stale_revision_changeset(food) do
    food
    |> change()
    |> add_error(:revision, "is stale")
    |> Map.put(:action, :stale_revision)
  end

  defp ensure_coach(%Ctx{coach_id: coach_id}) when not is_nil(coach_id), do: :ok
  defp ensure_coach(%Ctx{}), do: {:error, :not_found}

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
