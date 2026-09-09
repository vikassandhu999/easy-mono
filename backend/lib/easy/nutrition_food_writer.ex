defmodule Easy.Nutrition.FoodWriter do
  alias Easy.Ctx
  alias Easy.LibraryMedia
  alias Easy.Nutrition.{Food, PlanReader, RecipeIngredient}
  alias Easy.Repo
  alias Easy.Revision

  import Ecto.Changeset

  @type update_error :: :not_found | :read_only_source | :in_use | Ecto.Changeset.t()

  @spec create(Ctx.t(), map()) :: {:ok, Food.t()} | {:error, :not_found | Ecto.Changeset.t()}
  def create(%Ctx{} = ctx, attrs) do
    with :ok <- Ctx.ensure_coach(ctx),
         changeset <- Food.insert_changeset(ctx.business_id, ctx.coach_id, attrs),
         :ok <- authorize_media(ctx, changeset) do
      Repo.insert(changeset)
    end
  end

  @spec update(Ctx.t(), String.t(), pos_integer(), map()) :: {:ok, Food.t()} | {:error, update_error()}
  def update(%Ctx{} = ctx, food_id, expected_revision, attrs) do
    with :ok <- Ctx.ensure_coach(ctx) do
      Revision.locked(
        Food.for_business_or_system(ctx.business_id),
        food_id,
        expected_revision,
        &update_locked_food(ctx, &1, attrs)
      )
    end
  end

  @spec delete(Ctx.t(), String.t()) :: {:ok, Food.t()} | {:error, update_error()}
  def delete(%Ctx{} = ctx, food_id) do
    with :ok <- Ctx.ensure_coach(ctx) do
      Revision.locked(
        Food.for_business_or_system(ctx.business_id),
        food_id,
        :any,
        &delete_locked_food(ctx, &1)
      )
    end
  end

  # Food mutations

  defp update_locked_food(_ctx, %Food{source: :system}, _attrs), do: {:error, :read_only_source}

  defp update_locked_food(ctx, food, attrs) do
    changeset = Food.update_changeset(food, attrs)

    with :ok <- authorize_media(ctx, changeset),
         :ok <- protect_serving_references(ctx, food, changeset) do
      Repo.update(changeset)
    end
  end

  defp authorize_media(_ctx, %{valid?: false}), do: :ok
  defp authorize_media(ctx, changeset), do: LibraryMedia.authorize_attach(ctx, get_change(changeset, :media_id))

  defp protect_serving_references(_ctx, _food, %{valid?: false}), do: :ok

  defp protect_serving_references(ctx, food, changeset) do
    sizes = get_field(changeset, :serving_sizes)

    removed =
      Enum.reject(food.serving_sizes, fn stored ->
        Enum.any?(sizes, &(&1.unit == stored.unit and &1.label == stored.label))
      end)

    if Enum.any?(removed, &serving_used?(ctx, food.id, &1)), do: {:error, :in_use}, else: :ok
  end

  defp serving_used?(ctx, food_id, size) do
    portion = %{kind: :serving, unit: size.unit, label: size.label}

    PlanReader.library_item_used?(ctx, :food, food_id, portion) or
      Repo.exists?(
        RecipeIngredient.for_food(ctx.business_id, food_id)
        |> RecipeIngredient.for_portion(portion)
      )
  end

  # The Library row lock serializes menu references against deletion.
  defp delete_locked_food(_ctx, %Food{source: :system}), do: {:error, :read_only_source}

  defp delete_locked_food(ctx, food) do
    if food_used_structurally?(ctx, food.id) do
      {:error, :in_use}
    else
      Repo.delete(food)
    end
  end

  defp food_used_structurally?(ctx, food_id) do
    PlanReader.library_item_used?(ctx, :food, food_id) or
      Repo.exists?(RecipeIngredient.for_food(ctx.business_id, food_id))
  end
end
