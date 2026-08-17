defmodule Easy.Nutrition.MealSlot do
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

  @spec ordinary() :: [atom()]
  def ordinary, do: @ordinary

  @spec workout() :: [atom()]
  def workout, do: @workout

  @spec values() :: [atom()]
  def values, do: @values

  @spec names() :: [String.t()]
  def names, do: Enum.map(@values, &Atom.to_string/1)

  @spec cast(term()) :: {:ok, atom()} | :error
  def cast(slot) when slot in @values, do: {:ok, slot}

  def cast(slot) when is_binary(slot) do
    if slot in names(), do: {:ok, String.to_existing_atom(slot)}, else: :error
  end

  def cast(_slot), do: :error
end
