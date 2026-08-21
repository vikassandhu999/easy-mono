defmodule Easy.Nutrition.MealSlotTest do
  use ExUnit.Case, async: true

  alias Easy.Nutrition.MealSlot

  test "ordinary slots precede the workout group in one closed order" do
    assert MealSlot.ordinary() == [
             :early_morning,
             :breakfast,
             :mid_morning,
             :lunch,
             :afternoon,
             :evening,
             :dinner,
             :pre_sleep
           ]

    assert MealSlot.workout() == [:pre_workout, :during_workout, :post_workout]
    assert MealSlot.values() == MealSlot.ordinary() ++ MealSlot.workout()
    assert MealSlot.names() == Enum.map(MealSlot.values(), &Atom.to_string/1)
    assert MealSlot.cast("breakfast") == {:ok, :breakfast}
    assert MealSlot.cast(:post_workout) == {:ok, :post_workout}
    assert MealSlot.cast("brunch") == :error
  end
end
