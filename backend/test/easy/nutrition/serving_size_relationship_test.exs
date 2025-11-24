defmodule Easy.Nutrition.ServingSizeRelationshipTest do
  use Easy.DataCase, async: true

  alias Easy.Nutrition
  alias Easy.Accounts
  alias Easy.Nutrition.Ingredient

  describe "ingredients with serving sizes" do
    test "create_ingredient/3 creates ingredient with serving sizes" do
      # Setup user, business, and coach via register
      {:ok, result} =
        Accounts.register(
          %{email: "test_serving@example.com", full_name: "Test User"},
          %{name: "Test Business", handle: "test-business-handle"}
        )

      user = result.user
      coach = Accounts.get_coach_by_user(user)
      business = coach.business

      attrs = %{
        "name" => "Oats",
        "calories_per_100g" => 100,
        "protein_per_100g" => 5,
        "carbohydrates_per_100g" => 20,
        "fats_per_100g" => 2,
        "fiber_per_100g" => 3,
        "serving_sizes" => [
          %{"name" => "cup", "gram_weight" => 80},
          %{"name" => "tbsp", "gram_weight" => 5}
        ]
      }

      assert {:ok, %Ingredient{} = ingredient} =
               Nutrition.create_ingredient(business.id, coach.id, attrs)

      # Preload serving sizes
      ingredient = Easy.Repo.preload(ingredient, :serving_sizes)

      assert length(ingredient.serving_sizes) == 2

      cup = Enum.find(ingredient.serving_sizes, fn s -> s.name == "cup" end)
      assert cup
      assert Decimal.equal?(cup.gram_weight, Decimal.new(80))

      tbsp = Enum.find(ingredient.serving_sizes, fn s -> s.name == "tbsp" end)
      assert tbsp
      assert Decimal.equal?(tbsp.gram_weight, Decimal.new(5))
    end
  end
end
