defmodule EasyWeb.NutritionEndpointsTest do
  use Easy.ConnCase, async: true

  alias Easy.{Accounts, Nutrition, Coaches, Organizations}

  @moduledoc """
  Integration tests for nutrition endpoints (ingredients, recipes, meals).

  Tests the new scope-based authorization pattern where business_id is extracted
  from JWT claims instead of URL parameters.
  """

  # ============================================
  # TEST HELPERS
  # ============================================

  defp create_test_business_and_coach do
    # Create user
    {:ok, user} =
      Accounts.create_user(%{
        email: "coach#{System.unique_integer([:positive])}@example.com",
        full_name: "Test Coach",
        email_verified: true
      })

    # Create business using legacy function
    {:ok, business} =
      Organizations.create_business_legacy(user, %{
        name: "Test Business #{System.unique_integer([:positive])}"
      })

    # Create coach profile using legacy function
    {:ok, coach} =
      Coaches.create_coach_legacy(user.id, business.id, %{
        bio: "Test coach bio"
      })

    %{business: business, user: user, coach: coach}
  end

  defp generate_test_token(user, business_id, coach_id) do
    # Generate a test access token with business and coach context
    {:ok, token} =
      Accounts.Token.generate_access_token(
        user,
        Ecto.UUID.generate(),
        ["coach"],
        %{business_id: business_id, coach_id: coach_id}
      )

    token
  end

  defp generate_token_without_business(user) do
    # Generate a test access token without business context
    {:ok, token} =
      Accounts.Token.generate_access_token(
        user,
        Ecto.UUID.generate(),
        [],
        %{}
      )

    token
  end

  defp generate_token_without_coach(user, business_id) do
    # Generate a test access token with business but no coach context
    {:ok, token} =
      Accounts.Token.generate_access_token(
        user,
        Ecto.UUID.generate(),
        [],
        %{business_id: business_id}
      )

    token
  end

  defp auth_conn(conn, token) do
    put_req_header(conn, "authorization", "Bearer #{token}")
  end

  # ============================================
  # INGREDIENT ENDPOINT TESTS
  # ============================================

  describe "GET /api/ingredients" do
    setup do
      context = create_test_business_and_coach()
      token = generate_test_token(context.user, context.business.id, context.coach.id)

      # Create test ingredients
      {:ok, ingredient1} =
        Nutrition.create_ingredient(context.business.id, context.coach.id, %{
          name: "Chicken Breast",
          calories: Decimal.new("165"),
          protein: Decimal.new("31"),
          carbohydrates: Decimal.new("0"),
          fats: Decimal.new("3.6"),
          fiber: Decimal.new("0")
        })

      {:ok, ingredient2} =
        Nutrition.create_ingredient(context.business.id, context.coach.id, %{
          name: "Brown Rice",
          calories: Decimal.new("112"),
          protein: Decimal.new("2.6"),
          carbohydrates: Decimal.new("24"),
          fats: Decimal.new("0.9"),
          fiber: Decimal.new("1.8")
        })

      Map.merge(context, %{token: token, ingredient1: ingredient1, ingredient2: ingredient2})
    end

    test "lists ingredients for authenticated coach with business context", %{
      conn: conn,
      token: token,
      ingredient1: ingredient1,
      ingredient2: ingredient2
    } do
      conn =
        conn
        |> auth_conn(token)
        |> get("/api/ingredients")

      assert %{
               "ingredients" => ingredients,
               "meta" => meta
             } = json_response(conn, 200)

      assert length(ingredients) == 2
      assert meta["limit"] == 50
      assert meta["offset"] == 0

      ingredient_names = Enum.map(ingredients, & &1["name"])
      assert ingredient1.name in ingredient_names
      assert ingredient2.name in ingredient_names
    end

    test "supports pagination parameters", %{conn: conn, token: token} do
      conn =
        conn
        |> auth_conn(token)
        |> get("/api/ingredients?limit=1&offset=0")

      assert %{
               "ingredients" => ingredients,
               "meta" => %{"limit" => 1, "offset" => 0}
             } = json_response(conn, 200)

      assert length(ingredients) == 1
    end

    test "supports search parameter", %{conn: conn, token: token} do
      conn =
        conn
        |> auth_conn(token)
        |> get("/api/ingredients?search=Chicken")

      assert %{"ingredients" => ingredients} = json_response(conn, 200)
      assert length(ingredients) >= 1
      assert Enum.any?(ingredients, fn i -> String.contains?(i["name"], "Chicken") end)
    end

    test "returns 403 when business context is missing", %{conn: conn, user: user} do
      token = generate_token_without_business(user)

      conn =
        conn
        |> auth_conn(token)
        |> get("/api/ingredients")

      assert %{
               "error" => %{
                 "message" => message,
                 "code" => code
               }
             } = json_response(conn, 403)

      assert message =~ "business context"
      assert code in ["forbidden", "FORBIDDEN"]
    end

    test "returns 403 when coach context is missing", %{
      conn: conn,
      user: user,
      business: business
    } do
      token = generate_token_without_coach(user, business.id)

      conn =
        conn
        |> auth_conn(token)
        |> get("/api/ingredients")

      assert %{
               "error" => %{
                 "message" => message,
                 "code" => code
               }
             } = json_response(conn, 403)

      assert message =~ "coach"
    end

    test "returns 401 when not authenticated", %{conn: conn} do
      conn = get(conn, "/api/ingredients")

      assert %{
               "error" => %{
                 "code" => code
               }
             } = json_response(conn, 401)

      assert code in ["MISSING_TOKEN", "missing_token"]
    end
  end

  describe "POST /api/ingredients" do
    setup do
      context = create_test_business_and_coach()
      token = generate_test_token(context.user, context.business.id, context.coach.id)

      Map.put(context, :token, token)
    end

    test "creates ingredient with valid data", %{conn: conn, token: token, business: business} do
      ingredient_params = %{
        "name" => "Salmon Fillet",
        "description" => "Fresh Atlantic salmon",
        "calories" => 206,
        "protein" => 22,
        "carbohydrates" => 0,
        "fats" => 13,
        "fiber" => 0,
        "source" => "USDA"
      }

      conn =
        conn
        |> auth_conn(token)
        |> post("/api/ingredients", ingredient_params)

      assert %{"ingredient" => ingredient} = json_response(conn, 201)
      assert ingredient["name"] == "Salmon Fillet"
      assert ingredient["business_id"] == business.id
      assert Decimal.equal?(Decimal.new(ingredient["calories"]), Decimal.new("206"))
    end

    test "returns validation error for missing required fields", %{conn: conn, token: token} do
      conn =
        conn
        |> auth_conn(token)
        |> post("/api/ingredients", %{})

      assert %{"error" => _error} = json_response(conn, 422)
    end

    test "returns 403 when business context is missing", %{conn: conn, user: user} do
      token = generate_token_without_business(user)

      conn =
        conn
        |> auth_conn(token)
        |> post("/api/ingredients", %{"name" => "Test"})

      assert %{
               "error" => %{
                 "message" => message,
                 "code" => code
               }
             } = json_response(conn, 403)

      assert message =~ "business context"
      assert code in ["forbidden", "FORBIDDEN"]
    end

    test "returns 403 when coach context is missing", %{
      conn: conn,
      user: user,
      business: business
    } do
      token = generate_token_without_coach(user, business.id)

      conn =
        conn
        |> auth_conn(token)
        |> post("/api/ingredients", %{"name" => "Test"})

      assert %{
               "error" => %{
                 "message" => message,
                 "code" => code
               }
             } = json_response(conn, 403)

      assert message =~ "coach"
    end
  end

  # ============================================
  # RECIPE ENDPOINT TESTS
  # ============================================

  describe "GET /api/recipes" do
    setup do
      context = create_test_business_and_coach()
      token = generate_test_token(context.user, context.business.id, context.coach.id)

      # Create test recipes
      {:ok, recipe1} =
        Nutrition.create_recipe(context.business.id, context.coach.id, %{
          name: "Grilled Chicken",
          description: "Healthy grilled chicken",
          servings: 4
        })

      {:ok, recipe2} =
        Nutrition.create_recipe(context.business.id, context.coach.id, %{
          name: "Chicken Stir Fry",
          description: "Quick stir fry",
          servings: 2
        })

      Map.merge(context, %{token: token, recipe1: recipe1, recipe2: recipe2})
    end

    test "lists recipes for authenticated coach with business context", %{
      conn: conn,
      token: token,
      recipe1: recipe1,
      recipe2: recipe2
    } do
      conn =
        conn
        |> auth_conn(token)
        |> get("/api/recipes")

      assert %{
               "recipes" => recipes,
               "meta" => meta
             } = json_response(conn, 200)

      assert length(recipes) == 2
      assert meta["limit"] == 50

      recipe_names = Enum.map(recipes, & &1["name"])
      assert recipe1.name in recipe_names
      assert recipe2.name in recipe_names
    end

    test "supports search parameter", %{conn: conn, token: token} do
      conn =
        conn
        |> auth_conn(token)
        |> get("/api/recipes?search=Grilled")

      assert %{"recipes" => recipes} = json_response(conn, 200)
      assert length(recipes) >= 1
      assert Enum.any?(recipes, fn r -> String.contains?(r["name"], "Grilled") end)
    end

    test "returns 403 when business context is missing", %{conn: conn, user: user} do
      token = generate_token_without_business(user)

      conn =
        conn
        |> auth_conn(token)
        |> get("/api/recipes")

      assert %{
               "error" => %{
                 "message" => message,
                 "code" => code
               }
             } = json_response(conn, 403)

      assert message =~ "business context"
      assert code in ["forbidden", "FORBIDDEN"]
    end

    test "returns 403 when coach context is missing", %{
      conn: conn,
      user: user,
      business: business
    } do
      token = generate_token_without_coach(user, business.id)

      conn =
        conn
        |> auth_conn(token)
        |> get("/api/recipes")

      assert %{
               "error" => %{
                 "message" => message,
                 "code" => code
               }
             } = json_response(conn, 403)

      assert message =~ "coach"
    end
  end

  describe "POST /api/recipes" do
    setup do
      context = create_test_business_and_coach()
      token = generate_test_token(context.user, context.business.id, context.coach.id)

      Map.put(context, :token, token)
    end

    test "creates recipe with valid data", %{conn: conn, token: token, business: business} do
      recipe_params = %{
        "name" => "Protein Smoothie",
        "description" => "Post-workout smoothie",
        "instructions" => "Blend all ingredients",
        "prep_time_minutes" => 5,
        "servings" => 1
      }

      conn =
        conn
        |> auth_conn(token)
        |> post("/api/recipes", recipe_params)

      assert %{"recipe" => recipe} = json_response(conn, 201)
      assert recipe["name"] == "Protein Smoothie"
      assert recipe["business_id"] == business.id
      assert recipe["servings"] == 1
    end

    test "returns 403 when business context is missing", %{conn: conn, user: user} do
      token = generate_token_without_business(user)

      conn =
        conn
        |> auth_conn(token)
        |> post("/api/recipes", %{"name" => "Test"})

      assert %{
               "error" => %{
                 "message" => message,
                 "code" => code
               }
             } = json_response(conn, 403)

      assert message =~ "business context"
      assert code in ["forbidden", "FORBIDDEN"]
    end

    test "returns 403 when coach context is missing", %{
      conn: conn,
      user: user,
      business: business
    } do
      token = generate_token_without_coach(user, business.id)

      conn =
        conn
        |> auth_conn(token)
        |> post("/api/recipes", %{"name" => "Test"})

      assert %{
               "error" => %{
                 "message" => message,
                 "code" => code
               }
             } = json_response(conn, 403)

      assert message =~ "coach"
    end
  end

  # ============================================
  # MEAL ENDPOINT TESTS
  # ============================================

  describe "GET /api/meals" do
    setup do
      context = create_test_business_and_coach()
      token = generate_test_token(context.user, context.business.id, context.coach.id)

      # Create test meals
      {:ok, meal1} =
        Nutrition.create_meal(context.business.id, context.coach.id, %{
          name: "Breakfast Bowl",
          description: "Healthy breakfast",
          meal_type: "breakfast"
        })

      {:ok, meal2} =
        Nutrition.create_meal(context.business.id, context.coach.id, %{
          name: "Lunch Salad",
          description: "Fresh salad",
          meal_type: "lunch"
        })

      Map.merge(context, %{token: token, meal1: meal1, meal2: meal2})
    end

    test "lists meals for authenticated coach with business context", %{
      conn: conn,
      token: token,
      meal1: meal1,
      meal2: meal2
    } do
      conn =
        conn
        |> auth_conn(token)
        |> get("/api/meals")

      assert %{
               "meals" => meals,
               "meta" => meta
             } = json_response(conn, 200)

      assert length(meals) == 2
      assert meta["limit"] == 50

      meal_names = Enum.map(meals, & &1["name"])
      assert meal1.name in meal_names
      assert meal2.name in meal_names
    end

    test "supports meal_type filter", %{conn: conn, token: token} do
      conn =
        conn
        |> auth_conn(token)
        |> get("/api/meals?meal_type=breakfast")

      assert %{"meals" => meals} = json_response(conn, 200)
      assert length(meals) >= 1
      assert Enum.all?(meals, fn m -> m["meal_type"] == "breakfast" end)
    end

    test "returns 403 when business context is missing", %{conn: conn, user: user} do
      token = generate_token_without_business(user)

      conn =
        conn
        |> auth_conn(token)
        |> get("/api/meals")

      assert %{
               "error" => %{
                 "message" => message,
                 "code" => code
               }
             } = json_response(conn, 403)

      assert message =~ "business context"
      assert code in ["forbidden", "FORBIDDEN"]
    end

    test "returns 403 when coach context is missing", %{
      conn: conn,
      user: user,
      business: business
    } do
      token = generate_token_without_coach(user, business.id)

      conn =
        conn
        |> auth_conn(token)
        |> get("/api/meals")

      assert %{
               "error" => %{
                 "message" => message,
                 "code" => code
               }
             } = json_response(conn, 403)

      assert message =~ "coach"
    end
  end

  describe "POST /api/meals" do
    setup do
      context = create_test_business_and_coach()
      token = generate_test_token(context.user, context.business.id, context.coach.id)

      Map.put(context, :token, token)
    end

    test "creates meal with valid data", %{conn: conn, token: token, business: business} do
      meal_params = %{
        "name" => "Dinner Plate",
        "description" => "Balanced dinner",
        "meal_type" => "dinner",
        "notes" => "Great for meal prep"
      }

      conn =
        conn
        |> auth_conn(token)
        |> post("/api/meals", meal_params)

      assert %{"meal" => meal} = json_response(conn, 201)
      assert meal["name"] == "Dinner Plate"
      assert meal["business_id"] == business.id
      assert meal["meal_type"] == "dinner"
    end

    test "returns 403 when business context is missing", %{conn: conn, user: user} do
      token = generate_token_without_business(user)

      conn =
        conn
        |> auth_conn(token)
        |> post("/api/meals", %{"name" => "Test"})

      assert %{
               "error" => %{
                 "message" => message,
                 "code" => code
               }
             } = json_response(conn, 403)

      assert message =~ "business context"
      assert code in ["forbidden", "FORBIDDEN"]
    end

    test "returns 403 when coach context is missing", %{
      conn: conn,
      user: user,
      business: business
    } do
      token = generate_token_without_coach(user, business.id)

      conn =
        conn
        |> auth_conn(token)
        |> post("/api/meals", %{"name" => "Test"})

      assert %{
               "error" => %{
                 "message" => message,
                 "code" => code
               }
             } = json_response(conn, 403)

      assert message =~ "coach"
    end
  end
end
