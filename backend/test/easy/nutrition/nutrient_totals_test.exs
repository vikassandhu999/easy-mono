defmodule Easy.Nutrition.NutrientTotalsTest do
  use ExUnit.Case, async: true

  alias Easy.Nutrition.NutrientTotals

  @nutrients %{calories: 100, protein: 5.0, carbohydrates: 10.0, fat: 2.0, fiber: nil}

  test "database round trips derive completeness and preserve unknown nutrients" do
    assert {:ok, dumped} = NutrientTotals.dump(Map.put(@nutrients, :complete, true))
    refute Map.has_key?(dumped, :complete)

    persisted = dumped |> Jason.encode!() |> Jason.decode!()
    assert {:ok, loaded} = NutrientTotals.load(persisted)
    assert loaded == Map.put(@nutrients, :complete, false)

    assert {:ok, complete} = NutrientTotals.cast(%{@nutrients | fiber: 0})
    assert complete.complete
  end

  test "dump rejects invalid or incomplete nutrient maps" do
    for invalid <- [nil, [], %{}, Map.delete(@nutrients, :fiber), %{@nutrients | calories: -1}, %{@nutrients | protein: "5"}] do
      assert :error = NutrientTotals.dump(invalid)
    end
  end

  test "load rejects malformed storage values without raising" do
    for invalid <- [nil, [], "bad", 1, %{"calories" => -1}, %{"protein" => "bad"}] do
      assert :error = NutrientTotals.load(invalid)
    end
  end
end
