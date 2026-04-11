defmodule EasyWeb.Coaches.ClientPlanJSON do
  alias EasyWeb.Coaches.NutritionPlanJSON
  alias EasyWeb.Coaches.TrainingPlanJSON

  @spec training_plans(map()) :: map()
  def training_plans(%{plans: plans, count: count}) do
    TrainingPlanJSON.index(%{plans: plans, count: count})
  end

  @spec nutrition_plans(map()) :: map()
  def nutrition_plans(%{plans: plans, count: count}) do
    NutritionPlanJSON.index(%{plans: plans, count: count})
  end
end
