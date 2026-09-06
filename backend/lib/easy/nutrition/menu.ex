defmodule Easy.Nutrition.Menu.Portion do
  use Ecto.Schema
  import Ecto.Changeset

  @type t() :: %__MODULE__{}
  @primary_key false
  embedded_schema do
    field :kind, Ecto.Enum, values: [:gram, :serving]
    field :grams, :float
    field :amount, :float
    field :unit, :string
    field :label, :string
  end

  @spec changeset(t(), map()) :: Ecto.Changeset.t()
  def changeset(portion, attrs) do
    changeset = cast(portion, attrs, [:kind])

    case get_field(changeset, :kind) do
      :gram ->
        changeset
        |> cast(attrs, [:grams])
        |> validate_required([:grams])
        |> validate_number(:grams, greater_than: 0)

      :serving ->
        changeset
        |> cast(attrs, [:amount, :unit, :label])
        |> validate_required([:amount, :unit])
        |> validate_number(:amount, greater_than: 0)

      _other ->
        add_error(changeset, :kind, "must be gram or serving")
    end
  end

  @spec input(t()) :: Easy.Nutrition.Portions.t()
  def input(%__MODULE__{kind: :gram, grams: grams}), do: %{kind: :gram, grams: grams}
  def input(%__MODULE__{kind: :serving} = portion), do: Map.take(portion, [:kind, :amount, :unit, :label])
end

defmodule Easy.Nutrition.Menu.Nutrients do
  use Ecto.Schema

  @type t() :: %__MODULE__{}
  @primary_key false
  embedded_schema do
    field :calories, :float
    field :protein, :float
    field :carbohydrates, :float
    field :fat, :float
    field :fiber, :float
    field :complete, :boolean, default: false
  end
end

defmodule Easy.Nutrition.Menu.Item do
  use Ecto.Schema
  import Ecto.Changeset
  alias Easy.Nutrition.Menu.{Nutrients, Portion}

  @type t() :: %__MODULE__{}
  @primary_key {:id, :binary_id, autogenerate: false}
  embedded_schema do
    field :kind, Ecto.Enum, values: [:food, :recipe]
    field :food_id, Ecto.UUID
    field :recipe_id, Ecto.UUID
    field :name, :string, virtual: true
    field :weight_g, :float
    embeds_one :portion, Portion
    embeds_one :nutrients, Nutrients
  end

  @spec changeset(t(), map()) :: Ecto.Changeset.t()
  def changeset(item, attrs) do
    item
    |> cast(attrs, [:id, :kind, :food_id, :recipe_id])
    |> validate_required([:id, :kind])
    |> cast_embed(:portion, required: true)
    |> validate_source()
  end

  defp validate_source(changeset) do
    case {get_field(changeset, :kind), get_field(changeset, :food_id), get_field(changeset, :recipe_id)} do
      {:food, id, nil} when is_binary(id) -> changeset
      {:recipe, nil, id} when is_binary(id) -> changeset
      _other -> add_error(changeset, :kind, "must match exactly one Library reference")
    end
  end
end

defmodule Easy.Nutrition.Menu.Meal do
  use Ecto.Schema
  import Ecto.Changeset
  alias Easy.Nutrition.Menu.Item

  @type t() :: %__MODULE__{}
  @primary_key {:id, :binary_id, autogenerate: false}
  embedded_schema do
    field :name, :string
    field :notes, :string
    embeds_many :meal_items, Item
  end

  @spec changeset(t(), map()) :: Ecto.Changeset.t()
  def changeset(meal, attrs) do
    meal
    |> cast(attrs, [:id, :name, :notes])
    |> update_change(:name, &String.trim/1)
    |> validate_required([:id, :name])
    |> validate_length(:name, max: 255)
    |> validate_length(:notes, max: 5000)
    |> cast_embed(:meal_items)
  end
end

defmodule Easy.Nutrition.Menu.Slot do
  use Ecto.Schema
  import Ecto.Changeset
  alias Easy.Nutrition.MealSlot

  @type t() :: %__MODULE__{}
  @primary_key false
  embedded_schema do
    field :meal_slot, Ecto.Enum, values: MealSlot.values()
    field :meal_ids, {:array, Ecto.UUID}
  end

  @spec changeset(t(), map()) :: Ecto.Changeset.t()
  def changeset(slot, attrs) do
    slot
    |> cast(attrs, [:meal_slot, :meal_ids])
    |> validate_required([:meal_slot, :meal_ids])
    |> validate_length(:meal_ids, min: 1)
  end
end

defmodule Easy.Nutrition.Menu.DayPattern do
  use Ecto.Schema
  import Ecto.Changeset
  alias Easy.Nutrition.Menu.Slot

  @type t() :: %__MODULE__{}
  @primary_key {:id, :binary_id, autogenerate: false}
  embedded_schema do
    field :name, :string
    embeds_many :slots, Slot
  end

  @spec changeset(t(), map()) :: Ecto.Changeset.t()
  def changeset(pattern, attrs) do
    pattern
    |> cast(attrs, [:id, :name])
    |> update_change(:name, &String.trim/1)
    |> validate_required([:id, :name])
    |> validate_length(:name, max: 255)
    |> cast_embed(:slots)
  end
end

defmodule Easy.Nutrition.Menu do
  use Ecto.Schema
  import Ecto.Changeset
  alias Easy.Nutrition.{Library, MealSlot, NutrientTotals}
  alias Easy.Nutrition.Menu.{DayPattern, Meal, Nutrients, Portion}

  @weekdays [:monday, :tuesday, :wednesday, :thursday, :friday, :saturday, :sunday]
  @type t() :: %__MODULE__{}
  @primary_key false
  embedded_schema do
    embeds_many :meals, Meal
    embeds_many :day_patterns, DayPattern
    field :schedule, {:map, Ecto.UUID}
  end

  @spec weekdays() :: [atom()]
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

  @spec references(t()) :: [Library.item_spec()]
  def references(menu) do
    Enum.map(items(menu), fn item ->
      %{kind: item.kind, id: item.food_id || item.recipe_id, portion: Portion.input(item.portion)}
    end)
  end

  @spec resolve(t(), [Library.resolved_item()]) :: t()
  def resolve(menu, resolved) do
    by_id = menu |> items() |> Enum.zip(resolved) |> Map.new(fn {item, value} -> {item.id, value} end)

    map_items(menu, fn item ->
      value = Map.fetch!(by_id, item.id)
      %{item | weight_g: value.portion.grams, nutrients: struct!(Nutrients, value.nutrients)}
    end)
  end

  @spec name_items(t(), map()) :: t()
  def name_items(menu, names) do
    map_items(menu, fn item -> %{item | name: Map.get(names, {item.kind, item.food_id || item.recipe_id})} end)
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

  @spec meals_for_slot(t(), DayPattern.t(), atom()) :: [Meal.t()]
  def meals_for_slot(menu, pattern, meal_slot) do
    case Enum.find(pattern.slots, &(&1.meal_slot == meal_slot)) do
      nil ->
        []

      slot ->
        meals = Map.new(menu.meals, &{&1.id, &1})
        Enum.map(slot.meal_ids, &Map.fetch!(meals, &1))
    end
  end

  @spec format(t()) :: map()
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
      kind: item.kind,
      food_id: item.food_id,
      recipe_id: item.recipe_id,
      name: item.name,
      portion: Portion.input(item.portion),
      nutrients: NutrientTotals.round(item.nutrients)
    }
  end

  defp format_pattern(pattern) do
    slots = Enum.sort_by(pattern.slots, &Enum.find_index(MealSlot.values(), fn value -> value == &1.meal_slot end))
    %{id: pattern.id, name: pattern.name, slots: Enum.map(slots, &Map.take(&1, [:meal_slot, :meal_ids]))}
  end
end
