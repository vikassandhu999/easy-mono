defmodule Easy.Training.PerformedSetTest do
  use Easy.SchemaCase

  alias Easy.Sessions
  alias Easy.Training.PerformedSet

  describe "insert_changeset/3" do
    test "does not check session workout elements against the database" do
      %{business: business, session: session, exercise: exercise, element: element} =
        session_with_element_added_after_snapshot()

      changeset =
        PerformedSet.insert_changeset(session.id, business.id, %{
          "exercise_id" => exercise.id,
          "workout_element_id" => element.id,
          "position" => 0,
          "actual_reps" => "10"
        })

      assert changeset.valid?
    end
  end

  describe "create/3" do
    test "rejects workout elements added after the planned snapshot was captured" do
      %{business: business, session: session, exercise: exercise, element: element} =
        session_with_element_added_after_snapshot()

      assert {:error, changeset} =
               Sessions.create_performed_set(session.id, business.id, %{
                 "exercise_id" => exercise.id,
                 "workout_element_id" => element.id,
                 "position" => 0,
                 "actual_reps" => "10"
               })

      assert %{workout_element_id: ["must belong to the session workout"]} = errors_on(changeset)
    end
  end

  defp session_with_element_added_after_snapshot do
    business = insert(:business)
    coach = insert(:coach, business: business)
    client = insert(:client, creator: coach, business: business)
    plan = insert(:training_plan, author: coach, business: business)
    workout = insert(:workout, training_plan: plan, business: business)
    original_exercise = insert(:exercise, business: business)

    insert(:workout_element,
      workout: workout,
      exercise: original_exercise,
      business: business,
      position: 0
    )

    {:ok, session} =
      Sessions.create_workout_session(business.id, client.id, %{"workout_id" => workout.id})

    added_exercise = insert(:exercise, business: business)

    added_element =
      insert(:workout_element,
        workout: workout,
        exercise: added_exercise,
        business: business,
        position: 1
      )

    %{business: business, session: session, exercise: added_exercise, element: added_element}
  end
end
