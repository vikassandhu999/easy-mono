defmodule Easy.Nutrition.Menu do
  use Ecto.Schema
  import Ecto.Changeset
  alias Easy.Nutrition.{ItemReference, MealSlot, NutrientTotals, Portion}
  alias Easy.Nutrition.Menu.{DayPattern, Meal}

  @type weekday :: :monday | :tuesday | :wednesday | :thursday | :friday | :saturday | :sunday

  @type formatted_item :: %{
          id: String.t(),
          kind: :food | :recipe,
          food_id: String.t() | nil,
          recipe_id: String.t() | nil,
          name: String.t() | nil,
          portion: Portion.t(),
          nutrients: NutrientTotals.t()
        }
  @type formatted_meal :: %{
          id: String.t(),
          name: String.t(),
          notes: String.t() | nil,
          nutrients: NutrientTotals.t(),
          meal_items: [formatted_item()]
        }
  @type formatted_pattern :: %{
          id: String.t(),
          name: String.t(),
          slots: [%{meal_slot: MealSlot.t(), meal_ids: [String.t()]}]
        }
  @type formatted :: %{
          meals: [formatted_meal()],
          day_patterns: [formatted_pattern()],
          schedule: %{weekday() => String.t()}
        }

  @weekdays [:monday, :tuesday, :wednesday, :thursday, :friday, :saturday, :sunday]
  @type t() :: %__MODULE__{}
  @primary_key false
  embedded_schema do
    embeds_many :meals, Meal
    embeds_many :day_patterns, DayPattern
    field :schedule, {:map, Ecto.UUID}
  end

  @spec weekdays() :: [weekday()]
  def weekdays, do: @weekdays

  @spec empty() :: t()
  def empty do
    pattern = %DayPattern{id: Ecto.UUID.generate(), name: "Everyday", slots: []}
    %__MODULE__{meals: [], day_patterns: [pattern], schedule: Map.new(@weekdays, &{to_string(&1), pattern.id})}
  end

  @spec cast(map()) :: {:ok, t()} | {:error, Ecto.Changeset.t()}
  def cast(attrs) do
    %__MODULE__{}
    |> Ecto.Changeset.cast(attrs, [:schedule])
    |> cast_embed(:meals)
    |> cast_embed(:day_patterns, required: true)
    |> validate_required([:schedule])
    |> update_change(:schedule, &Map.new(&1, fn {day, id} -> {to_string(day), id} end))
    |> validate_topology()
    |> apply_action(:insert)
  end

  defp validate_topology(%{valid?: false} = changeset), do: changeset

  defp validate_topology(changeset) do
    menu = apply_changes(changeset)
    nodes = menu.meals ++ items(menu) ++ menu.day_patterns
    meal_ids = MapSet.new(menu.meals, & &1.id)
    pattern_ids = MapSet.new(menu.day_patterns, & &1.id)

    changeset
    |> check(:meals, unique?(Enum.map(nodes, & &1.id)), "node IDs must be unique UUIDs")
    |> check(:day_patterns, Enum.all?(menu.day_patterns, &valid_slots?(&1.slots, meal_ids)), "offers a Meal outside this Menu")
    |> check(:schedule, valid_schedule?(menu.schedule, pattern_ids), "must map every weekday to a Day Pattern in this Menu")
  end

  defp check(changeset, _field, true, _message), do: changeset
  defp check(changeset, field, false, message), do: add_error(changeset, field, message)

  defp unique?(values), do: length(values) == MapSet.size(MapSet.new(values))

  defp valid_slots?(slots, meal_ids) do
    unique?(Enum.map(slots, & &1.meal_slot)) and
      Enum.all?(slots, fn slot ->
        unique?(slot.meal_ids) and Enum.all?(slot.meal_ids, &MapSet.member?(meal_ids, &1))
      end)
  end

  defp valid_schedule?(schedule, pattern_ids) do
    MapSet.new(Map.keys(schedule)) == MapSet.new(@weekdays, &to_string/1) and
      Enum.all?(Map.values(schedule), &MapSet.member?(pattern_ids, &1))
  end

  @spec items(t()) :: [Easy.Nutrition.Menu.Item.t()]
  def items(menu), do: Enum.flat_map(menu.meals, & &1.meal_items)

  @spec references(t()) :: [ItemReference.t()]
  def references(menu), do: Enum.map(items(menu), &item_reference/1)

  @spec resolve(t(), ItemReference.resolved_items()) :: t()
  def resolve(menu, resolved) do
    map_items(menu, fn item ->
      value = Map.fetch!(resolved, item_reference(item))
      %{item | name: value.item.name, portion: value.portion, nutrients: value.nutrients}
    end)
  end

  defp item_reference(item) do
    ItemReference.new(item, Portion.format(item.portion))
  end

  defp map_items(menu, fun) do
    %{menu | meals: Enum.map(menu.meals, fn meal -> %{meal | meal_items: Enum.map(meal.meal_items, fun)} end)}
  end

  @spec day_pattern(t(), Date.t()) :: DayPattern.t()
  def day_pattern(menu, date) do
    weekday = Enum.at(@weekdays, Date.day_of_week(date) - 1)
    id = Map.fetch!(menu.schedule, to_string(weekday))
    Enum.find(menu.day_patterns, &(&1.id == id))
  end

  @spec meals_for_slot(t(), DayPattern.t(), MealSlot.t()) :: [Meal.t()]
  def meals_for_slot(menu, pattern, meal_slot) do
    case Enum.find(pattern.slots, &(&1.meal_slot == meal_slot)) do
      nil ->
        []

      slot ->
        meals = Map.new(menu.meals, &{&1.id, &1})
        Enum.map(slot.meal_ids, &Map.fetch!(meals, &1))
    end
  end

  @spec format(t()) :: formatted()
  def format(menu) do
    %{
      meals: Enum.map(menu.meals, &format_meal/1),
      day_patterns: Enum.map(menu.day_patterns, &format_pattern/1),
      schedule: Map.new(@weekdays, &{&1, Map.fetch!(menu.schedule, to_string(&1))})
    }
  end

  defp format_meal(meal) do
    %{
      id: meal.id,
      name: meal.name,
      notes: meal.notes,
      nutrients: meal.meal_items |> Enum.map(& &1.nutrients) |> NutrientTotals.combine() |> NutrientTotals.round(),
      meal_items: Enum.map(meal.meal_items, &format_item/1)
    }
  end

  defp format_item(item) do
    %{
      id: item.id,
      kind: ItemReference.kind(item),
      food_id: item.food_id,
      recipe_id: item.recipe_id,
      name: item.name,
      portion: Portion.format(item.portion),
      nutrients: NutrientTotals.round(item.nutrients)
    }
  end

  defp format_pattern(pattern) do
    slots = Enum.sort_by(pattern.slots, &Enum.find_index(MealSlot.values(), fn value -> value == &1.meal_slot end))
    %{id: pattern.id, name: pattern.name, slots: Enum.map(slots, &Map.take(&1, [:meal_slot, :meal_ids]))}
  end
end
