defmodule Easy.Nutrition.ProgrammingMenuFixtures do
  alias Easy.Nutrition.Plan
  alias Easy.Nutrition.Programming.MenuReplacement
  alias Easy.Nutrition.WeekSchedule

  @spec menu(Plan.t(), keyword()) :: MenuReplacement.menu_input()
  def menu(plan, opts) do
    pattern = hd(plan.day_patterns)

    %{
      meals: Keyword.fetch!(opts, :meals),
      day_patterns: [
        %{id: pattern.id, name: pattern.name, position: pattern.position, slots: []}
      ],
      schedule: schedule_for(pattern.id)
    }
  end

  @spec schedule_for(String.t()) :: MenuReplacement.schedule_input()
  def schedule_for(pattern_id) do
    Map.new(WeekSchedule.weekdays(), &{&1, pattern_id})
  end

  @spec meal_input(String.t(), String.t(), integer(), [MenuReplacement.meal_item_input()]) ::
          MenuReplacement.meal_input()
  def meal_input(ref, name, position, meal_items) do
    %{local_ref: ref, name: name, position: position, meal_items: meal_items}
  end

  @spec persisted_meal(String.t(), String.t(), integer(), [MenuReplacement.meal_item_input()]) ::
          MenuReplacement.meal_input()
  def persisted_meal(id, name, position, meal_items) do
    %{id: id, name: name, position: position, meal_items: meal_items}
  end

  @spec food_item(String.t(), String.t(), integer(), MenuReplacement.portion_input()) ::
          MenuReplacement.meal_item_input()
  def food_item(ref, food_id, position, portion) do
    %{local_ref: ref, kind: :food, food_id: food_id, position: position, portion: portion}
  end

  @spec recipe_item(String.t(), String.t(), integer(), MenuReplacement.portion_input()) ::
          MenuReplacement.meal_item_input()
  def recipe_item(ref, recipe_id, position, portion) do
    %{local_ref: ref, kind: :recipe, recipe_id: recipe_id, position: position, portion: portion}
  end

  @spec persisted_item(String.t(), :food | :recipe, String.t(), integer(), MenuReplacement.portion_input()) ::
          MenuReplacement.meal_item_input()
  def persisted_item(id, kind, source_id, position, portion) do
    base = %{id: id, kind: kind, position: position, portion: portion}

    case kind do
      :food -> Map.put(base, :food_id, source_id)
      :recipe -> Map.put(base, :recipe_id, source_id)
    end
  end
end
