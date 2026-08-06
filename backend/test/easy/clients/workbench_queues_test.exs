defmodule Easy.Clients.WorkbenchQueuesTest do
  use Easy.SchemaCase

  alias Easy.Clients

  setup do
    business = insert(:business)
    coach = insert(:coach, business: business)
    today = Date.utc_today()
    # Older than every queue window so a fixture is only in the queues its own
    # attributes put it in (RM-016: offsets from today, never fixed dates).
    settled_at = DateTime.add(DateTime.utc_now(:second), -60, :day)

    %{business: business, coach: coach, today: today, settled_at: settled_at}
  end

  defp covered_client(%{business: business, coach: coach, today: today, settled_at: settled_at}, plan_end) do
    client = insert(:client, business: business, creator: coach, inserted_at: settled_at)

    insert(:training_plan,
      business: business,
      creator: coach,
      client: client,
      status: :active,
      start_date: Date.add(today, -7),
      end_date: plan_end
    )

    client
  end

  describe "programming queue" do
    test "holds active clients with no plan in force", ctx do
      lapsed = insert(:client, business: ctx.business, creator: ctx.coach, inserted_at: ctx.settled_at)

      assert {:ok, %{clients: [listed], count: 1}} =
               Clients.list_clients(owner_ctx(ctx.business), filter: :programming)

      assert listed.id == lapsed.id
      assert listed.needs_programming
      assert listed.covered_until == nil
    end

    test "holds clients whose coverage ends within 3 days, no-plan rows first", ctx do
      ending = covered_client(ctx, Date.add(ctx.today, 2))
      lapsed = insert(:client, business: ctx.business, creator: ctx.coach, inserted_at: ctx.settled_at)

      assert {:ok, %{clients: [first, second], count: 2}} =
               Clients.list_clients(owner_ctx(ctx.business), filter: :programming)

      assert first.id == lapsed.id
      assert second.id == ending.id
      assert second.covered_until == Date.add(ctx.today, 2)
    end

    test "excludes clients covered beyond the horizon or with a successor scheduled", ctx do
      covered_client(ctx, Date.add(ctx.today, 30))

      ending_with_successor = covered_client(ctx, Date.add(ctx.today, 2))

      insert(:training_plan,
        business: ctx.business,
        creator: ctx.coach,
        client: ending_with_successor,
        status: :active,
        start_date: Date.add(ctx.today, 5),
        end_date: Date.add(ctx.today, 30)
      )

      assert {:ok, %{clients: [], count: 0}} =
               Clients.list_clients(owner_ctx(ctx.business), filter: :programming)
    end

    test "an open-ended nutrition plan (no end date) covers indefinitely", ctx do
      client = insert(:client, business: ctx.business, creator: ctx.coach, inserted_at: ctx.settled_at)

      insert(:plan,
        business: ctx.business,
        creator: ctx.coach,
        client: client,
        status: :active,
        start_date: nil,
        end_date: nil
      )

      assert {:ok, %{clients: [], count: 0}} =
               Clients.list_clients(owner_ctx(ctx.business), filter: :programming)

      assert {:ok, %{clients: [listed]}} = Clients.list_clients(owner_ctx(ctx.business))
      refute listed.needs_programming
    end

    test "nutrition coverage counts too", ctx do
      client = insert(:client, business: ctx.business, creator: ctx.coach, inserted_at: ctx.settled_at)

      insert(:plan,
        business: ctx.business,
        creator: ctx.coach,
        client: client,
        status: :active,
        start_date: Date.add(ctx.today, -7),
        end_date: Date.add(ctx.today, 30)
      )

      assert {:ok, %{clients: [], count: 0}} =
               Clients.list_clients(owner_ctx(ctx.business), filter: :programming)
    end

    test "excludes inactive clients", ctx do
      insert(:client, business: ctx.business, creator: ctx.coach, status: :inactive, inserted_at: ctx.settled_at)

      assert {:ok, %{clients: [], count: 0}} =
               Clients.list_clients(owner_ctx(ctx.business), filter: :programming)
    end
  end

  describe "expiring queue" do
    test "holds active clients ending within 7 days, soonest first", ctx do
      later = covered_client(ctx, Date.add(ctx.today, 60))
      sooner = covered_client(ctx, Date.add(ctx.today, 60))
      covered_client(ctx, Date.add(ctx.today, 60))

      {:ok, _} = later |> Ecto.Changeset.change(subscription_ends_on: Date.add(ctx.today, 6)) |> Repo.update()
      {:ok, _} = sooner |> Ecto.Changeset.change(subscription_ends_on: Date.add(ctx.today, 1)) |> Repo.update()

      assert {:ok, %{clients: [first, second], count: 2}} =
               Clients.list_clients(owner_ctx(ctx.business), filter: :expiring)

      assert first.id == sooner.id
      assert second.id == later.id
      assert first.expiring_soon
    end

    test "excludes subscriptions past their end or beyond the window", ctx do
      past = covered_client(ctx, Date.add(ctx.today, 60))
      far = covered_client(ctx, Date.add(ctx.today, 60))

      {:ok, _} = past |> Ecto.Changeset.change(subscription_ends_on: Date.add(ctx.today, -1)) |> Repo.update()
      {:ok, _} = far |> Ecto.Changeset.change(subscription_ends_on: Date.add(ctx.today, 30)) |> Repo.update()

      assert {:ok, %{clients: [], count: 0}} =
               Clients.list_clients(owner_ctx(ctx.business), filter: :expiring)
    end
  end

  describe "new queue" do
    test "holds recent additions, stale pending invites, and incomplete intake", ctx do
      recent = insert(:client, business: ctx.business, creator: ctx.coach)

      stale_invite =
        insert(:client,
          business: ctx.business,
          creator: ctx.coach,
          status: :pending,
          user: nil,
          inserted_at: ctx.settled_at,
          invitation_sent_at: DateTime.add(DateTime.utc_now(:second), -5, :day)
        )

      open_intake = covered_client(ctx, Date.add(ctx.today, 60))

      insert(:form_assignment,
        business: ctx.business,
        client: open_intake,
        purpose: "intake",
        status: "assigned",
        form_template: build(:form_template, business: ctx.business)
      )

      assert {:ok, %{clients: clients, count: 3}} =
               Clients.list_clients(owner_ctx(ctx.business), filter: :new)

      assert Enum.map(clients, & &1.id) |> Enum.sort() ==
               Enum.sort([recent.id, stale_invite.id, open_intake.id])
    end

    test "excludes settled and inactive clients", ctx do
      covered_client(ctx, Date.add(ctx.today, 60))
      insert(:client, business: ctx.business, creator: ctx.coach, status: :inactive)

      fresh_invite =
        insert(:client,
          business: ctx.business,
          creator: ctx.coach,
          status: :pending,
          user: nil,
          inserted_at: ctx.settled_at,
          invitation_sent_at: DateTime.utc_now(:second)
        )

      assert {:ok, %{clients: clients, count: 0}} =
               Clients.list_clients(owner_ctx(ctx.business), filter: :new)

      refute Enum.any?(clients, &(&1.id == fresh_invite.id))
    end
  end

  describe "quiet queue" do
    # A daily schedule makes the two most recent scheduled dates exactly
    # yesterday and the day before, whatever today's weekday is (RM-016).
    @all_weekdays ~w(monday tuesday wednesday thursday friday saturday sunday)

    defp scheduled_client(ctx, opts \\ []) do
      client = insert(:client, business: ctx.business, creator: ctx.coach, inserted_at: ctx.settled_at)

      plan =
        insert(:training_plan,
          business: ctx.business,
          creator: ctx.coach,
          client: client,
          status: :active,
          start_date: Keyword.get(opts, :start_date, Date.add(ctx.today, -30)),
          end_date: Date.add(ctx.today, 30)
        )

      workout = insert(:workout, plan: plan, business: ctx.business, weekdays: @all_weekdays)
      {client, workout}
    end

    defp complete_session(ctx, client, workout, date) do
      Repo.insert!(%Easy.Training.TrainingSession{
        date: date,
        state: :completed,
        started_at: DateTime.utc_now(:second),
        client_id: client.id,
        business_id: ctx.business.id,
        training_workout_id: workout.id
      })
    end

    test "holds clients who missed their last two scheduled sessions", ctx do
      {never_trained, _workout} = scheduled_client(ctx)
      {lapsed, lapsed_workout} = scheduled_client(ctx)
      complete_session(ctx, lapsed, lapsed_workout, Date.add(ctx.today, -3))

      {present, present_workout} = scheduled_client(ctx)
      complete_session(ctx, present, present_workout, Date.add(ctx.today, -1))

      assert {:ok, %{clients: clients, count: 2}} =
               Easy.Workbench.list_quiet_clients(owner_ctx(ctx.business))

      assert Enum.map(clients, & &1.id) |> Enum.sort() == Enum.sort([never_trained.id, lapsed.id])
    end

    test "a plan too young to have missed two sessions stays out", ctx do
      scheduled_client(ctx, start_date: Date.add(ctx.today, -1))

      assert {:ok, %{clients: [], count: 0}} = Easy.Workbench.list_quiet_clients(owner_ctx(ctx.business))
    end

    test "clients with no weekday schedule are never quiet", ctx do
      covered_client(ctx, Date.add(ctx.today, 30))

      assert {:ok, %{clients: [], count: 0}} = Easy.Workbench.list_quiet_clients(owner_ctx(ctx.business))
    end

    test "a missed latest check-in is the second arm, superseded assignments are not", ctx do
      missed = covered_client(ctx, Date.add(ctx.today, 30))

      insert(:form_assignment,
        business: ctx.business,
        client: missed,
        purpose: "check_in",
        status: "missed",
        due_date: Date.add(ctx.today, -4),
        form_template: build(:form_template, business: ctx.business)
      )

      recovered = covered_client(ctx, Date.add(ctx.today, 30))

      insert(:form_assignment,
        business: ctx.business,
        client: recovered,
        purpose: "check_in",
        status: "missed",
        due_date: Date.add(ctx.today, -10),
        form_template: build(:form_template, business: ctx.business)
      )

      insert(:form_assignment,
        business: ctx.business,
        client: recovered,
        purpose: "check_in",
        status: "assigned",
        due_date: Date.add(ctx.today, 3),
        form_template: build(:form_template, business: ctx.business)
      )

      assert {:ok, %{clients: [listed], count: 1}} = Easy.Workbench.list_quiet_clients(owner_ctx(ctx.business))
      assert listed.id == missed.id
    end

    test "orders longest-quiet first", ctx do
      recent = covered_client(ctx, Date.add(ctx.today, 30))

      insert(:form_assignment,
        business: ctx.business,
        client: recent,
        purpose: "check_in",
        status: "missed",
        due_date: Date.add(ctx.today, -1),
        form_template: build(:form_template, business: ctx.business)
      )

      older = covered_client(ctx, Date.add(ctx.today, 30))

      insert(:form_assignment,
        business: ctx.business,
        client: older,
        purpose: "check_in",
        status: "missed",
        due_date: Date.add(ctx.today, -10),
        form_template: build(:form_template, business: ctx.business)
      )

      assert {:ok, %{clients: [first, second]}} = Easy.Workbench.list_quiet_clients(owner_ctx(ctx.business))
      assert first.id == older.id
      assert second.id == recent.id
    end
  end

  describe "snooze" do
    test "a snoozed quiet client leaves the queue and returns on expiry", ctx do
      {client, _workout} = scheduled_client(ctx)
      owner = owner_ctx(ctx.business)

      assert {:ok, %{count: 1}} = Easy.Workbench.list_quiet_clients(owner)

      assert {:ok, _snooze} =
               Easy.Workbench.snooze_queue_for_client(owner, client.id, %{
                 queue: :quiet,
                 snoozed_until: Date.add(ctx.today, 7)
               })

      assert {:ok, %{count: 0}} = Easy.Workbench.list_quiet_clients(owner)
      assert {:ok, counts} = Easy.Workbench.counts(owner)
      assert counts.quiet == 0

      # Re-snoozing to a past date is expiry: the client reappears.
      assert {:ok, _snooze} =
               Easy.Workbench.snooze_queue_for_client(owner, client.id, %{
                 queue: :quiet,
                 snoozed_until: Date.add(ctx.today, -1)
               })

      assert {:ok, %{count: 1}} = Easy.Workbench.list_quiet_clients(owner)
    end

    test "an expiring snooze hides the queue row but not the roster flag", ctx do
      client = covered_client(ctx, Date.add(ctx.today, 60))
      {:ok, _} = client |> Ecto.Changeset.change(subscription_ends_on: Date.add(ctx.today, 3)) |> Repo.update()
      owner = owner_ctx(ctx.business)

      assert {:ok, %{count: 1}} = Clients.list_clients(owner, filter: :expiring)

      assert {:ok, _snooze} =
               Easy.Workbench.snooze_queue_for_client(owner, client.id, %{
                 queue: :expiring,
                 snoozed_until: Date.add(ctx.today, 14)
               })

      assert {:ok, %{count: 0}} = Clients.list_clients(owner, filter: :expiring)
      assert {:ok, counts} = Clients.count_workbench_queues(owner)
      assert counts.expiring == 0

      assert {:ok, %{clients: [listed]}} = Clients.list_clients(owner)
      assert listed.expiring_soon
    end

    test "cannot snooze another business's client", ctx do
      other_business = insert(:business)
      other = insert(:client, business: other_business, creator: insert(:coach, business: other_business))

      assert {:error, :not_found} =
               Easy.Workbench.snooze_queue_for_client(owner_ctx(ctx.business), other.id, %{
                 queue: :quiet,
                 snoozed_until: Date.add(ctx.today, 7)
               })
    end
  end

  describe "count_workbench_queues/1" do
    test "counts every queue in one pass and scopes by tenant", ctx do
      # programming: lapsed; new: recent addition (also programming)
      insert(:client, business: ctx.business, creator: ctx.coach)

      expiring = covered_client(ctx, Date.add(ctx.today, 60))
      {:ok, _} = expiring |> Ecto.Changeset.change(subscription_ends_on: Date.add(ctx.today, 3)) |> Repo.update()

      other_business = insert(:business)
      insert(:client, business: other_business, creator: insert(:coach, business: other_business))

      assert {:ok, counts} = Clients.count_workbench_queues(owner_ctx(ctx.business))
      assert counts == %{programming: 1, expiring: 1, new_clients: 1}
    end
  end
end
