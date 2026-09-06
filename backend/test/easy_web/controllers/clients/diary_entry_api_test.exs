defmodule EasyWeb.Clients.DiaryEntryApiTest do
  use Easy.ConnCase

  import Easy.Nutrition.DiaryFixtures, only: [covering_setup: 0]

  setup do
    fixture = covering_setup()

    conn =
      build_conn()
      |> authenticate_client(fixture.client)
      |> put_req_header("content-type", "application/json")

    Map.put(fixture, :conn, conn)
  end

  test "saves, rejects a stale revision, and removes an entry through one day endpoint", ctx do
    %{"data" => [day]} = ctx.conn |> get("/v1/client/nutrition-days") |> json_response(200)
    [slot] = day["slots"]
    [row] = slot["rows"]
    entry_id = Ecto.UUID.generate()
    path = "/v1/client/nutrition-days/#{ctx.today}"

    saved =
      ctx.conn
      |> patch(path, %{
        "slots" => [
          %{
            "meal_slot" => slot["meal_slot"],
            "expected_revision" => slot["revision"],
            "meal_id" => slot["meal_id"],
            "entries" => [
              %{
                "id" => entry_id,
                "planned_item_ref" => row["planned_item_ref"],
                "food_id" => row["food_id"],
                "recipe_id" => row["recipe_id"],
                "portion" => %{"kind" => "gram", "grams" => 75},
                "notes" => "Hungry today"
              }
            ]
          }
        ]
      })
      |> json_response(200)

    [saved_slot] = saved["data"]["slots"]
    [saved_row] = saved_slot["rows"]
    assert saved_row["entry_id"] == entry_id
    assert saved_row["portion"]["grams"] == 75.0
    assert saved_row["notes"] == "Hungry today"
    assert saved_slot["revision"] == 1

    stale =
      ctx.conn
      |> patch(path, %{
        "slots" => [
          %{
            "meal_slot" => slot["meal_slot"],
            "expected_revision" => slot["revision"],
            "meal_id" => slot["meal_id"],
            "entries" => []
          }
        ]
      })

    assert json_response(stale, 409)

    removed =
      ctx.conn
      |> patch(path, %{
        "slots" => [
          %{
            "meal_slot" => saved_slot["meal_slot"],
            "expected_revision" => saved_slot["revision"],
            "meal_id" => saved_slot["meal_id"],
            "entries" => []
          }
        ]
      })
      |> json_response(200)

    [removed_slot] = removed["data"]["slots"]
    assert [%{"entry_id" => nil, "status" => "pending"}] = removed_slot["rows"]
  end

  test "rejects unknown save fields through the real router", ctx do
    conn = patch(ctx.conn, "/v1/client/nutrition-days/#{ctx.today}", %{"slots" => [], "unexpected" => true})

    assert json_response(conn, 422)
  end

  test "rejects incomplete portion variants through the real router", ctx do
    %{"data" => [day]} = ctx.conn |> get("/v1/client/nutrition-days") |> json_response(200)
    [slot] = day["slots"]
    [row] = slot["rows"]
    path = "/v1/client/nutrition-days/#{ctx.today}"

    for portion <- [
          %{"kind" => "gram"},
          %{"kind" => "serving", "amount" => 1},
          %{"kind" => "serving", "grams" => 100, "amount" => 1, "unit" => "cup"}
        ] do
      conn =
        patch(ctx.conn, path, %{
          "slots" => [
            %{
              "meal_slot" => slot["meal_slot"],
              "expected_revision" => slot["revision"],
              "meal_id" => slot["meal_id"],
              "entries" => [
                %{
                  "id" => Ecto.UUID.generate(),
                  "planned_item_ref" => row["planned_item_ref"],
                  "food_id" => row["food_id"],
                  "recipe_id" => row["recipe_id"],
                  "portion" => portion,
                  "notes" => nil
                }
              ]
            }
          ]
        })

      assert json_response(conn, 422)
    end
  end
end
