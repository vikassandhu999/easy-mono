defmodule Easy.Training.LibraryTest do
  use Easy.DataCase, async: true

  alias Easy.Training.Library
  alias Easy.Training.Library.{MuscleGroup, Muscle, Equipment, Exercise, ExerciseMuscle}

  describe "muscle_groups" do
    test "list_muscle_groups/0 returns all muscle groups" do
      {:ok, muscle_group} = Library.create_muscle_group(%{name: "Upper Body"})

      {:ok, groups} = Library.list_muscle_groups()
      assert Enum.find(groups, &(&1.id == muscle_group.id))
    end

    test "fetch_muscle_group/1 returns the muscle group with given id" do
      {:ok, muscle_group} = Library.create_muscle_group(%{name: "Lower Body"})

      assert {:ok, found} = Library.fetch_muscle_group(muscle_group.id)
      assert found.id == muscle_group.id
      assert found.name == "Lower Body"
    end

    test "fetch_muscle_group/1 returns error for invalid id" do
      assert {:error, :not_found} = Library.fetch_muscle_group(Ecto.UUID.generate())
    end
  end

  describe "muscles" do
    setup do
      {:ok, muscle_group} = Library.create_muscle_group(%{name: "Chest"})
      %{muscle_group: muscle_group}
    end

    test "list_muscles/0 returns all muscles with preloaded muscle_group", %{muscle_group: mg} do
      {:ok, muscle} = Library.create_muscle(%{name: "Pectoralis Major", muscle_group_id: mg.id})

      {:ok, muscles} = Library.list_muscles()
      found = Enum.find(muscles, &(&1.id == muscle.id))
      assert found
      assert found.muscle_group.id == mg.id
    end

    test "fetch_muscle/1 returns the muscle with given id", %{muscle_group: mg} do
      {:ok, muscle} = Library.create_muscle(%{name: "Biceps", muscle_group_id: mg.id})

      assert {:ok, found} = Library.fetch_muscle(muscle.id)
      assert found.id == muscle.id
    end
  end

  describe "equipment" do
    test "list_equipment/0 returns all equipment" do
      {:ok, equipment} = Library.create_equipment(%{name: "Barbell"})

      {:ok, all_equipment} = Library.list_equipment()
      assert Enum.find(all_equipment, &(&1.id == equipment.id))
    end

    test "fetch_equipment/1 returns the equipment with given id" do
      {:ok, equipment} = Library.create_equipment(%{name: "Dumbbell"})

      assert {:ok, found} = Library.fetch_equipment(equipment.id)
      assert found.id == equipment.id
    end
  end

  describe "exercises" do
    setup do
      # Create business
      {:ok, business} = create_test_business()
      {:ok, muscle_group} = Library.create_muscle_group(%{name: "Back"})

      {:ok, muscle} =
        Library.create_muscle(%{name: "Latissimus Dorsi", muscle_group_id: muscle_group.id})

      {:ok, equipment} = Library.create_equipment(%{name: "Pull-up Bar"})

      %{business: business, muscle: muscle, equipment: equipment}
    end

    test "create_exercise/2 creates an exercise with muscle and equipment associations", ctx do
      attrs = %{
        "name" => "Pull-up",
        "description" => "A classic back exercise",
        "mechanics" => "compound",
        "force" => "pull",
        "muscle_ids" => [ctx.muscle.id],
        "equipment_ids" => [ctx.equipment.id]
      }

      assert {:ok, exercise} = Library.create_exercise(ctx.business.id, attrs)
      assert exercise.name == "Pull-up"
      assert exercise.mechanics == :compound
      assert exercise.force == :pull
      assert exercise.business_id == ctx.business.id
      assert length(exercise.muscles) == 1
      assert length(exercise.equipment) == 1
    end

    test "create_exercise/2 sets muscle role to :primary by default", ctx do
      attrs = %{
        "name" => "Lat Pulldown",
        "muscle_ids" => [ctx.muscle.id]
      }

      assert {:ok, exercise} = Library.create_exercise(ctx.business.id, attrs)

      # Query the join table to check the role
      exercise_muscle =
        Repo.get_by(ExerciseMuscle, exercise_id: exercise.id, muscle_id: ctx.muscle.id)

      assert exercise_muscle.role == :primary
    end

    test "fetch_exercise/2 returns exercise for business-specific exercise", ctx do
      {:ok, exercise} = Library.create_exercise(ctx.business.id, %{"name" => "Custom Exercise"})

      assert {:ok, found} = Library.fetch_exercise(ctx.business.id, exercise.id)
      assert found.id == exercise.id
    end

    test "fetch_exercise/2 returns exercise for system-level exercise", ctx do
      {:ok, system_exercise} = Library.create_system_exercise(%{"name" => "System Squat"})

      # Any business can access system exercises
      assert {:ok, found} = Library.fetch_exercise(ctx.business.id, system_exercise.id)
      assert found.id == system_exercise.id
      assert is_nil(found.business_id)
    end

    test "fetch_exercise/2 returns error when exercise belongs to different business", ctx do
      {:ok, other_business} = create_test_business()
      {:ok, exercise} = Library.create_exercise(other_business.id, %{"name" => "Other Exercise"})

      assert {:error, :not_found} = Library.fetch_exercise(ctx.business.id, exercise.id)
    end

    test "list_exercises/2 returns exercises for business and system exercises", ctx do
      {:ok, business_exercise} =
        Library.create_exercise(ctx.business.id, %{"name" => "Business Exercise"})

      {:ok, system_exercise} = Library.create_system_exercise(%{"name" => "System Exercise"})

      {:ok, {exercises, _meta}} = Library.list_exercises(ctx.business.id)

      ids = Enum.map(exercises, & &1.id)
      assert business_exercise.id in ids
      assert system_exercise.id in ids
    end

    test "duplicate_exercise/2 creates a copy with unique name", ctx do
      {:ok, original} =
        Library.create_exercise(ctx.business.id, %{
          "name" => "Original Exercise",
          "muscle_ids" => [ctx.muscle.id],
          "equipment_ids" => [ctx.equipment.id]
        })

      assert {:ok, copy} = Library.duplicate_exercise(original, ctx.business.id)
      assert copy.name == "Original Exercise (Copy)"
      assert copy.id != original.id
      assert length(copy.muscles) == length(original.muscles)
      assert length(copy.equipment) == length(original.equipment)
    end
  end

  # Helper to create a test business
  defp create_test_business do
    # First create a user
    {:ok, user} =
      Easy.Accounts.register_user(%{
        email: "test#{System.unique_integer()}@example.com",
        phone: "+1#{:rand.uniform(9_999_999_999)}"
      })

    # Then create a business
    Easy.Organizations.create_business(%{
      name: "Test Business #{System.unique_integer()}",
      email: "business#{System.unique_integer()}@example.com",
      owner_id: user.id
    })
  end
end
