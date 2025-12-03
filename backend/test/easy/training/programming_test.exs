defmodule Easy.Training.ProgrammingTest do
  use Easy.DataCase, async: true

  alias Easy.Training.Programming
  alias Easy.Training.Programming.{TrainingPlan, PlannedWorkout, WorkoutElement, PlannedSet}
  alias Easy.Training.Library

  describe "training_plans" do
    setup do
      {:ok, business, coach} = create_test_business_with_coach()
      %{business: business, coach: coach}
    end

    test "create_training_plan/3 creates a template", %{business: business, coach: coach} do
      attrs = %{
        "name" => "PPL Program",
        "description" => "Push Pull Legs"
      }

      assert {:ok, plan} = Programming.create_training_plan(business.id, coach.id, attrs)
      assert plan.name == "PPL Program"
      assert plan.is_template == true
      assert plan.business_id == business.id
      assert plan.author_id == coach.id
      assert is_nil(plan.client_id)
    end

    test "fetch_training_plan/2 returns plan for business", %{business: business, coach: coach} do
      {:ok, plan} =
        Programming.create_training_plan(business.id, coach.id, %{"name" => "My Plan"})

      assert {:ok, found} = Programming.fetch_training_plan(business.id, plan.id)
      assert found.id == plan.id
    end

    test "fetch_training_plan/2 returns error for other business", %{
      business: business,
      coach: coach
    } do
      {:ok, other_business, _} = create_test_business_with_coach()

      {:ok, plan} =
        Programming.create_training_plan(business.id, coach.id, %{"name" => "My Plan"})

      assert {:error, :not_found} = Programming.fetch_training_plan(other_business.id, plan.id)
    end

    test "list_training_plans/2 filters by is_template", %{business: business, coach: coach} do
      {:ok, template} =
        Programming.create_training_plan(business.id, coach.id, %{"name" => "Template"})

      {:ok, {templates, _meta}} =
        Programming.list_training_plans(business.id, %{is_template: true})

      assert Enum.find(templates, &(&1.id == template.id))
    end

    test "duplicate_training_plan/2 creates a deep copy", %{business: business, coach: coach} do
      {:ok, plan} =
        Programming.create_training_plan(business.id, coach.id, %{
          "name" => "Original Plan"
        })

      # Add a workout to the plan
      {:ok, _workout} =
        Programming.create_planned_workout(%{
          name: "Day 1",
          day_number: 1,
          training_plan_id: plan.id
        })

      assert {:ok, copy} = Programming.duplicate_training_plan(business.id, plan.id)
      assert copy.name == "Original Plan (Copy)"
      assert copy.original_template_id == plan.id
      assert length(copy.planned_workouts) == 1
    end
  end

  describe "assign_training_plan_to_client/5" do
    setup do
      {:ok, business, coach} = create_test_business_with_coach()
      {:ok, client} = create_test_client(business.id)
      {:ok, exercise} = create_test_exercise(business.id)

      {:ok, plan} =
        Programming.create_training_plan(business.id, coach.id, %{
          "name" => "Client Plan"
        })

      {:ok, workout} =
        Programming.create_planned_workout(%{
          name: "Day 1",
          day_number: 1,
          training_plan_id: plan.id
        })

      {:ok, element} =
        Programming.create_workout_element(%{
          position: 0,
          exercise_id: exercise.id,
          planned_workout_id: workout.id
        })

      {:ok, _set} =
        Programming.create_planned_set(%{
          position: 0,
          target_reps: "10",
          load_value: 50,
          load_type: :absolute_kg,
          rest_seconds: 90,
          workout_element_id: element.id
        })

      %{business: business, coach: coach, client: client, plan: plan}
    end

    test "creates a deep copy assigned to client with business_id authorization", ctx do
      start_date = Date.utc_today()
      end_date = Date.add(start_date, 30)

      assert {:ok, %{new_plan: assigned}} =
               Programming.assign_training_plan_to_client(
                 ctx.business.id,
                 ctx.plan.id,
                 ctx.client.id,
                 start_date,
                 end_date
               )

      assert assigned.is_template == false
      assert assigned.client_id == ctx.client.id
      assert assigned.original_template_id == ctx.plan.id
      assert assigned.start_date == start_date
      assert assigned.end_date == end_date
    end

    test "returns error when template belongs to different business", ctx do
      {:ok, other_business, _} = create_test_business_with_coach()
      start_date = Date.utc_today()
      end_date = Date.add(start_date, 30)

      assert {:error, :not_found} =
               Programming.assign_training_plan_to_client(
                 other_business.id,
                 ctx.plan.id,
                 ctx.client.id,
                 start_date,
                 end_date
               )
    end
  end

  describe "planned_workouts" do
    setup do
      {:ok, business, coach} = create_test_business_with_coach()

      {:ok, plan} =
        Programming.create_training_plan(business.id, coach.id, %{"name" => "Test Plan"})

      %{business: business, plan: plan}
    end

    test "create_planned_workout/1 validates day_number between 1 and 7", %{plan: plan} do
      # Test day_number too low
      assert {:error, changeset} =
               Programming.create_planned_workout(%{
                 name: "Invalid Day",
                 day_number: 0,
                 training_plan_id: plan.id
               })

      assert %{day_number: ["must be greater than or equal to 1"]} = errors_on(changeset)

      # Test day_number too high
      assert {:error, changeset} =
               Programming.create_planned_workout(%{
                 name: "Invalid Day",
                 day_number: 8,
                 training_plan_id: plan.id
               })

      assert %{day_number: ["must be less than or equal to 7"]} = errors_on(changeset)
    end

    test "unique constraint on (training_plan_id, day_number)", %{plan: plan} do
      {:ok, _} =
        Programming.create_planned_workout(%{
          name: "Day 1",
          day_number: 1,
          training_plan_id: plan.id
        })

      assert {:error, changeset} =
               Programming.create_planned_workout(%{
                 name: "Another Day 1",
                 day_number: 1,
                 training_plan_id: plan.id
               })

      assert %{day_number: ["day already exists in this training plan"]} = errors_on(changeset)
    end
  end

  describe "planned_sets - universal schema" do
    setup do
      {:ok, business, coach} = create_test_business_with_coach()
      {:ok, exercise} = create_test_exercise(business.id)

      {:ok, plan} =
        Programming.create_training_plan(business.id, coach.id, %{"name" => "Test Plan"})

      {:ok, workout} =
        Programming.create_planned_workout(%{
          name: "Day 1",
          day_number: 1,
          training_plan_id: plan.id
        })

      {:ok, element} =
        Programming.create_workout_element(%{
          position: 0,
          exercise_id: exercise.id,
          planned_workout_id: workout.id
        })

      %{element: element}
    end

    test "creates a strength set with target_reps and load", %{element: element} do
      assert {:ok, set} =
               Programming.create_planned_set(%{
                 position: 0,
                 target_reps: "5",
                 load_value: 100,
                 load_type: :absolute_kg,
                 intensity_target: "RPE 8",
                 rest_seconds: 180,
                 set_type: :working,
                 workout_element_id: element.id
               })

      assert set.target_reps == "5"
      assert set.load_type == :absolute_kg
      assert set.set_type == :working
    end

    test "creates a rep range set", %{element: element} do
      assert {:ok, set} =
               Programming.create_planned_set(%{
                 position: 0,
                 target_reps: "8-12",
                 load_type: :bodyweight,
                 workout_element_id: element.id
               })

      assert set.target_reps == "8-12"
      assert set.load_type == :bodyweight
    end

    test "creates an AMRAP set", %{element: element} do
      assert {:ok, set} =
               Programming.create_planned_set(%{
                 position: 0,
                 target_reps: "AMRAP",
                 duration_seconds: 60,
                 workout_element_id: element.id
               })

      assert set.target_reps == "AMRAP"
      assert set.duration_seconds == 60
    end

    test "creates a cardio set with duration and distance", %{element: element} do
      assert {:ok, set} =
               Programming.create_planned_set(%{
                 position: 0,
                 duration_seconds: 1800,
                 distance_value: 5,
                 distance_unit: :km,
                 intensity_target: "Zone 2",
                 workout_element_id: element.id
               })

      assert set.duration_seconds == 1800
      assert set.distance_value == Decimal.new("5")
      assert set.distance_unit == :km
    end

    test "validates at least one target is required", %{element: element} do
      assert {:error, changeset} =
               Programming.create_planned_set(%{
                 position: 0,
                 load_value: 100,
                 load_type: :absolute_kg,
                 workout_element_id: element.id
               })

      assert %{target_reps: ["must have at least one target: reps, duration, or distance"]} =
               errors_on(changeset)
    end

    test "validates distance_unit required when distance_value set", %{element: element} do
      assert {:error, changeset} =
               Programming.create_planned_set(%{
                 position: 0,
                 target_reps: "10",
                 distance_value: 5,
                 workout_element_id: element.id
               })

      assert %{distance_unit: ["required when distance_value is set"]} = errors_on(changeset)
    end

    test "unique constraint on (workout_element_id, position)", %{element: element} do
      {:ok, _} =
        Programming.create_planned_set(%{
          position: 0,
          target_reps: "10",
          workout_element_id: element.id
        })

      assert {:error, changeset} =
               Programming.create_planned_set(%{
                 position: 0,
                 target_reps: "12",
                 workout_element_id: element.id
               })

      assert %{position: ["position already exists in this workout element"]} =
               errors_on(changeset)
    end
  end

  # Helpers
  defp create_test_business_with_coach do
    {:ok, user} =
      Easy.Accounts.register_user(%{
        email: "coach#{System.unique_integer()}@example.com",
        phone: "+1#{:rand.uniform(9_999_999_999)}"
      })

    {:ok, business} =
      Easy.Organizations.create_business(%{
        name: "Test Business #{System.unique_integer()}",
        email: "business#{System.unique_integer()}@example.com",
        owner_id: user.id
      })

    {:ok, coach} =
      Easy.Organizations.create_coach(%{
        user_id: user.id,
        business_id: business.id,
        role: :owner
      })

    {:ok, business, coach}
  end

  defp create_test_client(business_id) do
    Easy.Clients.create_client(%{
      name: "Test Client #{System.unique_integer()}",
      email: "client#{System.unique_integer()}@example.com",
      business_id: business_id
    })
  end

  defp create_test_exercise(business_id) do
    Library.create_exercise(business_id, %{
      "name" => "Test Exercise #{System.unique_integer()}"
    })
  end
end
