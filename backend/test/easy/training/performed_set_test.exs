defmodule Easy.Training.TrainingPerformedSetTest do
  use Easy.SchemaCase

  alias Easy.Sessions
  alias Easy.Training.TrainingPerformedSet

  describe "insert_changeset/3" do
    test "is valid with the required set fields" do
      business = insert(:business)

      changeset =
        TrainingPerformedSet.insert_changeset(Ecto.UUID.generate(), business.id, %{
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
        TrainingPerformedSet.insert_changeset(Ecto.UUID.generate(), business.id, %{
          "set_type" => nil,
          "position" => nil
        })

      errors = errors_on(changeset)
      assert "can't be blank" in errors.set_type
      assert "can't be blank" in errors.position
    end
  end

  describe "create_performed_set/3" do
    test "records a performed set for an exercise in the session" do
      %{business: business, session: session, exercise: exercise} = session_with_element()

      assert {:ok, set} =
               Sessions.create_performed_set(session.id, business.id, %{
                 "exercise_id" => exercise.id,
                 "set_type" => "working",
                 "position" => 0,
                 "reps" => "10"
               })

      assert set.reps == "10"
      assert set.exercise_name == exercise.name
    end

    test "rejects an exercise that is neither owned nor system" do
      %{business: business, session: session} = session_with_element()
      foreign_exercise = insert(:exercise, business: insert(:business))

      assert {:error, :not_found} =
               Sessions.create_performed_set(session.id, business.id, %{
                 "exercise_id" => foreign_exercise.id,
                 "set_type" => "working",
                 "position" => 0,
                 "reps" => "10"
               })
    end
  end

  defp session_with_element do
    business = insert(:business)
    coach = insert(:coach, business: business)
    client = insert(:client, user: insert(:user), creator: coach, business: business)
    plan = insert(:training_plan, creator: coach, business: business)
    workout = insert(:workout, plan: plan, creator: coach, business: business)
    exercise = insert(:exercise, business: business)

    insert(:workout_element,
      workout: workout,
      exercise: exercise,
      business: business,
      position: 0
    )

    {:ok, session} =
      Sessions.create_workout_session(business.id, client.id, %{"training_workout_id" => workout.id})

    %{business: business, session: session, exercise: exercise}
  end
end
