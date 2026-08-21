defmodule EasyWeb.Coaches.FoodJSON do
  alias Easy.Nutrition.Food
  alias EasyWeb.FoodPayload

  @spec show(map()) :: map()
  def show(%{food: food}) do
    %{data: data(food)}
  end

  @spec index(map()) :: map()
  @spec categories(map()) :: map()
  def categories(%{categories: categories}) do
    %{data: categories}
  end

  def index(%{foods: foods, count: count}) do
    %{data: Enum.map(foods, &data/1), count: count}
  end

  @spec impact(map()) :: map()
  def impact(%{templates: templates, active_client_plans: active_client_plans} = assigns) do
    %{
      data: %{
        recipes: Map.get(assigns, :recipes, []),
        templates: templates,
        active_client_plans: active_client_plans
      }
    }
  end

  defp data(%Food{} = food) do
    food
    |> FoodPayload.data()
    |> Map.put(:creator_id, food.creator_id)
  end
end
