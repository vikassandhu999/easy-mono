defmodule EasyWeb.Coaches.ProspectsInboxTest do
  use Easy.ConnCase

  import Ecto.Query

  alias Easy.Landing.Prospect
  alias Easy.Repo

  setup do
    coach = insert(:coach)

    conn =
      build_conn()
      |> put_req_header("content-type", "application/json")
      |> authenticate_coach(coach)

    page =
      conn
      |> put("/v1/coach/landing-page", page_attrs())
      |> json_response(200)
      |> Map.fetch!("data")

    %{conn: conn, page: page}
  end

  test "cursor pages use a stable ID tie-breaker across inserts and deletes", %{conn: conn, page: page} do
    ids = for name <- ["A", "B", "C"], do: submit_application(page, name)["id"]
    tied_at = ~U[2026-01-01 00:00:00Z]
    Repo.update_all(from(prospect in Prospect, where: prospect.id in ^ids), set: [inserted_at: tied_at])

    first = list(conn, "cursor=start&limit=1")
    [first_id] = ids(first)
    assert first_id == Enum.max(ids)
    assert first["next_cursor"]

    inserted = submit_application(page, "Inserted later")
    Repo.delete!(Repo.get!(Prospect, first_id))

    second = list(conn, "cursor=#{first["next_cursor"]}&limit=10")
    assert ids(second) == (ids -- [first_id]) |> Enum.sort(:desc)
    refute inserted["id"] in ids(second)
  end

  test "literal search and cursor search find results beyond the first page", %{conn: conn, page: page} do
    submit_application(page, "literal 100% result")
    submit_application(page, "literal 100x result")
    submit_application(page, "needle one")
    submit_application(page, "needle two")

    literal = list(conn, "search=100%25&limit=10")
    assert Enum.map(literal["data"], & &1["name"]) == ["literal 100% result"]

    first = list(conn, "search=needle&cursor=start&limit=1")
    assert length(first["data"]) == 1
    assert first["next_cursor"]

    second = list(conn, "search=needle&cursor=#{first["next_cursor"]}&limit=1")
    assert length(second["data"]) == 1
    assert Enum.sort(Enum.map(first["data"] ++ second["data"], & &1["name"])) == ["needle one", "needle two"]
  end

  test "returns server stage counts and rejects malformed mixed paging", %{conn: conn, page: page} do
    first = submit_application(page, "New")
    second = submit_application(page, "Reviewing")
    third = submit_application(page, "Lost")

    patch_prospect(conn, second["id"], %{"expected_revision" => 1, "status" => "reviewing"})
    patch_prospect(conn, third["id"], %{"expected_revision" => 1, "status" => "lost"})

    response = list(conn, "status=new&limit=10")
    assert Enum.map(response["data"], & &1["id"]) == [first["id"]]
    assert response["summary"] == %{"new" => 1, "reviewing" => 1, "won" => 0, "lost" => 1}

    assert json_response(get(conn, "/v1/coach/prospects?cursor=start&offset=1"), 422)
    assert json_response(get(conn, "/v1/coach/prospects?cursor=invalid"), 422)
  end

  test "denies another business and rejects stale review edits", %{conn: conn, page: page} do
    prospect = submit_application(page, "Priya Sharma")
    other = insert(:coach)
    other_conn = build_conn() |> put_req_header("content-type", "application/json") |> authenticate_coach(other)

    assert json_response(get(other_conn, "/v1/coach/prospects/#{prospect["id"]}"), 404)
    assert json_response(patch(other_conn, "/v1/coach/prospects/#{prospect["id"]}", %{"status" => "lost"}), 404)
    assert json_response(post(other_conn, "/v1/coach/prospects/#{prospect["id"]}/enroll", %{}), 404)

    current = patch_prospect(conn, prospect["id"], %{"expected_revision" => 1, "status" => "reviewing", "notes" => "Called"})

    assert %{"error_code" => "stale_revision", "error_detail" => %{"current_revision" => revision}} =
             json_response(patch(conn, "/v1/coach/prospects/#{prospect["id"]}", %{"expected_revision" => 1, "status" => "lost"}), 409)

    assert revision == current["revision"]
  end

  test "renders original question rows and enrollment defaults, then keeps acceptance on replay", %{conn: conn, page: page} do
    prospect = submit_application(page, "Priya Sharma", %{"goal" => "Build strength"})

    shown = get(conn, "/v1/coach/prospects/#{prospect["id"]}") |> json_response(200) |> Map.fetch!("data")
    assert shown["enrollment_defaults"] == %{"first_name" => "Priya", "last_name" => "Sharma", "email" => shown["email"], "phone" => nil}
    assert shown["answer_rows"] == [%{"question_id" => "goal", "label" => "What is your goal?", "value" => "Build strength"}]
    assert shown["submitted_questions"] == [%{"id" => "goal", "label" => "What is your goal?", "type" => "long_text", "options" => []}]

    enrolled =
      post(conn, "/v1/coach/prospects/#{prospect["id"]}/enroll", %{"expected_revision" => shown["revision"]})
      |> json_response(201)
      |> Map.fetch!("data")

    assert enrolled["already_enrolled"] == false
    assert enrolled["prospect"]["status"] == "won"
    assert enrolled["prospect"]["client"]["status"] == "pending"

    assert json_response(patch(conn, "/v1/coach/prospects/#{prospect["id"]}", %{"expected_revision" => enrolled["prospect"]["revision"], "status" => "lost"}), 422)

    replay = post(conn, "/v1/coach/prospects/#{prospect["id"]}/enroll", %{}) |> json_response(201) |> Map.fetch!("data")
    assert replay["already_enrolled"] == true
    assert replay["prospect"]["client"]["id"] == enrolled["prospect"]["client"]["id"]
    assert replay["prospect"]["status"] == "won"
  end

  test "renders legacy answers with incomplete question definitions", %{conn: conn, page: page} do
    prospect = submit_application(page, "Legacy applicant")

    Repo.update_all(from(row in Prospect, where: row.id == ^prospect["id"]),
      set: [
        submitted_questions: [%{"id" => "goal", "label" => %{}}, %{"id" => 12}, %{}],
        answers: %{"goal" => "Build strength", "earlier" => ["Walking", "Swimming"]}
      ]
    )

    shown = get(conn, "/v1/coach/prospects/#{prospect["id"]}") |> json_response(200) |> Map.fetch!("data")

    assert shown["answer_rows"] == [
             %{"question_id" => "goal", "label" => "Earlier question", "value" => "Build strength"},
             %{"question_id" => "earlier", "label" => "Earlier question (earlier)", "value" => "[\"Walking\",\"Swimming\"]"}
           ]
  end

  defp list(conn, query), do: get(conn, "/v1/coach/prospects?#{query}") |> json_response(200)
  defp ids(response), do: Enum.map(response["data"], & &1["id"])
  defp patch_prospect(conn, id, attrs), do: patch(conn, "/v1/coach/prospects/#{id}", attrs) |> json_response(200) |> Map.fetch!("data")

  defp submit_application(page, name, answers \\ %{"goal" => "Build strength"}) do
    public_conn()
    |> post("/v1/public/landing-pages/#{page["slug"]}/applications", %{
      "expected_revision" => page["revision"],
      "name" => name,
      "email" => "prospect-#{System.unique_integer([:positive])}@example.com",
      "answers" => answers
    })
    |> json_response(201)
    |> Map.fetch!("data")
  end

  defp page_attrs do
    %{
      "slug" => "prospect-inbox",
      "expected_revision" => 0,
      "template" => "proof_first",
      "headline" => "Inbox coaching",
      "status" => "published",
      "application_questions" => [%{"id" => "goal", "label" => "What is your goal?", "type" => "long_text", "options" => []}],
      "programs" => []
    }
  end

  defp public_conn, do: build_conn() |> put_req_header("content-type", "application/json")
end
