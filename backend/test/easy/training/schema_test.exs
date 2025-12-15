defmodule Easy.Training.SchemaTest do
  use Easy.DataCase

  alias Easy.Training.Programming.{PlannedSet, TrainingPlan}
  alias Easy.Training.Library.{ExerciseMuscle, ExerciseEquipment}

  describe "PlannedSet" do
    test "validates load_unit enum values" do
      # Valid units
      for unit <- [:kg, :lbs, :percent_1rm, :bodyweight, :none] do
        changeset =
          PlannedSet.changeset(%PlannedSet{}, %{
            target_reps: "10",
            load_unit: unit
          })

        assert changeset.valid?
        assert get_field(changeset, :load_unit) == unit
      end

      # Invalid unit (removed rpe)
      changeset =
        PlannedSet.changeset(%PlannedSet{}, %{
          target_reps: "10",
          load_unit: :rpe
        })

      refute changeset.valid?
      assert "is invalid" in errors_on(changeset).load_unit
    end
  end

  describe "TrainingPlan" do
    test "requires author_id" do
      changeset =
        TrainingPlan.changeset(%TrainingPlan{}, %{
          name: "Test Plan",
          business_id: Ecto.UUID.generate()
        })

      refute changeset.valid?
      assert "can't be blank" in errors_on(changeset).author_id

      changeset =
        TrainingPlan.changeset(
          %TrainingPlan{
            business_id: Ecto.UUID.generate(),
            author_id: Ecto.UUID.generate()
          },
          %{
            name: "Test Plan"
          }
        )

      if not changeset.valid? do
        IO.inspect(errors_on(changeset), label: "Changeset Errors")
      end

      assert changeset.valid?
    end
  end

  describe "ExerciseMuscle" do
    test "casts foreign keys" do
      params = %{
        exercise_id: Ecto.UUID.generate(),
        muscle_id: Ecto.UUID.generate(),
        role: :primary
      }

      changeset = ExerciseMuscle.changeset(%ExerciseMuscle{}, params)

      assert changeset.valid?
      assert get_field(changeset, :exercise_id) == params.exercise_id
      assert get_field(changeset, :muscle_id) == params.muscle_id
    end
  end

  describe "ExerciseEquipment" do
    test "casts foreign keys" do
      params = %{
        exercise_id: Ecto.UUID.generate(),
        equipment_id: Ecto.UUID.generate()
      }

      changeset = ExerciseEquipment.changeset(%ExerciseEquipment{}, params)

      assert changeset.valid?
      assert get_field(changeset, :exercise_id) == params.exercise_id
      assert get_field(changeset, :equipment_id) == params.equipment_id
    end
  end
end
