defmodule Easy.WorkbenchProgrammingQueueTest do
  use Easy.DataCase

  alias Easy.Ctx
  alias Easy.Workbench

  setup do
    business = insert(:business)
    coach = insert(:coach, business: business, user: business.owner)

    today = Easy.LocalCalendar.to_local_date(DateTime.utc_now(), Easy.LocalCalendar.default_timezone())
    %{business: business, coach: coach, ctx: owner_ctx(business), today: today}
  end

  test "expands required services and returns overlapping distinct counts", ctx do
    training = insert_client(ctx, [:training])
    nutrition = insert_client(ctx, [:nutrition])
    both = insert_client(ctx, [:training, :nutrition])
    insert_client(ctx, [])
    insert_client(ctx, [:training, :nutrition], status: :inactive, inactive_reason: :manual)

    assert {:ok, %{count: 3, items: items}} = Workbench.list_programming_queue(ctx.ctx)

    assert Enum.map(items, & &1.client.id) == Enum.sort([training.id, both.id]) ++ [nutrition.id]

    both_item = Enum.find(items, &(&1.client.id == both.id))

    assert both_item.reasons == [
             %{code: :service_never_programmed, service: :training},
             %{code: :service_never_programmed, service: :nutrition}
           ]

    assert {:ok, %{count: 2, items: training_items}} =
             Workbench.list_programming_queue(ctx.ctx, service: :training)

    assert Enum.map(training_items, & &1.client.id) == Enum.sort([training.id, both.id])
    assert Enum.all?(training_items, &Enum.all?(&1.reasons, fn reason -> reason.service == :training end))

    assert {:ok, %{count: 2, items: nutrition_items}} =
             Workbench.list_programming_queue(ctx.ctx, service: "nutrition")

    assert Enum.map(nutrition_items, & &1.client.id) == Enum.sort([nutrition.id, both.id])

    assert {:ok, %{programming: counts}} = Workbench.counts(ctx.ctx)
    assert counts == %{all: 3, training: 2, nutrition: 2}
  end

  test "classifies history, lapsed coverage, and both lookahead boundaries", ctx do
    archived = insert_client(ctx, [:training])
    insert_training_plan(ctx, archived, Date.add(ctx.today, -20), Date.add(ctx.today, -10), true)

    lapsed = insert_client(ctx, [:nutrition])
    insert_nutrition_plan(ctx, lapsed, Date.add(ctx.today, -20), Date.add(ctx.today, -1))

    ending_today = insert_client(ctx, [:training])
    insert_training_plan(ctx, ending_today, Date.add(ctx.today, -20), ctx.today)

    ending_day_six = insert_client(ctx, [:nutrition])
    insert_nutrition_plan(ctx, ending_day_six, Date.add(ctx.today, -20), Date.add(ctx.today, 6))

    covered_through_horizon = insert_client(ctx, [:training])
    insert_training_plan(ctx, covered_through_horizon, Date.add(ctx.today, -20), Date.add(ctx.today, 7))

    assert {:ok, %{count: 4, items: items}} = Workbench.list_programming_queue(ctx.ctx)

    assert Enum.map(Enum.take(items, 2), & &1.client.id) == [archived.id, lapsed.id]
    assert Enum.at(items, 2).client.id == ending_today.id
    assert Enum.at(items, 3).client.id == ending_day_six.id
    refute Enum.any?(items, &(&1.client.id == covered_through_horizon.id))

    Enum.each(Enum.take(items, 2), fn item ->
      assert [%{code: :service_coverage_missing, first_uncovered_on: first_uncovered_on}] = item.reasons
      assert first_uncovered_on == ctx.today
    end)

    assert Enum.at(items, 2).reasons == [
             %{
               code: :service_coverage_ending_soon,
               service: :training,
               coverage_ends_on: ctx.today,
               first_uncovered_on: Date.add(ctx.today, 1)
             }
           ]

    assert Enum.at(items, 3).reasons == [
             %{
               code: :service_coverage_ending_soon,
               service: :nutrition,
               coverage_ends_on: Date.add(ctx.today, 6),
               first_uncovered_on: Date.add(ctx.today, 7)
             }
           ]
  end

  test "seamless successors and open-ended plans cover while an internal gap remains", ctx do
    seamless = insert_client(ctx, [:training])
    insert_training_plan(ctx, seamless, Date.add(ctx.today, -10), Date.add(ctx.today, 2))
    insert_training_plan(ctx, seamless, Date.add(ctx.today, 3), Date.add(ctx.today, 20))

    gap = insert_client(ctx, [:nutrition])
    insert_nutrition_plan(ctx, gap, Date.add(ctx.today, -10), Date.add(ctx.today, 2))
    insert_nutrition_plan(ctx, gap, Date.add(ctx.today, 4), Date.add(ctx.today, 20))

    open_ended = insert_client(ctx, [:training])
    insert_training_plan(ctx, open_ended, Date.add(ctx.today, -10), nil)

    assert {:ok, %{count: 1, items: [item]}} = Workbench.list_programming_queue(ctx.ctx)
    assert item.client.id == gap.id

    assert item.reasons == [
             %{
               code: :service_coverage_ending_soon,
               service: :nutrition,
               coverage_ends_on: Date.add(ctx.today, 2),
               first_uncovered_on: Date.add(ctx.today, 3)
             }
           ]
  end

  test "unassigned and deleted plans do not create history but archived assigned plans do", ctx do
    never = insert_client(ctx, [:training])

    insert(:training_plan,
      business: ctx.business,
      creator: ctx.coach,
      client: nil,
      start_date: Date.add(ctx.today, -10),
      end_date: Date.add(ctx.today, 20)
    )

    deleted = insert_client(ctx, [:training])
    deleted_plan = insert_training_plan(ctx, deleted, Date.add(ctx.today, -10), Date.add(ctx.today, 20))
    assert {:ok, _deleted_plan} = Repo.delete(deleted_plan)

    archived = insert_client(ctx, [:nutrition])
    insert_nutrition_plan(ctx, archived, Date.add(ctx.today, -10), Date.add(ctx.today, 20), :archived)

    assert {:ok, %{count: 3, items: items}} = Workbench.list_programming_queue(ctx.ctx)

    assert Enum.find(items, &(&1.client.id == never.id)).reasons == [
             %{code: :service_never_programmed, service: :training}
           ]

    assert Enum.find(items, &(&1.client.id == deleted.id)).reasons == [
             %{code: :service_never_programmed, service: :training}
           ]

    assert Enum.find(items, &(&1.client.id == archived.id)).reasons == [
             %{
               code: :service_coverage_missing,
               service: :nutrition,
               first_uncovered_on: ctx.today
             }
           ]
  end

  test "filtering changes the reason set and pagination preserves total membership", ctx do
    both = insert_client(ctx, [:training, :nutrition])
    insert_training_plan(ctx, both, Date.add(ctx.today, -20), Date.add(ctx.today, -1))
    never_training = insert_client(ctx, [:training])

    assert {:ok, %{count: 2, items: [first]}} =
             Workbench.list_programming_queue(ctx.ctx, limit: 1)

    assert first.client.id in [both.id, never_training.id]
    assert hd(first.reasons).code == :service_never_programmed

    assert {:ok, %{count: 2, items: all_items}} = Workbench.list_programming_queue(ctx.ctx)

    assert Enum.find(all_items, &(&1.client.id == both.id)).reasons == [
             %{code: :service_never_programmed, service: :nutrition},
             %{
               code: :service_coverage_missing,
               service: :training,
               first_uncovered_on: ctx.today
             }
           ]

    assert {:ok, %{count: 2, items: training_items}} =
             Workbench.list_programming_queue(ctx.ctx, service: :training)

    both_training = Enum.find(training_items, &(&1.client.id == both.id))

    assert both_training.reasons == [
             %{
               code: :service_coverage_missing,
               service: :training,
               first_uncovered_on: ctx.today
             }
           ]

    assert {:ok, %{count: 1, items: [nutrition_item]}} =
             Workbench.list_programming_queue(ctx.ctx, service: :nutrition)

    assert nutrition_item.client.id == both.id
    assert nutrition_item.reasons == [%{code: :service_never_programmed, service: :nutrition}]
    assert {:error, :invalid_service} = Workbench.list_programming_queue(ctx.ctx, service: :mobility)
  end

  test "cursor paging keeps the native priority order after an anchor is deleted", ctx do
    first = insert_client(ctx, [:training])
    second = insert_client(ctx, [:training])
    third = insert_client(ctx, [:training])

    assert {:ok, %{count: 3, items: [first_item], next_cursor: cursor}} =
             Workbench.list_programming_queue(ctx.ctx, cursor: "start", limit: 1)

    assert first_item.client.id == Enum.min([first.id, second.id, third.id])
    assert is_binary(cursor)

    Repo.delete!(first_item.client)

    assert {:ok, %{count: 2, items: [next_item], next_cursor: _}} =
             Workbench.list_programming_queue(ctx.ctx, cursor: cursor, limit: 1)

    assert next_item.client.id == Enum.sort([first.id, second.id, third.id]) |> Enum.at(1)
  end

  test "search is escaped before the count and cursor page are calculated", ctx do
    matching = insert_client(ctx, [:training], first_name: "100% Ready")
    insert_client(ctx, [:training], first_name: "100 Percent Ready")

    assert {:ok, %{count: 1, items: [item], next_cursor: nil}} =
             Workbench.list_programming_queue(ctx.ctx, search: "100%", cursor: "start", limit: 1)

    assert item.client.id == matching.id
  end

  test "rejects malformed cursors and cursor requests with a legacy offset", ctx do
    assert {:error, :invalid_cursor} =
             Workbench.list_programming_queue(ctx.ctx, cursor: "not-a-cursor")

    assert {:error, :cursor_incompatible} =
             Workbench.list_programming_queue(ctx.ctx, cursor: "start", offset: 1)
  end

  test "is tenant-scoped, trainer-visible, and fail-closed", ctx do
    trainer = insert(:coach, business: ctx.business)
    other_trainer = insert(:coach, business: ctx.business)

    visible =
      insert(:client,
        business: ctx.business,
        creator: trainer,
        assigned_coach: trainer,
        required_services: [:training]
      )

    insert(:client,
      business: ctx.business,
      creator: other_trainer,
      assigned_coach: other_trainer,
      required_services: [:training]
    )

    other_business = insert(:business)
    insert(:client, business: other_business, required_services: [:training])

    assert {:ok, %{count: 1, items: [item]}} =
             Workbench.list_programming_queue(trainer_ctx(trainer))

    assert item.client.id == visible.id

    malformed = Ctx.new(ctx.business.id, Ecto.UUID.generate(), nil, false)
    assert {:ok, %{count: 0, items: []}} = Workbench.list_programming_queue(malformed)
  end

  test "coverage and urgency use each client's local midnight", ctx do
    now = DateTime.new!(ctx.today, ~T[12:00:00], "Etc/UTC")
    tomorrow = Date.add(ctx.today, 1)
    east = insert_client(ctx, [:nutrition], timezone: "Pacific/Kiritimati")
    west = insert_client(ctx, [:training], timezone: "Pacific/Honolulu")
    insert_nutrition_plan(ctx, east, tomorrow, nil)
    insert_training_plan(ctx, west, tomorrow, nil)

    facts = Easy.WorkbenchProgrammingQueue.service_facts(ctx.ctx, now) |> Repo.all()
    refute Enum.any?(facts, &(&1.client_id == east.id))
    assert [fact] = facts
    assert fact.client_id == west.id
    assert fact.code == "service_coverage_missing"
    assert fact.first_uncovered_on == ctx.today

    Repo.update!(Ecto.Changeset.change(east, timezone: ""))
    Repo.update!(Ecto.Changeset.change(ctx.business, timezone: "Pacific/Kiritimati"))
    fallback = Easy.WorkbenchProgrammingQueue.service_facts(ctx.ctx, now) |> Repo.all()
    refute Enum.any?(fallback, &(&1.client_id == east.id))
  end

  defp insert_client(ctx, services, attrs \\ []) do
    insert(
      :client,
      Keyword.merge(
        [business: ctx.business, creator: ctx.coach, required_services: services],
        attrs
      )
    )
  end

  defp insert_training_plan(ctx, client, start_date, end_date, archived? \\ false) do
    insert(:training_plan,
      business: ctx.business,
      creator: ctx.coach,
      client: client,
      archived_at: if(archived?, do: DateTime.utc_now(:second)),
      start_date: start_date,
      end_date: end_date
    )
  end

  defp insert_nutrition_plan(ctx, client, start_date, end_date, status \\ :active) do
    insert(:plan,
      business: ctx.business,
      creator: ctx.coach,
      client: client,
      status: status,
      start_date: start_date,
      end_date: end_date
    )
  end
end
