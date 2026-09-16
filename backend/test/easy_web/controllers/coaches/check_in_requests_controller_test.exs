defmodule EasyWeb.Coaches.CheckInRequestsControllerTest do
  use Easy.ConnCase

  setup do
    business = insert(:business, handle: "requests-#{Ecto.UUID.generate()}")
    coach = insert(:coach, business: business)
    client = insert(:client, business: coach.business, creator: coach)
    template = insert(:form_template, business: coach.business, purpose: :check_in, name: "Weekly 100% progress")
    conn = build_conn() |> authenticate_coach(coach)
    %{conn: conn, coach: coach, client: client, template: template}
  end

  test "pages check-in requests with exact summaries and filtered counts", context do
    %{conn: conn, client: client, template: template} = context
    requests = for _ <- 1..43, do: request(context)
    intake = insert(:form_template, business: client.business, purpose: :intake)
    insert(:form_assignment, business: client.business, client: client, form_template: intake, purpose: :intake)
    other_client = insert(:client, business: client.business, creator: context.coach)

    insert(:form_assignment,
      business: client.business,
      client: other_client,
      form_template: template,
      purpose: :check_in
    )

    first = get_page(conn, client, %{limit: 20, status: "outstanding"})
    assert first["count"] == 43
    assert length(first["data"]) == 20
    second = get_page(conn, client, %{limit: 20, cursor: first["next_cursor"], status: "outstanding"})
    third = get_page(conn, client, %{limit: 20, cursor: second["next_cursor"], status: "outstanding"})
    assert third["next_cursor"] == nil
    assert third["count"] == 43
    rows = first["data"] ++ second["data"] ++ third["data"]
    assert MapSet.new(Enum.map(rows, & &1["id"])) == MapSet.new(Enum.map(requests, & &1.id))
    assert Enum.all?(rows, &(&1["form_name"] == template.name and &1["latest_submission_id"] == nil))
    assert Enum.all?(rows, &(&1["client_id"] == client.id and &1["status"] == "assigned"))
    assert Enum.all?(rows, &(&1["priority"] == "normal" and &1["due_date"] == Date.to_iso8601(Date.utc_today())))
    assert Enum.all?(rows, &(map_size(&1) == 8))
    assert get_page(conn, client, %{search: "100%"})["count"] == 43
    assert get_page(conn, client, %{search: "100_"})["count"] == 0
  end

  test "status groups and latest response preserve request identity", context do
    %{conn: conn, client: client} = context
    for status <- [:assigned, :in_progress, :missed, :dismissed], do: request(context, status: status)
    completed = request(context, status: :completed, completed_at: DateTime.utc_now(:second))
    older = DateTime.add(DateTime.utc_now(:second), -60, :second)
    insert(:form_submission, business: client.business, client: client, form_assignment: completed, submitted_at: older)
    latest = insert(:form_submission, business: client.business, client: client, form_assignment: completed)
    assert get_page(conn, client, %{status: "all"})["count"] == 5
    assert get_page(conn, client, %{status: "outstanding"})["count"] == 3
    for status <- ["missed", "dismissed", "completed"], do: assert(get_page(conn, client, %{status: status})["count"] == 1)
    assert [%{"id" => id, "latest_submission_id" => submission_id}] = get_page(conn, client, %{status: "completed"})["data"]
    assert id == completed.id
    assert submission_id == latest.id
  end

  test "rejects invalid filters and cursors", %{conn: conn, client: client} do
    for params <- [%{status: "bogus"}, %{cursor: "bad"}, %{limit: 0}, %{unexpected: true}] do
      assert conn |> get(path(client), params) |> json_response(422)
    end
  end

  test "keeps foreign and hidden clients inaccessible", context do
    %{conn: conn, client: client, coach: coach} = context
    foreign_business = insert(:business, handle: "requests-#{Ecto.UUID.generate()}")
    foreign_coach = insert(:coach, business: foreign_business)
    foreign = insert(:client, business: foreign_business, creator: foreign_coach)
    assert conn |> get(path(foreign)) |> json_response(404)
    trainer = insert(:coach, business: coach.business)
    trainer_conn = build_conn() |> authenticate_coach(trainer)
    assert trainer_conn |> get(path(client)) |> json_response(404)
    visible = insert(:client, business: coach.business, creator: trainer)
    assert get_page(trainer_conn, visible, %{})["data"] == []
  end

  defp request(%{client: client, template: template}, attrs \\ []) do
    insert(
      :form_assignment,
      Keyword.merge([business: client.business, client: client, form_template: template, purpose: :check_in, priority: :normal, due_date: Date.utc_today()], attrs)
    )
  end

  defp path(client), do: "/v1/coach/clients/#{client.id}/check-in-requests"
  defp get_page(conn, client, params), do: conn |> get(path(client), params) |> json_response(200)
end
