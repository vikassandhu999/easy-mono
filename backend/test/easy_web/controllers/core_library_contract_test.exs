defmodule EasyWeb.CoreLibraryContractTest do
  use Easy.ConnCase, async: true

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
        {"training-exercises", :exercise, %{name: "Custom item", measures: ["reps", "load"]}}
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

  test "built-in exercises remain readable but cannot be changed or archived", f do
    exercise = insert(:exercise, business: nil)
    assert response(patch(f.coach_conn, "/v1/coach/training-exercises/#{exercise.id}", %{name: "Denied"}), 404)
    assert response(delete(f.coach_conn, "/v1/coach/training-exercises/#{exercise.id}"), 404)
    assert json_response(get(f.client_conn, "/v1/client/training-exercises/#{exercise.id}"), 200)["data"]["built_in"] == true
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
end
