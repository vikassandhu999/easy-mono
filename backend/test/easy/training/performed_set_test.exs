defmodule Easy.Training.TrainingPerformedSetTest do
  use Easy.SchemaCase

  alias Easy.{Ctx, Sessions}
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
  end

  defp session_with_element do
    business = insert(:business)
    coach = insert(:coach, business: business)
    client = insert(:client, user: insert(:user), creator: coach, business: business)
    plan = insert(:training_plan, creator: coach, business: business, client_id: client.id)
    workout = insert(:workout, plan: plan, creator: coach, business: business)
    exercise = insert(:exercise, business: business)

    insert(:workout_element,
      workout: workout,
      exercise: exercise,
      business: business,
      position: 0
    )

    session = insert(:workout_session, client: client, business: business, state: :active)
    ctx = %Ctx{user_id: client.user_id, business_id: client.business_id}

    %{business: business, ctx: ctx, session: session, exercise: exercise}
  end
end
