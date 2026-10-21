defmodule Easy.ExercisesTest do
  use Easy.DataCase, async: true

  alias Easy.Attachments.Attachment
  alias Easy.ClientDays
  alias Easy.Workouts
  alias Easy.Workouts.Exercise

  setup do
    coach = insert(:coach)
    %{coach: coach, ctx: trainer_ctx(coach)}
  end

  test "only name and kind are required and omitted metrics use kind defaults", f do
    assert {:ok, run} = Workouts.create_exercise(f.ctx, %{name: "Run", kind: "activity"})
    assert Enum.map(run.metrics, &{&1.key, &1.label}) == [distance: nil, duration: nil]
    assert {:ok, empty} = Workouts.create_exercise(f.ctx, %{name: "Rest", kind: "practice", metrics: []})
    assert empty.metrics == []
    assert {:error, %Ecto.Changeset{}} = Workouts.create_exercise(f.ctx, %{kind: "movement"})
  end

  test "metric labels are trimmed and blank labels become nil", f do
    assert {:ok, row} =
             Workouts.create_exercise(f.ctx, %{
               name: "Climb",
               kind: "practice",
               metrics: [%{key: "reps", label: " Moves "}, %{key: "attempts", label: "  "}]
             })

    assert Enum.map(row.metrics, &{&1.key, &1.label}) == [reps: "Moves", attempts: nil]
    assert {:ok, updated} = Workouts.update_exercise(f.ctx, row.id, %{kind: "movement"})
    assert updated.metrics == row.metrics
  end

  test "grade cannot be selected", f do
    assert {:error, %Ecto.Changeset{}} =
             Workouts.create_exercise(f.ctx, %{
               name: "Climb",
               kind: "practice",
               metrics: [%{key: "grade"}]
             })
  end

  test "media reorder keeps ids and removal keeps attachments", f do
    assert {:ok, row} =
             Workouts.create_exercise(f.ctx, %{
               name: "Squat",
               kind: "movement",
               media: [
                 %{url: "https://example.com/a.mp4", caption: " Front "},
                 %{url: "https://example.com/b.mp4", caption: "  "}
               ]
             })

    [a, b] = row.media
    assert {a.position, a.caption, b.position, b.caption} == {0, "Front", 1, nil}

    assert {:ok, reversed} =
             Workouts.update_exercise(f.ctx, row.id, %{
               media: [
                 %{id: b.id, url: b.attachment.external_url},
                 %{id: a.id, url: a.attachment.external_url, caption: a.caption}
               ]
             })

    assert Enum.map(reversed.media, &{&1.id, &1.position}) == [{b.id, 0}, {a.id, 1}]
    assert {:ok, removed} = Workouts.update_exercise(f.ctx, row.id, %{media: []})
    assert removed.media == []
    assert Repo.aggregate(Attachment, :count) == 2
  end

  test "archived exercises leave pickers but stay readable", f do
    assert {:ok, row} = Workouts.create_exercise(f.ctx, %{name: "Archive test exercise", kind: "movement"})
    assert {:ok, archived} = Workouts.archive_exercise(f.ctx, row.id)
    assert archived.archived_at
    assert {:ok, %{data: []}} = Workouts.list_exercises(f.ctx, search: "Archive test exercise")
    assert {:ok, %{data: [found]}} = Workouts.list_exercises(f.ctx, search: "Archive test exercise", archived: true)
    assert found.id == row.id
    assert {:ok, readable} = Workouts.get_exercise(f.ctx, row.id)
    assert readable.id == row.id
    assert {:ok, restored} = Workouts.restore_exercise(f.ctx, row.id)
    assert restored.archived_at == nil
    assert {:ok, %{data: [selectable]}} = Workouts.list_exercises(f.ctx, search: "Archive test exercise")
    assert selectable.id == row.id
  end

  test "archiving twice keeps the first timestamp", f do
    assert {:ok, row} = Workouts.create_exercise(f.ctx, %{name: "Squat", kind: "movement"})
    first = ~U[2026-10-01 00:00:00Z]
    row |> change(archived_at: first) |> Repo.update!()
    assert {:ok, archived} = Workouts.archive_exercise(f.ctx, row.id)
    assert archived.archived_at == first
  end

  test "archive, restore, update and media are tenant scoped", f do
    other = trainer_ctx(insert(:coach))
    assert {:ok, row} = Workouts.create_exercise(f.ctx, %{name: "Squat", kind: "movement", media: [%{url: "https://example.com/a"}]})
    builtin = Repo.one!(from e in Exercise, where: is_nil(e.business_id), limit: 1)

    for id <- [row.id, builtin.id] do
      assert {:error, :not_found} = Workouts.archive_exercise(other, id)
      assert {:error, :not_found} = Workouts.restore_exercise(other, id)
      assert {:error, :not_found} = Workouts.update_exercise(other, id, %{media: []})
      assert {:error, :not_found} = Workouts.update_exercise(other, id, %{name: "No"})
    end

    assert {:error, :not_found} = Workouts.get_exercise(other, row.id)
    assert {:ok, %{data: []}} = Workouts.list_exercises(other, search: "Squat", archived: true)
    assert {:error, :not_found} = Workouts.get_exercise(f.ctx, Ecto.UUID.generate())
    assert {:ok, readable} = Workouts.get_exercise(f.ctx, row.id)
    assert length(readable.media) == 1
  end

  test "the client exercise search excludes archived exercises", f do
    client = insert(:client, business: f.coach.business, coach: f.coach)
    client_ctx = %{Easy.Ctx.new(client.business_id, client.user_id) | client_id: client.id}
    assert {:ok, row} = Workouts.create_exercise(f.ctx, %{name: "Unique squat", kind: "movement"})
    assert {:ok, %{data: [found]}} = ClientDays.list_client_exercises(client_ctx, search: "Unique squat")
    assert found.id == row.id
    assert {:ok, _} = Workouts.archive_exercise(f.ctx, row.id)
    assert {:ok, %{data: []}} = ClientDays.list_client_exercises(client_ctx, search: "Unique squat")
    foreign_ctx = %{client_ctx | business_id: insert(:business).id}
    assert {:error, :not_found} = ClientDays.list_client_exercises(foreign_ctx, [])
  end

  test "copy keeps metric labels and shares attachments through fresh gallery rows", f do
    assert {:ok, source} =
             Workouts.create_exercise(f.ctx, %{
               name: "Practice",
               kind: "practice",
               instructions: "Slowly",
               equipment: "Mat",
               muscles: ["core"],
               metrics: [%{key: "reps", label: "Moves"}],
               media: [%{url: "https://example.com/demo"}]
             })

    assert {:ok, copy} = Workouts.copy_exercise(f.ctx, source.id)

    assert {copy.name, copy.instructions, copy.equipment, copy.muscles, copy.metrics} ==
             {"Practice (copy)", "Slowly", "Mat", ["core"], source.metrics}

    assert hd(copy.media).id != hd(source.media).id
    assert hd(copy.media).attachment_id == hd(source.media).attachment_id
    other = trainer_ctx(insert(:coach))
    assert {:error, :not_found} = Workouts.copy_exercise(other, source.id)
    assert {:error, :not_found} = Workouts.delete_exercise(other, source.id)
    assert {:ok, _} = Workouts.delete_exercise(f.ctx, copy.id)
    assert Repo.aggregate(Attachment, :count) == 1
  end

  test "invalid media replacements roll back the exercise edit", f do
    assert {:ok, row} = Workouts.create_exercise(f.ctx, %{name: "Original", kind: "movement", media: [%{url: "https://example.com/demo"}]})
    assert {:error, %Ecto.Changeset{}} = Workouts.update_exercise(f.ctx, row.id, %{name: "Changed", media: [%{url: "file:///bad"}]})
    assert {:ok, retained} = Workouts.get_exercise(f.ctx, row.id)
    assert {retained.name, retained.media} == {"Original", row.media}
    assert {:error, %Ecto.Changeset{}} = Workouts.update_exercise(f.ctx, row.id, %{media: [%{id: Ecto.UUID.generate(), url: "https://example.com/foreign"}]})
  end
end
