defmodule Easy.Foods do
  alias Easy.Nutrition.Food
  alias Easy.Orgs.Coach
  alias Easy.Repo

  @spec get_visible_food(String.t(), String.t()) :: {:ok, Food.t()} | {:error, :not_found}
  def get_visible_food(business_id, food_id) do
    Food
    |> Food.for_business_or_system(business_id)
    |> Repo.get(food_id)
    |> ok_or_not_found()
  end

  @spec get_business_food(String.t(), String.t()) :: {:ok, Food.t()} | {:error, :not_found}
  def get_business_food(business_id, food_id) do
    Food
    |> Food.for_business(business_id)
    |> Repo.get(food_id)
    |> ok_or_not_found()
  end

  @spec list_visible_foods(String.t(), String.t() | nil, non_neg_integer(), pos_integer()) ::
          {:ok, %{count: non_neg_integer(), foods: [Food.t()]}}
  def list_visible_foods(business_id, search, offset, limit) do
    search = String.trim(search || "")
    base = Food |> Food.for_business_or_system(business_id) |> Food.search(search)
    ordered = if search == "", do: Food.newest(base), else: base

    {:ok,
     %{
       count: Repo.aggregate(base, :count, :id),
       foods: ordered |> Easy.Utils.paginate(offset, limit) |> Repo.all()
     }}
  end

  @spec create_food(String.t(), String.t(), map()) ::
          {:ok, Food.t()} | {:error, Ecto.Changeset.t()}
  def create_food(business_id, coach_id, attrs) do
    business_id
    |> Food.insert_changeset(coach_id, attrs)
    |> Repo.insert()
  end

  @spec create_food_for_coach_user(String.t(), String.t(), map()) ::
          {:ok, Food.t()} | {:error, :not_found | Ecto.Changeset.t()}
  def create_food_for_coach_user(business_id, user_id, attrs) do
    with {:ok, coach} <- get_coach_for_user(business_id, user_id) do
      create_food(business_id, coach.id, attrs)
    end
  end

  @spec update_food(Food.t(), map()) :: {:ok, Food.t()} | {:error, Ecto.Changeset.t()}
  def update_food(%Food{} = food, attrs) do
    food
    |> Food.update_changeset(attrs)
    |> Repo.update()
  end

  @spec update_food(String.t(), String.t(), map()) ::
          {:ok, Food.t()} | {:error, :not_found | Ecto.Changeset.t()}
  def update_food(business_id, food_id, attrs) do
    with {:ok, food} <- get_business_food(business_id, food_id) do
      update_food(food, attrs)
    end
  end

  @spec delete_food(Food.t()) :: {:ok, Food.t()} | {:error, Ecto.Changeset.t()}
  def delete_food(%Food{} = food), do: Repo.delete(food)

  @spec delete_food(String.t(), String.t()) ::
          {:ok, Food.t()} | {:error, :not_found | Ecto.Changeset.t()}
  def delete_food(business_id, food_id) do
    with {:ok, food} <- get_business_food(business_id, food_id) do
      delete_food(food)
    end
  end

  defp get_coach_for_user(business_id, user_id) do
    Coach
    |> Coach.for_business(business_id)
    |> Coach.for_user(user_id)
    |> Repo.one()
    |> ok_or_not_found()
  end

  defp ok_or_not_found(nil), do: {:error, :not_found}
  defp ok_or_not_found(record), do: {:ok, record}
end
