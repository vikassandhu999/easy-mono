defmodule Easy.MealSlot do
  @values [:breakfast, :morning_snack, :lunch, :afternoon_snack, :dinner, :evening_snack]

  @spec values() :: [atom()]
  def values, do: @values

  @spec names() :: [String.t()]
  def names, do: Enum.map(@values, &Atom.to_string/1)
end
