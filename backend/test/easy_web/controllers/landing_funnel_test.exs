defmodule EasyWeb.LandingFunnelTest do
  use Easy.ConnCase

  alias Easy.Clients.Client
  alias Easy.Landing.Prospect
  alias Easy.Repo

  import Ecto.Query

  setup do
    coach = insert(:coach)

    conn =
      build_conn()
      |> put_req_header("content-type", "application/json")
      |> authenticate_coach(coach)

    %{conn: conn, coach: coach, business: coach.business}
  end

  defp page_attrs(overrides) do
    Map.merge(
      %{
        "slug" => "coach-page",
        "template" => "proof_first",
        "headline" => "Build strength without guessing.",
        "subheadline" => "Personal coaching with structure.",
        "status" => "published",
        "proof_points" => [%{"label" => "clients", "value" => "220+"}],
        "application_questions" => [
          %{"id" => "goal", "label" => "Main goal?", "type" => "long_text", "options" => []}
        ],
        "programs" => [
          %{"name" => "Fat loss coaching", "audience" => "For busy professionals"},
          %{"name" => "Muscle gain", "audience" => "For lifters"}
        ]
      },
      overrides
    )
  end

  defp publish_page(conn, overrides) do
    conn = put(conn, "/v1/coach/landing-page", page_attrs(overrides))
    json_response(conn, 200)["data"]
  end

  describe "coach landing page upsert" do
    test "creates then updates the single page, replacing programs", %{conn: conn} do
      created = publish_page(conn, %{"slug" => "kavya-strength"})
      assert created["slug"] == "kavya-strength"
      assert length(created["programs"]) == 2

      updated = publish_page(conn, %{"slug" => "kavya-strength", "programs" => [%{"name" => "Only one"}]})
      assert length(updated["programs"]) == 1
      assert created["id"] == updated["id"], "upsert keeps the same page"
    end

    test "rejects more than three programs", %{conn: conn} do
      programs = for n <- 1..4, do: %{"name" => "Program #{n}"}
      conn = put(conn, "/v1/coach/landing-page", page_attrs(%{"programs" => programs}))
      assert json_response(conn, 422)
    end

    test "rejects more than five questions", %{conn: conn} do
      questions = for n <- 1..6, do: %{"id" => "q#{n}", "label" => "Q#{n}", "type" => "short_text", "options" => []}
      conn = put(conn, "/v1/coach/landing-page", page_attrs(%{"application_questions" => questions}))
      assert json_response(conn, 422)
    end

    test "returns null before a page exists", %{conn: conn} do
      assert %{"data" => nil} = json_response(get(conn, "/v1/coach/landing-page"), 200)
    end
  end

  describe "public landing page read" do
    test "renders a published page by slug", %{conn: conn} do
      publish_page(conn, %{"slug" => "public-read"})

      data = json_response(get(build_conn(), "/v1/public/landing-pages/public-read"), 200)["data"]
      assert data["headline"] == "Build strength without guessing."
      assert length(data["programs"]) == 2
      assert data["business_name"]
    end

    test "404s for an unpublished page", %{conn: conn} do
      publish_page(conn, %{"slug" => "draft-page", "status" => "draft"})
      assert json_response(get(build_conn(), "/v1/public/landing-pages/draft-page"), 404)
    end

    test "404s for an unknown slug" do
      assert json_response(get(build_conn(), "/v1/public/landing-pages/nope"), 404)
    end
  end

  describe "public application" do
    test "creates a prospect and stores the selected program", %{conn: conn, business: business} do
      page = publish_page(conn, %{"slug" => "apply-here"})
      program = hd(page["programs"])

      resp =
        post(build_conn() |> put_req_header("content-type", "application/json"), "/v1/public/landing-pages/apply-here/applications", %{
          "name" => "Priya Sharma",
          "email" => "priya@example.com",
          "landing_program_id" => program["id"],
          "answers" => %{"goal" => "Lose 8kg"}
        })

      data = json_response(resp, 201)["data"]
      assert data["name"] == "Priya Sharma"
      assert data["program_name"] == program["name"]

      prospect = Repo.one(from p in Prospect, where: p.business_id == ^business.id)
      assert prospect.status == :new
      assert prospect.landing_program_id == program["id"]
      assert prospect.answers == %{"goal" => "Lose 8kg"}
    end

    test "requires a phone or email", %{conn: conn} do
      publish_page(conn, %{"slug" => "needs-contact"})

      resp =
        post(build_conn() |> put_req_header("content-type", "application/json"), "/v1/public/landing-pages/needs-contact/applications", %{
          "name" => "No Contact"
        })

      assert json_response(resp, 422)
    end
  end

  describe "coach prospects" do
    test "scopes reads to the coach's business", %{conn: conn} do
      publish_page(conn, %{"slug" => "scoped"})
      submit_application("scoped", "priya@example.com")

      other = insert(:coach)
      other_conn = build_conn() |> put_req_header("content-type", "application/json") |> authenticate_coach(other)

      assert %{"data" => [], "count" => 0} = json_response(get(other_conn, "/v1/coach/prospects"), 200)
      assert %{"data" => [prospect]} = json_response(get(conn, "/v1/coach/prospects"), 200)
      assert json_response(get(other_conn, "/v1/coach/prospects/#{prospect["id"]}"), 404)
    end

    test "filters by status and updates", %{conn: conn} do
      publish_page(conn, %{"slug" => "statusable"})
      submit_application("statusable", "priya@example.com")
      [prospect] = json_response(get(conn, "/v1/coach/prospects"), 200)["data"]

      updated = json_response(patch(conn, "/v1/coach/prospects/#{prospect["id"]}", %{"status" => "reviewing"}), 200)["data"]
      assert updated["status"] == "reviewing"

      assert %{"data" => [_]} = json_response(get(conn, "/v1/coach/prospects?status=reviewing"), 200)
      assert %{"data" => []} = json_response(get(conn, "/v1/coach/prospects?status=new"), 200)
    end
  end

  describe "enroll prospect" do
    test "creates a pending client, links it, marks won", %{conn: conn, business: business} do
      publish_page(conn, %{"slug" => "enroll-me"})
      submit_application("enroll-me", "newclient@example.com")
      [prospect] = json_response(get(conn, "/v1/coach/prospects"), 200)["data"]

      resp = post(conn, "/v1/coach/prospects/#{prospect["id"]}/enroll", %{})
      data = json_response(resp, 201)["data"]

      assert data["already_enrolled"] == false
      assert data["prospect"]["status"] == "won"
      assert data["prospect"]["client"]["id"]

      assert client_count(business.id) == 1
      client = Repo.one(from c in Client, where: c.business_id == ^business.id)
      assert client.status == :pending
      assert data["prospect"]["client"]["id"] == client.id
    end

    test "does not create a second client on duplicate enroll", %{conn: conn, business: business} do
      publish_page(conn, %{"slug" => "enroll-twice"})
      submit_application("enroll-twice", "once@example.com")
      [prospect] = json_response(get(conn, "/v1/coach/prospects"), 200)["data"]

      first = json_response(post(conn, "/v1/coach/prospects/#{prospect["id"]}/enroll", %{}), 201)["data"]
      second = json_response(post(conn, "/v1/coach/prospects/#{prospect["id"]}/enroll", %{}), 201)["data"]

      assert second["already_enrolled"] == true
      assert second["prospect"]["client"]["id"] == first["prospect"]["client"]["id"]
      assert client_count(business.id) == 1
    end
  end

  defp submit_application(slug, email) do
    post(
      build_conn() |> put_req_header("content-type", "application/json"),
      "/v1/public/landing-pages/#{slug}/applications",
      %{"name" => "Priya Sharma", "email" => email, "answers" => %{}}
    )
  end

  defp client_count(business_id) do
    Repo.aggregate(from(c in Client, where: c.business_id == ^business_id), :count, :id)
  end
end
