defmodule Easy.WorkoutLogsConcurrencyTest do
  use ExUnit.Case, async: false

  import Ecto.Query
  import Easy.Factory

  alias Easy.Clients.Client
  alias Easy.CoachingTerms.CoachingTerm
  alias Easy.Ctx
  alias Easy.Identity.User
  alias Easy.Orgs.{Business, Coach}
  alias Easy.Repo
  alias Easy.WorkoutLogs
  alias Easy.Workouts

  alias Easy.Workouts.{
    Exercise,
    ExerciseLog,
    ExerciseSet,
    Workout,
    WorkoutExerciseReference,
    WorkoutLog,
    WorkoutSchedule
  }

  alias Ecto.Adapters.SQL.Sandbox

  setup do
    :ok = Sandbox.checkout(Repo, sandbox: false)
    business = insert(:business)
    on_exit(fn -> cleanup_business(business) end)

    coach = insert(:coach, business: business, user: business.owner)
    client = insert(:client, business: business, coach: coach, timezone: "Etc/UTC")
    exercise = insert(:exercise, business: business)
    coach_ctx = %Ctx{business_id: business.id, user_id: coach.user_id, coach_id: coach.id, owner?: true}
    client_ctx = %Ctx{business_id: business.id, user_id: client.user_id, client_id: client.id}

    {:ok, %{data: workout}} =
      Workouts.create_workout_for_client(coach_ctx, client.id, workout_attrs(exercise.id, "Original workout", 8))

    %{
      business: business,
      client: client,
      exercise: exercise,
      coach_ctx: coach_ctx,
      client_ctx: client_ctx,
      workout: workout
    }
  end

  test "coach and client recording the same prescribed slot store exactly one set", f do
    log_id = Ecto.UUID.generate()
    activity_id = Ecto.UUID.generate()
    entry_id = hd(hd(f.workout.groups).exercises).id
    client_set_id = Ecto.UUID.generate()
    coach_set_id = Ecto.UUID.generate()

    assert {:ok, log} = WorkoutLogs.start_client_workout_log(f.client_ctx, %{id: log_id, workout_id: f.workout.id})

    assert {:ok, started} =
             WorkoutLogs.start_client_activity(f.client_ctx, log.id, %{
               id: activity_id,
               exercise_id: f.exercise.id,
               workout_exercise_id: entry_id
             })

    assert [%{id: ^activity_id, side_mode: :combined}] = started.exercise_logs

    results =
      race([
        fn ->
          WorkoutLogs.record_client_set(f.client_ctx, log.id, activity_id, %{
            id: client_set_id,
            state: "completed",
            round: 1,
            reps: 8
          })
        end,
        fn ->
          WorkoutLogs.record_set_for_client(f.coach_ctx, f.client.id, log.id, activity_id, %{
            id: coach_set_id,
            state: "completed",
            round: 1,
            reps: 6
          })
        end
      ])

    assert Enum.count(results, &match?({:ok, %WorkoutLog{}}, &1)) == 1
    assert Enum.count(results, &match?({:error, _}, &1)) == 1

    assert [saved] =
             Repo.all(from set in ExerciseSet, where: set.business_id == ^f.business.id and set.workout_log_id == ^log.id)

    assert {saved.id, saved.reps} in [{client_set_id, 8}, {coach_set_id, 6}]
    assert {saved.exercise_log_id, saved.workout_exercise_id, saved.exercise_id} == {activity_id, entry_id, f.exercise.id}
    assert {saved.state, saved.round, saved.side} == {:completed, 1, nil}
  end

  test "a coach edit racing a client start never changes content the log references", f do
    today = Date.utc_today()

    {:ok, %{data: schedule}} =
      Workouts.add_schedule_for_client(f.coach_ctx, f.client.id, %{
        workout_id: f.workout.id,
        weekdays_mask: 127,
        from_date: today
      })

    log_id = Ecto.UUID.generate()

    [edit_result, start_result] =
      race([
        fn ->
          Workouts.update_workout_for_client(
            f.coach_ctx,
            f.client.id,
            f.workout.id,
            workout_attrs(f.exercise.id, "Updated workout", 12)
          )
        end,
        fn ->
          WorkoutLogs.start_client_workout_log(f.client_ctx, %{
            id: log_id,
            schedule_id: schedule.id,
            scheduled_date: today
          })
        end
      ])

    assert {:ok, %{data: edited}} = edit_result
    assert {:ok, started} = start_result
    assert edited.name == "Updated workout"
    assert hd(hd(hd(edited.groups).exercises).targets).reps.value == 12
    assert started.id == log_id
    assert {started.schedule_id, started.scheduled_date} == {schedule.id, today}
    assert started.workout_id == started.workout.id

    saved_log = Repo.get!(WorkoutLog, log_id)
    referenced = Repo.get!(Workout, saved_log.workout_id)
    assert saved_log.workout_id == started.workout_id
    assert content(referenced) == content(started.workout)
  end

  defp workout_attrs(exercise_id, name, reps) do
    %{
      name: name,
      groups: [
        %{
          rounds: 3,
          exercises: [
            %{exercise_id: exercise_id, side_mode: "combined", targets: [%{reps: %{mode: "exact", value: reps}}]}
          ]
        }
      ]
    }
  end

  defp content(workout) do
    %{
      name: workout.name,
      description: workout.description,
      type: workout.type,
      video_id: workout.video_id,
      groups: Enum.map(workout.groups, &Ecto.embedded_dump(&1, :json))
    }
  end

  defp race(operations) do
    parent = self()
    barrier = make_ref()

    tasks =
      Enum.map(operations, fn operation ->
        Task.async(fn ->
          :ok = Sandbox.checkout(Repo, sandbox: false)
          send(parent, {barrier, :ready, self()})

          try do
            receive do
              {^barrier, :go} -> operation.()
            after
              5_000 -> raise "concurrent operation did not receive its start message"
            end
          after
            Sandbox.checkin(Repo)
          end
        end)
      end)

    try do
      Enum.each(tasks, fn %{pid: pid} -> assert_receive {^barrier, :ready, ^pid}, 5_000 end)
      Enum.each(tasks, &send(&1.pid, {barrier, :go}))
      Enum.map(tasks, &Task.await(&1, 15_000))
    after
      Enum.each(tasks, &Task.shutdown(&1, :brutal_kill))
    end
  end

  defp cleanup_business(business) do
    :ok = Sandbox.checkout(Repo, sandbox: false)
    client_users = Repo.all(from client in Client, where: client.business_id == ^business.id, select: client.user_id)
    coach_users = Repo.all(from coach in Coach, where: coach.business_id == ^business.id, select: coach.user_id)
    user_ids = Enum.uniq([business.owner_user_id | client_users ++ coach_users])

    Repo.transaction(fn ->
      schemas = [ExerciseSet, ExerciseLog, WorkoutLog, WorkoutSchedule, WorkoutExerciseReference, Workout, Exercise]

      for schema <- schemas do
        Repo.delete_all(from row in schema, where: row.business_id == ^business.id)
      end

      Repo.delete_all(from term in CoachingTerm, join: client in Client, on: client.id == term.client_id, where: client.business_id == ^business.id)
      Repo.delete_all(from client in Client, where: client.business_id == ^business.id)
      Repo.delete_all(from coach in Coach, where: coach.business_id == ^business.id)
      Repo.delete_all(from row in Business, where: row.id == ^business.id)
      Repo.delete_all(from user in User, where: user.id in ^user_ids)
    end)
  end
end
