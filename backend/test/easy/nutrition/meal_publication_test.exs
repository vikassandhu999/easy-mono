defmodule Easy.Nutrition.MealPublicationTest do
  use Easy.DataCase, async: true
  import Easy.Nutrition.DiaryFixtures
  alias Easy.Nutrition.Diary

  test "saving food is quiet until sharing a meal, and its note is one normal message" do
    %{client: client, today: today, food: food} = covering_setup()
    ctx = client_ctx(client)
    assert {:ok, day} = save_extra(ctx, today, extra_attrs(food))
    assert {:ok, %{messages: []}} = Easy.Chat.list_client_messages(ctx)
    draft = day.slots |> hd() |> slot_draft() |> Map.merge(%{share: true, note_to_coach: "Still hungry after breakfast"})
    assert {:ok, shared} = Diary.save_client_nutrition_day(ctx, today, %{slots: [draft]})
    assert %DateTime{} = hd(shared.slots).shared_at
    assert {:ok, %{messages: [message]}} = Easy.Chat.list_client_messages(ctx)
    assert message.body == "Still hungry after breakfast"
    assert message.embed_type == :meal
    assert message.embed_id == hd(shared.slots).id
    updated = shared.slots |> hd() |> slot_draft() |> Map.merge(%{share: true, note_to_coach: "Still hungry after breakfast"})
    assert {:ok, corrected} = Diary.save_client_nutrition_day(ctx, today, %{slots: [updated]})
    assert {:ok, %{messages: [same]}} = Easy.Chat.list_client_messages(ctx)
    assert same.id == message.id
    assert hd(corrected.slots).shared_at == hd(shared.slots).shared_at
  end

  test "invalid communication rolls back both sharing and food changes" do
    %{client: client, today: today, food: food} = covering_setup()
    ctx = client_ctx(client)
    {:ok, day} = save_extra(ctx, today, extra_attrs(food))
    before = hd(day.slots)
    draft = before |> slot_draft() |> Map.merge(%{share: true, note_to_coach: String.duplicate("a", 4001)})
    assert {:error, _} = Diary.save_client_nutrition_day(ctx, today, %{slots: [draft]})
    {:ok, saved} = get_client_nutrition_day(ctx, today)
    assert hd(saved.slots).revision == before.revision
    assert hd(saved.slots).shared_at == nil
  end

  test "removing mistaken intake from a shared meal preserves its source and earlier communication" do
    %{client: client, today: today, food: food} = covering_setup()
    ctx = client_ctx(client)
    {:ok, day} = save_extra(ctx, today, extra_attrs(food))
    draft = day.slots |> hd() |> slot_draft() |> Map.merge(%{share: true, note_to_coach: "Recorded the wrong meal"})
    {:ok, shared} = Diary.save_client_nutrition_day(ctx, today, %{slots: [draft]})
    before = hd(shared.slots)
    correction = before |> slot_draft() |> Map.merge(%{share: true, entries: []})

    assert {:ok, corrected} = Diary.save_client_nutrition_day(ctx, today, %{slots: [correction]})
    after_slot = hd(corrected.slots)
    assert after_slot.id == before.id
    assert after_slot.shared_at == before.shared_at
    assert after_slot.revision == before.revision + 1
    refute Enum.any?(after_slot.rows, & &1.entry_id)
    assert {:ok, %{messages: [message]}} = Easy.Chat.list_client_messages(ctx)
    assert message.body == "Recorded the wrong meal"
    assert message.embed_id == before.id
  end
end
