defmodule EasyWeb.CoreLibraryContractTest do
  use Easy.ConnCase, async: true

  alias Easy.Nutrition.Content

  setup do
    coach = insert(:coach)
    client = insert(:client, business: coach.business, coach: coach)

    %{
      coach: coach,
      coach_conn: authenticate_coach(build_conn(), coach),
      client_conn: authenticate_client(build_conn(), client),
      foreign_conn: authenticate_coach(build_conn(), insert(:coach))
    }
  end

  for {path, factory, attrs} <- [
        {"training-exercises", :exercise, %{name: "Custom item", measures: ["reps", "load"]}},
        {"nutrition-foods", :food, %{name: "Custom item", nutrients: %{energy_kcal: 100}}},
        {"nutrition-recipes", :recipe, %{name: "Custom item", servings_count: 1, ingredients: []}}
      ] do
    @path path
    @factory factory
    @attrs attrs

    test "#{path}: create, update and archive preserve detail and remove items from coach/client pickers", f do
      path = "/v1/coach/#{@path}"
      created = json_response(post(f.coach_conn, path, @attrs), 201)["data"]
      assert created["name"] == "Custom item"
      attrs = if @factory == :exercise, do: %{name: "Renamed item"}, else: %{name: "Renamed item", expected_revision: 1}
      assert json_response(patch(f.coach_conn, path <> "/#{created["id"]}", attrs), 200)["data"]["name"] == "Renamed item"
      assert json_response(get(f.client_conn, "/v1/client/#{@path}/#{created["id"]}"), 200)["data"]["name"] == "Renamed item"
      assert response(delete(f.coach_conn, path <> "/#{created["id"]}"), 204)
      archived = json_response(get(f.coach_conn, path <> "/#{created["id"]}"), 200)["data"]
      assert is_binary(archived["archived_at"])

      for {conn, role} <- [{f.coach_conn, "coach"}, {f.client_conn, "client"}] do
        assert json_response(get(conn, "/v1/#{role}/#{@path}", %{search: "Renamed item"}), 200)["data"] == []
      end
    end

    test "#{path}: foreign writes and client foreign reads return 404", f do
      item = insert(@factory, business: f.coach.business)
      foreign = insert(@factory)
      path = "/v1/coach/#{@path}/#{item.id}"
      attrs = if @factory == :exercise, do: %{name: "Denied"}, else: %{name: "Denied", expected_revision: 1}
      assert response(get(f.foreign_conn, path), 404)
      assert response(patch(f.foreign_conn, path, attrs), 404)
      assert response(delete(f.foreign_conn, path), 404)
      assert response(get(f.client_conn, "/v1/client/#{@path}/#{foreign.id}"), 404)
      assert response(get(f.coach_conn, "/v1/coach/#{@path}/#{Ecto.UUID.generate()}"), 404)
      assert json_response(get(f.coach_conn, path), 200)["data"]["name"] == item.name
    end

    test "#{path}: search cursors are complete and tenant-scoped on both app routes", f do
      rows = for n <- 1..3, do: insert(@factory, business: f.coach.business, name: "Page match #{n}")
      insert(@factory, business: f.coach.business, name: "Other")
      insert(@factory, name: "Page match")

      for {conn, role} <- [{f.coach_conn, "coach"}, {f.client_conn, "client"}] do
        path = "/v1/#{role}/#{@path}"
        query = %{search: "Page match", limit: 2}
        cursor? = role == "coach" or @factory != :exercise
        first_query = Map.put(query, if(cursor?, do: :cursor, else: :offset), if(cursor?, do: "start", else: 0))
        first = json_response(get(conn, path, first_query), 200)
        next_query = Map.put(query, if(cursor?, do: :cursor, else: :offset), if(cursor?, do: first["next_cursor"], else: 2))
        second = json_response(get(conn, path, next_query), 200)
        assert first["count"] == 3
        assert length(first["data"]) == 2
        assert length(second["data"]) == 1
        assert second["next_cursor"] == nil
        assert MapSet.new(first["data"] ++ second["data"], & &1["id"]) == MapSet.new(rows, & &1.id)
        if cursor?, do: assert(json_response(get(conn, path, %{cursor: "broken"}), 422)["error_detail"]["fields"]["cursor"] == ["is invalid"])
      end
    end

    test "#{path}: validation identifies unknown trusted ids and missing required names", f do
      path = "/v1/coach/#{@path}"
      assert json_response(post(f.coach_conn, path, Map.put(@attrs, :business_id, Ecto.UUID.generate())), 422)["error_detail"]["fields"]["business_id"] == ["is unknown"]
      assert json_response(post(f.coach_conn, path, Map.delete(@attrs, :name)), 422)["error_detail"]["fields"]["name"] == ["is required"]
    end
  end

  for {path, factory} <- [{"nutrition-foods", :food}, {"nutrition-recipes", :recipe}] do
    @path path
    @factory factory
    test "#{path}: stale updates do not replace saved data", f do
      item = insert(@factory, business: f.coach.business)
      path = "/v1/coach/#{@path}/#{item.id}"
      assert json_response(patch(f.coach_conn, path, %{name: "Saved", expected_revision: 1}), 200)["data"]["revision"] == 2
      error = json_response(patch(f.coach_conn, path, %{name: "Lost", expected_revision: 1}), 409)
      assert error["error_code"] == "stale_revision"
      assert error["error_detail"]["current_revision"] == 2
      assert json_response(get(f.coach_conn, path), 200)["data"]["name"] == "Saved"
    end

    test "#{path}: usage reads reject foreign items and expose an empty usage page", f do
      item = insert(@factory, business: f.coach.business)
      path = "/v1/coach/#{@path}/#{item.id}"
      usage = json_response(get(f.coach_conn, path <> "/usage"), 200)
      assert %{"count" => 0, "data" => [], "counts" => %{"recipes" => 0, "templates" => 0, "client_plans" => 0}} = usage
      assert response(get(f.foreign_conn, path <> "/usage"), 404)
      assert response(get(f.foreign_conn, path <> "/impact"), 404)
      assert response(get(f.coach_conn, "/v1/coach/#{@path}/#{Ecto.UUID.generate()}/usage"), 404)
    end
  end

  test "built-in foods and exercises remain readable but cannot be changed or archived", f do
    food = insert(:food, business: nil, creator: nil, source: :system)
    exercise = insert(:exercise, business: nil)
    assert json_response(get(f.coach_conn, "/v1/coach/nutrition-foods/#{food.id}"), 200)["data"]["source"] == "system"

    assert json_response(patch(f.coach_conn, "/v1/coach/nutrition-foods/#{food.id}", %{name: "Denied", expected_revision: 1}), 422)["error_detail"]["fields"]["source"] == [
             "system and imported foods are read-only; use the copy endpoint"
           ]

    assert response(delete(f.coach_conn, "/v1/coach/nutrition-foods/#{food.id}"), 404)
    assert response(patch(f.coach_conn, "/v1/coach/training-exercises/#{exercise.id}", %{name: "Denied"}), 404)
    assert response(delete(f.coach_conn, "/v1/coach/training-exercises/#{exercise.id}"), 404)
    assert json_response(get(f.client_conn, "/v1/client/training-exercises/#{exercise.id}"), 200)["data"]["built_in"] == true
  end

  test "food category filters combine with search and exclude archived and foreign categories", f do
    matched = insert(:food, business: f.coach.business, name: "Oats cereal", category: "grains")
    insert(:food, business: f.coach.business, name: "Oats drink", category: "drinks")
    insert(:food, business: f.coach.business, name: "Rice", category: "grains")
    insert(:food, business: f.coach.business, category: "archived", archived_at: DateTime.utc_now(:second))
    insert(:food, category: "foreign")
    page = json_response(get(f.coach_conn, "/v1/coach/nutrition-foods", %{search: "Oats", categories: ["grains"], cursor: "start"}), 200)
    assert Enum.map(page["data"], & &1["id"]) == [matched.id]
    assert json_response(get(f.coach_conn, "/v1/coach/nutrition-foods/categories"), 200)["data"] == ["drinks", "grains"]
  end

  test "exercise muscle and equipment filters intersect search results", f do
    muscle = insert(:muscle)
    equipment = insert(:equipment)
    matched = insert(:exercise, business: f.coach.business, name: "Row cable", muscles: [muscle], equipment: [equipment])
    insert(:exercise, business: f.coach.business, name: "Row free", muscles: [muscle])
    insert(:exercise, business: f.coach.business, name: "Press cable", muscles: [muscle], equipment: [equipment])
    page = json_response(get(f.coach_conn, "/v1/coach/training-exercises", %{search: "Row", muscle_ids: [muscle.id], equipment_ids: [equipment.id]}), 200)
    assert page["count"] == 1
    assert Enum.map(page["data"], & &1["id"]) == [matched.id]
  end

  test "recipe usage reads return the template and assigned plan that use it", f do
    food = insert(:food, business: f.coach.business)

    recipe =
      insert(:recipe,
        business: f.coach.business,
        ingredients: [%{"food_id" => food.id, "portion" => %{"type" => "grams", "grams" => 100}}]
      )

    content =
      Map.put(Content.empty(), "meals", [
        %{
          "id" => Ecto.UUID.generate(),
          "name" => "Breakfast",
          "items" => [
            %{
              "id" => Ecto.UUID.generate(),
              "source" => %{"type" => "recipe", "id" => recipe.id},
              "portion" => %{"type" => "serving", "serving_id" => "serving", "amount" => 1}
            }
          ]
        }
      ])

    template = json_response(post(f.coach_conn, "/v1/coach/nutrition-plans", %{name: "Menu", content: content}), 201)["data"]
    client = insert(:client, business: f.coach.business, coach: f.coach)
    plan = json_response(post(f.coach_conn, "/v1/coach/clients/#{client.id}/nutrition-plans/#{template["id"]}/assign", %{}), 201)["data"]
    path = "/v1/coach/nutrition-recipes/#{recipe.id}/usage"
    page = json_response(get(f.coach_conn, path), 200)
    assert page["counts"] == %{"recipes" => 0, "templates" => 1, "client_plans" => 1}
    assert MapSet.new(page["data"], & &1["id"]) == MapSet.new([template["id"], plan["id"]])
    filtered = json_response(get(f.coach_conn, path, %{kind: "client_plans"}), 200)
    assert Enum.map(filtered["data"], & &1["id"]) == [plan["id"]]
  end

  test "food usage follows recipe references and paginates matching rows", f do
    food = insert(:food, business: f.coach.business)
    ingredients = [%{"food_id" => food.id, "portion" => %{"type" => "grams", "grams" => 100}}]
    recipes = for _ <- 1..2, do: insert(:recipe, business: f.coach.business, name: "Uses oats", ingredients: ingredients)
    path = "/v1/coach/nutrition-foods/#{food.id}/usage"
    first = json_response(get(f.coach_conn, path, %{kind: "recipes", search: "Uses", limit: 1}), 200)
    second = json_response(get(f.coach_conn, path, %{kind: "recipes", search: "Uses", limit: 1, cursor: first["next_cursor"]}), 200)
    assert first["counts"]["recipes"] == 2
    assert MapSet.new(first["data"] ++ second["data"], & &1["id"]) == MapSet.new(recipes, & &1.id)
    assert second["next_cursor"] == nil
  end
end
