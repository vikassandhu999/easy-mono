defmodule EasyWeb.Clients.RecipeControllerTest do
  use Easy.ConnCase

  setup do
    coach = insert(:coach)
    client = insert(:client, creator: coach, business: coach.business)
    conn = build_conn() |> authenticate_client(client)

    %{conn: conn, coach: coach, client: client, business: coach.business}
  end

  describe "GET /v1/client/nutrition-recipes" do
    test "lists business recipes", ctx do
      insert(:recipe, creator: ctx.coach, business: ctx.business, name: "Dal Tadka")

      conn = get(ctx.conn, "/v1/client/nutrition-recipes")
      assert %{"data" => data, "count" => 1} = json_response(conn, 200)
      assert hd(data)["name"] == "Dal Tadka"
    end

    test "searches recipes by name", ctx do
      insert(:recipe, creator: ctx.coach, business: ctx.business, name: "Chicken Curry")
      insert(:recipe, creator: ctx.coach, business: ctx.business, name: "Paneer Tikka")

      conn = get(ctx.conn, "/v1/client/nutrition-recipes", %{"search" => "chicken"})
      assert %{"data" => data} = json_response(conn, 200)
      assert length(data) == 1
      assert hd(data)["name"] == "Chicken Curry"
    end

    test "does not show other business recipes", ctx do
      other_coach = insert(:coach)
      insert(:recipe, creator: other_coach, business: other_coach.business, name: "Secret Recipe")

      conn = get(ctx.conn, "/v1/client/nutrition-recipes", %{"search" => "Secret"})
      assert %{"data" => [], "count" => 0} = json_response(conn, 200)
    end

    test "returns 403 without auth" do
      conn = build_conn() |> get("/v1/client/nutrition-recipes")
      assert json_response(conn, 403)
    end
  end

  describe "GET /v1/client/nutrition-recipes/:id" do
    test "returns recipe with ingredients", ctx do
      food = insert(:food, creator: ctx.coach, business: ctx.business, name: "Chicken")
      recipe = insert(:recipe, creator: ctx.coach, business: ctx.business, name: "Butter Chicken")

      insert(:recipe_ingredient,
        recipe: recipe,
        food: food,
        amount: 200,
        unit: "g",
        weight_g: 200
      )

      conn = get(ctx.conn, "/v1/client/nutrition-recipes/#{recipe.id}")
      assert %{"data" => data} = json_response(conn, 200)
      assert data["id"] == recipe.id
      assert data["name"] == "Butter Chicken"
      assert length(data["recipe_ingredients"]) == 1

      ingredient = hd(data["recipe_ingredients"])
      assert ingredient["food"]["name"] == "Chicken"
    end

    test "returns 404 for other business recipe", ctx do
      other_coach = insert(:coach)
      recipe = insert(:recipe, creator: other_coach, business: other_coach.business)

      conn = get(ctx.conn, "/v1/client/nutrition-recipes/#{recipe.id}")
      assert json_response(conn, 404)
    end
  end
end
