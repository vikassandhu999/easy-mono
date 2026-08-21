defmodule EasyWeb.Clients.NutritionPlanJSON do
  alias EasyWeb.Coaches.NutritionPlanJSON

  @spec show(map()) :: map()
  def show(assigns), do: NutritionPlanJSON.show(assigns)

  @spec index(map()) :: map()
  def index(assigns), do: NutritionPlanJSON.index(assigns)
end
