defmodule EasyWeb.Clients.NutritionDayJSON do
  @spec index(map()) :: map()
  defdelegate index(assigns), to: EasyWeb.NutritionDayJSON
end
