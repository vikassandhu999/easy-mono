defmodule EasyWeb.Clients.TrainingCalendarControllerTest do
  use Easy.ConnCase

  alias Easy.Clients.Client
  alias Easy.Training.WorkoutSchedule

  setup do
    now = DateTime.utc_now()
    timezone = if now.hour < 12, do: "Etc/GMT+12", else: "Pacific/Kiritimati"
    coach = insert(:coach)
    client = insert(:client, business: coach.business, coach: coach, timezone: timezone)
    date = Client.local_date(client, now)
    refute date == DateTime.to_date(now)
    %{conn: authenticate_client(build_conn(), client), client: client, coach: coach, date: date}
  end

  test "profile, default coverage and planned start agree on the client's local day", ctx do
    plan =
      insert(:training_plan,
        kind: :client_plan,
        business: ctx.coach.business,
        creator: ctx.coach.user,
        client: ctx.client,
        start_date: ctx.date,
        end_date: ctx.date
      )

    workout = insert(:workout, business: ctx.coach.business, plan: plan)
    weekday = Enum.at(WorkoutSchedule.weekdays(), Date.day_of_week(ctx.date) - 1)
    insert(:workout_schedule, business: ctx.coach.business, plan: plan, workout: workout, weekday: weekday)
    date_string = Date.to_iso8601(ctx.date)
    profile = ctx.conn |> get("/v1/client/me") |> json_response(200)
    assert profile["data"]["timezone"] == ctx.client.timezone
    assert profile["data"]["local_date"] == date_string

    coverage = ctx.conn |> get("/v1/client/training-plans/coverage") |> json_response(200)
    assert coverage["data"]["date"] == date_string
    assert coverage["data"]["workout"]["id"] == workout.id
    assert coverage["data"]["plan"]["lifecycle"] == "current"

    explicit_utc =
      ctx.conn
      |> get("/v1/client/training-plans/coverage", %{date: Date.utc_today()})
      |> json_response(200)

    assert explicit_utc["data"] == nil

    session =
      ctx.conn
      |> put_req_header("content-type", "application/json")
      |> post("/v1/client/training-sessions", Jason.encode!(%{training_workout_id: workout.id}))
      |> json_response(201)

    assert session["data"]["date"] == date_string
    assert session["data"]["source_plan_id"] == plan.id
    assert session["data"]["source_workout_id"] == workout.id
  end

  test "freestyle also stores the local day", ctx do
    response =
      ctx.conn
      |> put_req_header("content-type", "application/json")
      |> post("/v1/client/training-sessions", "{}")
      |> json_response(201)

    assert response["data"]["date"] == Date.to_iso8601(ctx.date)
    assert response["data"]["kind"] == "freestyle"
  end
end
