defmodule Easy.Nutrition.LibraryDeleteTest do
  use Easy.SchemaCase, async: false

  alias Easy.Ctx
  alias Easy.Nutrition.Diary
  alias Easy.Nutrition.DiaryEntry
  alias Easy.Nutrition.Library
  alias Easy.Repo

  # Deleting library rows used to raise Ecto.ConstraintError (a 500): `food_id` and
  # `recipe_id` are ON DELETE SET NULL, and nulling one on a meal item violates the
  # food-xor-recipe check. Blocked up front instead, as a conflict.

  describe "delete_food/3" do
    test "is blocked while a recipe ingredient still uses the food" do
      %{ctx: ctx, business: business, coach: coach} = scenario()
      food = insert(:food, business: business, creator: coach)
      recipe = insert(:recipe, business: business, creator: coach)
      insert(:recipe_ingredient, business: business, recipe: recipe, food: food, weight_g: 100.0)

      # Nulling this would silently drop the food's macros from the recipe total.
      assert {:error, :in_use} = Library.delete_food(ctx, food.id, food.revision)
    end

    test "succeeds when only a logged entry references the food, and the log survives" do
      %{ctx: ctx, business: business, coach: coach, client_ctx: client_ctx} = scenario()
      food = insert(:food, business: business, creator: coach, name: "Banana", calories_per_100g: 90.0)
      today = Date.utc_today()

      assert {:ok, day} =
               Diary.add_client_extra(
                 client_ctx,
                 today,
                 %{meal_slot: :breakfast, food_id: food.id, portion: %{kind: :gram, grams: 100.0}},
                 Ecto.UUID.generate()
               )

      entry = hd(day.slots).rows |> Enum.find(& &1.entry) |> Map.fetch!(:entry)

      assert {:ok, _deleted} = Library.delete_food(ctx, food.id, food.revision)

      kept = Repo.get!(DiaryEntry, entry.id)
      assert kept.food_id == nil
      assert kept.display_name == "Banana"
      assert kept.calories == 90.0
    end
  end

  describe "delete_recipe/3" do
    test "succeeds when nothing references the recipe" do
      %{ctx: ctx, business: business, coach: coach} = scenario()
      recipe = insert(:recipe, business: business, creator: coach)

      assert {:ok, _deleted} = Library.delete_recipe(ctx, recipe.id, recipe.revision)
    end
  end

  defp scenario do
    business = insert(:business, owner: build(:user, email: unique_email()))
    coach = insert(:coach, business: business, user: build(:user, email: unique_email()))
    client = insert(:client, business: business, creator: coach, assigned_coach: coach)

    %{
      ctx: Ctx.new(business.id, coach.user_id, coach.id, true),
      client_ctx: %Ctx{business_id: business.id, user_id: client.user_id, client_id: client.id},
      business: business,
      coach: coach
    }
  end

  defp unique_email, do: "user-#{System.unique_integer([:positive])}@test.com"
end
