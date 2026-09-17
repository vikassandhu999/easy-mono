defmodule EasyWeb.Coaches.WorkbenchItemsControllerTest do
  use Easy.ConnCase

  setup do
    business = insert(:business)
    coach = insert(:coach, business: business, user: business.owner)
    conn = build_conn() |> authenticate_coach(coach)
    %{conn: conn, coach: coach, business: coach.business}
  end

  test "empty views preserve exact and omitted counts", %{conn: conn} do
    for view <- ["awaiting", "follow-ups"] do
      assert %{"count" => 0, "data" => [], "next_cursor" => nil} = page(conn, %{view: view})
      assert %{"count" => nil, "data" => []} = page(conn, %{view: view, include_count: false})
    end
  end

  test "mixed work is ordered, independently identified and counted before paging", %{
    conn: conn,
    business: business,
    coach: coach
  } do
    client = insert(:client, business: business, creator: coach, required_services: [:training, :nutrition])
    waiting = DateTime.add(DateTime.utc_now(:microsecond), -2, :day)
    conversation = insert(:conversation, business: business, client: client, waiting_since: waiting)
    template = insert(:form_template, business: business, purpose: :intake)

    assignment =
      insert(:form_assignment,
        business: business,
        client: client,
        form_template: template,
        purpose: :intake,
        status: :completed
      )

    submission = insert(:form_submission, business: business, client: client, form_assignment: assignment)

    first = page(conn, %{limit: 2})
    assert first["count"] == 4
    assert Enum.map(first["data"], & &1["kind"]) == ["prepare_plan", "prepare_plan"]
    assert Enum.map(first["data"], & &1["target"]["service"]) == ["training", "nutrition"]
    assert Enum.uniq_by(first["data"], & &1["id"]) == first["data"]

    second = page(conn, %{limit: 2, cursor: first["next_cursor"], include_count: false})
    assert second["count"] == nil
    assert [reply, review] = second["data"]
    assert reply["kind"] == "reply"
    assert reply["target"]["conversation_id"] == conversation.id

    assert review["target"] == %{
             "submission_id" => submission.id,
             "assignment_id" => assignment.id,
             "purpose" => "intake"
           }

    assert second["next_cursor"] == nil
    refute inspect(first) =~ "business_id"

    Easy.Repo.update!(Ecto.Changeset.change(submission, reviewed_at: DateTime.utc_now(:second)))
    assert page(conn, %{})["count"] == 3
    assert page(conn, %{view: "follow-ups"})["count"] == 0
  end

  test "follow-ups retain source reasons and kind-specific snoozes", %{conn: conn, business: business, coach: coach} do
    at = DateTime.utc_now(:second)
    today = Date.utc_today()

    invited =
      insert(:client,
        business: business,
        creator: coach,
        status: :pending,
        user: nil,
        invitation_sent_at: DateTime.add(at, -5, :day)
      )

    client =
      insert(:client, business: business, creator: coach, joined_at: at, subscription_ends_on: Date.add(today, 4))

    template = insert(:form_template, business: business, purpose: :intake)

    insert(:form_assignment,
      business: business,
      client: client,
      form_template: template,
      purpose: :intake,
      due_date: Date.add(today, -1)
    )

    check_in = insert(:form_template, business: business, purpose: :check_in)

    insert(:form_assignment,
      business: business,
      client: client,
      form_template: check_in,
      purpose: :check_in,
      due_date: Date.add(today, -3),
      status: :missed
    )

    result = page(conn, %{view: "follow-ups"})
    assert result["count"] == 4

    assert Enum.map(result["data"], & &1["kind"]) == [
             "missed_check_in",
             "invitation_follow_up",
             "intake_follow_up",
             "ending_engagement"
           ]

    assert Enum.at(result["data"], 1)["target"]["invitation_id"] == invited.id

    conn
    |> put("/v1/coach/clients/#{client.id}/queue-snooze", %{
      queue: "quiet",
      snoozed_until: Date.to_iso8601(Date.add(today, 2))
    })
    |> response(204)

    assert page(conn, %{view: "follow-ups"})["count"] == 3
  end

  test "search is literal, cursor is filter-scoped, and deleted anchors work", %{
    conn: conn,
    business: business,
    coach: coach
  } do
    for n <- 1..5 do
      insert(:client, business: business, creator: coach, first_name: "Queue_#{n}%", required_services: [:training])
    end

    first = page(conn, %{search: "Queue_", limit: 2})
    assert first["count"] == 5
    cursor = first["next_cursor"]
    assert page(conn, %{search: "Queue_5%"})["count"] == 1
    assert page(conn, %{search: "absent"})["count"] == 0
    Easy.Repo.delete!(Easy.Repo.get!(Easy.Clients.Client, List.last(first["data"])["client"]["id"]))
    second = page(conn, %{search: "Queue_", limit: 2, cursor: cursor})
    third = page(conn, %{search: "Queue_", limit: 2, cursor: second["next_cursor"]})
    assert length(second["data"]) == 2
    assert length(third["data"]) == 1
    assert third["next_cursor"] == nil

    for query <- [%{cursor: cursor}, %{cursor: cursor, search: "Queue_", view: "follow-ups"}] do
      conn |> get("/v1/coach/workbench/items", query) |> json_response(422)
    end
  end

  test "invalid parameters and unauthorized requests do not produce a page", %{conn: conn} do
    for query <- [
          %{limit: 0},
          %{limit: 101},
          %{view: "other"},
          %{include_count: "maybe"},
          %{cursor: "garbage"},
          %{offset: 0}
        ] do
      conn |> get("/v1/coach/workbench/items", query) |> json_response(422)
    end

    build_conn() |> get("/v1/coach/workbench/items") |> json_response(403)
  end

  test "owners and assigned coaches see only their authorized items and counts", %{
    business: business,
    coach: owner,
    conn: owner_conn
  } do
    first_coach = insert(:coach, business: business)
    second_coach = insert(:coach, business: business)
    other_business = insert(:business)
    other_coach = insert(:coach, business: other_business)

    for {business, creator, assigned} <- [
          {business, owner, first_coach},
          {business, owner, second_coach},
          {other_business, other_coach, other_coach}
        ] do
      person =
        insert(:client,
          business: business,
          creator: creator,
          assigned_coach: assigned,
          required_services: [:training, :nutrition],
          subscription_ends_on: Date.add(Date.utc_today(), 2)
        )

      insert(:conversation, business: business, client: person, waiting_since: DateTime.utc_now(:microsecond))
      template = insert(:form_template, business: business, purpose: :intake)

      assignment =
        insert(:form_assignment,
          business: business,
          client: person,
          form_template: template,
          purpose: :intake,
          status: :completed
        )

      insert(:form_submission, business: business, client: person, form_assignment: assignment)
    end

    first_conn = build_conn() |> authenticate_coach(first_coach)
    second_conn = build_conn() |> authenticate_coach(second_coach)
    assert page(owner_conn, %{})["count"] == 8
    assert page(first_conn, %{})["count"] == 4
    assert page(second_conn, %{})["count"] == 4
    assert page(first_conn, %{view: "follow-ups"})["count"] == 1
    first = page(first_conn, %{limit: 1})
    assert page(first_conn, %{cursor: first["next_cursor"]})["count"] == 4

    for conn <- [second_conn, owner_conn, build_conn() |> authenticate_coach(other_coach)] do
      conn |> get("/v1/coach/workbench/items", %{cursor: first["next_cursor"]}) |> json_response(422)
    end
  end

  test "reviews and replies retain inactive clients while planning excludes them", %{
    conn: conn,
    business: business,
    coach: coach
  } do
    person =
      insert(:client, business: business, creator: coach, status: :inactive, required_services: [:training, :nutrition])

    insert(:conversation, business: business, client: person, waiting_since: DateTime.utc_now(:microsecond))
    template = insert(:form_template, business: business, purpose: :check_in)

    assignment =
      insert(:form_assignment, business: business, client: person, form_template: template, purpose: :check_in)

    insert(:form_submission, business: business, client: person, form_assignment: assignment)
    assert %{"count" => 2, "data" => data} = page(conn, %{})
    assert MapSet.new(Enum.map(data, & &1["kind"])) == MapSet.new(["reply", "review"])
    assert Enum.all?(data, &(&1["client"]["status"] == "inactive"))
  end

  test "upcoming coverage follows waiting work and assigning one service retains the other", %{
    conn: conn,
    business: business,
    coach: coach
  } do
    today = Date.utc_today()

    client =
      insert(:client,
        business: business,
        creator: coach,
        timezone: "Etc/UTC",
        required_services: [:training, :nutrition]
      )

    training =
      insert(:training_plan,
        business: business,
        creator: coach,
        client: client,
        start_date: Date.add(today, -1),
        end_date: Date.add(today, 2)
      )

    insert(:conversation, business: business, client: client, waiting_since: DateTime.utc_now(:microsecond))
    assert %{"count" => 3, "data" => [nutrition, reply, upcoming]} = page(conn, %{})
    assert nutrition["target"]["service"] == "nutrition"
    assert reply["kind"] == "reply"
    assert upcoming["due_on"] == Date.to_iso8601(Date.add(today, 3))
    assert upcoming["waiting_since"] == nil
    Easy.Repo.update!(Ecto.Changeset.change(training, end_date: nil))
    assert %{"count" => 2, "data" => [nutrition, _reply]} = page(conn, %{})
    assert nutrition["target"]["service"] == "nutrition"
  end

  defp page(conn, query), do: conn |> get("/v1/coach/workbench/items", query) |> json_response(200)
end
