defmodule Easy.Nutrition.LibraryProtectionTest do
  use Easy.SchemaCase, async: true

  alias Easy.Nutrition.{Food, Library, Programming}
  import Easy.Nutrition.ProgrammingMenuFixtures

  describe "delete_food/2" do
    test "is blocked while a Menu Item still uses the food" do
      coach = insert(:coach)
      ctx = trainer_ctx(coach)
      food = insert(:food, business: coach.business, creator: coach)
      put_food_on_menu(coach, food)

      assert {:error, :in_use} = Library.delete_food(ctx, food.id)
    end

    test "is blocked while an archived plan still uses the food" do
      coach = insert(:coach)
      ctx = trainer_ctx(coach)
      food = insert(:food, business: coach.business, creator: coach)
      put_food_on_menu(coach, food, archived_at: DateTime.utc_now(:second))

      assert {:error, :in_use} = Library.delete_food(ctx, food.id)
    end

    test "is not blocked by another business's Menu" do
      coach = insert(:coach)
      ctx = trainer_ctx(coach)
      food = insert(:food, business: coach.business, creator: coach)

      other = insert(:coach)
      other_food = insert(:food, business: other.business, creator: other)
      put_food_on_menu(other, other_food)

      assert {:ok, _} = Library.delete_food(ctx, food.id)
    end
  end

  describe "update_recipe/4" do
    test "rejects removing cooked weight while a Menu uses a gram Portion of the Recipe" do
      coach = insert(:coach)
      ctx = trainer_ctx(coach)

      recipe =
        insert(:recipe,
          business: coach.business,
          creator: coach,
          cooked_weight_g: 400.0,
          servings_count: 2
        )

      put_recipe_on_menu(coach, recipe, portion: :gram)

      assert {:error, :in_use} =
               Library.update_recipe(ctx, recipe.id, recipe.revision, %{
                 name: recipe.name,
                 servings_count: recipe.servings_count,
                 cooked_weight_g: nil
               })
    end

    test "rejects string-key cooked weight removal while a Menu uses a gram Portion" do
      coach = insert(:coach)
      ctx = trainer_ctx(coach)

      recipe =
        insert(:recipe,
          business: coach.business,
          creator: coach,
          cooked_weight_g: 400.0,
          servings_count: 2
        )

      put_recipe_on_menu(coach, recipe, portion: :gram)

      assert {:error, :in_use} =
               Library.update_recipe(ctx, recipe.id, recipe.revision, %{
                 "name" => recipe.name,
                 "servings_count" => recipe.servings_count,
                 "cooked_weight_g" => nil
               })
    end

    test "allows removing cooked weight when Menus only use serving Portions" do
      coach = insert(:coach)
      ctx = trainer_ctx(coach)

      recipe =
        insert(:recipe,
          business: coach.business,
          creator: coach,
          cooked_weight_g: 400.0,
          servings_count: 2
        )

      put_recipe_on_menu(coach, recipe, portion: :serving)

      assert {:ok, updated} =
               Library.update_recipe(ctx, recipe.id, recipe.revision, %{
                 name: recipe.name,
                 servings_count: recipe.servings_count,
                 cooked_weight_g: nil
               })

      assert updated.cooked_weight_g == nil
    end
  end

  describe "update_food/4" do
    test "recipe ingredients pin serving identity but allow its weight to change" do
      coach = insert(:coach)
      ctx = trainer_ctx(coach)
      serving = %{label: "cup", amount: 1.0, unit: "cup", weight_g: 200.0, is_default: true}
      food = insert(:food, business: coach.business, creator: coach, serving_sizes: [serving])
      recipe = insert(:recipe, business: coach.business, creator: coach)

      insert(:recipe_ingredient,
        business: coach.business,
        recipe: recipe,
        food: food,
        portion: %{kind: :serving, amount: 1.0, unit: "cup", label: "cup"}
      )

      replacement = %{serving | label: "scoop", unit: "scoop"}

      assert {:error, :in_use} =
               Library.update_food(ctx, food.id, food.revision, %{serving_sizes: [replacement]})

      assert [%{unit: "cup", weight_g: 200.0}] = Repo.get!(Food, food.id).serving_sizes

      assert {:ok, updated} =
               Library.update_food(ctx, food.id, food.revision, %{serving_sizes: [%{serving | weight_g: 210.0}]})

      assert [%{unit: "cup", label: "cup", weight_g: 210.0}] = updated.serving_sizes
    end

    test "rejects removing a serving used by a live Menu Item" do
      coach = insert(:coach)
      ctx = trainer_ctx(coach)

      food =
        insert(:food,
          business: coach.business,
          creator: coach,
          serving_sizes: [
            %{label: "cup", amount: 1.0, unit: "cup", weight_g: 200.0, is_default: true}
          ]
        )

      put_food_on_menu(coach, food, portion: %{kind: :serving, amount: 1.0, unit: "cup", label: "cup"})

      replacement = %{
        serving_sizes: [%{label: "scoop", amount: 1.0, unit: "scoop", weight_g: 30.0, is_default: true}]
      }

      for attrs <- [replacement, Jason.decode!(Jason.encode!(replacement))] do
        assert {:error, :in_use} = Library.update_food(ctx, food.id, food.revision, attrs)
      end

      assert [%{unit: "cup", weight_g: 200.0}] = Repo.get!(Food, food.id).serving_sizes
    end
  end

  describe "get_food_impact/2" do
    test "lists Recipe Ingredients and Menu references across plan states without leaking tenants" do
      coach = insert(:coach)
      ctx = trainer_ctx(coach)
      client = insert(:client, business: coach.business, coach: coach)
      food = insert(:food, business: coach.business, creator: coach, name: "Yogurt")
      recipe = insert(:recipe, business: coach.business, creator: coach, name: "Lassi")

      insert(:recipe_ingredient,
        business: coach.business,
        recipe: recipe,
        food: food,
        portion: %{kind: :gram, grams: 100.0}
      )

      template = put_food_on_menu(coach, food, name: "Cut Template")

      archived =
        put_food_on_menu(coach, food, name: "Old Cut", archived_at: DateTime.utc_now(:second))

      client_plan =
        put_food_on_menu(coach, food,
          kind: :client_plan,
          client: client,
          name: "Client Cut",
          start_date: ~D[2026-09-01]
        )

      other = insert(:coach)
      other_food = insert(:food, business: other.business, creator: other)
      other_recipe = insert(:recipe, business: other.business, creator: other, name: "Secret")

      insert(:recipe_ingredient,
        business: other.business,
        recipe: other_recipe,
        food: other_food,
        portion: %{kind: :gram, grams: 50.0}
      )

      put_food_on_menu(other, other_food, name: "Other Cut")

      assert {:ok, impact} = Library.get_food_impact(ctx, food.id)
      assert [%{id: recipe_id, name: "Lassi"}] = impact.recipes
      assert recipe_id == recipe.id
      refute Enum.any?(impact.recipes, &(&1.id == other_recipe.id))

      template_ids = Enum.map(impact.templates, & &1.id)
      assert template.id in template_ids
      assert archived.id in template_ids
      refute Enum.any?(impact.templates, &(&1.name == "Other Cut"))
      refute Enum.any?(impact.templates, &Map.has_key?(&1, :business_id))

      assert [%{id: client_plan_id, name: "Client Cut", client_id: client_id}] =
               impact.client_plans

      assert client_plan_id == client_plan.id
      assert client_id == client.id
    end

    test "does not leak another business's food" do
      coach = insert(:coach)
      other = insert(:coach)
      food = insert(:food, business: other.business, creator: other)

      assert {:error, :not_found} = Library.get_food_impact(trainer_ctx(coach), food.id)
      assert {:error, :not_found} = Library.get_food_impact(trainer_ctx(coach), Ecto.UUID.generate())
    end
  end

  describe "get_recipe_impact/2" do
    test "lists direct Menu references for Templates and Client Plans, including archived" do
      coach = insert(:coach)
      ctx = trainer_ctx(coach)
      client = insert(:client, business: coach.business, coach: coach)
      recipe = insert(:recipe, business: coach.business, creator: coach, name: "Dal")

      template = put_recipe_on_menu(coach, recipe, name: "Cut Template")

      archived =
        put_recipe_on_menu(coach, recipe, name: "Old Cut", archived_at: DateTime.utc_now(:second))

      client_plan =
        put_recipe_on_menu(coach, recipe,
          kind: :client_plan,
          client: client,
          name: "Client Cut",
          start_date: ~D[2026-09-01]
        )

      other = insert(:coach)
      other_recipe = insert(:recipe, business: other.business, creator: other)
      put_recipe_on_menu(other, other_recipe, name: "Other Cut")

      assert {:error, :not_found} = Library.get_recipe_impact(ctx, other_recipe.id)
      assert {:error, :not_found} = Library.get_recipe_impact(ctx, Ecto.UUID.generate())
      assert {:ok, impact} = Library.get_recipe_impact(ctx, recipe.id)
      template_ids = Enum.map(impact.templates, & &1.id)
      assert template.id in template_ids
      assert archived.id in template_ids
      refute Enum.any?(impact.templates, &(&1.name == "Other Cut"))

      assert [%{id: client_plan_id, name: "Client Cut", client_id: client_id}] =
               impact.client_plans

      assert client_plan_id == client_plan.id
      assert client_id == client.id
    end
  end

  describe "delete_recipe/2" do
    test "is blocked while a Menu Item still uses the recipe, including archived plans" do
      coach = insert(:coach)
      ctx = trainer_ctx(coach)
      recipe = insert(:recipe, business: coach.business, creator: coach)
      put_recipe_on_menu(coach, recipe, archived_at: DateTime.utc_now(:second))

      assert {:error, :in_use} = Library.delete_recipe(ctx, recipe.id)
    end

    test "is not blocked by another business's Menu" do
      coach = insert(:coach)
      ctx = trainer_ctx(coach)
      recipe = insert(:recipe, business: coach.business, creator: coach)

      other = insert(:coach)
      other_recipe = insert(:recipe, business: other.business, creator: other)
      put_recipe_on_menu(other, other_recipe)

      assert {:ok, _} = Library.delete_recipe(ctx, recipe.id)
    end
  end

  defp put_food_on_menu(coach, food, attrs \\ []) do
    {portion, attrs} = Keyword.pop(attrs, :portion, %{kind: :gram, grams: 100.0})
    put_item_on_menu(coach, food_item("food", food.id, portion), attrs)
  end

  defp put_recipe_on_menu(coach, recipe, attrs \\ []) do
    {kind, attrs} = Keyword.pop(attrs, :portion, :serving)

    portion =
      case kind do
        :gram -> %{kind: :gram, grams: 100.0}
        :serving -> %{kind: :serving, amount: 1.0, unit: "serving", label: nil}
      end

    put_item_on_menu(coach, recipe_item("recipe", recipe.id, portion), attrs)
  end

  defp put_item_on_menu(coach, item, attrs) do
    {archived_at, attrs} = Keyword.pop(attrs, :archived_at)
    plan = insert(:plan, Keyword.merge([business: coach.business, creator: coach.user, name: "Cut"], attrs))
    ctx = trainer_ctx(coach)
    {:ok, saved} = Programming.replace_menu(ctx, plan.id, plan.revision, menu(plan, meals: [meal_input("meal", "Meal", [item])]))

    if archived_at do
      {:ok, archived} = Programming.archive_plan(ctx, saved.id)
      archived
    else
      saved
    end
  end
end
