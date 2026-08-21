defmodule Easy.Foods.CategoryFilterTest do
  use Easy.SchemaCase

  alias Easy.Nutrition.Library
  alias Easy.Nutrition.Food
  alias Easy.Repo

  # `category` is a free-form string on `foods`, so the FO toolbar's options come
  # from the data. Both halves — the filter and the option list — are scoped to what
  # the coach can see (their business plus system foods).
  describe "list_foods/2 categories" do
    setup do
      business = insert(:business)
      coach = insert(:coach, business: business)

      insert(:food, business: business, creator: coach, name: "Chicken Breast", category: "Poultry")
      insert(:food, business: business, creator: coach, name: "Rolled Oats", category: "Grains")
      insert(:food, business: business, creator: coach, name: "Brown Rice", category: "Grains")
      insert(:food, business: business, creator: coach, name: "Uncategorised", category: nil)

      %{business: business, coach: coach}
    end

    test "no categories is a no-op, not an empty result", %{business: business} do
      ctx = owner_ctx(business)

      assert {:ok, %{count: all}} = Library.list_foods(ctx)
      assert {:ok, %{count: with_nil}} = Library.list_foods(ctx, categories: nil)
      assert {:ok, %{count: with_empty}} = Library.list_foods(ctx, categories: [])

      assert all == 4
      assert with_nil == 4
      assert with_empty == 4
    end

    test "filters to one category", %{business: business} do
      assert {:ok, %{count: 1, foods: [food]}} =
               Library.list_foods(owner_ctx(business), categories: ["Poultry"])

      assert food.name == "Chicken Breast"
    end

    test "takes any of several categories", %{business: business} do
      assert {:ok, %{count: 3}} =
               Library.list_foods(owner_ctx(business), categories: ["Poultry", "Grains"])
    end

    test "composes with search", %{business: business} do
      assert {:ok, %{count: 1, foods: [food]}} =
               Library.list_foods(owner_ctx(business), categories: ["Grains"], search: "rice")

      assert food.name == "Brown Rice"
    end

    test "search has deterministic tie-breakers" do
      {sql, _params} = Repo.to_sql(:all, Food.search("rice"))

      assert sql =~ ~s(ORDER BY ts_rank)
      assert sql =~ ~r/, \w0\."name", \w0\."id"$/
    end
  end

  describe "list_food_categories/1" do
    test "returns the distinct categories, sorted, without blanks" do
      business = insert(:business)
      coach = insert(:coach, business: business)

      insert(:food, business: business, creator: coach, category: "Grains")
      insert(:food, business: business, creator: coach, category: "Grains")
      insert(:food, business: business, creator: coach, category: "Dairy")
      insert(:food, business: business, creator: coach, category: nil)
      insert(:food, business: business, creator: coach, category: "")

      assert {:ok, ["Dairy", "Grains"]} = Library.list_food_categories(owner_ctx(business))
    end

    test "does not leak another business's categories" do
      business = insert(:business)
      coach = insert(:coach, business: business)
      insert(:food, business: business, creator: coach, category: "Grains")

      other_business = insert(:business)
      other_coach = insert(:coach, business: other_business)
      insert(:food, business: other_business, creator: other_coach, category: "Confidential")

      assert {:ok, categories} = Library.list_food_categories(owner_ctx(business))
      refute "Confidential" in categories
    end
  end
end
