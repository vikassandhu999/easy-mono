defmodule Easy.Training.ExerciseDeleteTest do
  use Easy.SchemaCase, async: false

  alias Easy.Ctx
  alias Easy.Repo
  alias Easy.Training.Library
  alias Easy.Training.{PerformedSets, PrescribedExercise, TrainingExercise}
  alias Easy.Training.TrainingPerformedSet

  # Deleting an exercise used to succeed and leave prescribed exercises pointing at
  # nothing: the row kept its planned sets, so a client was prescribed sets of
  # a nameless movement. Blocked as a conflict now.

  describe "delete_exercise/2" do
    test "is blocked while a prescribed exercise still uses the exercise" do
      s = scenario()
      exercise = insert(:exercise, business: s.business, creator: s.coach)
      insert(:prescribed_exercise, workout: s.workout, business: s.business, exercise: exercise)

      assert {:error, :in_use} = Library.delete_exercise(s.ctx, exercise.id)
      assert Repo.get(TrainingExercise, exercise.id)
    end

    test "succeeds when only a logged set references the exercise, and the set survives" do
      s = scenario()
      exercise = insert(:exercise, business: s.business, creator: s.coach)
      session = insert(:workout_session, business: s.business, client: s.client)

      assert {:ok, set} =
               PerformedSets.create_client_performed_set(s.client_ctx, session.id, %{
                 exercise_id: exercise.id,
                 exercise_name: "Back Squat",
                 set_type: :working,
                 reps: "5"
               })

      assert {:ok, _} = Library.delete_exercise(s.ctx, exercise.id)

      # History is denormalised: the name outlives the exercise row.
      kept = Repo.get!(TrainingPerformedSet, set.id)
      assert kept.exercise_id == nil
      assert kept.exercise_name == exercise.name
    end

    test "succeeds when nothing references the exercise" do
      s = scenario()
      exercise = insert(:exercise, business: s.business, creator: s.coach)

      assert {:ok, _} = Library.delete_exercise(s.ctx, exercise.id)
    end
  end

  describe "PrescribedExercise.update_changeset/2" do
    test "rejects clearing the exercise" do
      s = scenario()
      exercise = insert(:exercise, business: s.business, creator: s.coach)
      prescribed = insert(:prescribed_exercise, workout: s.workout, business: s.business, exercise: exercise)

      changeset = PrescribedExercise.update_changeset(prescribed, %{exercise_id: nil})
      refute changeset.valid?
      assert "can't be blank" in errors_on(changeset).exercise_id
      assert Repo.reload!(prescribed).exercise_id == exercise.id
    end
  end

  defp scenario do
    business = insert(:business, owner: build(:user, email: unique_email()))
    coach = insert(:coach, business: business, user: build(:user, email: unique_email()))
    client = insert(:client, business: business, creator: coach, assigned_coach: coach)
    plan = insert(:training_plan, business: business, creator: coach.user)
    workout = insert(:workout, plan: plan, business: business)

    %{
      business: business,
      coach: coach,
      client: client,
      workout: workout,
      ctx: Ctx.new(business.id, coach.user_id, coach.id, true),
      client_ctx: %Ctx{business_id: business.id, user_id: client.user_id, client_id: client.id}
    }
  end

  defp unique_email, do: "user-#{System.unique_integer([:positive])}@test.com"
end
