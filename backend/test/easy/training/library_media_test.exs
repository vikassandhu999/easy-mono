defmodule Easy.Training.LibraryMediaTest do
  use Easy.DataCase, async: false

  alias Easy.Training.Library

  test "attaches same-business media and exposes it on the exercise" do
    coach = insert(:coach)
    media = insert(:library_media, business: coach.business)

    assert {:ok, exercise} =
             Library.create_exercise(trainer_ctx(coach), %{name: "Squat", media_id: media.id})

    assert exercise.media_id == media.id
    assert exercise.media.id == media.id
  end

  test "rejects cross-business media as not found" do
    coach = insert(:coach)
    other_media = insert(:library_media)

    assert {:error, :not_found} =
             Library.create_exercise(trainer_ctx(coach), %{name: "Squat", media_id: other_media.id})
  end

  test "replace and remove keep other fields intact" do
    coach = insert(:coach)
    media_a = insert(:library_media, business: coach.business)
    media_b = insert(:library_media, business: coach.business)
    ctx = trainer_ctx(coach)

    {:ok, exercise} =
      Library.create_exercise(ctx, %{name: "Squat", instructions: "keep me", media_id: media_a.id})

    {:ok, replaced} = Library.update_exercise(ctx, exercise.id, %{media_id: media_b.id})
    assert replaced.media_id == media_b.id
    assert replaced.media.id == media_b.id
    assert replaced.instructions == "keep me"

    {:ok, removed} = Library.update_exercise(ctx, exercise.id, %{media_id: nil})
    assert removed.media_id == nil
    assert removed.media == nil
    assert removed.instructions == "keep me"
  end

  test "duplicate carries the media reference forward" do
    coach = insert(:coach)
    media = insert(:library_media, business: coach.business)
    ctx = trainer_ctx(coach)

    {:ok, exercise} = Library.create_exercise(ctx, %{name: "Squat", media_id: media.id})
    {:ok, copy} = Library.duplicate_exercise(ctx, exercise.id, %{name: "Squat copy"})

    assert copy.media_id == media.id
  end

  test "string-keyed media follows the same authorization and clearing rules" do
    coach = insert(:coach)
    ctx = trainer_ctx(coach)
    media = insert(:library_media, business: coach.business)
    hidden = insert(:library_media)

    assert {:error, :not_found} =
             Library.create_exercise(ctx, %{"name" => "Hidden media", "media_id" => hidden.id})

    assert {:ok, exercise} =
             Library.create_exercise(ctx, %{"name" => "Visible media", "media_id" => media.id})

    assert exercise.media.id == media.id
    assert {:error, :not_found} = Library.update_exercise(ctx, exercise.id, %{"media_id" => hidden.id})
    assert {:ok, unchanged} = Library.get_exercise(ctx, exercise.id)
    assert unchanged.media_id == media.id
    assert {:ok, cleared} = Library.update_exercise(ctx, exercise.id, %{"media_id" => nil})
    assert cleared.media == nil
  end
end
