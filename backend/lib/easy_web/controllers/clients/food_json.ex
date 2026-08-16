defmodule EasyWeb.Clients.FoodJSON do
  alias Easy.Nutrition.Food
  alias EasyWeb.FoodPayload

  @spec show(map()) :: map()
  def show(%{food: food}) do
    %{data: data(food)}
  end

  @spec index(map()) :: map()
  def index(%{foods: foods, count: count}) do
    %{data: Enum.map(foods, &data/1), count: count}
  end

  defp data(%Food{} = food), do: FoodPayload.data(food)
end
