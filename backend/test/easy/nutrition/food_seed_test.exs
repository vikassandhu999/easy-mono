Code.require_file("priv/repo/seeds/food_seeds.exs")

defmodule Easy.Nutrition.FoodSeedTest do
  use ExUnit.Case, async: true
  alias Easy.Repo.Seeds.Foods

  test "source missing and non-numeric values remain unknown, sugar and explicit zero survive" do
    assert Foods.source_nutrients(%{"calorie" => 120, "proteins" => "unknown", "fibre" => nil, "sugar" => 0}) == %{
             "energy_kcal" => 120.0,
             "sugar_g" => 0.0
           }

    assert Foods.source_nutrients(%{"sugar" => 3.25}) == %{"sugar_g" => 3.25}
  end
end
