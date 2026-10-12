defmodule EasyWeb.ReviewContractTest do
  alias Easy.CoachingTerms.CoachingTerm
  alias Easy.Ctx
  alias Easy.Repo
  alias Easy.Trackers
  use Easy.ConnCase, async: false
  import Ecto.Query

  setup do
    coach = insert(:coach)
    client = insert(:client, business: coach.business, coach: coach, timezone: "Etc/UTC")
    colleague = insert(:coach, business: coach.business)

    %{
      coach: coach,
      client: client,
      coach_conn: authenticate_coach(build_conn(), coach),
      client_conn: authenticate_client(build_conn(), client),
      foreign_conn: authenticate_coach(build_conn(), insert(:coach)),
      colleague_conn: authenticate_coach(build_conn(), colleague),
      ctx: %Ctx{business_id: coach.business_id, user_id: coach.user_id, coach_id: coach.id}
    }
  end

  test "screen and review replies serialize safely, edit and deletion stay in chat", f do
    {:ok, tracker} = Trackers.create_tracker(f.ctx, %{name: "Weight", kind: :number, base_unit: "kg"})

    record = %{
      tracker_id: tracker.id,
      local_date: Date.utc_today(),
      request_id: Ecto.UUID.generate(),
      number_value: 82.5,
      entered_unit: "kg"
    }

    assert response(post(f.client_conn, "/v1/client/tracker-entries", record), 201)
    assert response(get(f.coach_conn, "/v1/coach/clients/not-a-uuid/review-screen"), 422)
    prefix = "/v1/coach/clients/#{f.client.id}"
    screen = json_response(get(f.coach_conn, prefix <> "/review-screen"), 200)["data"]
    assert screen["reviewed_through_seq"] == 1
    assert hd(screen["changes"])["title"] == "Weight"
    assert screen["training_counts"] == %{"expected" => 0, "completed" => 0, "extra" => 0}
    assert hd(screen["trackers"])["average"] == 82.5
    refute Jason.encode!(screen) =~ "business_id"

    attrs = %{
      snapshot_token: screen["snapshot_token"],
      assessment: "needs_attention",
      private_note: "Secret",
      reply: "Public reply"
    }

    saved = json_response(post(f.coach_conn, prefix <> "/reviews", attrs), 201)["data"]
    assert saved["private_note"] == "Secret" && saved["assessment"] == "needs_attention"

    replies =
      json_response(get(f.client_conn, "/v1/client/review-replies", %{cursor: "start", review_id: saved["id"]}), 200)

    assert [%{"body" => "Public reply", "edited_at" => nil, "embed" => %{"type" => "review", "id" => id}}] =
             replies["data"]

    assert id == saved["id"]
    refute Jason.encode!(replies) =~ "private_note"
    refute Jason.encode!(replies) =~ "assessment"
    assert response(patch(f.coach_conn, prefix <> "/reviews/#{saved["id"]}", %{reply: "Edited"}), 200)
    edited = hd(json_response(get(f.client_conn, "/v1/client/review-replies"), 200)["data"])
    assert edited["body"] == "Edited" && edited["edited_at"]
    assert response(patch(f.coach_conn, prefix <> "/reviews/#{saved["id"]}", %{reply: nil}), 200)
    assert json_response(get(f.client_conn, "/v1/client/review-replies"), 200)["data"] == []
    assert json_response(get(f.coach_conn, prefix <> "/reviews", %{cursor: "start"}), 200)["count"] == 1
  end

  test "wire shape rejects mutable facts and general chat review references", f do
    prefix = "/v1/coach/clients/#{f.client.id}"
    screen = json_response(get(f.coach_conn, prefix <> "/review-screen"), 200)["data"]
    attrs = %{snapshot_token: screen["snapshot_token"], assessment: "on_track"}
    review = json_response(post(f.coach_conn, prefix <> "/reviews", attrs), 201)["data"]
    assert response(patch(f.coach_conn, prefix <> "/reviews/#{review["id"]}", %{reviewed_at: DateTime.utc_now()}), 422)

    assert response(
             post(f.client_conn, "/v1/client/conversation/messages", %{
               body: "Fake",
               embed: %{type: "review", id: review["id"]}
             }),
             422
           )

    assert response(post(f.coach_conn, prefix <> "/reviews", %{attrs | snapshot_token: "forged"}), 409)
    assert response(get(f.coach_conn, "/v1/coach/review-roster", %{cursor: "bad"}), 422)

    assert response(
             get(f.coach_conn, prefix <> "/review-screen", %{from: Date.utc_today(), to: Date.add(Date.utc_today(), -1)}),
             422
           )
  end

  test "coach scope and term gate hold for every endpoint; client profile has only focus", f do
    prefix = "/v1/coach/clients/#{f.client.id}"
    screen = json_response(get(f.coach_conn, prefix <> "/review-screen"), 200)["data"]
    attrs = %{snapshot_token: screen["snapshot_token"], assessment: "at_risk", private_note: "Secret", reply: "A reply"}
    review = json_response(post(f.coach_conn, prefix <> "/reviews", attrs), 201)["data"]

    for conn <- [f.foreign_conn, f.colleague_conn] do
      assert response(get(conn, prefix <> "/review-screen"), 404)
      assert response(get(conn, prefix <> "/reviews"), 404)
      assert response(post(conn, prefix <> "/reviews", attrs), 404)
      assert response(patch(conn, prefix <> "/reviews/#{review["id"]}", %{reply: nil}), 404)
      assert json_response(get(conn, "/v1/coach/review-roster"), 200)["data"] == []
    end

    assert response(patch(f.coach_conn, prefix, %{focus: "Sleep well", review_frequency_days: 3}), 200)
    profile = json_response(get(f.client_conn, "/v1/client/me"), 200)["data"]
    assert profile["focus"] == "Sleep well"
    refute Map.has_key?(profile, "assessment")

    Repo.update_all(from(t in CoachingTerm, where: t.client_id == ^f.client.id),
      set: [ends_on: Date.add(Date.utc_today(), -1)]
    )

    ended = json_response(get(f.coach_conn, prefix <> "/review-screen"), 200)["data"]
    assert response(post(f.coach_conn, prefix <> "/reviews", %{attrs | snapshot_token: ended["snapshot_token"]}), 403)
    assert json_response(get(f.client_conn, "/v1/client/review-replies"), 200)["count"] == 1
    assert json_response(get(f.coach_conn, "/v1/coach/review-roster", %{due: "inactive"}), 200)["count"] == 1
  end
end
