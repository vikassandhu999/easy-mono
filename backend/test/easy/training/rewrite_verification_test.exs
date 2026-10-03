defmodule Easy.Training.RewriteVerificationTest do
  use Easy.DataCase, async: true

  alias Easy.Training.{Execution, Library, PerformedSets, PlanReader, Programming}

  test "Programming and Execution carry one Training design from Template to correctable history with frozen prescription" do
    coach = insert(:coach)
    client = insert(:client, business: coach.business, coach: coach)
    squat = insert(:exercise, business: coach.business, name: "Back Squat")
    coach_ctx = trainer_ctx(coach)
    client_ctx = %Easy.Ctx{business_id: client.business_id, user_id: client.user_id, client_id: client.id}
    today = Date.utc_today()

    assert {:ok, template} = Programming.create_template(coach_ctx, %{name: "Strength Base"})

    assert {:ok, programmed} =
             Programming.replace_prescription(coach_ctx, template.id, template.revision, %{
               workouts: [
                 %{
                   local_ref: "lower",
                   name: "Lower",
                   position: 0,
                   prescribed_exercises: [
                     %{
                       local_ref: "squat",
                       exercise_id: squat.id,
                       position: 0,
                       prescribed_sets: [%{set_type: "working", reps: "5"}]
                     }
                   ]
                 }
               ],
               schedule:
                 Enum.map(
                   [:monday, :tuesday, :wednesday, :thursday, :friday, :saturday, :sunday],
                   &%{weekday: &1, workout_ref: "lower"}
                 )
             })

    assert {:ok, duplicate} = Programming.duplicate_template(coach_ctx, programmed.id)
    assert duplicate.id != programmed.id

    assert {:ok, assigned} =
             Programming.assign_template_to_client(coach_ctx, client.id, programmed.id, %{
               start_date: today
             })

    assert assigned.kind == :client_plan
    assert [workout] = assigned.workouts

    assert {:ok, dated} =
             Programming.update_plan(coach_ctx, assigned.id, assigned.revision, %{end_date: Date.add(today, 30)})

    assert dated.end_date == Date.add(today, 30)

    assert {:ok, %{plan: coverage_plan, workout: scheduled}} = PlanReader.resolve_client_coverage(client_ctx, today)
    assert coverage_plan.id == dated.id
    assert scheduled.id == workout.id

    assert {:ok, planned} = Execution.start_client_session(client_ctx, workout.id, %{})
    assert planned.kind == :planned
    assert planned.prescription_snapshot["workout"]["name"] == "Lower"
    snapshot = planned.prescription_snapshot

    assert {:ok, _set} =
             PerformedSets.create_client_performed_set(client_ctx, planned.id, %{
               exercise_id: squat.id,
               snapshot_exercise_ref: hd(workout.prescribed_exercises).id,
               reps: "5"
             })

    assert {:ok, completed} = Execution.complete_client_session(client_ctx, planned.id, %{notes: "Done"})
    assert completed.state == :completed

    assert {:ok, freestyle} = Execution.start_client_session(client_ctx, nil, %{})
    assert {:ok, discarded} = Execution.discard_client_session(client_ctx, freestyle.id)
    assert discarded.state == :discarded

    assert {:ok, _} = Programming.delete_plan(coach_ctx, dated.id, dated.revision)
    assert {:ok, _} = Programming.delete_plan(coach_ctx, programmed.id, programmed.revision)
    assert {:ok, _} = Programming.delete_plan(coach_ctx, duplicate.id, duplicate.revision)
    assert {:ok, _} = Library.delete_exercise(coach_ctx, squat.id)

    assert {:ok, history} = Execution.get_client_session(client_ctx, completed.id)
    assert history.prescription_snapshot == snapshot
    assert [%{exercise_name: "Back Squat", exercise_id: nil}] = history.performed_sets

    assert {:error, %Ecto.Changeset{action: :stale_revision}} =
             Execution.update_client_session(client_ctx, history.id, %{expected_revision: history.revision - 1, notes: "rewrite"})

    assert {:ok, corrected} =
             Execution.update_client_session(client_ctx, history.id, %{expected_revision: history.revision, soreness_rating: 2})

    assert corrected.prescription_snapshot == snapshot
    assert corrected.closed_at == history.closed_at
    assert corrected.soreness_rating == 2
  end
end
