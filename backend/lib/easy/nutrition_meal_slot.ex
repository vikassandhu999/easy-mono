defmodule Easy.Nutrition.MealSlot do
  @type ordinary ::
          :early_morning | :breakfast | :mid_morning | :lunch | :afternoon | :evening | :dinner | :pre_sleep
  @type workout :: :pre_workout | :during_workout | :post_workout
  @type t :: ordinary() | workout()

  @ordinary [
    :early_morning,
    :breakfast,
    :mid_morning,
    :lunch,
    :afternoon,
    :evening,
    :dinner,
    :pre_sleep
  ]

  @workout [:pre_workout, :during_workout, :post_workout]
  @values @ordinary ++ @workout

  @spec ordinary() :: [ordinary()]
  def ordinary, do: @ordinary

  @spec workout() :: [workout()]
  def workout, do: @workout

  @spec values() :: [t()]
  def values, do: @values

  @spec names() :: [String.t()]
  def names, do: Enum.map(@values, &Atom.to_string/1)
end
