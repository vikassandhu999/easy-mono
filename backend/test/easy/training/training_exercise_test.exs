defmodule Easy.Training.TrainingExerciseTest do
  use Easy.DataCase, async: true

  alias Easy.Training.TrainingExercise

  describe "text length validation" do
    test "insert rejects fields longer than the public request contract" do
      changeset =
        TrainingExercise.insert_changeset(Ecto.UUID.generate(), nil, %{
          name: String.duplicate("n", 256),
          instructions: String.duplicate("i", 10_001)
        })

      assert %{name: [_], instructions: [_]} = errors_on(changeset)
    end

    test "update rejects fields longer than the public request contract" do
      changeset =
        TrainingExercise.update_changeset(%TrainingExercise{}, %{
          name: String.duplicate("n", 256),
          instructions: String.duplicate("i", 10_001)
        })

      assert %{name: [_], instructions: [_]} = errors_on(changeset)
    end

    test "accepts values at the public request limits" do
      changeset =
        TrainingExercise.insert_changeset(Ecto.UUID.generate(), nil, %{
          name: String.duplicate("n", 255),
          instructions: String.duplicate("i", 10_000)
        })

      assert changeset.valid?
    end
  end
end
