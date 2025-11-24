defmodule Easy.NutritionDeletionProtectionTest do
  use Easy.DataCase, async: true

  alias Easy.Nutrition
  alias Easy.Organizations
  alias Easy.Organizations
  alias Easy.Accounts

  describe "ingredient deletion protection" do
    setup do
      # Create test business and coach
      {:ok, user} = Accounts.create_user(%{email: "test@example.com", full_name: "Test User"})
      {:ok, business} = Organizations.create_business(%{name: "Test Business"})

      {:ok, coach} =
        Coaches.create_coach(%{
          user_id: user.id,
          business_id: business.id,
          bio: "Test bio"
        })

      {:ok, business: business, coach: coach}
    end

    test "allows deletion of ingredient not used in any recipes or meals", %{
      business: business,
      coach: coach
    } do
      # Create an ingredient
      {:ok, ingredient} =
        Nutrition.create_ingredient(business.id, coach.id, %{
          name: "Unused Ingredient",
          calories_per_100g: Decimal.new("100"),
          protein_per_100g: Decimal.new("10"),
          carbohydrates_per_100g: Decimal.new("20"),
          fats_per_100g: Decimal.new("5"),
          fiber_per_100g: Decimal.new("2")
        })

      # Should be able to delete it
      assert {:ok, _deleted_ingredient} = Nutrition.delete_ingredient(ingredient, coach.id)
    end

    test "prevents deletion of ingredient used in a recipe", %{
      business: business,
      coach: coach
    } do
      # Create an ingredient
      {:ok, ingredient} =
        Nutrition.create_ingredient(business.id, coach.id, %{
          name: "Chicken Breast",
          calories_per_100g: Decimal.new("165"),
          protein_per_100g: Decimal.new("31"),
          carbohydrates_per_100g: Decimal.new("0"),
          fats_per_100g: Decimal.new("3.6"),
          fiber_per_100g: Decimal.new("0")
        })

      # Create a recipe
      {:ok, recipe} =
        Nutrition.create_recipe(business.id, coach.id, %{
          name: "Grilled Chicken",
          servings: 2
        })

      # Add ingredient to recipe
      {:ok, _recipe_ingredient} =
        Nutrition.add_ingredient_to_recipe(
          recipe.id,
          ingredient.id,
          Decimal.new("200"),
          "g",
          coach.id
        )

      # Should not be able to delete the ingredient
      assert {:error, :ingredient_in_use} = Nutrition.delete_ingredient(ingredient, coach.id)
    end

    test "prevents deletion of ingredient used directly in a meal", %{
      business: business,
      coach: coach
    } do
      # Create an ingredient
      {:ok, ingredient} =
        Nutrition.create_ingredient(business.id, coach.id, %{
          name: "Banana",
          calories_per_100g: Decimal.new("89"),
          protein_per_100g: Decimal.new("1.1"),
          carbohydrates_per_100g: Decimal.new("23"),
          fats_per_100g: Decimal.new("0.3"),
          fiber_per_100g: Decimal.new("2.6")
        })

      # Create a meal
      {:ok, meal} =
        Nutrition.create_meal(business.id, coach.id, %{
          name: "Breakfast Bowl",
          meal_type: "breakfast"
        })

      # Add ingredient directly to meal
      {:ok, _meal_ingredient} =
        Nutrition.add_ingredient_to_meal(
          meal.id,
          ingredient.id,
          Decimal.new("100"),
          "g",
          coach.id
        )

      # Should not be able to delete the ingredient
      assert {:error, :ingredient_in_use} = Nutrition.delete_ingredient(ingredient, coach.id)
    end

    test "prevents deletion of ingredient used in both recipe and meal", %{
      business: business,
      coach: coach
    } do
      # Create an ingredient
      {:ok, ingredient} =
        Nutrition.create_ingredient(business.id, coach.id, %{
          name: "Oats",
          calories_per_100g: Decimal.new("389"),
          protein_per_100g: Decimal.new("17"),
          carbohydrates_per_100g: Decimal.new("66"),
          fats_per_100g: Decimal.new("7"),
          fiber_per_100g: Decimal.new("11")
        })

      # Create a recipe and add ingredient
      {:ok, recipe} =
        Nutrition.create_recipe(business.id, coach.id, %{
          name: "Oatmeal",
          servings: 1
        })

      {:ok, _recipe_ingredient} =
        Nutrition.add_ingredient_to_recipe(
          recipe.id,
          ingredient.id,
          Decimal.new("50"),
          "g",
          coach.id
        )

      # Create a meal and add ingredient directly
      {:ok, meal} =
        Nutrition.create_meal(business.id, coach.id, %{
          name: "Snack",
          meal_type: "snack"
        })

      {:ok, _meal_ingredient} =
        Nutrition.add_ingredient_to_meal(
          meal.id,
          ingredient.id,
          Decimal.new("30"),
          "g",
          coach.id
        )

      # Should not be able to delete the ingredient
      assert {:error, :ingredient_in_use} = Nutrition.delete_ingredient(ingredient, coach.id)
    end
  end

  describe "recipe deletion protection" do
    setup do
      # Create test business and coach
      {:ok, user} = Accounts.create_user(%{email: "test2@example.com", full_name: "Test User 2"})
      {:ok, business} = Organizations.create_business(%{name: "Test Business 2"})

      {:ok, coach} =
        Coaches.create_coach(%{
          user_id: user.id,
          business_id: business.id,
          bio: "Test bio"
        })

      {:ok, business: business, coach: coach}
    end

    test "allows deletion of recipe not used in any meals", %{
      business: business,
      coach: coach
    } do
      # Create a recipe
      {:ok, recipe} =
        Nutrition.create_recipe(business.id, coach.id, %{
          name: "Unused Recipe",
          servings: 1
        })

      # Should be able to delete it
      assert {:ok, _deleted_recipe} = Nutrition.delete_recipe(recipe, coach.id)
    end

    test "prevents deletion of recipe used in a meal", %{
      business: business,
      coach: coach
    } do
      # Create a recipe
      {:ok, recipe} =
        Nutrition.create_recipe(business.id, coach.id, %{
          name: "Protein Shake",
          servings: 1
        })

      # Create a meal
      {:ok, meal} =
        Nutrition.create_meal(business.id, coach.id, %{
          name: "Post-Workout",
          meal_type: "snack"
        })

      # Add recipe to meal
      {:ok, _meal_recipe} =
        Nutrition.add_recipe_to_meal(
          meal.id,
          recipe.id,
          Decimal.new("1"),
          coach.id
        )

      # Should not be able to delete the recipe
      assert {:error, :recipe_in_use} = Nutrition.delete_recipe(recipe, coach.id)
    end

    test "prevents deletion of recipe used in multiple meals", %{
      business: business,
      coach: coach
    } do
      # Create a recipe
      {:ok, recipe} =
        Nutrition.create_recipe(business.id, coach.id, %{
          name: "Salad",
          servings: 1
        })

      # Create first meal
      {:ok, meal1} =
        Nutrition.create_meal(business.id, coach.id, %{
          name: "Lunch",
          meal_type: "lunch"
        })

      # Create second meal
      {:ok, meal2} =
        Nutrition.create_meal(business.id, coach.id, %{
          name: "Dinner",
          meal_type: "dinner"
        })

      # Add recipe to both meals
      {:ok, _meal_recipe1} =
        Nutrition.add_recipe_to_meal(
          meal1.id,
          recipe.id,
          Decimal.new("1"),
          coach.id
        )

      {:ok, _meal_recipe2} =
        Nutrition.add_recipe_to_meal(
          meal2.id,
          recipe.id,
          Decimal.new("1.5"),
          coach.id
        )

      # Should not be able to delete the recipe
      assert {:error, :recipe_in_use} = Nutrition.delete_recipe(recipe, coach.id)
    end
  end

  describe "deletion after removing references" do
    setup do
      # Create test business and coach
      {:ok, user} = Accounts.create_user(%{email: "test3@example.com", full_name: "Test User 3"})
      {:ok, business} = Organizations.create_business(%{name: "Test Business 3"})

      {:ok, coach} =
        Coaches.create_coach(%{
          user_id: user.id,
          business_id: business.id,
          bio: "Test bio"
        })

      {:ok, business: business, coach: coach}
    end

    test "allows ingredient deletion after removing from recipe", %{
      business: business,
      coach: coach
    } do
      # Create ingredient and recipe
      {:ok, ingredient} =
        Nutrition.create_ingredient(business.id, coach.id, %{
          name: "Test Ingredient",
          calories_per_100g: Decimal.new("100"),
          protein_per_100g: Decimal.new("10"),
          carbohydrates_per_100g: Decimal.new("20"),
          fats_per_100g: Decimal.new("5"),
          fiber_per_100g: Decimal.new("2")
        })

      {:ok, recipe} =
        Nutrition.create_recipe(business.id, coach.id, %{
          name: "Test Recipe",
          servings: 1
        })

      # Add ingredient to recipe
      {:ok, _recipe_ingredient} =
        Nutrition.add_ingredient_to_recipe(
          recipe.id,
          ingredient.id,
          Decimal.new("100"),
          "g",
          coach.id
        )

      # Cannot delete ingredient while in use
      assert {:error, :ingredient_in_use} = Nutrition.delete_ingredient(ingredient, coach.id)

      # Remove ingredient from recipe
      {:ok, _removed} =
        Nutrition.remove_ingredient_from_recipe(recipe.id, ingredient.id, coach.id)

      # Now should be able to delete ingredient
      assert {:ok, _deleted_ingredient} = Nutrition.delete_ingredient(ingredient, coach.id)
    end

    test "allows recipe deletion after removing from meal", %{
      business: business,
      coach: coach
    } do
      # Create recipe and meal
      {:ok, recipe} =
        Nutrition.create_recipe(business.id, coach.id, %{
          name: "Test Recipe",
          servings: 1
        })

      {:ok, meal} =
        Nutrition.create_meal(business.id, coach.id, %{
          name: "Test Meal",
          meal_type: "lunch"
        })

      # Add recipe to meal
      {:ok, _meal_recipe} =
        Nutrition.add_recipe_to_meal(
          meal.id,
          recipe.id,
          Decimal.new("1"),
          coach.id
        )

      # Cannot delete recipe while in use
      assert {:error, :recipe_in_use} = Nutrition.delete_recipe(recipe, coach.id)

      # Remove recipe from meal
      {:ok, _removed} = Nutrition.remove_recipe_from_meal(meal.id, recipe.id, coach.id)

      # Now should be able to delete recipe
      assert {:ok, _deleted_recipe} = Nutrition.delete_recipe(recipe, coach.id)
    end
  end
end
