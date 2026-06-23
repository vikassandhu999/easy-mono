defmodule EasyWeb.Coaches.ExerciseControllerTest do
  use Easy.ConnCase

  alias Easy.Repo
  alias Easy.Training.TrainingExercise

  setup do
    owner = insert(:user, email: "owner-#{Ecto.UUID.generate()}@test.com")
    coach_user = insert(:user, email: "coach-#{Ecto.UUID.generate()}@test.com")

    business =
      insert(:business,
        owner: nil,
        owner_id: owner.id,
        name: "Business #{Ecto.UUID.generate()}",
        handle: "business-#{Ecto.UUID.generate()}"
      )

    coach = insert(:coach, user: nil, user_id: coach_user.id, business: nil, business_id: business.id)
    conn = build_conn() |> authenticate_coach(coach)

    %{conn: conn, coach: coach, business: business}
  end

  describe "POST /v1/coach/training-exercises" do
    test "creates a business exercise with selected muscles and equipment", %{
      conn: conn,
      business: business
    } do
      biceps = insert(:muscle, name: "Biceps #{Ecto.UUID.generate()}")
      traps = insert(:muscle, name: "Traps #{Ecto.UUID.generate()}")
      barbell = insert(:equipment, name: "Barbell #{Ecto.UUID.generate()}")
      cable = insert(:equipment, name: "Cable #{Ecto.UUID.generate()}")

      payload = %{
        "name" => "Cable Curl #{Ecto.UUID.generate()}",
        "description" => "Curl with control.",
        "instructions" => "Keep elbows fixed and pull through the full range.",
        "mechanics" => "isolation",
        "force" => "pull",
        "images" => ["https://cdn.example.com/exercises/cable-curl.png"],
        "muscle_ids" => [traps.id, biceps.id],
        "equipment_ids" => [cable.id, barbell.id]
      }

      conn =
        conn
        |> put_req_header("content-type", "application/json")
        |> post("/v1/coach/training-exercises", payload)

      assert %{"data" => data} = json_response(conn, 201)
      assert data["id"]
      refute Map.has_key?(data, "business_id")
      assert data["name"] == payload["name"]
      assert data["description"] == payload["description"]
      assert data["instructions"] == payload["instructions"]
      assert data["mechanics"] == payload["mechanics"]
      assert data["force"] == payload["force"]
      assert data["images"] == payload["images"]

      assert data["muscles"]
             |> Enum.map(& &1["id"])
             |> Enum.sort() == Enum.sort([biceps.id, traps.id])

      assert data["equipment"]
             |> Enum.map(& &1["id"])
             |> Enum.sort() == Enum.sort([barbell.id, cable.id])

      exercise =
        TrainingExercise
        |> Repo.get!(data["id"])
        |> Repo.preload([:muscles, :equipment])

      assert exercise.business_id == business.id
      assert exercise.name == payload["name"]
      assert exercise.description == payload["description"]
      assert exercise.instructions == payload["instructions"]
      assert exercise.mechanics == "isolation"
      assert exercise.force == "pull"
      assert exercise.images == payload["images"]

      assert exercise.muscles
             |> Enum.map(& &1.id)
             |> Enum.sort() == Enum.sort([biceps.id, traps.id])

      assert exercise.equipment
             |> Enum.map(& &1.id)
             |> Enum.sort() == Enum.sort([barbell.id, cable.id])
    end

    test "returns validation details when name is missing", %{conn: conn} do
      conn =
        conn
        |> put_req_header("content-type", "application/json")
        |> post("/v1/coach/training-exercises", %{"description" => "missing name"})

      assert %{
               "errors" => [
                 %{
                   "detail" => "Missing field: name",
                   "source" => %{"pointer" => "/name"},
                   "title" => "Invalid value"
                 }
               ]
             } = json_response(conn, 422)
    end

    test "rejects trusted identifiers in the request body", %{conn: conn} do
      conn =
        conn
        |> put_req_header("content-type", "application/json")
        |> post("/v1/coach/training-exercises", %{
          "name" => "Rejected #{Ecto.UUID.generate()}",
          "business_id" => Ecto.UUID.generate()
        })

      assert %{"errors" => [_error]} = json_response(conn, 422)
    end
  end

  describe "GET /v1/coach/training-exercises" do
    test "lists current business and system exercises only", %{conn: conn, business: business} do
      search_term = "Visible #{Ecto.UUID.generate()}"

      business_exercise =
        insert(:exercise,
          business: nil,
          business_id: business.id,
          name: "#{search_term} Business Exercise"
        )

      system_exercise =
        insert(:exercise,
          business: nil,
          business_id: nil,
          name: "#{search_term} System Exercise"
        )

      other_owner = insert(:user, email: "other-owner-#{Ecto.UUID.generate()}@test.com")

      other_business =
        insert(:business,
          owner: nil,
          owner_id: other_owner.id,
          name: "Other Business #{Ecto.UUID.generate()}",
          handle: "other-business-#{Ecto.UUID.generate()}"
        )

      other_exercise =
        insert(:exercise,
          business: nil,
          business_id: other_business.id,
          name: "#{search_term} Other Business Exercise"
        )

      conn = get(conn, "/v1/coach/training-exercises", %{"search" => search_term})
      assert %{"data" => data, "count" => 2} = json_response(conn, 200)

      assert data
             |> Enum.map(& &1["id"])
             |> Enum.sort() == Enum.sort([business_exercise.id, system_exercise.id])

      refute other_exercise.id in Enum.map(data, & &1["id"])
    end

    test "filters by search term inside the coach exercise library", %{conn: conn, business: business} do
      matching_business_exercise =
        insert(:exercise,
          business: nil,
          business_id: business.id,
          name: "Barbell Bench Press #{Ecto.UUID.generate()}"
        )

      matching_system_exercise =
        insert(:exercise,
          business: nil,
          business_id: nil,
          name: "Incline Bench Press #{Ecto.UUID.generate()}"
        )

      insert(:exercise,
        business: nil,
        business_id: business.id,
        name: "Standing Row #{Ecto.UUID.generate()}"
      )

      conn = get(conn, "/v1/coach/training-exercises", %{"search" => "bench"})
      assert %{"data" => data, "count" => 2} = json_response(conn, 200)

      assert data
             |> Enum.map(& &1["id"])
             |> Enum.sort() == Enum.sort([matching_business_exercise.id, matching_system_exercise.id])
    end

    test "returns 403 without a coach token" do
      conn = build_conn() |> get("/v1/coach/training-exercises")
      assert %{"error_code" => "unauthorized"} = json_response(conn, 403)
    end
  end

  describe "GET /v1/coach/training-exercises/:id" do
    test "shows a business exercise with muscles and equipment", %{conn: conn, business: business} do
      lat = insert(:muscle, name: "Lat #{Ecto.UUID.generate()}")
      cable = insert(:equipment, name: "Cable Machine #{Ecto.UUID.generate()}")

      exercise =
        insert(:exercise,
          business: nil,
          business_id: business.id,
          name: "Lat Pulldown #{Ecto.UUID.generate()}",
          muscles: [lat],
          equipment: [cable]
        )

      conn = get(conn, "/v1/coach/training-exercises/#{exercise.id}")
      assert %{"data" => data} = json_response(conn, 200)

      assert data["id"] == exercise.id
      assert data["name"] == exercise.name
      assert [%{"id" => lat_id, "name" => lat_name}] = data["muscles"]
      assert lat_id == lat.id
      assert lat_name == lat.name
      assert [%{"id" => cable_id, "name" => cable_name}] = data["equipment"]
      assert cable_id == cable.id
      assert cable_name == cable.name
    end

    test "shows a system exercise", %{conn: conn} do
      exercise =
        insert(:exercise,
          business: nil,
          business_id: nil,
          name: "System Deadlift #{Ecto.UUID.generate()}"
        )

      conn = get(conn, "/v1/coach/training-exercises/#{exercise.id}")
      assert %{"data" => data} = json_response(conn, 200)

      assert data["id"] == exercise.id
      assert data["name"] == exercise.name
    end

    test "returns 404 for another business exercise", %{conn: conn} do
      other_owner = insert(:user, email: "other-owner-#{Ecto.UUID.generate()}@test.com")

      other_business =
        insert(:business,
          owner: nil,
          owner_id: other_owner.id,
          name: "Other Business #{Ecto.UUID.generate()}",
          handle: "other-business-#{Ecto.UUID.generate()}"
        )

      exercise =
        insert(:exercise,
          business: nil,
          business_id: other_business.id,
          name: "Private TrainingExercise #{Ecto.UUID.generate()}"
        )

      conn = get(conn, "/v1/coach/training-exercises/#{exercise.id}")
      assert %{"error_code" => "not_found"} = json_response(conn, 404)
    end
  end

  describe "PATCH /v1/coach/training-exercises/:id" do
    test "updates a business exercise without changing its business", %{conn: conn, business: business} do
      exercise =
        insert(:exercise,
          business: nil,
          business_id: business.id,
          name: "Original TrainingExercise #{Ecto.UUID.generate()}"
        )

      new_name = "Updated TrainingExercise #{Ecto.UUID.generate()}"

      conn =
        conn
        |> put_req_header("content-type", "application/json")
        |> patch("/v1/coach/training-exercises/#{exercise.id}", %{"name" => new_name})

      assert %{"data" => data} = json_response(conn, 200)
      assert data["id"] == exercise.id
      assert data["name"] == new_name

      updated = Repo.get!(TrainingExercise, exercise.id)
      assert updated.name == new_name
      assert updated.business_id == business.id
    end

    test "rejects trusted identifiers in the update body", %{conn: conn, business: business} do
      exercise =
        insert(:exercise,
          business: nil,
          business_id: business.id,
          name: "Original TrainingExercise #{Ecto.UUID.generate()}"
        )

      conn =
        conn
        |> put_req_header("content-type", "application/json")
        |> patch("/v1/coach/training-exercises/#{exercise.id}", %{
          "name" => "Updated TrainingExercise #{Ecto.UUID.generate()}",
          "business_id" => Ecto.UUID.generate()
        })

      assert %{"errors" => [_error]} = json_response(conn, 422)

      updated = Repo.get!(TrainingExercise, exercise.id)
      assert updated.name == exercise.name
      assert updated.business_id == business.id
    end

    test "returns 404 when updating a system exercise", %{conn: conn} do
      exercise =
        insert(:exercise,
          business: nil,
          business_id: nil,
          name: "System Pushup #{Ecto.UUID.generate()}"
        )

      conn =
        conn
        |> put_req_header("content-type", "application/json")
        |> patch("/v1/coach/training-exercises/#{exercise.id}", %{"name" => "Nope"})

      assert %{"error_code" => "not_found"} = json_response(conn, 404)

      assert Repo.get!(TrainingExercise, exercise.id).name == exercise.name
    end

    test "returns 404 when updating another business exercise", %{conn: conn} do
      other_owner = insert(:user, email: "other-owner-#{Ecto.UUID.generate()}@test.com")

      other_business =
        insert(:business,
          owner: nil,
          owner_id: other_owner.id,
          name: "Other Business #{Ecto.UUID.generate()}",
          handle: "other-business-#{Ecto.UUID.generate()}"
        )

      exercise =
        insert(:exercise,
          business: nil,
          business_id: other_business.id,
          name: "Other TrainingExercise #{Ecto.UUID.generate()}"
        )

      conn =
        conn
        |> put_req_header("content-type", "application/json")
        |> patch("/v1/coach/training-exercises/#{exercise.id}", %{"name" => "Nope"})

      assert %{"error_code" => "not_found"} = json_response(conn, 404)

      assert Repo.get!(TrainingExercise, exercise.id).name == exercise.name
    end
  end

  describe "DELETE /v1/coach/training-exercises/:id" do
    test "deletes a business exercise", %{conn: conn, business: business} do
      exercise =
        insert(:exercise,
          business: nil,
          business_id: business.id,
          name: "Delete Me #{Ecto.UUID.generate()}"
        )

      conn = delete(conn, "/v1/coach/training-exercises/#{exercise.id}")
      assert response(conn, 204)
      assert Repo.get(TrainingExercise, exercise.id) == nil
    end

    test "returns 404 when deleting a system exercise", %{conn: conn} do
      exercise =
        insert(:exercise,
          business: nil,
          business_id: nil,
          name: "Keep System TrainingExercise #{Ecto.UUID.generate()}"
        )

      conn = delete(conn, "/v1/coach/training-exercises/#{exercise.id}")
      assert %{"error_code" => "not_found"} = json_response(conn, 404)
      assert Repo.get!(TrainingExercise, exercise.id).name == exercise.name
    end

    test "returns 404 when deleting another business exercise", %{conn: conn} do
      other_owner = insert(:user, email: "other-owner-#{Ecto.UUID.generate()}@test.com")

      other_business =
        insert(:business,
          owner: nil,
          owner_id: other_owner.id,
          name: "Other Business #{Ecto.UUID.generate()}",
          handle: "other-business-#{Ecto.UUID.generate()}"
        )

      exercise =
        insert(:exercise,
          business: nil,
          business_id: other_business.id,
          name: "Other Delete #{Ecto.UUID.generate()}"
        )

      conn = delete(conn, "/v1/coach/training-exercises/#{exercise.id}")
      assert %{"error_code" => "not_found"} = json_response(conn, 404)
      assert Repo.get!(TrainingExercise, exercise.id).name == exercise.name
    end
  end

  describe "POST /v1/coach/training-exercises/:id/copy" do
    test "duplicates a system exercise with the requested name", %{conn: conn, business: business} do
      hamstrings = insert(:muscle, name: "Hamstrings #{Ecto.UUID.generate()}")
      barbell = insert(:equipment, name: "Barbell #{Ecto.UUID.generate()}")
      duplicate_name = "Trap Bar Deadlift #{Ecto.UUID.generate()}"

      source =
        insert(:exercise,
          business: nil,
          business_id: nil,
          name: "Deadlift #{Ecto.UUID.generate()}",
          muscles: [hamstrings],
          equipment: [barbell]
        )

      conn =
        conn
        |> put_req_header("content-type", "application/json")
        |> post("/v1/coach/training-exercises/#{source.id}/copy", %{"name" => duplicate_name})

      assert %{"data" => data} = json_response(conn, 201)

      assert data["id"] != source.id
      assert data["name"] == duplicate_name

      duplicate =
        TrainingExercise
        |> Repo.get!(data["id"])
        |> Repo.preload([:muscles, :equipment])

      assert duplicate.business_id == business.id
      assert duplicate.name == duplicate_name
      assert duplicate.muscles |> Enum.map(& &1.id) == [hamstrings.id]
      assert duplicate.equipment |> Enum.map(& &1.id) == [barbell.id]
    end

    test "returns 422 when duplicate name is missing", %{conn: conn} do
      source =
        insert(:exercise,
          business: nil,
          business_id: nil,
          name: "Deadlift #{Ecto.UUID.generate()}"
        )

      conn =
        conn
        |> put_req_header("content-type", "application/json")
        |> post("/v1/coach/training-exercises/#{source.id}/copy", %{})

      assert %{
               "errors" => [
                 %{
                   "detail" => "Missing field: name",
                   "source" => %{"pointer" => "/name"},
                   "title" => "Invalid value"
                 }
               ]
             } = json_response(conn, 422)
    end

    test "returns 404 when duplicating another business exercise", %{conn: conn, business: business} do
      other_owner = insert(:user, email: "other-owner-#{Ecto.UUID.generate()}@test.com")

      other_business =
        insert(:business,
          owner: nil,
          owner_id: other_owner.id,
          name: "Other Business #{Ecto.UUID.generate()}",
          handle: "other-business-#{Ecto.UUID.generate()}"
        )

      source =
        insert(:exercise,
          business: nil,
          business_id: other_business.id,
          name: "Other Business Source #{Ecto.UUID.generate()}"
        )

      conn =
        conn
        |> put_req_header("content-type", "application/json")
        |> post("/v1/coach/training-exercises/#{source.id}/copy", %{"name" => "Private Copy"})

      assert %{"error_code" => "not_found"} = json_response(conn, 404)

      assert Repo.get_by(TrainingExercise, business_id: business.id, name: "Private Copy") == nil
      assert Repo.get!(TrainingExercise, source.id).business_id == other_business.id
    end
  end
end
