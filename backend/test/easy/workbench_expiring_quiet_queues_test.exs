defmodule Easy.WorkbenchExpiringQuietQueuesTest do
  use Easy.DataCase

  alias Easy.Clients
  alias Easy.Ctx
  alias Easy.Workbench

  setup do
    business = insert(:business)
    coach = insert(:coach, business: business, user: business.owner)

    %{business: business, coach: coach, ctx: owner_ctx(business), today: Date.utc_today()}
  end

  describe "Expiring queue" do
    test "includes both renewal-window boundaries with reasons and stable order", ctx do
      ending_today_client = insert_client(ctx, subscription_ends_on: ctx.today)
      ending_day_fourteen_client = insert_client(ctx, subscription_ends_on: Date.add(ctx.today, 14))
      insert_client(ctx, subscription_ends_on: Date.add(ctx.today, 15))
      insert_client(ctx, subscription_ends_on: nil)

      assert {:ok, %{count: 2, items: [first, second]}} =
               Workbench.list_expiring_queue(ctx.ctx)

      assert first.client.id == ending_today_client.id
      assert first.reasons == [%{code: :engagement_ending_soon, ends_on: ctx.today}]
      assert second.client.id == ending_day_fourteen_client.id

      assert second.reasons == [
               %{code: :engagement_ending_soon, ends_on: Date.add(ctx.today, 14)}
             ]
    end

    test "snooze and renewal drain the queue without hiding the roster expiry fact", ctx do
      client = insert_client(ctx, subscription_ends_on: Date.add(ctx.today, 14))

      assert {:ok, %{count: 1}} = Workbench.list_expiring_queue(ctx.ctx)

      assert {:ok, _snooze} =
               Workbench.snooze_queue_for_client(ctx.ctx, client.id, %{
                 queue: :expiring,
                 snoozed_until: Date.add(ctx.today, 3)
               })

      assert {:ok, %{count: 0, items: []}} = Workbench.list_expiring_queue(ctx.ctx)
      assert {:ok, counts} = Workbench.counts(ctx.ctx)
      assert counts.expiring == 0

      assert {:ok, %{clients: [listed]}} = Clients.list_clients(ctx.ctx)
      assert listed.expiring_soon

      assert {:ok, _expired_snooze} =
               Workbench.snooze_queue_for_client(ctx.ctx, client.id, %{
                 queue: :expiring,
                 snoozed_until: Date.add(ctx.today, -1)
               })

      assert {:ok, %{count: 1}} = Workbench.list_expiring_queue(ctx.ctx)

      assert {:ok, _renewed} =
               Clients.update_client(ctx.ctx, client.id, %{
                 subscription_ends_on: Date.add(ctx.today, 15)
               })

      assert {:ok, %{count: 0, items: []}} = Workbench.list_expiring_queue(ctx.ctx)
    end

    test "keeps pagination totals and owner/trainer visibility with a stable tie-break", ctx do
      trainer = insert(:coach, business: ctx.business)
      other_trainer = insert(:coach, business: ctx.business)
      ends_on = Date.add(ctx.today, 5)

      visible =
        for _ <- 1..2 do
          insert(:client,
            business: ctx.business,
            creator: trainer,
            assigned_coach: trainer,
            subscription_ends_on: ends_on
          )
        end

      insert(:client,
        business: ctx.business,
        creator: other_trainer,
        assigned_coach: other_trainer,
        subscription_ends_on: ends_on
      )

      insert(:client,
        business: ctx.business,
        creator: trainer,
        assigned_coach: trainer,
        status: :inactive,
        inactive_reason: :manual,
        subscription_ends_on: ends_on
      )

      other_business = insert(:business)
      insert(:client, business: other_business, subscription_ends_on: ends_on)

      trainer_ctx = trainer_ctx(trainer)
      expected_ids = visible |> Enum.map(& &1.id) |> Enum.sort()

      assert {:ok, %{count: 2, items: [first]}} =
               Workbench.list_expiring_queue(trainer_ctx, limit: 1)

      assert first.client.id == hd(expected_ids)

      assert {:ok, %{count: 2, items: [second]}} =
               Workbench.list_expiring_queue(trainer_ctx, offset: 1, limit: 1)

      assert second.client.id == List.last(expected_ids)
    end
  end

  describe "Quiet queue" do
    test "uses the latest due check-in and ignores future assignments and training activity", ctx do
      waiting = insert_client(ctx, [])
      missed = insert_check_in(waiting, Date.add(ctx.today, -5), :missed)
      insert_check_in(waiting, Date.add(ctx.today, 5), :assigned)

      waiting_workout = insert_training_schedule(ctx, waiting)

      Repo.insert!(%Easy.Training.TrainingSession{
        date: Date.add(ctx.today, -1),
        state: :completed,
        started_at: DateTime.utc_now(:second),
        client_id: waiting.id,
        business_id: ctx.business.id,
        training_workout_id: waiting_workout.id
      })

      due_today = insert_client(ctx, [])
      due_today_assignment = insert_check_in(due_today, ctx.today, :missed)

      recovered = insert_client(ctx, [])
      insert_check_in(recovered, Date.add(ctx.today, -10), :missed)
      insert_check_in(recovered, Date.add(ctx.today, -1), :completed)

      training_only = insert_client(ctx, [])
      insert_training_schedule(ctx, training_only)

      future_miss = insert_client(ctx, [])
      insert_check_in(future_miss, Date.add(ctx.today, 1), :missed)

      assert {:ok, %{count: 2, items: [first, second]}} =
               Workbench.list_quiet_queue(ctx.ctx)

      assert first.client.id == waiting.id
      assert first.reasons == [%{code: :missed_check_in, assignment_id: missed.id, due_on: missed.due_date}]
      assert second.client.id == due_today.id

      assert second.reasons == [
               %{
                 code: :missed_check_in,
                 assignment_id: due_today_assignment.id,
                 due_on: ctx.today
               }
             ]
    end

    test "snooze defers work and a later completed due check-in drains it", ctx do
      client = insert_client(ctx, [])
      insert_check_in(client, Date.add(ctx.today, -3), :missed)

      assert {:ok, %{count: 1}} = Workbench.list_quiet_queue(ctx.ctx)
      assert {:ok, %{quiet: 1}} = Workbench.counts(ctx.ctx)

      assert {:ok, _snooze} =
               Workbench.snooze_queue_for_client(ctx.ctx, client.id, %{
                 queue: :quiet,
                 snoozed_until: Date.add(ctx.today, 2)
               })

      assert {:ok, %{count: 0, items: []}} = Workbench.list_quiet_queue(ctx.ctx)
      assert {:ok, %{quiet: 0}} = Workbench.counts(ctx.ctx)

      assert {:ok, _expired_snooze} =
               Workbench.snooze_queue_for_client(ctx.ctx, client.id, %{
                 queue: :quiet,
                 snoozed_until: Date.add(ctx.today, -1)
               })

      assert {:ok, %{count: 1}} = Workbench.list_quiet_queue(ctx.ctx)

      insert_check_in(client, Date.add(ctx.today, -1), :completed)

      assert {:ok, %{count: 0, items: []}} = Workbench.list_quiet_queue(ctx.ctx)
      assert {:ok, %{quiet: 0}} = Workbench.counts(ctx.ctx)
    end

    test "keeps pagination totals and owner/trainer visibility with a stable tie-break", ctx do
      trainer = insert(:coach, business: ctx.business)
      other_trainer = insert(:coach, business: ctx.business)
      due_on = Date.add(ctx.today, -2)

      visible =
        for _ <- 1..2 do
          client =
            insert(:client,
              business: ctx.business,
              creator: trainer,
              assigned_coach: trainer
            )

          insert_check_in(client, due_on, :missed)
          client
        end

      hidden =
        insert(:client,
          business: ctx.business,
          creator: other_trainer,
          assigned_coach: other_trainer
        )

      insert_check_in(hidden, due_on, :missed)

      inactive =
        insert(:client,
          business: ctx.business,
          creator: trainer,
          assigned_coach: trainer,
          status: :inactive,
          inactive_reason: :manual
        )

      insert_check_in(inactive, due_on, :missed)

      other_business = insert(:business)
      other_client = insert(:client, business: other_business)
      insert_check_in(other_client, due_on, :missed)

      trainer_ctx = trainer_ctx(trainer)
      expected_ids = visible |> Enum.map(& &1.id) |> Enum.sort()

      assert {:ok, %{count: 2, items: [first]}} =
               Workbench.list_quiet_queue(trainer_ctx, limit: 1)

      assert first.client.id == hd(expected_ids)

      assert {:ok, %{count: 2, items: [second]}} =
               Workbench.list_quiet_queue(trainer_ctx, offset: 1, limit: 1)

      assert second.client.id == List.last(expected_ids)

      malformed = Ctx.new(ctx.business.id, Ecto.UUID.generate(), nil, false)
      assert {:ok, %{count: 0, items: []}} = Workbench.list_quiet_queue(malformed)
    end
  end

  defp insert_client(ctx, attrs) do
    insert(
      :client,
      Keyword.merge([business: ctx.business, creator: ctx.coach, status: :active], attrs)
    )
  end

  defp insert_check_in(client, due_date, status) do
    template = insert(:form_template, business: client.business, purpose: :check_in)

    insert(:form_assignment,
      business: client.business,
      client: client,
      form_template: template,
      purpose: :check_in,
      status: status,
      due_date: due_date
    )
  end

  defp insert_training_schedule(ctx, client) do
    plan =
      insert(:training_plan,
        business: ctx.business,
        creator: ctx.coach,
        client: client,
        status: :active,
        start_date: Date.add(ctx.today, -30),
        end_date: Date.add(ctx.today, 30)
      )

    insert(:workout,
      plan: plan,
      business: ctx.business,
      weekdays: ~w(monday tuesday wednesday thursday friday saturday sunday)
    )
  end
end
