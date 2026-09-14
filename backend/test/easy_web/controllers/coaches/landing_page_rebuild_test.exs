defmodule EasyWeb.Coaches.LandingPageRebuildTest do
  use Easy.ConnCase

  alias Easy.Landing.{LandingProgram, Prospect}
  alias Easy.Repo

  setup do
    coach = insert(:coach)

    conn =
      build_conn()
      |> put_req_header("content-type", "application/json")
      |> authenticate_coach(coach)

    %{conn: conn}
  end

  describe "landing page rebuilds" do
    test "keeps a supplied program ID and its application association", %{conn: conn} do
      created = save_page(conn)
      program = hd(created["programs"])
      application = apply_for_coaching(created, program["id"])

      saved =
        save_page(conn, %{
          "expected_revision" => created["revision"],
          "programs" => [Map.put(program_attrs(), "id", program["id"])]
        })

      assert hd(saved["programs"])["id"] == program["id"]
      assert Repo.get!(Prospect, application["id"]).landing_program_id == program["id"]
    end

    test "archives a removed program and retains submitted program context through a rename", %{conn: conn} do
      created = save_page(conn, %{"programs" => [program_attrs("Strength coaching"), program_attrs("Conditioning")]})
      [strength, conditioning] = created["programs"]
      strength_application = apply_for_coaching(created, strength["id"])
      conditioning_application = apply_for_coaching(created, conditioning["id"])

      saved =
        save_page(conn, %{
          "expected_revision" => created["revision"],
          "programs" => [Map.put(program_attrs("Renamed strength coaching"), "id", strength["id"])]
        })

      assert [renamed] = saved["programs"]
      assert renamed["id"] == strength["id"]
      assert renamed["name"] == "Renamed strength coaching"
      assert %{archived_at: archived_at} = Repo.get!(LandingProgram, conditioning["id"])
      assert archived_at

      assert %{"id" => strength_id, "name" => "Strength coaching"} =
               Repo.get!(Prospect, strength_application["id"]).submitted_program

      assert strength_id == strength["id"]

      assert %{"id" => conditioning_id, "name" => "Conditioning"} =
               Repo.get!(Prospect, conditioning_application["id"]).submitted_program

      assert conditioning_id == conditioning["id"]
    end

    test "denies a program ID from another business", %{conn: conn} do
      page = save_page(conn)
      other_coach = insert(:coach)

      other_conn =
        build_conn()
        |> put_req_header("content-type", "application/json")
        |> authenticate_coach(other_coach)

      other_page = save_page(other_conn, %{"slug" => "another-coach"})
      other_program = hd(other_page["programs"])

      response =
        public_conn()
        |> post(
          "/v1/public/landing-pages/#{page["slug"]}/applications",
          application_attrs(page, other_program["id"])
        )

      assert json_response(response, 422)
    end

    test "rejects a stale page update", %{conn: conn} do
      created = save_page(conn)

      updated =
        save_page(conn, %{
          "expected_revision" => created["revision"],
          "headline" => "Updated headline",
          "programs" => [Map.put(program_attrs(), "id", hd(created["programs"])["id"])]
        })

      response = put(conn, "/v1/coach/landing-page", page_attrs(%{"expected_revision" => created["revision"]}))

      assert %{"error_code" => "stale_revision", "error_detail" => %{"current_revision" => current_revision}} =
               json_response(response, 409)

      assert current_revision == updated["revision"]
    end

    test "rejects an application submitted against a stale public revision", %{conn: conn} do
      created = save_page(conn)
      program = hd(created["programs"])

      save_page(conn, %{
        "expected_revision" => created["revision"],
        "headline" => "A newer page",
        "programs" => [Map.put(program_attrs(), "id", program["id"])]
      })

      response =
        public_conn()
        |> post(
          "/v1/public/landing-pages/#{created["slug"]}/applications",
          application_attrs(created, program["id"])
        )

      assert %{"error_code" => "stale_revision"} = json_response(response, 409)
    end

    test "recovers a receipt through rename, offline status, and a reused address", %{conn: conn} do
      page = save_page(conn)
      program = hd(page["programs"])

      request =
        page
        |> application_attrs(program["id"])
        |> Map.put("request_id", Ecto.UUID.generate())

      first =
        public_conn()
        |> post("/v1/public/landing-pages/#{page["slug"]}/applications", request)
        |> json_response(201)
        |> Map.fetch!("data")

      renamed =
        save_page(conn, %{
          "expected_revision" => page["revision"],
          "slug" => "renamed-strength-with-kavya",
          "headline" => "Renamed page",
          "programs" => [Map.put(program_attrs(), "id", program["id"])]
        })

      other_coach = insert(:coach)

      other_conn =
        build_conn()
        |> put_req_header("content-type", "application/json")
        |> authenticate_coach(other_coach)

      save_page(other_conn, %{"slug" => page["slug"]})

      replay_after_rename =
        public_conn()
        |> post("/v1/public/landing-pages/#{page["slug"]}/applications", request)
        |> json_response(201)
        |> Map.fetch!("data")

      assert replay_after_rename == first

      save_page(conn, %{
        "expected_revision" => renamed["revision"],
        "slug" => renamed["slug"],
        "status" => "draft",
        "programs" => [Map.put(program_attrs(), "id", program["id"])]
      })

      replay =
        public_conn()
        |> post("/v1/public/landing-pages/#{page["slug"]}/applications", request)
        |> json_response(201)
        |> Map.fetch!("data")

      assert replay == first

      response =
        public_conn()
        |> post(
          "/v1/public/landing-pages/#{page["slug"]}/applications",
          Map.put(request, "name", "Different applicant")
        )

      assert json_response(response, 409)

      identity_mismatch =
        request
        |> Map.put("request_id", Ecto.UUID.generate())
        |> Map.put("name", "Different applicant")

      assert json_response(
               post(public_conn(), "/v1/public/landing-pages/#{page["slug"]}/applications", identity_mismatch),
               404
             )
    end

    test "rejects malformed questions, options, and answer values", %{conn: conn} do
      for questions <- [
            [%{"id" => "goal", "type" => "long_text", "options" => []}],
            [%{"id" => "readiness", "label" => "Ready?", "type" => "single_select", "options" => ["Yes"]}]
          ] do
        response = put(conn, "/v1/coach/landing-page", page_attrs(%{"application_questions" => questions}))
        assert json_response(response, 422)
      end

      page =
        save_page(conn, %{
          "application_questions" => [
            %{"id" => "readiness", "label" => "Ready?", "type" => "single_select", "options" => ["Yes", "No"]}
          ]
        })

      for answers <- [%{"unknown" => "value"}, %{"readiness" => "Maybe"}, %{"readiness" => ["Yes"]}] do
        response =
          public_conn()
          |> post(
            "/v1/public/landing-pages/#{page["slug"]}/applications",
            application_attrs(page, nil, answers)
          )

        assert json_response(response, 422)
      end
    end

    test "rejects null collections", %{conn: conn} do
      response = put(conn, "/v1/coach/landing-page", page_attrs(%{"programs" => nil, "application_questions" => nil}))
      assert json_response(response, 422)
    end
  end

  defp save_page(conn, overrides \\ %{}) do
    conn
    |> put("/v1/coach/landing-page", page_attrs(overrides))
    |> json_response(200)
    |> Map.fetch!("data")
  end

  defp apply_for_coaching(page, program_id) do
    public_conn()
    |> post("/v1/public/landing-pages/#{page["slug"]}/applications", application_attrs(page, program_id))
    |> json_response(201)
    |> Map.fetch!("data")
  end

  defp page_attrs(overrides) do
    Map.merge(
      %{
        "slug" => "strength-with-kavya",
        "expected_revision" => 0,
        "template" => "proof_first",
        "headline" => "Build strength without guessing.",
        "status" => "published",
        "application_questions" => [
          %{"id" => "goal", "label" => "What is your main goal?", "type" => "long_text", "options" => []}
        ],
        "programs" => [program_attrs()]
      },
      overrides
    )
  end

  defp program_attrs(name \\ "Strength coaching") do
    %{"name" => name, "audience" => "For busy professionals", "price_display" => "₹8,000/month"}
  end

  defp application_attrs(page, program_id, answers \\ %{"goal" => "Build strength"}) do
    %{
      "landing_page_id" => page["id"],
      "expected_revision" => page["revision"],
      "name" => "Priya Sharma",
      "email" => "priya@example.com",
      "landing_program_id" => program_id,
      "answers" => answers
    }
  end

  defp public_conn do
    build_conn()
    |> put_req_header("content-type", "application/json")
  end
end
