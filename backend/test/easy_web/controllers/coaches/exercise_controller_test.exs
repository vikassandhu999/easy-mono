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
        owner_user_id: owner.id,
        name: "Business #{Ecto.UUID.generate()}",
        handle: "library-#{System.unique_integer([:positive])}"
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
        "instructions" => "Keep elbows fixed and pull through the full range.",
        "mechanics" => "isolation",
        "force" => "pull",
        "measures" => ["reps", "load"],
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
      assert data["instructions"] == payload["instructions"]
      assert data["built_in"] == false
      assert data["measures"] == ["reps", "load"]
      assert data["bodyweight"] == false
      assert data["mechanics"] == payload["mechanics"]
      assert data["force"] == payload["force"]
      refute Map.has_key?(data, "images")

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
      assert exercise.instructions == payload["instructions"]
      assert exercise.mechanics == :isolation
      assert exercise.force == :pull
      assert exercise.measures == [:reps, :load]

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
        |> post("/v1/coach/training-exercises", %{"measures" => ["reps"]})

      assert %{"error_detail" => %{"fields" => %{"name" => ["is required"]}}} =
               json_response(conn, 422)
    end

    test "rejects trusted identifiers in the request body", %{conn: conn} do
      conn =
        conn
        |> put_req_header("content-type", "application/json")
        |> post("/v1/coach/training-exercises", %{
          "name" => "Rejected #{Ecto.UUID.generate()}",
          "business_id" => Ecto.UUID.generate()
        })

      assert %{"error_detail" => %{"fields" => %{"business_id" => ["is unknown"]}}} =
               json_response(conn, 422)
    end
  end

  describe "GET /v1/coach/training-exercises" do
    test "rejects unknown list query parameters", %{conn: conn} do
      conn = get(conn, "/v1/coach/training-exercises?unexpected=true")

      assert %{"error_detail" => %{"fields" => %{"unexpected" => ["is unknown"]}}} =
               json_response(conn, 422)
    end

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
          owner_user_id: other_owner.id,
          name: "Other Business #{Ecto.UUID.generate()}",
          handle: "library-#{System.unique_integer([:positive])}"
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

    test "filters by equipment ids", %{conn: conn, business: business} do
      barbell = insert(:equipment, name: "Barbell #{Ecto.UUID.generate()}")
      cable = insert(:equipment, name: "Cable #{Ecto.UUID.generate()}")

      with_barbell =
        insert(:exercise,
          business: nil,
          business_id: business.id,
          name: "Barbell Row #{Ecto.UUID.generate()}",
          equipment: [barbell]
        )

      with_cable =
        insert(:exercise,
          business: nil,
          business_id: business.id,
          name: "Cable Curl #{Ecto.UUID.generate()}",
          equipment: [cable]
        )

      no_equipment =
        insert(:exercise,
          business: nil,
          business_id: business.id,
          name: "Bodyweight Squat #{Ecto.UUID.generate()}"
        )

      conn = get(conn, "/v1/coach/training-exercises", %{"equipment_ids" => barbell.id})
      assert %{"data" => data} = json_response(conn, 200)

      returned_ids = Enum.map(data, & &1["id"])
      assert with_barbell.id in returned_ids
      refute with_cable.id in returned_ids
      refute no_equipment.id in returned_ids
    end

    test "filters by muscle ids", %{conn: conn, business: business} do
      chest = insert(:muscle, name: "Chest #{Ecto.UUID.generate()}")
      back = insert(:muscle, name: "Back #{Ecto.UUID.generate()}")

      with_chest =
        insert(:exercise,
          business: nil,
          business_id: business.id,
          name: "Bench Press #{Ecto.UUID.generate()}",
          muscles: [chest]
        )

      with_back =
        insert(:exercise,
          business: nil,
          business_id: business.id,
          name: "Bent Row #{Ecto.UUID.generate()}",
          muscles: [back]
        )

      no_muscles =
        insert(:exercise,
          business: nil,
          business_id: business.id,
          name: "Plank #{Ecto.UUID.generate()}"
        )

      conn = get(conn, "/v1/coach/training-exercises", %{"muscle_ids" => chest.id})
      assert %{"data" => data} = json_response(conn, 200)

      returned_ids = Enum.map(data, & &1["id"])
      assert with_chest.id in returned_ids
      refute with_back.id in returned_ids
      refute no_muscles.id in returned_ids
    end

    test "filters by multiple muscle ids returns exercises matching any", %{conn: conn, business: business} do
      chest = insert(:muscle, name: "Chest #{Ecto.UUID.generate()}")
      back = insert(:muscle, name: "Back #{Ecto.UUID.generate()}")
      legs = insert(:muscle, name: "Legs #{Ecto.UUID.generate()}")

      with_chest =
        insert(:exercise,
          business: nil,
          business_id: business.id,
          name: "Bench Press #{Ecto.UUID.generate()}",
          muscles: [chest]
        )

      with_back =
        insert(:exercise,
          business: nil,
          business_id: business.id,
          name: "Bent Row #{Ecto.UUID.generate()}",
          muscles: [back]
        )

      with_legs =
        insert(:exercise,
          business: nil,
          business_id: business.id,
          name: "Squat #{Ecto.UUID.generate()}",
          muscles: [legs]
        )

      conn = get(conn, "/v1/coach/training-exercises", %{"muscle_ids" => [chest.id, back.id]})
      assert %{"data" => data} = json_response(conn, 200)

      returned_ids = Enum.map(data, & &1["id"])
      assert with_chest.id in returned_ids
      assert with_back.id in returned_ids
      refute with_legs.id in returned_ids
    end

    test "traverses cursor pages within the matching coach library", %{conn: conn, business: business} do
      search = "Cursor exercise #{Ecto.UUID.generate()}"

      exercises =
        for suffix <- ["Business", "System", "Second"] do
          insert(:exercise,
            business: if(suffix == "System", do: nil, else: business),
            name: "#{search} #{suffix}"
          )
        end

      other_coach = insert(:coach)

      insert(:exercise,
        business: other_coach.business,
        name: "#{search} Private"
      )

      first =
        conn
        |> get("/v1/coach/training-exercises", %{"cursor" => "start", "limit" => "1", "search" => search})
        |> json_response(200)

      assert %{"data" => [first_exercise], "count" => 3, "next_cursor" => cursor} = first
      assert is_binary(cursor)

      second =
        conn
        |> recycle()
        |> get("/v1/coach/training-exercises", %{"cursor" => cursor, "limit" => "10", "search" => search})
        |> json_response(200)

      assert %{"data" => remaining, "count" => 3, "next_cursor" => nil} = second

      assert [first_exercise | remaining]
             |> Enum.map(& &1["id"])
             |> Enum.sort() == Enum.map(exercises, & &1.id) |> Enum.sort()
    end

    test "bounds cursor pages and rejects malformed or incompatible cursors", %{conn: conn, business: business} do
      search = "Cursor bound #{Ecto.UUID.generate()}"

      for index <- 1..105 do
        insert(:exercise, business: business, name: "#{search} #{index}")
      end

      default =
        conn
        |> get("/v1/coach/training-exercises", %{"cursor" => "start", "search" => search})
        |> json_response(200)

      assert %{"data" => default_data, "count" => 105, "next_cursor" => default_cursor} = default
      assert length(default_data) == 20
      assert is_binary(default_cursor)

      capped =
        conn
        |> recycle()
        |> get("/v1/coach/training-exercises", %{"cursor" => "start", "limit" => "1000", "search" => search})
        |> json_response(200)

      assert %{"data" => capped_data, "count" => 105, "next_cursor" => capped_cursor} = capped
      assert length(capped_data) == 100
      assert is_binary(capped_cursor)

      assert %{"error_detail" => %{"fields" => %{"cursor" => ["is invalid"]}}} =
               conn
               |> recycle()
               |> get("/v1/coach/training-exercises", %{"cursor" => "not-a-cursor"})
               |> json_response(422)

      assert %{"error_detail" => %{"fields" => %{"cursor" => ["cannot be combined with offset or sort"]}}} =
               conn
               |> recycle()
               |> get("/v1/coach/training-exercises", %{"cursor" => "start", "offset" => "1"})
               |> json_response(422)
    end

    test "returns 403 without a coach token" do
      conn = build_conn() |> get("/v1/coach/training-exercises")
      assert %{"error_code" => "unauthorized"} = json_response(conn, 403)
    end
  end

  describe "GET /v1/coach/training-exercises/:id" do
    test "renders the public media subset and includes measures", %{conn: conn, business: business} do
      media = insert(:library_media, business: business)
      exercise = insert(:exercise, business: business, media: media)

      conn = get(conn, "/v1/coach/training-exercises/#{exercise.id}")

      assert %{
               "data" => %{
                 "measures" => ["reps", "load"],
                 "media" => %{
                   "id" => media_id,
                   "kind" => "image",
                   "content_type" => content_type,
                   "byte_size" => byte_size,
                   "url" => url
                 }
               }
             } = json_response(conn, 200)

      assert media_id == media.id
      assert content_type == media.content_type
      assert byte_size == media.byte_size
      assert is_binary(url)

      assert data = json_response(conn, 200)["data"]
      assert data["media"] |> Map.keys() |> Enum.sort() == ["byte_size", "content_type", "id", "kind", "url"]
    end

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
          owner_user_id: other_owner.id,
          name: "Other Business #{Ecto.UUID.generate()}",
          handle: "library-#{System.unique_integer([:positive])}"
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

      assert %{"error_detail" => %{"fields" => %{"business_id" => ["is unknown"]}}} =
               json_response(conn, 422)

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
          owner_user_id: other_owner.id,
          name: "Other Business #{Ecto.UUID.generate()}",
          handle: "library-#{System.unique_integer([:positive])}"
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
      assert Repo.get(TrainingExercise, exercise.id).archived_at != nil
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
          owner_user_id: other_owner.id,
          name: "Other Business #{Ecto.UUID.generate()}",
          handle: "library-#{System.unique_integer([:positive])}"
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

      assert %{"error_detail" => %{"fields" => %{"name" => ["is required"]}}} =
               json_response(conn, 422)
    end

    test "returns 404 when duplicating another business exercise", %{conn: conn, business: business} do
      other_owner = insert(:user, email: "other-owner-#{Ecto.UUID.generate()}@test.com")

      other_business =
        insert(:business,
          owner: nil,
          owner_user_id: other_owner.id,
          name: "Other Business #{Ecto.UUID.generate()}",
          handle: "library-#{System.unique_integer([:positive])}"
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
