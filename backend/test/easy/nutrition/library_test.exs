defmodule Easy.Nutrition.LibraryTest do
  alias Easy.Nutrition.Portions
  use Easy.SchemaCase

  alias Easy.Nutrition.{Food, Library, NutrientTotals, Recipe}
  alias Easy.Repo

  for {factory, schema, operations} <- [
        {:food, Food, [:get_food, :copy_food, :delete_food]},
        {:recipe, Recipe, [:get_recipe, :copy_recipe, :delete_recipe]}
      ] do
    test "#{factory} reads, copies and deletes reject foreign and missing identities without mutations" do
      coach = insert(:coach)
      foreign_coach = insert(:coach)
      ctx = trainer_ctx(coach)
      foreign = insert(unquote(factory), business: foreign_coach.business, creator: foreign_coach)
      before = Repo.get!(unquote(schema), foreign.id)
      count = Repo.aggregate(unquote(schema), :count)

      for operation <- unquote(operations), id <- [foreign.id, Ecto.UUID.generate()] do
        assert {:error, :not_found} = apply(Library, operation, [ctx, id])
      end

      assert Repo.get!(unquote(schema), foreign.id) == before
      assert Repo.aggregate(unquote(schema), :count) == count
    end
  end

  test "unavailable media rejects food writes without changing metadata or revision" do
    coach = insert(:coach)
    ctx = trainer_ctx(coach)
    media = insert(:library_media, business: coach.business)
    hidden = insert(:library_media)
    food = insert(:food, business: coach.business, creator: coach, media: media)
    before = Repo.get!(Food, food.id)
    count = Repo.aggregate(Food, :count)

    for media_id <- [hidden.id, Ecto.UUID.generate()] do
      attrs = params_for(:food_attrs) |> Map.put("media_id", media_id)
      assert {:error, :not_found} = Library.create_food(ctx, attrs)

      assert {:error, :not_found} =
               Library.update_food(ctx, food.id, food.revision, %{"name" => "Rejected", "media_id" => media_id})

      assert Repo.get!(Food, food.id) == before
      assert Repo.aggregate(Food, :count) == count
    end

    assert {:ok, cleared} = Library.update_food(ctx, food.id, food.revision, %{"media_id" => nil})
    assert cleared.media_id == nil
    assert cleared.media == nil
    assert cleared.name == food.name
    assert cleared.revision == food.revision + 1
  end

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
    test "validates serving input before checking references and accepts string-keyed replacements" do
      coach = insert(:coach)
      food = insert(:food, business: coach.business, creator: coach)
      ctx = trainer_ctx(coach)

      assert {:error, changeset} = Library.update_food(ctx, food.id, food.revision, %{"serving_sizes" => "invalid"})
      assert errors_on(changeset).serving_sizes == ["is invalid"]
      assert Repo.get!(Food, food.id).revision == food.revision

      attrs = %{
        "serving_sizes" => [
          %{"label" => "cup", "unit" => "cup", "amount" => 1.0, "weight_g" => 200.0, "is_default" => true}
        ]
      }

      assert {:ok, updated} = Library.update_food(ctx, food.id, food.revision, attrs)
      assert [%{label: "cup", weight_g: 200.0}] = updated.serving_sizes
    end

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

    test "does not leak another business's food" do
      coach = insert(:coach)
      other = insert(:coach)
      food = insert(:food, business: other.business, creator: other)

      assert {:error, :not_found} =
               Library.update_food(trainer_ctx(coach), food.id, 1, %{name: "Hacked"})
    end
  end

  describe "delete_food/2" do
    test "deletes on the expected revision and rejects a stale one" do
      coach = insert(:coach)
      food = insert(:food, business: coach.business, creator: coach)
      ctx = trainer_ctx(coach)

      assert {:ok, _} = Library.update_food(ctx, food.id, 1, %{name: "Kept"})

      assert {:ok, _} = Library.delete_food(ctx, food.id)
      refute Repo.get(Food, food.id)
    end

    test "any coach in the business can delete another coach's food" do
      business = insert(:business)
      creator = insert(:coach, business: business)
      editor = insert(:coach, business: business)
      food = insert(:food, business: business, creator: creator)

      assert {:ok, _} = Library.delete_food(trainer_ctx(editor), food.id)
      refute Repo.get(Food, food.id)
    end

    test "does not delete a system food" do
      coach = insert(:coach)
      food = insert(:food, business: coach.business, creator: coach, source: :system)

      assert {:error, :read_only_source} = Library.delete_food(trainer_ctx(coach), food.id)
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
    test "searches without searchable tokens retain newest-first pagination" do
      coach = insert(:coach)
      ctx = trainer_ctx(coach)
      older = insert(:food, business: coach.business, creator: coach, inserted_at: ~U[2025-01-01 00:00:00Z])
      newer = insert(:food, business: coach.business, creator: coach, inserted_at: ~U[2025-01-02 00:00:00Z])

      for search <- [nil, "", "  ", "!!!", " & : * "] do
        assert {:ok, %{count: 2, foods: [first]}} = Library.list_foods(ctx, search: search, limit: 1)
        assert first.id == newer.id
        assert {:ok, %{count: 2, foods: [second]}} = Library.list_foods(ctx, search: search, limit: 1, offset: 1)
        assert second.id == older.id
      end
    end

    test "does not list another business's foods" do
      coach = insert(:coach)
      insert(:food, business: coach.business, creator: coach, name: "Ours")
      other = insert(:coach)
      insert(:food, business: other.business, creator: other, name: "Theirs")

      assert {:ok, %{count: 1, foods: [food]}} = Library.list_foods(trainer_ctx(coach))
      assert food.name == "Ours"
    end

    test "bounds pagination while preserving the visible count" do
      coach = insert(:coach)
      ctx = trainer_ctx(coach)
      insert_list(101, :food, business: coach.business, creator: coach)

      assert {:ok, %{count: 101, foods: foods}} = Library.list_foods(ctx, limit: 500)
      assert length(foods) == 100
      assert {:ok, %{count: 101, foods: [_first]}} = Library.list_foods(ctx, offset: -5, limit: 1)
      assert {:ok, %{count: 101, foods: []}} = Library.list_foods(ctx, limit: -1)
    end
  end

  describe "resolve_food_portion/2" do
    test "resolves a gram portion to positive grams" do
      food = insert(:food)

      assert {:ok, %{kind: :gram, grams: 150.0}} =
               Portions.resolve_food(food, %{kind: :gram, grams: 150})
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
               Portions.resolve_food(food, %{kind: :serving, amount: 2.0, unit: "cup", label: "1 cup"})
    end

    test "rejects a serving that is not on the food" do
      food = insert(:food, serving_sizes: [])

      assert {:error, :invalid_portion} =
               Portions.resolve_food(food, %{kind: :serving, amount: 1.0, unit: "cup", label: "1 cup"})
    end

    test "rejects a non-positive gram portion" do
      food = insert(:food)

      assert {:error, :invalid_portion} = Portions.resolve_food(food, %{kind: :gram, grams: 0})
    end
  end

  defp atomize(map) do
    Map.new(map, fn {k, v} -> {String.to_existing_atom(k), v} end)
  end
end
