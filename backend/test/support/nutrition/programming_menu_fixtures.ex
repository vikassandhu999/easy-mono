defmodule Easy.Nutrition.ProgrammingMenuFixtures do
  alias Easy.Nutrition.Menu
  alias Easy.Nutrition.Plan

  # Named fixtures share IDs within a test, without collisions between async tests.
  @spec uuid(String.t()) :: String.t()
  def uuid(name), do: Ecto.UUID.load!(:crypto.hash(:md5, :erlang.term_to_binary({self(), name})))

  @spec menu(Plan.t(), keyword()) :: map()
  def menu(plan, opts) do
    pattern = hd(plan.menu.day_patterns)

    %{
      meals: Keyword.fetch!(opts, :meals),
      day_patterns: [
        %{id: pattern.id, name: pattern.name, slots: []}
      ],
      schedule: schedule_for(pattern.id)
    }
  end

  @spec schedule_for(String.t()) :: map()
  def schedule_for(pattern_id) do
    Map.new(Menu.weekdays(), &{&1, pattern_id})
  end

  @spec meal_input(String.t(), String.t(), [map()]) ::
          map()
  def meal_input(ref, name, meal_items) do
    %{id: uuid(ref), name: name, meal_items: meal_items}
  end

  @spec persisted_meal(String.t(), String.t(), [map()]) ::
          map()
  def persisted_meal(id, name, meal_items) do
    %{id: id, name: name, meal_items: meal_items}
  end

  @spec food_item(String.t(), String.t(), map()) ::
          map()
  def food_item(ref, food_id, portion) do
    %{id: uuid(ref), kind: :food, food_id: food_id, portion: portion}
  end

  @spec recipe_item(String.t(), String.t(), map()) ::
          map()
  def recipe_item(ref, recipe_id, portion) do
    %{id: uuid(ref), kind: :recipe, recipe_id: recipe_id, portion: portion}
  end

  @spec persisted_item(String.t(), :food | :recipe, String.t(), map()) ::
          map()
  def persisted_item(id, kind, source_id, portion) do
    base = %{id: id, kind: kind, portion: portion}

    case kind do
      :food -> Map.put(base, :food_id, source_id)
      :recipe -> Map.put(base, :recipe_id, source_id)
    end
  end
end
