defmodule Easy.Training.LibraryTest do
  use Easy.DataCase, async: true

  alias Easy.Training.Library
  alias Easy.Training.TrainingExercise

  for {factory, function} <- [muscle: :list_muscles, equipment: :list_equipment] do
    test "#{function} searches literal text and returns alphabetical references" do
      names = ["Catalog By", "Catalog A%", "Catalog B_", "Catalog Ax"]
      Enum.each(names, &insert(unquote(factory), name: &1))
      list = fn search -> apply(Library, unquote(function), [search]) end

      assert {:ok, found} = list.("  cAtAlOg  ")
      assert Enum.map(found, & &1.name) == Enum.sort(names)
      assert {:ok, [percent]} = list.("Catalog A%")
      assert percent.name == "Catalog A%"
      assert {:ok, [underscore]} = list.("Catalog B_")
      assert underscore.name == "Catalog B_"
      assert {:ok, []} = list.("Catalog absent")
      assert list.(nil) == list.("   ")
    end
  end

  test "foreign and system exercises cannot be edited or deleted" do
    coach = insert(:coach)
    ctx = trainer_ctx(coach)
    foreign = insert(:exercise, business: insert(:business))
    system = insert(:exercise, business: nil, source: :system)

    for exercise <- [foreign, system] do
      before = Repo.get!(TrainingExercise, exercise.id)
      assert {:error, :not_found} = Library.update_exercise(ctx, exercise.id, %{name: "Changed"})
      assert {:error, :not_found} = Library.delete_exercise(ctx, exercise.id)
      assert Repo.get!(TrainingExercise, exercise.id) == before
    end

    assert {:error, :not_found} = Library.get_exercise(ctx, foreign.id)
    assert {:error, :not_found} = Library.get_exercise(ctx, Ecto.UUID.generate())
    assert {:error, :not_found} = Library.duplicate_exercise(ctx, foreign.id, %{name: "Forbidden copy"})
    assert {:ok, visible} = Library.get_exercise(ctx, system.id)
    assert visible.id == system.id
    refute Repo.exists?(TrainingExercise.for_business(ctx.business_id))
  end

  test "writes require a coach and stamp the trusted creator on new rows" do
    coach = insert(:coach)
    ctx = trainer_ctx(coach)
    other = insert(:coach)
    attrs = %{name: "Trusted creator", business_id: other.business_id, creator_id: other.id}

    assert {:ok, exercise} = Library.create_exercise(ctx, attrs)
    assert exercise.business_id == ctx.business_id
    assert exercise.creator_id == coach.id
    assert {:ok, copy} = Library.duplicate_exercise(ctx, exercise.id, %{attrs | name: "Trusted copy"})
    assert copy.business_id == ctx.business_id
    assert copy.creator_id == coach.id

    client = insert(:client, business: coach.business, creator: coach, assigned_coach: coach)
    client_ctx = %Easy.Ctx{business_id: ctx.business_id, client_id: client.id, user_id: client.user_id}

    assert {:error, :not_found} = Library.create_exercise(client_ctx, %{name: "Forbidden"})
    assert {:error, :not_found} = Library.update_exercise(client_ctx, exercise.id, %{name: "Forbidden"})
    assert {:error, :not_found} = Library.delete_exercise(client_ctx, exercise.id)
    assert {:error, :not_found} = Library.duplicate_exercise(client_ctx, exercise.id, %{name: "Forbidden"})
    assert {:ok, %{count: 2}} = Library.list_exercises(ctx)
    assert {:ok, unchanged} = Library.get_exercise(client_ctx, exercise.id)
    assert unchanged.name == exercise.name
    assert unchanged.creator_id == coach.id
  end

  test "pagination bounds negative values and retains the twenty-exercise cap" do
    coach = insert(:coach)
    ctx = trainer_ctx(coach)
    insert_list(21, :exercise, business: coach.business)
    insert(:exercise, business: insert(:business))

    assert {:ok, %{count: 21, exercises: [_exercise]}} = Library.list_exercises(ctx, offset: -5, limit: 1)
    assert {:ok, %{count: 21, exercises: []}} = Library.list_exercises(ctx, limit: -1)
    assert {:ok, %{count: 21, exercises: exercises}} = Library.list_exercises(ctx, limit: 500)
    assert length(exercises) == 20
  end

  test "combined filters count visible matches once and paginate the filtered result" do
    coach = insert(:coach)
    ctx = trainer_ctx(coach)
    muscles = insert_list(2, :muscle)
    equipment = insert_list(2, :equipment)
    attrs = [name: "Filtered Press", muscles: muscles, equipment: equipment]
    owned = insert(:exercise, [business: coach.business] ++ attrs)
    system = insert(:exercise, [business: nil, source: :system] ++ attrs)
    insert(:exercise, [business: insert(:business)] ++ attrs)
    insert(:exercise, business: coach.business, name: "Filtered Muscle Only", muscles: muscles)
    insert(:exercise, business: coach.business, name: "Filtered Equipment Only", equipment: equipment)
    insert(:exercise, business: coach.business, name: "Unrelated", muscles: muscles, equipment: equipment)

    opts = [search: "  filtered  ", muscle_ids: Enum.map(muscles, & &1.id), equipment_ids: Enum.map(equipment, & &1.id)]
    assert {:ok, %{count: 2, exercises: matches}} = Library.list_exercises(ctx, opts)
    assert MapSet.new(matches, & &1.id) == MapSet.new([owned.id, system.id])

    for {expected, offset} <- Enum.with_index(matches) do
      assert {:ok, %{count: 2, exercises: [actual]}} = Library.list_exercises(ctx, opts ++ [limit: 1, offset: offset])
      assert actual.id == expected.id
      assert length(actual.muscles) == 2
      assert length(actual.equipment) == 2
    end
  end

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

  test "unknown reference IDs reject the entire write and preserve existing associations" do
    ctx = trainer_ctx(insert(:coach))
    muscle = insert(:muscle)
    equipment = insert(:equipment)

    assert {:ok, exercise} =
             Library.create_exercise(ctx, %{
               name: "Original",
               muscle_ids: [muscle.id, muscle.id],
               equipment_ids: [equipment.id]
             })

    for {field, id} <- [{"muscle_ids", muscle.id}, {"equipment_ids", equipment.id}] do
      attrs = %{"name" => "Changed", field => [id, Ecto.UUID.generate()]}

      assert {:error, :not_found} = Library.create_exercise(ctx, attrs)
      assert {:error, :not_found} = Library.update_exercise(ctx, exercise.id, attrs)
    end

    assert {:ok, %{count: 1, exercises: [unchanged]}} = Library.list_exercises(ctx)
    assert unchanged.id == exercise.id
    assert unchanged.name == "Original"
    assert Enum.map(unchanged.muscles, & &1.id) == [muscle.id]
    assert Enum.map(unchanged.equipment, & &1.id) == [equipment.id]
  end

  test "string-keyed writes set, preserve, and clear reference lists and name a duplicate" do
    coach = insert(:coach)
    ctx = trainer_ctx(coach)
    muscle = insert(:muscle)
    equipment = insert(:equipment)

    assert {:ok, exercise} =
             Library.create_exercise(ctx, %{
               "name" => "Reference exercise",
               "muscle_ids" => [muscle.id],
               "equipment_ids" => [equipment.id]
             })

    assert Enum.map(exercise.muscles, & &1.id) == [muscle.id]
    assert Enum.map(exercise.equipment, & &1.id) == [equipment.id]
    assert {:ok, renamed} = Library.update_exercise(ctx, exercise.id, %{"name" => "Renamed exercise"})
    assert Enum.map(renamed.muscles, & &1.id) == [muscle.id]
    assert {:ok, copy} = Library.duplicate_exercise(ctx, exercise.id, %{"name" => "Copied exercise"})
    assert copy.name == "Copied exercise"
    assert Enum.map(copy.equipment, & &1.id) == [equipment.id]

    assert {:ok, cleared} =
             Library.update_exercise(ctx, exercise.id, %{"muscle_ids" => [], "equipment_ids" => []})

    assert cleared.muscles == []
    assert cleared.equipment == []
  end

  test "duplicating a system exercise preserves tracking while creating a custom tenant exercise" do
    coach = insert(:coach)
    ctx = trainer_ctx(coach)

    system =
      insert(:exercise,
        business: nil,
        source: :system,
        import_id: "system-plank",
        name: "Plank",
        tracking_type: :duration,
        instructions: "Hold the position"
      )

    assert {:ok, copy} =
             Library.duplicate_exercise(ctx, system.id, %{
               name: "My plank",
               tracking_type: :weight_reps,
               business_id: Ecto.UUID.generate(),
               source: :system
             })

    assert copy.id != system.id
    assert copy.name == "My plank"
    assert copy.tracking_type == :duration
    assert copy.instructions == system.instructions
    assert copy.business_id == ctx.business_id
    assert copy.source == :custom
    assert copy.import_id == nil
  end

  test "malformed reference input rejects creation and leaves existing exercises unchanged" do
    coach = insert(:coach)
    ctx = trainer_ctx(coach)
    muscle = insert(:muscle)

    assert {:ok, exercise} = Library.create_exercise(ctx, %{name: "Original", muscle_ids: [muscle.id]})

    for {field, value} <- [
          {:muscle_ids, ["invalid"]},
          {:equipment_ids, [nil]},
          {:muscle_ids, "invalid"},
          {:media_id, "invalid"}
        ] do
      attrs = %{Atom.to_string(field) => value, "name" => "Changed"}

      assert {:error, %Ecto.Changeset{} = create_error} = Library.create_exercise(ctx, attrs)
      assert "is invalid" in Map.fetch!(errors_on(create_error), field)

      assert {:error, %Ecto.Changeset{} = update_error} = Library.update_exercise(ctx, exercise.id, attrs)
      assert "is invalid" in Map.fetch!(errors_on(update_error), field)
    end

    assert {:ok, %{count: 1, exercises: [unchanged]}} = Library.list_exercises(ctx)
    assert unchanged.name == "Original"
    assert Enum.map(unchanged.muscles, & &1.id) == [muscle.id]
  end
end
