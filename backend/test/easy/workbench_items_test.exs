defmodule Easy.WorkbenchItemsTest do
  use Easy.DataCase, async: true

  alias Easy.Workbench
  alias Easy.WorkbenchItemPage
  alias Easy.WorkbenchItems
  alias Easy.WorkbenchPage

  test "captured calendar instant persists through cursors across client-local midnight" do
    business = insert(:business)
    coach = insert(:coach, business: business, user: business.owner)
    ctx = owner_ctx(business)
    day = Date.add(Date.utc_today(), -2)
    before_midnight = DateTime.new!(day, ~T[18:29:00], "Etc/UTC")
    after_midnight = DateTime.add(before_midnight, 120, :second)

    clients =
      for zone <- ["Etc/UTC", "Asia/Kolkata"] do
        person = insert(:client, business: business, creator: coach, timezone: zone, required_services: [:training])

        insert(:training_plan,
          business: business,
          creator: coach,
          client: person,
          start_date: Date.add(day, -3),
          end_date: day
        )

        person
      end

    earlier = Repo.all(WorkbenchItems.facts(ctx, "awaiting", before_midnight))
    later = Repo.all(WorkbenchItems.facts(ctx, "awaiting", after_midnight))
    assert Enum.all?(earlier, &(&1.band == 2))
    assert Enum.find(later, &(&1.client_id == List.last(clients).id)).band == 0
    assert Enum.find(later, &(&1.client_id == hd(clients).id)).band == 2

    {:ok, params} = WorkbenchItemPage.prepare(ctx, [])
    ordered = Enum.sort_by(earlier, & &1.source_id)
    page = WorkbenchPage.finish(ordered, 1, 2, params.scope, &WorkbenchItemPage.position(&1, before_midnight))
    assert {:ok, decoded} = WorkbenchItemPage.prepare(ctx, cursor: page.next_cursor)
    assert decoded.evaluated_at == before_midnight
    assert {:ok, continued} = Workbench.list_items(ctx, cursor: page.next_cursor)
    assert continued.count == 2
    assert length(continued.items) == 1
    assert hd(continued.items).due_on == Date.add(day, 1)
    assert hd(hd(continued.items).reasons).code == :service_coverage_ending_soon

    assert {:ok, fresh} = Workbench.list_items(ctx)
    assert Enum.all?(fresh.items, &(hd(&1.reasons).code == :service_coverage_missing))
  end

  test "cursor validation rejects overflow, invalid ranks and a different ordering version" do
    business = insert(:business)
    ctx = owner_ctx(business)
    {:ok, params} = WorkbenchItemPage.prepare(ctx, [])
    position = %{band: 0, order_value: 0, kind_rank: 2, service_rank: 0, source_id: Ecto.UUID.generate()}

    page =
      WorkbenchPage.finish(
        [position, position],
        1,
        2,
        params.scope,
        &WorkbenchItemPage.position(&1, params.evaluated_at)
      )

    decoded = page.next_cursor |> Base.url_decode64!(padding: false) |> Jason.decode!()

    for bad <- [
          put_in(decoded, ["position", "order_value"], 99_999_999_999_999_999_999),
          put_in(decoded, ["position", "kind_rank"], 7),
          put_in(decoded, ["scope", "version"], 2)
        ] do
      cursor = bad |> Jason.encode!() |> Base.url_encode64(padding: false)
      assert {:error, :invalid_cursor} = Workbench.list_items(ctx, cursor: cursor)
    end
  end
end
