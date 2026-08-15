defmodule Easy.Training.LibraryTest do
  use Easy.DataCase, async: true

  alias Easy.Training.Library

  describe "get_exercises/2" do
    test "returns every visible exercise by id and rejects a batch containing a hidden exercise" do
      coach = insert(:coach)
      ctx = trainer_ctx(coach)
      owned = insert(:exercise, business: coach.business)
      system = insert(:exercise, business: nil, source: :system)
      hidden = insert(:exercise, business: insert(:business))

      assert {:ok, exercises} = Library.get_exercises(ctx, [system.id, owned.id, owned.id])
      assert Map.keys(exercises) |> MapSet.new() == MapSet.new([system.id, owned.id])

      assert {:error, :not_found} = Library.get_exercises(ctx, [owned.id, hidden.id])
    end
  end
end
