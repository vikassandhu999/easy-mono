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

      template_workout = insert(:workout, plan: template, business: business, creator: trainer_a)
      client_workout = insert(:workout, plan: client_plan, business: business, creator: trainer_b)

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

    test "get_workout_with_elements returns :not_found for a workout on another trainer's client's plan",
         %{trainer_a: trainer_a, client_workout: client_workout} do
      assert {:error, :not_found} =
               Workouts.get_workout_with_elements(trainer_ctx(trainer_a), client_workout.id)
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

    test "list_workouts returns :not_found for a plan belonging to another trainer's client", %{
      trainer_a: trainer_a,
      client_plan: client_plan
    } do
      assert {:error, :not_found} = Workouts.list_workouts(trainer_ctx(trainer_a), client_plan.id)
    end

    test "create_workout returns :not_found for a plan belonging to another trainer's client", %{
      trainer_a: trainer_a,
      client_plan: client_plan
    } do
      assert {:error, :not_found} =
               Workouts.create_workout(trainer_ctx(trainer_a), client_plan.id, %{"name" => "New Workout"})
    end

    test "create_workout_element returns :not_found for a workout on another trainer's client's plan",
         %{trainer_a: trainer_a, client_workout: client_workout} do
      assert {:error, :not_found} =
               Workouts.create_workout_element(trainer_ctx(trainer_a), client_workout.id, %{
                 "position" => 0
               })
    end

    test "update_workout_element returns :not_found for an element on another trainer's client's workout",
         %{trainer_a: trainer_a, client_element: client_element} do
      assert {:error, :not_found} =
               Workouts.update_workout_element(trainer_ctx(trainer_a), client_element.id, %{"notes" => "x"})
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

      assert {:ok, %{id: id}} = Workouts.get_workout_with_elements(ctx, client_workout.id)
      assert id == client_workout.id

      assert {:ok, _} = Workouts.update_workout(ctx, client_workout.id, %{"name" => "Renamed"})
      assert {:ok, _} = Workouts.update_workout_element(ctx, client_element.id, %{"notes" => "y"})
      assert {:ok, _} = Workouts.delete_workout_element(ctx, client_element.id)
      assert {:ok, _} = Workouts.delete_workout(ctx, client_workout.id)
    end

    test "a template plan's workouts (client_id nil) are visible to every trainer — shared library", %{
      trainer_a: trainer_a,
      template_workout: template_workout
    } do
      assert {:ok, %{id: id}} = Workouts.get_workout_with_elements(trainer_ctx(trainer_a), template_workout.id)
      assert id == template_workout.id
    end
  end
end
