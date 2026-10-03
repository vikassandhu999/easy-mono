defmodule Easy.Nutrition.LibraryDeleteTest do
  alias Easy.Nutrition.DiaryFixtures
  use Easy.SchemaCase, async: false
  alias Easy.Ctx
  alias Easy.Nutrition.Library

  describe("delete_food/2") do
    test "is blocked while a recipe ingredient still uses the food" do
      %{ctx: ctx, business: business, coach: coach} = scenario()
      food = insert(:food, business: business, creator: coach)
      recipe = insert(:recipe, business: business, creator: coach)
      insert(:recipe_ingredient, business: business, recipe: recipe, food: food, portion: %{kind: :gram, grams: 100.0})
      assert {:error, :in_use} = Library.delete_food(ctx, food.id)
    end

    test "succeeds when only a logged entry references the food, and the log survives" do
      %{ctx: ctx, business: business, coach: coach, client: client, client_ctx: client_ctx} = scenario()

      food =
        insert(:food, business: business, creator: coach, name: "Banana", calories_per_100g: 90.0)

      today = Date.utc_today()

      assert {:ok, day} =
               DiaryFixtures.save_extra(
                 client_ctx,
                 today,
                 %{meal_slot: :breakfast, food_id: food.id, portion: %{kind: :gram, grams: 100.0}}
               )

      entry = hd(day.slots).rows |> Enum.find(& &1.entry_id)
      assert {:ok, _deleted} = Library.delete_food(ctx, food.id)
      kept = DiaryFixtures.stored_entry(client, entry.id)
      assert kept.food_id == food.id
      assert kept.name == "Banana"
      assert kept.nutrients.calories == 90.0
    end
  end

  describe("delete_recipe/2") do
    test "succeeds when nothing references the recipe" do
      %{ctx: ctx, business: business, coach: coach} = scenario()
      recipe = insert(:recipe, business: business, creator: coach)
      assert {:ok, _deleted} = Library.delete_recipe(ctx, recipe.id)
    end
  end

  defp scenario do
    business = insert(:business, owner: build(:user, email: unique_email()))
    coach = insert(:coach, business: business, user: build(:user, email: unique_email()))
    client = insert(:client, business: business, coach: coach)

    %{
      ctx: Ctx.new(business.id, coach.user_id, coach.id, true),
      client_ctx: %Ctx{business_id: business.id, user_id: client.user_id, client_id: client.id},
      business: business,
      client: client,
      coach: coach
    }
  end

  defp unique_email do
    "user-#{System.unique_integer([:positive])}@test.com"
  end
end
