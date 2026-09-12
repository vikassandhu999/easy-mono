defmodule EasyWeb.Coaches.CheckInReviewControllerTest do
  use Easy.ConnCase

  alias Easy.Repo

  setup do
    coach = insert(:coach)
    client = insert(:client, business: coach.business, creator: coach, assigned_coach: coach)
    template = insert(:form_template, business: coach.business, purpose: :check_in)

    assignment =
      insert(:form_assignment,
        business: coach.business,
        client: client,
        form_template: template,
        purpose: :check_in,
        status: :completed
      )

    submission =
      insert(:form_submission,
        business: coach.business,
        client: client,
        form_assignment: assignment,
        answers: %{"meal_prep_ability" => "high"}
      )

    conn =
      build_conn()
      |> put_req_header("content-type", "application/json")
      |> authenticate_coach(coach)

    %{assignment: assignment, client: client, coach: coach, conn: conn, submission: submission, template: template}
  end

  test "lists unreviewed check-ins with client and assignment context", %{
    assignment: assignment,
    client: client,
    conn: conn,
    submission: submission,
    template: template
  } do
    conn = get(conn, "/v1/coach/check-ins/review-queue")

    assert %{"count" => 1, "data" => [item]} = json_response(conn, 200)
    assert item["id"] == submission.id
    assert item["client"]["id"] == client.id
    assert item["form_assignment"]["id"] == assignment.id
    assert item["form_assignment"]["form_template"]["id"] == template.id
  end

  test "rejects unknown review queue query parameters", %{conn: conn} do
    conn = get(conn, "/v1/coach/check-ins/review-queue?unexpected=true")

    assert %{"error_detail" => %{"fields" => %{"unexpected" => ["is unknown"]}}} =
             json_response(conn, 422)
  end

  test "reviews a submission idempotently", %{conn: conn, submission: submission} do
    conn = post(conn, "/v1/coach/form-submissions/#{submission.id}/review", %{})

    assert %{"data" => reviewed} = json_response(conn, 200)
    assert reviewed["reviewed_at"]
    assert reviewed["reviewed_by_id"]

    conn = post(recycle(conn), "/v1/coach/form-submissions/#{submission.id}/review", %{})
    assert %{"data" => reviewed_again} = json_response(conn, 200)
    assert reviewed_again["reviewed_at"] == reviewed["reviewed_at"]
    assert reviewed_again["reviewed_by_id"] == reviewed["reviewed_by_id"]

    conn = get(recycle(conn), "/v1/coach/check-ins/review-queue")
    assert %{"count" => 0, "data" => []} = json_response(conn, 200)
  end

  test "returns not found for another tenant's submission", %{conn: conn} do
    other_client = insert(:client)
    other_template = insert(:form_template, business: other_client.business)

    other_assignment =
      insert(:form_assignment,
        business: other_client.business,
        client: other_client,
        form_template: other_template
      )

    other_submission =
      insert(:form_submission,
        business: other_client.business,
        client: other_client,
        form_assignment: other_assignment
      )

    conn = post(conn, "/v1/coach/form-submissions/#{other_submission.id}/review", %{})
    assert json_response(conn, 404)
  end

  test "lists visible check-in submissions across review states with cursor pagination", %{
    conn: conn,
    coach: coach,
    client: client,
    submission: submission,
    template: template
  } do
    reviewed =
      insert(:form_submission,
        business: coach.business,
        client: client,
        form_assignment:
          insert(:form_assignment,
            business: coach.business,
            client: client,
            form_template: template,
            purpose: :check_in
          ),
        reviewed_at: DateTime.utc_now(:second),
        reviewed_by: coach.user
      )

    first_page =
      conn
      |> get("/v1/coach/check-ins/submissions", %{"cursor" => "start", "limit" => "1"})
      |> json_response(200)

    assert %{"data" => [first], "count" => 2, "next_cursor" => cursor} = first_page
    assert is_binary(cursor)

    second_page =
      conn
      |> recycle()
      |> get("/v1/coach/check-ins/submissions", %{"cursor" => cursor, "limit" => "1"})
      |> json_response(200)

    assert %{"data" => [second], "count" => 2, "next_cursor" => nil} = second_page
    assert Enum.sort([first["id"], second["id"]]) == Enum.sort([submission.id, reviewed.id])
    assert Enum.any?([first, second], &(&1["reviewed_at"] != nil))
  end

  test "filters submission history by client, review state, and literal search text", %{
    conn: conn,
    coach: coach,
    client: client
  } do
    suffix = Ecto.UUID.generate()
    literal = "Check-in %_ #{suffix}"

    matching_template = insert(:form_template, business: coach.business, purpose: :check_in, name: literal)

    matching_assignment =
      insert(:form_assignment,
        business: coach.business,
        client: client,
        form_template: matching_template,
        purpose: :check_in
      )

    matching =
      insert(:form_submission,
        business: coach.business,
        client: client,
        form_assignment: matching_assignment,
        reviewed_at: DateTime.utc_now(:second),
        reviewed_by: coach.user
      )

    insert(:form_submission,
      business: coach.business,
      client: client,
      form_assignment:
        insert(:form_assignment,
          business: coach.business,
          client: client,
          form_template: matching_template,
          purpose: :check_in
        )
    )

    other_client = insert(:client, business: coach.business, creator: coach, assigned_coach: coach)

    insert(:form_submission,
      business: coach.business,
      client: other_client,
      form_assignment:
        insert(:form_assignment,
          business: coach.business,
          client: other_client,
          form_template: matching_template,
          purpose: :check_in
        ),
      reviewed_at: DateTime.utc_now(:second),
      reviewed_by: coach.user
    )

    wildcard_template =
      insert(:form_template, business: coach.business, purpose: :check_in, name: "Check-in xy #{suffix}")

    wildcard_assignment =
      insert(:form_assignment,
        business: coach.business,
        client: client,
        form_template: wildcard_template,
        purpose: :check_in
      )

    insert(:form_submission, business: coach.business, client: client, form_assignment: wildcard_assignment)

    response =
      conn
      |> get("/v1/coach/check-ins/submissions", %{
        "cursor" => "start",
        "client_id" => client.id,
        "reviewed" => "true",
        "search" => literal
      })
      |> json_response(200)

    assert %{"data" => [%{"id" => id}], "count" => 1, "next_cursor" => nil} = response
    assert id == matching.id
  end

  test "hides other tenants, other trainers' clients, and intake submissions", %{conn: conn, coach: coach} do
    other_coach = insert(:coach, business: coach.business)
    other_client = insert(:client, business: coach.business, creator: other_coach, assigned_coach: other_coach)
    other_template = insert(:form_template, business: coach.business, purpose: :check_in)

    other_submission =
      insert(:form_submission,
        business: coach.business,
        client: other_client,
        form_assignment:
          insert(:form_assignment,
            business: coach.business,
            client: other_client,
            form_template: other_template,
            purpose: :check_in
          )
      )

    intake_client = insert(:client, business: coach.business, creator: coach, assigned_coach: coach)
    intake_template = insert(:form_template, business: coach.business, purpose: :intake)

    intake_submission =
      insert(:form_submission,
        business: coach.business,
        client: intake_client,
        form_assignment:
          insert(:form_assignment,
            business: coach.business,
            client: intake_client,
            form_template: intake_template,
            purpose: :intake
          )
      )

    other_business_client = insert(:client)
    other_business_template = insert(:form_template, business: other_business_client.business, purpose: :check_in)

    other_business_submission =
      insert(:form_submission,
        business: other_business_client.business,
        client: other_business_client,
        form_assignment:
          insert(:form_assignment,
            business: other_business_client.business,
            client: other_business_client,
            form_template: other_business_template,
            purpose: :check_in
          )
      )

    history = conn |> get("/v1/coach/check-ins/submissions?cursor=start") |> json_response(200)
    ids = Enum.map(history["data"], & &1["id"])

    refute other_submission.id in ids
    refute intake_submission.id in ids
    refute other_business_submission.id in ids

    for submission <- [other_submission, intake_submission, other_business_submission] do
      assert conn |> recycle() |> get("/v1/coach/check-ins/submissions/#{submission.id}") |> json_response(404)
    end
  end

  test "shows a check-in snapshot and continues after its cursor anchor is deleted", %{
    conn: conn,
    coach: coach,
    client: client,
    submission: submission,
    template: template
  } do
    following =
      insert(:form_submission,
        business: coach.business,
        client: client,
        form_assignment:
          insert(:form_assignment,
            business: coach.business,
            client: client,
            form_template: template,
            purpose: :check_in
          )
      )

    first_page =
      conn
      |> get("/v1/coach/check-ins/submissions", %{"cursor" => "start", "limit" => "1"})
      |> json_response(200)

    assert %{"data" => [first], "next_cursor" => cursor} = first_page

    assert %{"data" => detail} =
             conn
             |> recycle()
             |> get("/v1/coach/check-ins/submissions/#{first["id"]}")
             |> json_response(200)

    assert detail["question_snapshot"] == first["question_snapshot"]
    assert detail["answers"] == first["answers"]

    Repo.delete!(Repo.get!(Easy.Forms.FormSubmission, first["id"]))

    second_page =
      conn
      |> recycle()
      |> get("/v1/coach/check-ins/submissions", %{"cursor" => cursor, "limit" => "10"})
      |> json_response(200)

    assert %{"data" => remaining, "count" => 1, "next_cursor" => nil} = second_page
    refute first["id"] in Enum.map(remaining, & &1["id"])

    assert Enum.sort([first["id"] | Enum.map(remaining, & &1["id"])]) ==
             Enum.sort([submission.id, following.id])
  end

  test "rejects malformed history query values", %{conn: conn} do
    for {params, field} <- [
          {%{"cursor" => "not-a-cursor"}, "cursor"},
          {%{"cursor" => "start", "limit" => "0"}, "limit"},
          {%{"cursor" => "start", "reviewed" => "sometimes"}, "reviewed"},
          {%{"cursor" => "start", "client_id" => "not-a-uuid"}, "client_id"},
          {%{"cursor" => "start", "unexpected" => "true"}, "unexpected"}
        ] do
      assert %{"error_detail" => %{"fields" => %{^field => [_]}}} =
               conn
               |> recycle()
               |> get("/v1/coach/check-ins/submissions", params)
               |> json_response(422)
    end
  end

  test "rejects a malformed submission detail id", %{conn: conn} do
    assert %{"error_detail" => %{"fields" => %{"id" => [_]}}} =
             conn
             |> get("/v1/coach/check-ins/submissions/not-a-uuid")
             |> json_response(422)
  end
end
