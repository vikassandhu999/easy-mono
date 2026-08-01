defmodule Easy.Training.TrainingPerformedSetTest do
  use Easy.SchemaCase

  alias Easy.{Ctx, Sessions}
  alias Easy.Training.{TrainingPerformedSet, TrainingSession}

  describe "insert_changeset/3" do
    test "is valid with the required set fields" do
      business = insert(:business)

      changeset =
        TrainingPerformedSet.insert_changeset(business.id, Ecto.UUID.generate(), %{
          "exercise_name" => "Bench Press",
          "set_type" => "working",
          "position" => 0,
          "reps" => "10"
        })

      assert changeset.valid?
    end

    test "requires set_type and position" do
      business = insert(:business)

      changeset =
        TrainingPerformedSet.insert_changeset(business.id, Ecto.UUID.generate(), %{
          "set_type" => nil,
          "position" => nil
        })

      errors = errors_on(changeset)
      assert "can't be blank" in errors.set_type
      assert "can't be blank" in errors.position
    end
  end

  describe "create_client_performed_set/3" do
    test "records a performed set for an exercise in the session" do
      %{ctx: ctx, session: session, exercise: exercise} = session_with_element()

      assert {:ok, set} =
               Sessions.create_client_performed_set(ctx, session.id, %{
                 exercise_id: exercise.id,
                 set_type: "working",
                 position: 0,
                 reps: "10"
               })

      assert set.reps == "10"
      assert set.exercise_name == exercise.name
    end

    test "rejects an exercise that is neither owned nor system" do
      %{ctx: ctx, session: session} = session_with_element()
      foreign_exercise = insert(:exercise, business: insert(:business))

      assert {:error, :not_found} =
               Sessions.create_client_performed_set(ctx, session.id, %{
                 exercise_id: foreign_exercise.id,
                 set_type: "working",
                 position: 0,
                 reps: "10"
               })
    end

    test "appends after the session's last set when no position is given" do
      %{ctx: ctx, session: session, exercise: exercise} = session_with_element()

      assert {:ok, %{position: 0}} = log(ctx, session, exercise, %{})
      assert {:ok, %{position: 1}} = log(ctx, session, exercise, %{})
      assert {:ok, %{position: 7}} = log(ctx, session, exercise, %{position: 7})
      assert {:ok, %{position: 8}} = log(ctx, session, exercise, %{})
    end

    test "an explicit position is kept, duplicates included" do
      %{ctx: ctx, session: session, exercise: exercise} = session_with_element()

      assert {:ok, %{position: 3}} = log(ctx, session, exercise, %{position: 3})
      assert {:ok, %{position: 3}} = log(ctx, session, exercise, %{position: 3})

      assert {:ok, %{count: 1, sessions: [reloaded]}} = Sessions.list_client_sessions(ctx)
      assert Enum.map(reloaded.performed_sets, & &1.position) == [3, 3]
    end

    test "uses four data statements and does not resolve client identity again" do
      %{ctx: ctx, session: session, exercise: exercise} = session_with_element()

      {result, queries} = capture_queries(fn -> log(ctx, session, exercise, %{}) end)
      data_queries = Enum.reject(queries, &(&1 in ["begin", "commit"]))

      assert {:ok, %{position: 0}} = result
      assert length(data_queries) == 4
      assert Enum.count(data_queries, &String.contains?(&1, ~s(FROM "training_sessions"))) == 1
      assert Enum.count(data_queries, &String.contains?(&1, ~s(FROM "training_exercises"))) == 1
      assert Enum.count(data_queries, &String.contains?(&1, ~s(FROM "training_performed_sets"))) == 1
      assert Enum.count(data_queries, &String.starts_with?(&1, ~s(INSERT INTO "training_performed_sets"))) == 1
      refute Enum.any?(data_queries, &String.contains?(&1, ~s(FROM "clients")))
    end

    test "planned_exercise_index round-trips and defaults to nil" do
      %{ctx: ctx, session: session, exercise: exercise} = session_with_element()

      assert {:ok, %{planned_exercise_index: 2}} = log(ctx, session, exercise, %{planned_exercise_index: 2})
      assert {:ok, %{planned_exercise_index: nil} = added} = log(ctx, session, exercise, %{})

      assert {:ok, %{planned_exercise_index: 0}} =
               Sessions.update_client_performed_set(ctx, added.id, %{planned_exercise_index: 0})
    end

    test "rejects a negative planned_exercise_index" do
      %{ctx: ctx, session: session, exercise: exercise} = session_with_element()

      assert {:error, %Ecto.Changeset{} = changeset} = log(ctx, session, exercise, %{planned_exercise_index: -1})
      assert "must be greater than or equal to 0" in errors_on(changeset).planned_exercise_index
    end

    test "swapped_from_exercise_id is nilified when that exercise is deleted" do
      %{ctx: ctx, session: session, exercise: exercise} = session_with_element()
      swapped_from = insert(:exercise, business: exercise.business)

      assert {:ok, set} = log(ctx, session, exercise, %{swapped_from_exercise_id: swapped_from.id})
      assert set.swapped_from_exercise_id == swapped_from.id

      Repo.delete!(swapped_from)

      assert Repo.get!(TrainingPerformedSet, set.id).swapped_from_exercise_id == nil
    end

    test "rejects a swapped_from_exercise_id that does not exist" do
      %{ctx: ctx, session: session, exercise: exercise} = session_with_element()

      assert {:error, %Ecto.Changeset{} = changeset} =
               log(ctx, session, exercise, %{swapped_from_exercise_id: Ecto.UUID.generate()})

      assert errors_on(changeset).swapped_from_exercise_id != []
    end

    test "returns :not_found for another client's session" do
      %{ctx: ctx, exercise: exercise} = session_with_element()
      %{session: other_session} = session_with_element()

      assert {:error, :not_found} =
               Sessions.create_client_performed_set(ctx, other_session.id, %{
                 exercise_id: exercise.id,
                 set_type: "working",
                 reps: "10"
               })
    end
  end

  describe "database constraints" do
    test "rpe outside 1..10 is rejected by Postgres" do
      %{ctx: ctx, session: session, exercise: exercise} = session_with_element()
      {:ok, set} = log(ctx, session, exercise, %{})

      assert_raise Postgrex.Error, ~r/training_performed_sets_rpe_check/, fn ->
        Repo.update_all(from(s in TrainingPerformedSet, where: s.id == ^set.id), set: [rpe: Decimal.new(11)])
      end
    end

    test "soreness_rating outside 1..5 is rejected by Postgres" do
      %{session: session} = session_with_element()

      assert_raise Postgrex.Error, ~r/training_sessions_soreness_rating_check/, fn ->
        Repo.update_all(from(s in TrainingSession, where: s.id == ^session.id), set: [soreness_rating: 6])
      end
    end

    test "date and started_at cannot be null" do
      %{session: session} = session_with_element()
      query = from(s in TrainingSession, where: s.id == ^session.id)

      assert_raise Postgrex.Error, ~r/date/, fn -> Repo.update_all(query, set: [date: nil]) end
      assert_raise Postgrex.Error, ~r/started_at/, fn -> Repo.update_all(query, set: [started_at: nil]) end
    end
  end

  defp log(ctx, session, exercise, attrs) do
    Sessions.create_client_performed_set(
      ctx,
      session.id,
      Map.merge(%{exercise_id: exercise.id, set_type: "working", reps: "10"}, attrs)
    )
  end

  defp session_with_element do
    business = insert(:business)
    coach = insert(:coach, business: business)
    client = insert(:client, user: insert(:user), creator: coach, business: business)
    plan = insert(:training_plan, creator: coach, business: business, client_id: client.id)
    workout = insert(:workout, plan: plan, business: business)
    exercise = insert(:exercise, business: business)

    insert(:workout_element,
      workout: workout,
      exercise: exercise,
      business: business,
      position: 0
    )

    session = insert(:workout_session, client: client, business: business, state: :active)
    ctx = %Ctx{user_id: client.user_id, business_id: client.business_id, client_id: client.id}

    %{business: business, ctx: ctx, session: session, exercise: exercise}
  end

  defp capture_queries(fun) do
    parent = self()
    handler_id = {__MODULE__, make_ref()}

    :telemetry.attach(
      handler_id,
      [:easy, :repo, :query],
      fn _event, _measurements, metadata, _config -> send(parent, {:query, metadata.query}) end,
      nil
    )

    try do
      {fun.(), received_queries()}
    after
      :telemetry.detach(handler_id)
    end
  end

  defp received_queries(queries \\ []) do
    receive do
      {:query, query} -> received_queries([query | queries])
    after
      0 -> Enum.reverse(queries)
    end
  end
end
