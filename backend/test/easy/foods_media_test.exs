defmodule Easy.FoodsMediaTest do
  use Easy.DataCase, async: false

  alias Easy.Foods

  test "attaches same-business media and exposes it on the food" do
    coach = insert(:coach)
    media = insert(:library_media, business: coach.business)

    attrs = params_for(:food_attrs) |> Map.put("media_id", media.id)
    assert {:ok, food} = Foods.create_food(trainer_ctx(coach), atomize(attrs))

    assert food.media_id == media.id
    assert food.media.id == media.id
  end

  test "rejects cross-business media as not found" do
    coach = insert(:coach)
    other_media = insert(:library_media)

    attrs = params_for(:food_attrs) |> Map.put("media_id", other_media.id) |> atomize()
    assert {:error, :not_found} = Foods.create_food(trainer_ctx(coach), attrs)
  end

  test "replace and remove keep other fields intact" do
    coach = insert(:coach)
    media_a = insert(:library_media, business: coach.business)
    media_b = insert(:library_media, business: coach.business)
    ctx = trainer_ctx(coach)

    {:ok, food} =
      Foods.create_food(ctx, atomize(Map.merge(params_for(:food_attrs), %{"name" => "Yogurt", "media_id" => media_a.id})))

    {:ok, replaced} = Foods.update_food(ctx, food.id, %{media_id: media_b.id})
    assert replaced.media_id == media_b.id
    assert replaced.name == "Yogurt"

    {:ok, removed} = Foods.update_food(ctx, food.id, %{media_id: nil})
    assert removed.media_id == nil
    assert removed.media == nil
    assert removed.name == "Yogurt"
  end

  defp atomize(map) do
    Map.new(map, fn {k, v} -> {String.to_existing_atom(k), v} end)
  end
end
