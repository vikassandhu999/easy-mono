defmodule Easy.Training.TrackingTest do
  use Easy.DataCase, async: true

  alias Easy.Training.Tracking
  alias Easy.Training.Tracking.PerformedSet
  alias Easy.Training.Library

  describe "workout_sessions" do
    setup do
      {:ok, business, _coach, client} = create_test_setup()
      %{business: business, client: client}
    end

    test "start_session/3 creates a new active session", %{business: business, client: client} do
      assert {:ok, session} = Tracking.start_session(business.id, client.id)

      assert session.state == :active
      assert session.business_id == business.id
      assert session.client_id == client.id
      assert session.started_at
    end

    test "list_sessions/2 filters by business_id", %{business: business, client: client} do
      {:ok, session} = Tracking.start_session(business.id, client.id)
      {:ok, other_business, _, other_client} = create_test_setup()
      {:ok, _other_session} = Tracking.start_session(other_business.id, other_client.id)

      {:ok, sessions} = Tracking.list_sessions(business.id)
      assert length(sessions) == 1
      assert hd(sessions).id == session.id
    end

    test "list_sessions/2 filters by client_id", %{business: business, client: client} do
      {:ok, session} = Tracking.start_session(business.id, client.id)
      {:ok, other_client} = create_test_client(business.id)
      {:ok, _other_session} = Tracking.start_session(business.id, other_client.id)

      {:ok, sessions} = Tracking.list_sessions(business.id, client_id: client.id)
      assert length(sessions) == 1
      assert hd(sessions).id == session.id
    end

    test "fetch_session/2 returns session for correct business", %{
      business: business,
      client: client
    } do
      {:ok, session} = Tracking.start_session(business.id, client.id)

      assert {:ok, found} = Tracking.fetch_session(business.id, session.id)
      assert found.id == session.id
    end

    test "fetch_session/2 returns error for wrong business", %{business: business, client: client} do
      {:ok, session} = Tracking.start_session(business.id, client.id)
      {:ok, other_business, _, _} = create_test_setup()

      assert {:error, :not_found} = Tracking.fetch_session(other_business.id, session.id)
    end

    test "complete_session/2 transitions state and sets ended_at", %{
      business: business,
      client: client
    } do
      {:ok, session} = Tracking.start_session(business.id, client.id)

      assert {:ok, completed} = Tracking.complete_session(session, %{soreness_rating: 3})
      assert completed.state == :completed
      assert completed.ended_at
      assert completed.soreness_rating == 3
    end

    test "discard_session/1 transitions state to discarded", %{business: business, client: client} do
      {:ok, session} = Tracking.start_session(business.id, client.id)

      assert {:ok, discarded} = Tracking.discard_session(session)
      assert discarded.state == :discarded
    end
  end

  describe "performed_sets - universal tracking" do
    setup do
      {:ok, business, _coach, client} = create_test_setup()
      {:ok, exercise} = Library.create_exercise(business.id, %{"name" => "Test Exercise"})
      {:ok, session} = Tracking.start_session(business.id, client.id)

      %{session: session, exercise: exercise, business: business}
    end

    test "creates a strength set with actual_reps and load", %{
      session: session,
      exercise: exercise,
      business: business
    } do
      assert {:ok, set} =
               Tracking.create_performed_set(business.id, %{
                 position: 0,
                 actual_reps: "10",
                 load_value: 100,
                 load_unit: :kg,
                 rpe: 8.0,
                 rir: 2,
                 workout_session_id: session.id,
                 exercise_id: exercise.id
               })

      assert set.actual_reps == "10"
      assert set.load_value == Decimal.new("100")
      assert set.load_unit == :kg
      assert set.rpe == Decimal.new("8.0")
      assert set.rir == 2
    end

    test "creates a cardio set with duration and distance", %{
      session: session,
      exercise: exercise,
      business: business
    } do
      assert {:ok, set} =
               Tracking.create_performed_set(business.id, %{
                 position: 0,
                 duration_seconds: 1756,
                 distance_value: 5.1,
                 distance_unit: :km,
                 intensity_felt: "Zone 2",
                 workout_session_id: session.id,
                 exercise_id: exercise.id
               })

      assert set.duration_seconds == 1756
      assert set.distance_value == Decimal.new("5.1")
      assert set.distance_unit == :km
    end

    test "creates a bodyweight set", %{session: session, exercise: exercise, business: business} do
      assert {:ok, set} =
               Tracking.create_performed_set(business.id, %{
                 position: 0,
                 actual_reps: "15",
                 load_unit: :bodyweight,
                 notes: "Felt strong",
                 workout_session_id: session.id,
                 exercise_id: exercise.id
               })

      assert set.actual_reps == "15"
      assert set.load_unit == :bodyweight
    end

    test "validates at least one performance metric required", %{
      session: session,
      exercise: exercise,
      business: business
    } do
      assert {:error, changeset} =
               Tracking.create_performed_set(business.id, %{
                 position: 0,
                 load_value: 100,
                 load_unit: :kg,
                 workout_session_id: session.id,
                 exercise_id: exercise.id
               })

      assert %{actual_reps: ["must have at least one metric: reps, duration, or distance"]} =
               errors_on(changeset)
    end

    test "validates distance_unit required when distance_value set", %{
      session: session,
      exercise: exercise,
      business: business
    } do
      assert {:error, changeset} =
               Tracking.create_performed_set(business.id, %{
                 position: 0,
                 actual_reps: "10",
                 distance_value: 5,
                 workout_session_id: session.id,
                 exercise_id: exercise.id
               })

      assert %{distance_unit: ["required when distance_value is set"]} = errors_on(changeset)
    end

    test "validates load_unit required when load_value set", %{
      session: session,
      exercise: exercise,
      business: business
    } do
      assert {:error, changeset} =
               Tracking.create_performed_set(business.id, %{
                 position: 0,
                 actual_reps: "10",
                 load_value: 100,
                 workout_session_id: session.id,
                 exercise_id: exercise.id
               })

      assert %{load_unit: ["required when load_value is set"]} = errors_on(changeset)
    end

    test "validates rpe is between 1 and 10", %{
      session: session,
      exercise: exercise,
      business: business
    } do
      assert {:error, changeset} =
               Tracking.create_performed_set(business.id, %{
                 position: 0,
                 actual_reps: "10",
                 rpe: 11,
                 workout_session_id: session.id,
                 exercise_id: exercise.id
               })

      assert %{rpe: ["must be less than or equal to 10"]} = errors_on(changeset)
    end

    test "unique constraint on (workout_session_id, position)", %{
      session: session,
      exercise: exercise,
      business: business
    } do
      {:ok, _} =
        Tracking.create_performed_set(business.id, %{
          position: 0,
          actual_reps: "10",
          workout_session_id: session.id,
          exercise_id: exercise.id
        })

      assert {:error, changeset} =
               Tracking.create_performed_set(business.id, %{
                 position: 0,
                 actual_reps: "12",
                 workout_session_id: session.id,
                 exercise_id: exercise.id
               })

      assert %{workout_session_id: ["position already exists in this workout session"]} =
               errors_on(changeset)
    end

    test "update_performed_set/2 updates set values", %{
      session: session,
      exercise: exercise,
      business: business
    } do
      {:ok, set} =
        Tracking.create_performed_set(business.id, %{
          position: 0,
          actual_reps: "10",
          workout_session_id: session.id,
          exercise_id: exercise.id
        })

      assert {:ok, updated} = Tracking.update_performed_set(set, %{actual_reps: "12", rpe: 9.0})
      assert updated.actual_reps == "12"
      assert updated.rpe == Decimal.new("9.0")
    end

    test "delete_performed_set/1 removes the set", %{
      session: session,
      exercise: exercise,
      business: business
    } do
      {:ok, set} =
        Tracking.create_performed_set(business.id, %{
          position: 0,
          actual_reps: "10",
          workout_session_id: session.id,
          exercise_id: exercise.id
        })

      assert {:ok, _} = Tracking.delete_performed_set(set)
      assert Repo.get(PerformedSet, set.id) == nil
    end
  end

  # Helpers
  defp create_test_setup do
    # Ensure default plan exists
    if Easy.Repo.aggregate(Easy.Organizations.Plan, :count) == 0 do
      Easy.Repo.insert!(%Easy.Organizations.Plan{
        name: "Free Trial",
        slug: "free-trial",
        price_cents: 0,
        billing_interval: "month",
        is_default: true,
        features: %{},
        limits: %{}
      })
    end

    {:ok, user} =
      Easy.Accounts.create_user(%{
        email: "user#{System.unique_integer()}@example.com",
        phone: "+1#{:rand.uniform(9_999_999_999)}"
      })

    {:ok, business} =
      Easy.Organizations.create_business_with_owner(user, %{
        name: "Test Business #{System.unique_integer()}",
        email: "business#{System.unique_integer()}@example.com",
        handle: "business-#{System.unique_integer()}"
      })

    coach = Easy.Accounts.get_coach_by_user(user)

    {:ok, client} = create_test_client(business.id)

    {:ok, business, coach, client}
  end

  defp create_test_client(business_id) do
    %Easy.Clients.Client{}
    |> Easy.Clients.Client.create_changeset(%{
      full_name: "Test Client #{System.unique_integer()}",
      email: "client#{System.unique_integer()}@example.com",
      business_id: business_id
    })
    |> Easy.Repo.insert()
  end
end
