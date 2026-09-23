defmodule Easy.Training.ExecutionHistoryTest do
  # Query-capture assertions attach to the repository's global telemetry event.
  # Run this module synchronously so unrelated tests cannot pollute that mailbox.
  use Easy.DataCase, async: false

  alias Easy.Clients.Client
  alias Easy.Ctx
  alias Easy.Repo
  alias Easy.Training.{Execution, Library, PerformedSets, Programming}
  alias Easy.Training.TrainingSession

  setup do
    coach = insert(:coach)
    client = insert(:client, business: coach.business, creator: coach, assigned_coach: coach)
    ctx = %Ctx{business_id: coach.business_id, user_id: client.user_id, client_id: client.id}
    coach_ctx = %Ctx{business_id: coach.business_id, user_id: coach.user_id, coach_id: coach.id}

    %{client: client, coach: coach, coach_ctx: coach_ctx, ctx: ctx}
  end

  test "session reads and mutations conceal other clients, tenants and missing identities", ctx do
    assert {:ok, session} = Execution.start_client_session(ctx.ctx, nil, %{})
    before = Repo.get!(TrainingSession, session.id)
    client_before = Repo.get!(Client, ctx.client.id)
    other_client = insert(:client, business: ctx.coach.business, creator: ctx.coach, assigned_coach: ctx.coach)
    foreign = insert(:client)

    other_ctx = %{ctx.ctx | client_id: other_client.id, user_id: other_client.user_id}
    foreign_ctx = %Ctx{business_id: foreign.business_id, client_id: foreign.id, user_id: foreign.user_id}

    cases = [
      {other_ctx, session.id},
      {foreign_ctx, session.id},
      {%{ctx.ctx | business_id: foreign.business_id}, session.id},
      {%{ctx.ctx | client_id: nil}, session.id},
      {ctx.ctx, Ecto.UUID.generate()}
    ]

    for {actor, session_id} <- cases do
      assert {:error, :not_found} = Execution.get_client_session(actor, session_id)
      assert {:error, :not_found} = Execution.update_client_session(actor, session_id, %{notes: "Forbidden"})
      assert {:error, :not_found} = Execution.complete_client_session(actor, session_id, %{notes: "Forbidden"})
      assert {:error, :not_found} = Execution.discard_client_session(actor, session_id)
      assert Repo.get!(TrainingSession, session.id) == before
      assert Repo.get!(Client, ctx.client.id) == client_before
    end
  end

  describe "update_client_session/3" do
    test "updates notes and soreness only while the Training Session is active", ctx do
      assert {:ok, session} = Execution.start_client_session(ctx.ctx, nil, %{})

      assert {:ok, updated} =
               Execution.update_client_session(ctx.ctx, session.id, %{notes: "Heavy legs", soreness_rating: 4})

      assert updated.state == :active
      assert updated.notes == "Heavy legs"
      assert updated.soreness_rating == 4
      assert updated.closed_at == nil
    end

    test "completed metadata corrections require a revision", ctx do
      assert {:ok, session} = Execution.start_client_session(ctx.ctx, nil, %{})
      assert {:ok, completed} = Execution.complete_client_session(ctx.ctx, session.id, %{})

      assert {:error, %Ecto.Changeset{}} =
               Execution.update_client_session(ctx.ctx, completed.id, %{notes: "Rewrite history"})
    end
  end

  describe "complete_client_session/3" do
    test "closes an active Training Session and stamps client activity together", ctx do
      assert {:ok, session} = Execution.start_client_session(ctx.ctx, nil, %{})

      assert {:ok, completed} =
               Execution.complete_client_session(ctx.ctx, session.id, %{notes: "Great", soreness_rating: 3})

      assert completed.state == :completed
      assert completed.notes == "Great"
      assert completed.soreness_rating == 3
      assert %DateTime{} = completed.closed_at
      assert DateTime.compare(completed.closed_at, completed.started_at) in [:eq, :gt]
      assert Repo.reload(ctx.client).last_active_at == completed.closed_at
    end

    test "repeating complete is idempotent and does not stamp again", ctx do
      assert {:ok, session} = Execution.start_client_session(ctx.ctx, nil, %{})
      assert {:ok, first} = Execution.complete_client_session(ctx.ctx, session.id, %{notes: "First"})

      {result, queries} =
        capture_queries(fn ->
          Execution.complete_client_session(ctx.ctx, session.id, %{notes: "Retry"})
        end)

      assert {:ok, second} = result
      assert second.id == first.id
      assert second.state == :completed
      assert second.notes == "First"
      assert second.closed_at == first.closed_at
      assert Repo.reload(ctx.client).last_active_at == first.closed_at
      refute Enum.any?(queries, &String.contains?(&1, ~s(SET "last_active_at")))
    end
  end

  describe "discard_client_session/2" do
    test "closes an active Training Session without stamping activity", ctx do
      assert {:ok, session} = Execution.start_client_session(ctx.ctx, nil, %{})

      {result, queries} =
        capture_queries(fn ->
          Execution.discard_client_session(ctx.ctx, session.id)
        end)

      assert {:ok, discarded} = result
      assert discarded.state == :discarded
      assert %DateTime{} = discarded.closed_at
      assert is_nil(Repo.reload(ctx.client).last_active_at)
      refute Enum.any?(queries, &String.contains?(&1, ~s(SET "last_active_at")))
    end

    test "repeating discard is idempotent", ctx do
      assert {:ok, session} = Execution.start_client_session(ctx.ctx, nil, %{})
      assert {:ok, first} = Execution.discard_client_session(ctx.ctx, session.id)
      assert {:ok, second} = Execution.discard_client_session(ctx.ctx, session.id)

      assert second.id == first.id
      assert second.state == :discarded
      assert second.closed_at == first.closed_at
    end
  end

  describe "opposite terminal transitions" do
    test "completing a discarded Training Session returns conflict", ctx do
      assert {:ok, session} = Execution.start_client_session(ctx.ctx, nil, %{})
      assert {:ok, _} = Execution.discard_client_session(ctx.ctx, session.id)
      assert {:error, :conflict} = Execution.complete_client_session(ctx.ctx, session.id, %{})
    end

    test "discarding a completed Training Session returns conflict", ctx do
      assert {:ok, session} = Execution.start_client_session(ctx.ctx, nil, %{})
      assert {:ok, _} = Execution.complete_client_session(ctx.ctx, session.id, %{})
      assert {:error, :conflict} = Execution.discard_client_session(ctx.ctx, session.id)
    end
  end

  describe "revision protection" do
    test "completed facts require a current revision for correction", ctx do
      exercise = insert(:exercise, business: ctx.coach.business, name: "Back Squat")
      assert {:ok, session} = Execution.start_client_session(ctx.ctx, nil, %{})

      assert {:ok, set} =
               PerformedSets.create_client_performed_set(ctx.ctx, session.id, %{exercise_id: exercise.id, reps: "5"})

      assert {:ok, _} = Execution.complete_client_session(ctx.ctx, session.id, %{})

      assert {:error, %Ecto.Changeset{}} =
               PerformedSets.create_client_performed_set(ctx.ctx, session.id, %{exercise_id: exercise.id})

      assert {:error, %Ecto.Changeset{}} = PerformedSets.update_client_performed_set(ctx.ctx, set.id, %{reps: "8"})
      assert {:error, %Ecto.Changeset{}} = PerformedSets.delete_client_performed_set(ctx.ctx, set.id)
    end
  end

  describe "history" do
    test "client and authorized coach reads are paginated newest-first with a total order", ctx do
      for day <- 0..24 do
        insert(:workout_session,
          business: ctx.coach.business,
          client: ctx.client,
          state: :completed,
          date: Date.add(Date.utc_today(), -day),
          started_at: DateTime.add(DateTime.utc_now(:second), -day, :day)
        )
      end

      assert {:ok, %{count: 25, sessions: first}} = Execution.list_client_sessions(ctx.ctx, limit: 5)
      assert {:ok, %{sessions: second}} = Execution.list_client_sessions(ctx.ctx, offset: 5, limit: 5)
      assert length(first) == 5
      assert MapSet.disjoint?(MapSet.new(first, & &1.id), MapSet.new(second, & &1.id))
      assert Enum.map(first, & &1.started_at) == Enum.sort(Enum.map(first, & &1.started_at), {:desc, DateTime})

      assert {:ok, %{count: 25, sessions: coach_page}} =
               Execution.list_sessions_for_client(ctx.coach_ctx, ctx.client.id, limit: 5)

      assert Enum.map(coach_page, & &1.id) == Enum.map(first, & &1.id)
    end

    test "limit uses the repository maximum", ctx do
      now = DateTime.utc_now(:second)

      for day <- 0..100 do
        insert(:workout_session,
          business: ctx.coach.business,
          client: ctx.client,
          state: :completed,
          date: Date.add(Date.utc_today(), -day),
          started_at: DateTime.add(now, -day, :day)
        )
      end

      assert {:ok, %{count: 101, sessions: sessions}} = Execution.list_client_sessions(ctx.ctx, limit: 5000)
      assert length(sessions) == 100
    end

    test "inclusive from/to filters change the reported count", ctx do
      today = Date.utc_today()

      for day <- 0..24 do
        insert(:workout_session,
          business: ctx.coach.business,
          client: ctx.client,
          state: :completed,
          date: Date.add(today, -day),
          started_at: DateTime.add(DateTime.utc_now(:second), -day, :day)
        )
      end

      assert {:ok, %{count: 8, sessions: sessions}} =
               Execution.list_client_sessions(ctx.ctx, from: Date.add(today, -7), to: today)

      assert length(sessions) == 8
    end

    test "malformed and reversed date filters return validation errors", ctx do
      assert {:error, %Ecto.Changeset{} = malformed} = Execution.list_client_sessions(ctx.ctx, from: "not-a-date")
      assert "is invalid" in errors_on(malformed).from

      assert {:error, %Ecto.Changeset{} = reversed} =
               Execution.list_client_sessions(ctx.ctx, from: ~D[2026-08-10], to: ~D[2026-08-01])

      assert "must be on or after from" in errors_on(reversed).to
    end

    test "trainers cannot read another trainer's client history", ctx do
      other_trainer = insert(:coach, business: ctx.coach.business)
      other_client = insert(:client, business: ctx.coach.business, creator: other_trainer, assigned_coach: other_trainer)
      session = insert(:workout_session, business: ctx.coach.business, client: other_client, state: :completed)

      assert {:error, :not_found} = Execution.list_sessions_for_client(ctx.coach_ctx, other_client.id)
      assert {:error, :not_found} = Execution.get_session_for_client(ctx.coach_ctx, other_client.id, session.id)

      owner = owner_ctx(ctx.coach.business)
      assert {:ok, %{count: 1, sessions: [_]}} = Execution.list_sessions_for_client(owner, other_client.id)
      assert {:ok, %{id: id}} = Execution.get_session_for_client(owner, other_client.id, session.id)
      assert id == session.id
    end
  end

  describe "deletion survival" do
    test "history keeps snapshot content and frozen names after planning and exercise deletion", ctx do
      exercise = insert(:exercise, business: ctx.coach.business, name: "Back Squat")
      plan = insert_client_plan(ctx, name: "Strength Block", start_date: Date.utc_today())
      workout = insert(:workout, business: ctx.coach.business, plan: plan, name: "Lower", position: 0)

      prescribed =
        insert(:prescribed_exercise,
          business: ctx.coach.business,
          workout: workout,
          exercise: exercise,
          position: 0
        )

      assert {:ok, session} = Execution.start_client_session(ctx.ctx, workout.id, %{})

      assert {:ok, _set} =
               PerformedSets.create_client_performed_set(ctx.ctx, session.id, %{
                 exercise_id: exercise.id,
                 snapshot_exercise_ref: prescribed.id,
                 reps: "5"
               })

      snapshot = session.prescription_snapshot
      assert {:ok, _} = Execution.complete_client_session(ctx.ctx, session.id, %{})
      assert {:ok, _} = Programming.delete_plan(ctx.coach_ctx, plan.id, plan.revision)
      assert {:ok, _} = Library.delete_exercise(ctx.coach_ctx, exercise.id)

      assert {:ok, history} = Execution.get_client_session(ctx.ctx, session.id)
      assert history.state == :completed
      assert history.prescription_snapshot == snapshot
      assert [%{exercise_name: "Back Squat", exercise_id: nil, snapshot_exercise_ref: ref}] = history.performed_sets
      assert ref == prescribed.id

      assert {:ok, coach_history} = Execution.get_session_for_client(ctx.coach_ctx, ctx.client.id, session.id)
      assert coach_history.prescription_snapshot == snapshot
    end
  end

  defp insert_client_plan(ctx, attrs) do
    insert(
      :training_plan,
      Keyword.merge(
        [
          kind: :client_plan,
          business: ctx.coach.business,
          creator: ctx.coach.user,
          client: ctx.client
        ],
        attrs
      )
    )
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
