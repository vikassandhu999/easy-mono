defmodule Easy.WorkoutsTest do
  use Easy.DataCase, async: true

  alias Easy.Workouts

  describe "client visibility (trainer-team access control)" do
    setup do
      business = insert(:business)
      insert(:coach, business: business, user: business.owner)
      trainer_a = insert(:coach, business: business)
      trainer_b = insert(:coach, business: business)
      client_b = insert(:client, business: business, creator: trainer_b, assigned_coach: trainer_b)

      template = insert(:training_plan, business: business, creator: trainer_a)
      client_plan = insert(:training_plan, business: business, creator: trainer_b, client: client_b)

      template_workout = insert(:workout, plan: template, business: business)
      client_workout = insert(:workout, plan: client_plan, business: business)

      client_exercise = insert(:exercise, business: business)

      client_element =
        insert(:workout_element, workout: client_workout, business: business, exercise: client_exercise)

      %{
        business: business,
        trainer_a: trainer_a,
        trainer_b: trainer_b,
        client_b: client_b,
        template: template,
        client_plan: client_plan,
        template_workout: template_workout,
        client_workout: client_workout,
        client_element: client_element
      }
    end

    test "get_workout returns :not_found for a workout on another trainer's client's plan",
         %{trainer_a: trainer_a, client_workout: client_workout} do
      assert {:error, :not_found} = Workouts.get_workout(trainer_ctx(trainer_a), client_workout.id)
    end

    test "update_workout returns :not_found for a workout on another trainer's client's plan", %{
      trainer_a: trainer_a,
      client_workout: client_workout
    } do
      assert {:error, :not_found} =
               Workouts.update_workout(trainer_ctx(trainer_a), client_workout.id, %{"name" => "Hacked"})
    end

    test "delete_workout returns :not_found for a workout on another trainer's client's plan", %{
      trainer_a: trainer_a,
      client_workout: client_workout
    } do
      assert {:error, :not_found} = Workouts.delete_workout(trainer_ctx(trainer_a), client_workout.id)
    end

    test "create_workout returns :not_found for a plan belonging to another trainer's client", %{
      trainer_a: trainer_a,
      client_plan: client_plan
    } do
      assert {:error, :not_found} =
               Workouts.create_workout(trainer_ctx(trainer_a), client_plan.id, %{"name" => "New Workout"})
    end

    test "create_workout_elements returns :not_found for a workout on another trainer's client's plan",
         %{trainer_a: trainer_a, client_workout: client_workout, client_element: client_element} do
      assert {:error, :not_found} =
               Workouts.create_workout_elements(trainer_ctx(trainer_a), client_workout.id, [
                 %{exercise_id: client_element.exercise_id}
               ])
    end

    test "update_workout_element returns :not_found for an element on another trainer's client's workout",
         %{trainer_a: trainer_a, client_element: client_element} do
      assert {:error, :not_found} =
               Workouts.update_workout_element(trainer_ctx(trainer_a), client_element.id, %{"position" => 3})
    end

    test "delete_workout_element returns :not_found for an element on another trainer's client's workout",
         %{trainer_a: trainer_a, client_element: client_element} do
      assert {:error, :not_found} = Workouts.delete_workout_element(trainer_ctx(trainer_a), client_element.id)
    end

    test "reorder_workout_elements returns :not_found for a workout on another trainer's client's plan",
         %{trainer_a: trainer_a, client_workout: client_workout, client_element: client_element} do
      assert {:error, :not_found} =
               Workouts.reorder_workout_elements(trainer_ctx(trainer_a), client_workout.id, [client_element.id])
    end

    test "owner ctx can read/update/delete the client-assigned workout and its elements", %{
      business: business,
      client_workout: client_workout,
      client_element: client_element
    } do
      ctx = owner_ctx(business)

      assert {:ok, %{id: id}} = Workouts.get_workout(ctx, client_workout.id)
      assert id == client_workout.id

      assert {:ok, _} = Workouts.update_workout(ctx, client_workout.id, %{"name" => "Renamed"})
      assert {:ok, _} = Workouts.update_workout_element(ctx, client_element.id, %{"position" => 2})
      assert {:ok, _} = Workouts.delete_workout_element(ctx, client_element.id)
      assert {:ok, _} = Workouts.delete_workout(ctx, client_workout.id)
    end

    test "a template plan's workouts (client_id nil) are visible to every trainer — shared library", %{
      trainer_a: trainer_a,
      template_workout: template_workout
    } do
      assert {:ok, %{id: id}} = Workouts.get_workout(trainer_ctx(trainer_a), template_workout.id)
      assert id == template_workout.id
    end
  end

  describe "create_workout_elements/3" do
    setup do
      coach = insert(:coach)
      plan = insert(:training_plan, creator: coach, business: coach.business)
      workout = insert(:workout, plan: plan, business: coach.business)
      exercise = insert(:exercise, business: coach.business)
      other_exercise = insert(:exercise, business: coach.business)

      %{
        ctx: Easy.Ctx.new(coach.business_id, coach.user_id),
        workout: workout,
        exercise: exercise,
        other_exercise: other_exercise
      }
    end

    test "appends in the given order, after the workout's existing elements", %{
      ctx: ctx,
      workout: workout,
      exercise: exercise,
      other_exercise: other_exercise
    } do
      insert(:workout_element, workout: workout, business: workout.business, position: 0)

      assert {:ok, [first, second]} =
               Workouts.create_workout_elements(ctx, workout.id, [
                 %{exercise_id: exercise.id, planned_sets: [%{"reps" => "8"}]},
                 %{exercise_id: other_exercise.id, planned_sets: []}
               ])

      assert [first.position, second.position] == [1, 2]
      assert [first.exercise_id, second.exercise_id] == [exercise.id, other_exercise.id]
      assert first.exercise.id == exercise.id
    end

    test "uses one insert for the whole batch", %{ctx: ctx, workout: workout, exercise: exercise} do
      {result, queries} =
        capture_queries(fn ->
          Workouts.create_workout_elements(ctx, workout.id, [
            %{exercise_id: exercise.id},
            %{exercise_id: exercise.id},
            %{exercise_id: exercise.id}
          ])
        end)

      assert {:ok, [_, _, _]} = result

      assert Enum.count(queries, fn query ->
               String.starts_with?(query, ~s(INSERT INTO "training_workout_exercises"))
             end) == 1
    end

    test "writes nothing when one element names an unreachable exercise", %{
      ctx: ctx,
      workout: workout,
      exercise: exercise
    } do
      foreign = insert(:exercise, business: insert(:business))

      assert {:error, :not_found} =
               Workouts.create_workout_elements(ctx, workout.id, [
                 %{exercise_id: exercise.id},
                 %{exercise_id: foreign.id}
               ])

      assert {:ok, []} = Workouts.reorder_workout_elements(ctx, workout.id, [])
    end

    test "returns :not_found for a workout in another business", %{ctx: ctx, exercise: exercise} do
      foreign_coach = insert(:coach)
      foreign_plan = insert(:training_plan, creator: foreign_coach, business: foreign_coach.business)
      foreign_workout = insert(:workout, plan: foreign_plan, business: foreign_coach.business)

      assert {:error, :not_found} =
               Workouts.create_workout_elements(ctx, foreign_workout.id, [%{exercise_id: exercise.id}])
    end
  end

  describe "reorder_workout_elements/3" do
    test "renumbers straight to 0..n-1" do
      coach = insert(:coach)
      plan = insert(:training_plan, creator: coach, business: coach.business)
      workout = insert(:workout, plan: plan, business: coach.business)
      ctx = Easy.Ctx.new(coach.business_id, coach.user_id)

      elements =
        for position <- 0..2 do
          insert(:workout_element, workout: workout, business: workout.business, position: position)
        end

      order = elements |> Enum.reverse() |> Enum.map(& &1.id)

      assert {:ok, reordered} = Workouts.reorder_workout_elements(ctx, workout.id, order)
      assert Enum.map(reordered, & &1.id) == order
      assert Enum.map(reordered, & &1.position) == [0, 1, 2]
    end
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
