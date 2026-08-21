defmodule EasyWeb.Coaches.NutritionMenuControllerTest do
  use Easy.ConnCase

  import OpenApiSpex.TestAssertions

  alias Easy.Nutrition.{Meal, MealItem, Plan}
  alias Easy.Repo

  describe "PUT /v1/coach/nutrition-plans/:id/menu" do
    test "replaces and returns the complete Menu with nutrients rounded to one decimal", %{conn: conn} do
      coach = insert(:coach)
      template = insert(:plan, business: coach.business, creator: coach.user)

      food =
        insert(:food,
          business: coach.business,
          creator: coach,
          name: "Yogurt",
          calories_per_100g: 33.333,
          protein_g_per_100g: 20.0,
          carbs_g_per_100g: 10.0,
          fat_g_per_100g: 1.0,
          fiber_g_per_100g: 0.0,
          serving_sizes: [
            %{label: "1 cup", amount: 1.0, unit: "cup", weight_g: 80.0, is_default: true}
          ]
        )

      response =
        conn
        |> authenticate_coach(coach)
        |> put(
          "/v1/coach/nutrition-plans/#{template.id}/menu",
          menu_body(1,
            meals: [
              %{
                "local_ref" => "dinner",
                "name" => "Dinner",
                "position" => 10,
                "meal_items" => []
              },
              %{
                "local_ref" => "breakfast",
                "name" => "Breakfast",
                "position" => 0,
                "meal_items" => [
                  %{
                    "local_ref" => "yogurt",
                    "kind" => "food",
                    "food_id" => food.id,
                    "position" => 0,
                    "portion" => %{"kind" => "gram", "grams" => 50}
                  },
                  %{
                    "local_ref" => "cup",
                    "kind" => "food",
                    "food_id" => food.id,
                    "position" => 1,
                    "portion" => %{
                      "kind" => "serving",
                      "amount" => 1,
                      "unit" => "cup",
                      "label" => "1 cup"
                    }
                  }
                ]
              }
            ],
            slots: [
              %{
                "meal_slot" => "post_workout",
                "options" => [%{"local_ref" => "post", "meal_local_ref" => "dinner", "position" => 0}]
              },
              %{
                "meal_slot" => "breakfast",
                "options" => [%{"local_ref" => "default", "meal_local_ref" => "breakfast", "position" => 0}]
              }
            ]
          )
        )
        |> json_response(200)

      assert %{
               "data" => %{
                 "revision" => 2,
                 "meals" => [
                   %{
                     "name" => "Breakfast",
                     "position" => 0,
                     "nutrients" => %{"calories" => 43.3, "protein" => 26.0},
                     "meal_items" => [
                       %{
                         "kind" => "food",
                         "name" => "Yogurt",
                         "portion" => %{"kind" => "gram", "grams" => 50.0},
                         "nutrients" => %{"calories" => 16.7, "protein" => 10.0, "complete" => true}
                       },
                       %{
                         "kind" => "food",
                         "portion" => %{
                           "kind" => "serving",
                           "grams" => 80.0,
                           "amount" => 1.0,
                           "unit" => "cup",
                           "label" => "1 cup"
                         },
                         "nutrients" => %{"calories" => 26.7}
                       }
                     ]
                   },
                   %{"name" => "Dinner", "position" => 10, "meal_items" => []}
                 ],
                 "day_patterns" => [
                   %{
                     "name" => "Everyday",
                     "slots" => [
                       %{"meal_slot" => "breakfast", "options" => [%{"position" => 0}]},
                       %{"meal_slot" => "post_workout", "options" => [%{"position" => 0}]}
                     ]
                   }
                 ]
               }
             } = response

      breakfast_id = response["data"]["meals"] |> Enum.find(&(&1["name"] == "Breakfast")) |> Map.fetch!("id")
      dinner_id = response["data"]["meals"] |> Enum.find(&(&1["name"] == "Dinner")) |> Map.fetch!("id")
      pattern_id = hd(response["data"]["day_patterns"])["id"]

      assert hd(hd(response["data"]["day_patterns"])["slots"])["options"] |> hd() |> Map.fetch!("nutrition_meal_id") ==
               breakfast_id

      assert List.last(hd(response["data"]["day_patterns"])["slots"])["options"]
             |> hd()
             |> Map.fetch!("nutrition_meal_id") == dinner_id

      assert response["data"]["schedule"]["monday"] == pattern_id
      assert response["data"]["schedule"]["sunday"] == pattern_id
      assert_schema(response["data"], "NutritionPlan", EasyWeb.ApiSpec.spec())
    end

    test "keeps persisted Meal ids and omits meals that are left out of the replacement", %{conn: conn} do
      coach = insert(:coach)
      template = insert(:plan, business: coach.business, creator: coach.user)

      created =
        conn
        |> authenticate_coach(coach)
        |> put(
          "/v1/coach/nutrition-plans/#{template.id}/menu",
          menu_body(1,
            meals: [
              %{"local_ref" => "kept", "name" => "Kept", "position" => 0, "meal_items" => []},
              %{"local_ref" => "dropped", "name" => "Dropped", "position" => 1, "meal_items" => []}
            ]
          )
        )
        |> json_response(200)

      kept_id = created["data"]["meals"] |> Enum.find(&(&1["name"] == "Kept")) |> Map.fetch!("id")
      dropped_id = created["data"]["meals"] |> Enum.find(&(&1["name"] == "Dropped")) |> Map.fetch!("id")
      pattern_id = hd(created["data"]["day_patterns"])["id"]

      response =
        conn
        |> recycle()
        |> put_req_header("content-type", "application/json")
        |> authenticate_coach(coach)
        |> put(
          "/v1/coach/nutrition-plans/#{template.id}/menu",
          menu_body(2,
            meals: [
              %{"id" => kept_id, "name" => "Kept", "position" => 4, "meal_items" => []}
            ],
            pattern_id: pattern_id
          )
        )
        |> json_response(200)

      assert %{
               "data" => %{
                 "revision" => 3,
                 "meals" => [%{"id" => ^kept_id, "name" => "Kept", "position" => 4, "meal_items" => []}]
               }
             } = response

      assert_schema(response["data"], "NutritionPlan", EasyWeb.ApiSpec.spec())
      assert Repo.get(Meal, dropped_id) == nil
    end

    test "returns the structured stale revision error without writing", %{conn: conn} do
      coach = insert(:coach)
      template = insert(:plan, business: coach.business, creator: coach.user, revision: 3)

      response =
        conn
        |> authenticate_coach(coach)
        |> put(
          "/v1/coach/nutrition-plans/#{template.id}/menu",
          menu_body(2, meals: [%{"local_ref" => "breakfast", "name" => "Breakfast", "position" => 0, "meal_items" => []}])
        )
        |> json_response(409)

      assert %{
               "error_code" => "stale_revision",
               "error_detail" => %{"current_revision" => 3}
             } = response

      assert_schema(response, "StaleRevisionError", EasyWeb.ApiSpec.spec())
      assert Repo.get!(Plan, template.id).revision == 3
      assert Repo.aggregate(Meal.for_plan(template.id), :count, :id) == 0
    end

    test "rejects duplicate request-local references without writing", %{conn: conn} do
      coach = insert(:coach)
      template = insert(:plan, business: coach.business, creator: coach.user)

      response =
        conn
        |> authenticate_coach(coach)
        |> put(
          "/v1/coach/nutrition-plans/#{template.id}/menu",
          menu_body(1,
            meals: [
              %{"local_ref" => "same", "name" => "One", "position" => 0, "meal_items" => []},
              %{"local_ref" => "same", "name" => "Two", "position" => 1, "meal_items" => []}
            ]
          )
        )
        |> json_response(422)

      assert %{"error_code" => "invalid_input"} = response
      assert Repo.get!(Plan, template.id).revision == 1
      assert Repo.aggregate(Meal.for_plan(template.id), :count, :id) == 0
    end

    test "conceals another business Template", %{conn: conn} do
      coach = insert(:coach)
      other = insert(:coach)
      hidden = insert(:plan, business: other.business, creator: other.user)

      response =
        conn
        |> authenticate_coach(coach)
        |> put("/v1/coach/nutrition-plans/#{hidden.id}/menu", menu_body(1, meals: []))
        |> json_response(404)

      assert %{"error_code" => "not_found"} = response
      assert Repo.aggregate(MealItem.for_plan(hidden.id), :count, :id) == 0
    end
  end

  defp menu_body(revision, opts) do
    pattern_id = Keyword.get(opts, :pattern_id)
    slots = Keyword.get(opts, :slots, [])
    pattern_ref = pattern_id || "everyday"

    pattern =
      if pattern_id do
        %{"id" => pattern_id, "name" => "Everyday", "position" => 0, "slots" => slots}
      else
        %{"local_ref" => "everyday", "name" => "Everyday", "position" => 0, "slots" => slots}
      end

    %{
      "expected_revision" => revision,
      "meals" => Keyword.fetch!(opts, :meals),
      "day_patterns" => [pattern],
      "schedule" => Map.new(~w(monday tuesday wednesday thursday friday saturday sunday), &{&1, pattern_ref})
    }
  end
end
