defmodule EasyWeb.Coaches.CheckInReviewControllerTest do
  use Easy.ConnCase

  import OpenApiSpex.TestAssertions

  alias EasyWeb.ApiSpec

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

    assert %{"data" => [item]} = json_response(conn, 200)
    assert item["id"] == submission.id
    assert item["client"]["id"] == client.id
    assert item["form_assignment"]["id"] == assignment.id
    assert item["form_assignment"]["form_template"]["id"] == template.id
    assert_schema(item, "ClientProfileReviewQueueItem", ApiSpec.spec())
  end

  test "reviews a submission idempotently", %{conn: conn, submission: submission} do
    conn = post(conn, "/v1/coach/form-submissions/#{submission.id}/review", %{})

    assert %{"data" => reviewed} = json_response(conn, 200)
    assert reviewed["reviewed_at"]
    assert reviewed["reviewed_by_id"]
    assert_schema(reviewed, "ClientProfileFormSubmission", ApiSpec.spec())

    conn = post(recycle(conn), "/v1/coach/form-submissions/#{submission.id}/review", %{})
    assert %{"data" => reviewed_again} = json_response(conn, 200)
    assert reviewed_again["reviewed_at"] == reviewed["reviewed_at"]
    assert reviewed_again["reviewed_by_id"] == reviewed["reviewed_by_id"]

    conn = get(recycle(conn), "/v1/coach/check-ins/review-queue")
    assert %{"data" => []} = json_response(conn, 200)
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

  test "OpenAPI contains both review routes" do
    paths = ApiSpec.spec().paths
    assert paths["/v1/coach/check-ins/review-queue"]
    assert paths["/v1/coach/form-submissions/{id}/review"]
  end
end
