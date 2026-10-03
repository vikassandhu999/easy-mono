defmodule Easy.Training.ExecutionPerformedSetTest do
  use Easy.DataCase, async: true

  alias Easy.Ctx
  alias Easy.Repo
  alias Easy.Training.{Execution, PerformedSets}
  alias Easy.Training.TrainingPerformedSet

  setup do
    coach = insert(:coach)
    client = insert(:client, business: coach.business, coach: coach)
    ctx = %Ctx{business_id: coach.business_id, user_id: client.user_id, client_id: client.id}
    exercise = insert(:exercise, business: coach.business, name: "Back Squat")

    assert {:ok, session} = Execution.start_client_session(ctx, nil, %{})

    %{client: client, coach: coach, ctx: ctx, exercise: exercise, session: session}
  end

  test "set mutations reject missing identities and foreign or mismatched tenants", ctx do
    assert {:ok, set} =
             PerformedSets.create_client_performed_set(ctx.ctx, ctx.session.id, %{exercise_id: ctx.exercise.id})

    before = Repo.get!(TrainingPerformedSet, set.id)
    foreign = insert(:client)
    foreign_ctx = %Ctx{business_id: foreign.business_id, user_id: foreign.user_id, client_id: foreign.id}

    for actor <- [foreign_ctx, %{ctx.ctx | business_id: foreign.business_id}, %{ctx.ctx | client_id: nil}] do
      assert {:error, :not_found} =
               PerformedSets.create_client_performed_set(actor, ctx.session.id, %{exercise_id: ctx.exercise.id})

      assert {:error, :not_found} = PerformedSets.update_client_performed_set(actor, set.id, %{reps: "99"})
      assert {:error, :not_found} = PerformedSets.delete_client_performed_set(actor, set.id)
      assert [^before] = Repo.all(TrainingPerformedSet.for_session(ctx.session.id))
    end

    missing_id = Ecto.UUID.generate()
    assert {:error, :not_found} = PerformedSets.create_client_performed_set(ctx.ctx, missing_id, %{})
    assert {:error, :not_found} = PerformedSets.update_client_performed_set(ctx.ctx, missing_id, %{reps: "99"})
    assert {:error, :not_found} = PerformedSets.delete_client_performed_set(ctx.ctx, missing_id)
    assert [^before] = Repo.all(TrainingPerformedSet.for_session(ctx.session.id))
  end

  describe "create_client_performed_set/3" do
    test "malformed exercise references return changeset errors without inserting sets", ctx do
      for exercise_id <- ["not-a-uuid", 123, %{}] do
        assert {:error, %Ecto.Changeset{} = changeset} =
                 PerformedSets.create_client_performed_set(ctx.ctx, ctx.session.id, %{
                   "exercise_id" => exercise_id,
                   "exercise_name" => "Carry"
                 })

        assert "is invalid" in errors_on(changeset).exercise_id
      end

      assert {:ok, session} = Execution.get_client_session(ctx.ctx, ctx.session.id)
      assert session.performed_sets == []
    end

    test "string-keyed exercise references use the stored name and ignore submitted identity", ctx do
      assert {:ok, set} =
               PerformedSets.create_client_performed_set(ctx.ctx, ctx.session.id, %{
                 "exercise_id" => ctx.exercise.id,
                 "exercise_name" => %{"untrusted" => "name"},
                 "position" => 99,
                 "business_id" => Ecto.UUID.generate(),
                 "training_session_id" => Ecto.UUID.generate(),
                 "reps" => "5"
               })

      assert set.exercise_name == ctx.exercise.name
      assert set.exercise.id == ctx.exercise.id
      assert set.position == 0
      assert set.business_id == ctx.ctx.business_id
      assert set.training_session_id == ctx.session.id
    end

    test "string-keyed hidden exercise references are rejected before insertion", ctx do
      hidden = insert(:exercise, business: insert(:business))

      assert {:error, :not_found} =
               PerformedSets.create_client_performed_set(ctx.ctx, ctx.session.id, %{
                 "exercise_id" => hidden.id,
                 "exercise_name" => "Untrusted name"
               })

      assert {:ok, session} = Execution.get_client_session(ctx.ctx, ctx.session.id)
      assert session.performed_sets == []
    end

    test "records a visible exercise with a frozen name and server-assigned position", ctx do
      assert {:ok, set} =
               PerformedSets.create_client_performed_set(ctx.ctx, ctx.session.id, %{
                 exercise_id: ctx.exercise.id,
                 exercise_name: "Untrusted name",
                 reps: "5"
               })

      assert set.position == 0
      assert set.exercise_id == ctx.exercise.id
      assert set.exercise_name == "Back Squat"
    end

    test "records explicitly named work without a library exercise", ctx do
      assert {:ok, set} =
               PerformedSets.create_client_performed_set(ctx.ctx, ctx.session.id, %{
                 exercise_name: "  Sandbag carry  ",
                 duration_seconds: 60
               })

      assert set.exercise_id == nil
      assert set.exercise_name == "Sandbag carry"
    end

    test "requires either a visible exercise or a nonblank explicit name", ctx do
      assert {:error, %Ecto.Changeset{} = changeset} =
               PerformedSets.create_client_performed_set(ctx.ctx, ctx.session.id, %{exercise_name: "   "})

      assert "can't be blank" in errors_on(changeset).exercise_name
    end

    test "rejects notes longer than 5000 characters", ctx do
      assert {:error, %Ecto.Changeset{} = changeset} =
               PerformedSets.create_client_performed_set(ctx.ctx, ctx.session.id, %{
                 exercise_name: "Carry",
                 notes: String.duplicate("x", 5001)
               })

      assert "should be at most 5000 character(s)" in errors_on(changeset).notes
    end

    test "retains a stable snapshot exercise reference for planned and substituted work", ctx do
      %{prescribed: prescribed, session: session} = start_planned_session(ctx)
      substitute = insert(:exercise, business: ctx.coach.business, name: "Front Squat")

      assert {:ok, set} =
               PerformedSets.create_client_performed_set(ctx.ctx, session.id, %{
                 exercise_id: substitute.id,
                 snapshot_exercise_ref: prescribed.id,
                 reps: "8"
               })

      assert set.exercise_name == "Front Squat"
      assert set.snapshot_exercise_ref == prescribed.id
    end

    test "rejects a snapshot reference outside the session snapshot", ctx do
      %{session: session} = start_planned_session(ctx)

      assert {:error, %Ecto.Changeset{} = changeset} =
               PerformedSets.create_client_performed_set(ctx.ctx, session.id, %{
                 exercise_id: ctx.exercise.id,
                 snapshot_exercise_ref: Ecto.UUID.generate()
               })

      assert "is not in the Training Session snapshot" in errors_on(changeset).snapshot_exercise_ref
    end

    test "rejects an exercise from another tenant", ctx do
      foreign_exercise = insert(:exercise, business: insert(:business))

      assert {:error, :not_found} =
               PerformedSets.create_client_performed_set(ctx.ctx, ctx.session.id, %{
                 exercise_id: foreign_exercise.id
               })
    end

    test "appends in server order and active-session reads preserve that order", ctx do
      assert {:ok, first} =
               PerformedSets.create_client_performed_set(ctx.ctx, ctx.session.id, %{
                 exercise_id: ctx.exercise.id,
                 position: 99,
                 reps: "5"
               })

      assert {:ok, second} =
               PerformedSets.create_client_performed_set(ctx.ctx, ctx.session.id, %{
                 exercise_name: "Carry",
                 position: 0,
                 duration_seconds: 30
               })

      assert [first.position, second.position] == [0, 1]
      assert {:ok, active} = Execution.get_client_active_session(ctx.ctx)
      assert Enum.map(active.performed_sets, & &1.id) == [first.id, second.id]
    end
  end

  describe "update_client_performed_set/3" do
    test "updates measurements without changing exercise identity or snapshot reference", ctx do
      %{prescribed: prescribed, session: session} = start_planned_session(ctx)

      assert {:ok, set} =
               PerformedSets.create_client_performed_set(ctx.ctx, session.id, %{
                 exercise_id: ctx.exercise.id,
                 snapshot_exercise_ref: prescribed.id,
                 reps: "5"
               })

      other_exercise = insert(:exercise, business: ctx.coach.business, name: "Front Squat")

      assert {:ok, updated} =
               PerformedSets.update_client_performed_set(ctx.ctx, set.id, %{
                 exercise_id: other_exercise.id,
                 exercise_name: "Changed",
                 snapshot_exercise_ref: Ecto.UUID.generate(),
                 position: 9,
                 reps: "8"
               })

      assert updated.reps == "8"
      assert updated.position == 0
      assert updated.exercise_id == ctx.exercise.id
      assert updated.exercise_name == "Back Squat"
      assert updated.snapshot_exercise_ref == prescribed.id
    end

    test "requires a revision to correct completed sets", ctx do
      assert {:ok, set} =
               PerformedSets.create_client_performed_set(ctx.ctx, ctx.session.id, %{exercise_id: ctx.exercise.id})

      close_session(ctx.session)

      assert {:error, %Ecto.Changeset{}} = PerformedSets.update_client_performed_set(ctx.ctx, set.id, %{reps: "8"})
    end

    test "rejects notes longer than 5000 characters", ctx do
      assert {:ok, set} =
               PerformedSets.create_client_performed_set(ctx.ctx, ctx.session.id, %{
                 exercise_id: ctx.exercise.id
               })

      assert {:error, %Ecto.Changeset{} = changeset} =
               PerformedSets.update_client_performed_set(ctx.ctx, set.id, %{
                 notes: String.duplicate("x", 5001)
               })

      assert "should be at most 5000 character(s)" in errors_on(changeset).notes
    end
  end

  describe "delete_client_performed_set/2" do
    test "deletes only sets in the client's active session", ctx do
      assert {:ok, set} =
               PerformedSets.create_client_performed_set(ctx.ctx, ctx.session.id, %{exercise_id: ctx.exercise.id})

      assert {:ok, deleted} = PerformedSets.delete_client_performed_set(ctx.ctx, set.id)
      assert deleted.id == set.id

      assert {:ok, terminal_set} =
               PerformedSets.create_client_performed_set(ctx.ctx, ctx.session.id, %{exercise_id: ctx.exercise.id})

      close_session(ctx.session)
      assert {:error, %Ecto.Changeset{}} = PerformedSets.delete_client_performed_set(ctx.ctx, terminal_set.id)
    end

    test "conceals another client's active-session set from update and delete", ctx do
      other_client =
        insert(:client,
          business: ctx.coach.business,
          coach: ctx.coach
        )

      other_ctx = %Ctx{
        business_id: ctx.coach.business_id,
        user_id: other_client.user_id,
        client_id: other_client.id
      }

      assert {:ok, other_session} = Execution.start_client_session(other_ctx, nil, %{})

      assert {:ok, other_set} =
               PerformedSets.create_client_performed_set(other_ctx, other_session.id, %{exercise_id: ctx.exercise.id})

      assert {:error, :not_found} = PerformedSets.update_client_performed_set(ctx.ctx, other_set.id, %{reps: "8"})
      assert {:error, :not_found} = PerformedSets.delete_client_performed_set(ctx.ctx, other_set.id)
    end
  end

  defp start_planned_session(ctx) do
    Repo.delete!(ctx.session)

    plan =
      insert(:training_plan,
        kind: :client_plan,
        business: ctx.coach.business,
        creator: ctx.coach.user,
        client: ctx.client,
        start_date: Date.utc_today()
      )

    workout = insert(:workout, business: ctx.coach.business, plan: plan, position: 0)

    prescribed =
      insert(:prescribed_exercise,
        business: ctx.coach.business,
        workout: workout,
        exercise: ctx.exercise,
        position: 0
      )

    assert {:ok, session} = Execution.start_client_session(ctx.ctx, workout.id, %{})
    %{prescribed: prescribed, session: session}
  end

  defp close_session(session) do
    session
    |> Ecto.Changeset.change(state: :completed, closed_at: DateTime.utc_now(:second))
    |> Repo.update!()
  end
end
