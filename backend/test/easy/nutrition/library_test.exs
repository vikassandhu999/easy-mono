defmodule Easy.Nutrition.LibraryTest do
  use Easy.SchemaCase

  alias Easy.Nutrition.{Food, Library, NutrientTotals}
  alias Easy.Repo

  describe "create_food/2" do
    test "stamps custom source, business ownership, and revision 1" do
      coach = insert(:coach)
      attrs = atomize(params_for(:food_attrs))

      assert {:ok, food} = Library.create_food(trainer_ctx(coach), attrs)
      assert food.source == :custom
      assert food.business_id == coach.business_id
      assert food.creator_id == coach.id
      assert food.revision == 1
    end

    test "trusts the coach identity carried by Ctx" do
      coach = insert(:coach)
      ctx = %{trainer_ctx(coach) | user_id: Ecto.UUID.generate()}

      assert {:ok, food} = Library.create_food(ctx, atomize(params_for(:food_attrs)))
      assert food.creator_id == coach.id
    end

    test "allows a food with no serving sizes" do
      coach = insert(:coach)
      attrs = atomize(params_for(:food_attrs)) |> Map.put(:serving_sizes, [])

      assert {:ok, food} = Library.create_food(trainer_ctx(coach), attrs)
      assert food.serving_sizes == []
    end

    test "rejects a nonempty serving-size collection without exactly one default" do
      coach = insert(:coach)

      attrs =
        atomize(params_for(:food_attrs))
        |> Map.put(:serving_sizes, [
          %{label: "cup", amount: 1.0, unit: "cup", weight_g: 100.0, is_default: false}
        ])

      assert {:error, changeset} = Library.create_food(trainer_ctx(coach), attrs)
      assert %{serving_sizes: ["must have exactly one default"]} = errors_on(changeset)
    end

    test "rejects non-positive serving amounts and gram weights" do
      coach = insert(:coach)

      attrs =
        atomize(params_for(:food_attrs))
        |> Map.put(:serving_sizes, [
          %{label: "cup", amount: 0, unit: "cup", weight_g: 100.0, is_default: true}
        ])

      assert {:error, changeset} = Library.create_food(trainer_ctx(coach), attrs)
      assert %{serving_sizes: [%{amount: _}]} = errors_on(changeset)
    end

    test "keeps unknown canonical nutrients as nil rather than zero" do
      coach = insert(:coach)

      attrs =
        atomize(params_for(:food_attrs))
        |> Map.merge(%{
          calories_per_100g: 120.0,
          protein_g_per_100g: nil,
          carbs_g_per_100g: nil,
          fat_g_per_100g: nil,
          fiber_g_per_100g: nil
        })

      assert {:ok, food} = Library.create_food(trainer_ctx(coach), attrs)
      assert food.calories_per_100g == 120.0
      assert food.protein_g_per_100g == nil
      assert food.carbs_g_per_100g == nil
      assert food.fat_g_per_100g == nil
      assert food.fiber_g_per_100g == nil
      refute NutrientTotals.from_food(food).complete
    end
  end

  describe "update_food/4" do
    test "any coach in the business can update another coach's food" do
      business = insert(:business)
      creator = insert(:coach, business: business)
      editor = insert(:coach, business: business)
      food = insert(:food, business: business, creator: creator)

      assert {:ok, updated} =
               Library.update_food(trainer_ctx(editor), food.id, food.revision, %{name: "Shared rename"})

      assert updated.name == "Shared rename"
      assert updated.revision == food.revision + 1
      assert updated.creator_id == creator.id
    end

    test "a stale expected revision returns the latest revision" do
      coach = insert(:coach)
      food = insert(:food, business: coach.business, creator: coach)
      ctx = trainer_ctx(coach)

      assert {:ok, _updated} = Library.update_food(ctx, food.id, food.revision, %{name: "First"})

      assert {:error, %Ecto.Changeset{action: :stale_revision, data: %Food{revision: 2}}} =
               Library.update_food(ctx, food.id, food.revision, %{name: "Second"})
    end

    test "does not mutate a system food" do
      coach = insert(:coach)
      food = insert(:food, business: nil, creator: nil, source: :system)

      assert {:error, :read_only_source} =
               Library.update_food(trainer_ctx(coach), food.id, 1, %{name: "Nope"})
    end

    test "does not mutate an imported food" do
      coach = insert(:coach)
      food = insert(:food, business: coach.business, creator: coach, source: :imported)

      assert {:error, :read_only_source} =
               Library.update_food(trainer_ctx(coach), food.id, 1, %{name: "Nope"})
    end

    test "does not leak another business's food" do
      coach = insert(:coach)
      other = insert(:coach)
      food = insert(:food, business: other.business, creator: other)

      assert {:error, :not_found} =
               Library.update_food(trainer_ctx(coach), food.id, 1, %{name: "Hacked"})
    end
  end

  describe "delete_food/3" do
    test "deletes on the expected revision and rejects a stale one" do
      coach = insert(:coach)
      food = insert(:food, business: coach.business, creator: coach)
      ctx = trainer_ctx(coach)

      assert {:ok, _} = Library.update_food(ctx, food.id, 1, %{name: "Kept"})

      assert {:error, %Ecto.Changeset{action: :stale_revision, data: %Food{revision: 2}}} =
               Library.delete_food(ctx, food.id, 1)

      assert {:ok, _} = Library.delete_food(ctx, food.id, 2)
      refute Repo.get(Food, food.id)
    end

    test "any coach in the business can delete another coach's food" do
      business = insert(:business)
      creator = insert(:coach, business: business)
      editor = insert(:coach, business: business)
      food = insert(:food, business: business, creator: creator)

      assert {:ok, _} = Library.delete_food(trainer_ctx(editor), food.id, food.revision)
      refute Repo.get(Food, food.id)
    end

    test "does not delete an imported food" do
      coach = insert(:coach)
      food = insert(:food, business: coach.business, creator: coach, source: :imported)

      assert {:error, :read_only_source} = Library.delete_food(trainer_ctx(coach), food.id, 1)
    end
  end

  describe "copy_food/2" do
    test "copies a system food as a custom business food at revision 1" do
      coach = insert(:coach)

      source =
        insert(:food,
          business: nil,
          creator: nil,
          source: :system,
          calories_per_100g: 90.0,
          serving_sizes: [
            %Easy.Nutrition.ServingSize{
              label: "1 cup",
              amount: 1.0,
              unit: "cup",
              weight_g: 100.0,
              is_default: true
            }
          ]
        )

      assert {:ok, copy} = Library.copy_food(trainer_ctx(coach), source.id)
      assert copy.source == :custom
      assert copy.business_id == coach.business_id
      assert copy.revision == 1
      refute copy.id == source.id
      assert hd(copy.serving_sizes).label == "1 cup"
      refute Map.has_key?(Map.from_struct(hd(copy.serving_sizes)), :id)
    end
  end

  describe "list_foods/2" do
    test "does not list another business's foods" do
      coach = insert(:coach)
      insert(:food, business: coach.business, creator: coach, name: "Ours")
      other = insert(:coach)
      insert(:food, business: other.business, creator: other, name: "Theirs")

      assert {:ok, %{count: 1, foods: [food]}} = Library.list_foods(trainer_ctx(coach))
      assert food.name == "Ours"
    end

    test "honors requested page sizes through the shared maximum" do
      coach = insert(:coach)
      insert_list(21, :food, business: coach.business, creator: coach)

      assert {:ok, %{count: 21, foods: foods}} =
               Library.list_foods(trainer_ctx(coach), limit: 100)

      assert length(foods) == 21
    end
  end

  describe "resolve_food_portion/2" do
    test "resolves a gram portion to positive grams" do
      food = insert(:food)

      assert {:ok, %{grams: 150.0, amount: nil, unit: nil, label: nil}} =
               Library.resolve_food_portion(food, %{kind: :gram, grams: 150})
    end

    test "resolves a serving selection against the food's serving sizes" do
      food =
        insert(:food,
          serving_sizes: [
            %Easy.Nutrition.ServingSize{
              label: "1 cup",
              amount: 1.0,
              unit: "cup",
              weight_g: 100.0,
              is_default: true
            }
          ]
        )

      assert {:ok, %{grams: 200.0, amount: 2.0, unit: "cup", label: "1 cup"}} =
               Library.resolve_food_portion(food, %{kind: :serving, amount: 2.0, unit: "cup", label: "1 cup"})
    end

    test "rejects a serving that is not on the food" do
      food = insert(:food, serving_sizes: [])

      assert {:error, :invalid_portion} =
               Library.resolve_food_portion(food, %{kind: :serving, amount: 1.0, unit: "cup", label: "1 cup"})
    end

    test "rejects a non-positive gram portion" do
      food = insert(:food)

      assert {:error, :invalid_portion} = Library.resolve_food_portion(food, %{kind: :gram, grams: 0})
    end
  end

  defp atomize(map) do
    Map.new(map, fn {k, v} -> {String.to_existing_atom(k), v} end)
  end
end
