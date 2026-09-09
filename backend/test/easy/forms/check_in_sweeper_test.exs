defmodule Easy.Forms.CheckInSweeperTest do
  use Easy.SchemaCase, async: false

  import Swoosh.TestAssertions
  import ExUnit.CaptureLog

  alias Easy.CheckIns
  alias Easy.CheckInSweeper
  alias Easy.Ctx
  alias Easy.Forms.CheckInSchedule
  alias Easy.Forms.FormAssignment
  alias Easy.Repo

  defmodule ReminderAdapter do
    use Swoosh.Adapter

    def deliver(email, config) do
      [{_name, recipient}] = email.to
      send(config[:test_pid], {:reminder_attempt, recipient})

      if recipient == config[:reject_recipient],
        do: {:error, :provider_unavailable},
        else: {:ok, %{id: "delivered"}}
    end
  end

  for type <- [:due, :overdue] do
    @reminder_type type

    test "#{@reminder_type} reminder failures retry without repeating successful sends" do
      config = Application.fetch_env!(:easy, Easy.Mailer)
      on_exit(fn -> Application.put_env(:easy, Easy.Mailer, config) end)

      adapter_opts = [adapter: ReminderAdapter, test_pid: self(), reject_recipient: "retry@example.test"]
      Application.put_env(:easy, Easy.Mailer, adapter_opts)

      today = Date.utc_today()
      due_date = if @reminder_type == :due, do: today, else: Date.add(today, -2)
      field = if @reminder_type == :due, do: :due_reminder_sent_at, else: :overdue_reminder_sent_at

      send_reminders =
        if @reminder_type == :due do
          &CheckIns.send_due_check_in_reminders/1
        else
          &CheckIns.send_overdue_check_in_reminders/1
        end

      retry = reminder_assignment("retry@example.test", due_date)
      successful = reminder_assignment("success@example.test", due_date)

      capture_log(fn -> assert {1, 1} = send_reminders.(today) end)
      assert_receive {:reminder_attempt, "retry@example.test"}
      assert_receive {:reminder_attempt, "success@example.test"}
      assert is_nil(Map.fetch!(Repo.reload!(retry), field))
      assert Map.fetch!(Repo.reload!(successful), field)

      Application.put_env(:easy, Easy.Mailer, Keyword.delete(adapter_opts, :reject_recipient))

      assert {1, 0} = send_reminders.(Date.add(today, 1))
      assert_receive {:reminder_attempt, "retry@example.test"}
      refute_received {:reminder_attempt, "success@example.test"}
      assert Map.fetch!(Repo.reload!(retry), field)
      assert {0, 0} = send_reminders.(Date.add(today, 1))
      refute_received {:reminder_attempt, _}
    end
  end

  test "an unsent due reminder yields to the overdue reminder after two days" do
    today = Date.utc_today()
    assignment = reminder_assignment("overdue-only@example.test", Date.add(today, -2))

    assert {0, 0} = CheckIns.send_due_check_in_reminders(today)
    assert {1, 0} = CheckIns.send_overdue_check_in_reminders(today)
    assert_email_sent(to: "overdue-only@example.test", subject: "Your check-in is overdue")
    assert is_nil(Repo.reload!(assignment).due_reminder_sent_at)
  end

  test "sends and stamps one due reminder per occurrence" do
    today = Date.utc_today()
    coach = insert(:coach)
    client = insert(:client, business: coach.business, creator: coach, email: "client@example.com")
    template = insert(:form_template, business: coach.business, purpose: :check_in)
    ctx = %Ctx{business_id: coach.business_id, user_id: coach.business.owner_id, owner?: true}

    assert {:ok, _schedule} =
             CheckIns.create_check_in_schedule_for_client(ctx, client.id, %{
               form_template_id: template.id,
               frequency: :once,
               next_due_on: today
             })

    assert {1, 0} = CheckIns.send_due_check_in_reminders(today)
    assert_email_sent(to: "client@example.com", subject: "Your check-in is due")

    assignment = Repo.one!(FormAssignment.for_client(coach.business_id, client.id))
    assert assignment.due_reminder_sent_at

    assert {0, 0} = CheckIns.send_due_check_in_reminders(today)
    refute_email_sent()
  end

  test "sends a due reminder per assignment across a client's schedules" do
    coach = insert(:coach)
    client = insert(:client, business: coach.business, creator: coach, email: "multi@example.com")
    template_a = insert(:form_template, business: coach.business, purpose: :check_in)
    template_b = insert(:form_template, business: coach.business, purpose: :check_in)
    ctx = %Ctx{business_id: coach.business_id, user_id: coach.business.owner_id, owner?: true}

    today = Date.utc_today()

    for template <- [template_a, template_b] do
      assert {:ok, _schedule} =
               CheckIns.create_check_in_schedule_for_client(ctx, client.id, %{
                 form_template_id: template.id,
                 frequency: :weekly,
                 next_due_on: today
               })
    end

    assert {2, 0} = CheckIns.send_due_check_in_reminders(today)

    assignments = Repo.all(FormAssignment.for_client(coach.business_id, client.id))
    assert length(assignments) == 2
    assert Enum.all?(assignments, & &1.due_reminder_sent_at)

    assert {0, 0} = CheckIns.send_due_check_in_reminders(today)
  end

  test "sends one overdue reminder after two days" do
    today = Date.utc_today()
    client = insert(:client, email: "late@example.com")
    template = insert(:form_template, business: client.business, purpose: :check_in)

    assignment =
      insert(:form_assignment,
        business: client.business,
        client: client,
        form_template: template,
        purpose: :check_in,
        due_date: Date.add(today, -2)
      )

    assert {1, 0} = CheckIns.send_overdue_check_in_reminders(today)
    assert_email_sent(to: "late@example.com", subject: "Your check-in is overdue")
    assert Repo.reload(assignment).overdue_reminder_sent_at

    assert {0, 0} = CheckIns.send_overdue_check_in_reminders(today)
    refute_email_sent()
  end

  test "sweep is idempotent" do
    today = Date.utc_today()
    client = insert(:client, email: "sweep@example.com")
    template = insert(:form_template, business: client.business, purpose: :check_in)

    insert(:check_in_schedule,
      business: client.business,
      client: client,
      form_template: template,
      frequency: :weekly,
      next_due_on: today
    )

    assert %{generated: 1, due_reminders: 1} = CheckInSweeper.sweep(today)
    assert_email_sent(to: "sweep@example.com")

    assert %{generated: 0, due_reminders: 0} = CheckInSweeper.sweep(today)
    refute_email_sent()
    assert Repo.aggregate(FormAssignment.for_client(client.business_id, client.id), :count) == 1
  end

  test "generation and reminders process every page without loading the entire queue" do
    business = insert(:business)
    template = insert(:form_template, business: business, purpose: :check_in)
    today = Date.utc_today()

    for index <- 1..105 do
      client = insert(:client, business: business, email: "batch-#{index}@example.test")

      insert(:check_in_schedule,
        business: business,
        client: client,
        form_template: template,
        frequency: :once,
        next_due_on: today
      )
    end

    handler = {__MODULE__, make_ref()}
    :ok = :telemetry.attach(handler, [:easy, :repo, :query], &__MODULE__.capture_rows/4, self())
    on_exit(fn -> :telemetry.detach(handler) end)

    assert %{generated: 105, due_reminders: 105} = CheckInSweeper.sweep(today)
    assert {105, 0} = CheckIns.send_overdue_check_in_reminders(Date.add(today, 2))
    assert %{generated: 0, due_reminders: 0} = CheckInSweeper.sweep(today)
    assert {0, 0} = CheckIns.send_overdue_check_in_reminders(Date.add(today, 2))

    rows = received_row_counts()
    assert rows != []
    assert Enum.max(rows) <= 100
  end

  def capture_rows(_event, _measurements, %{query: "SELECT" <> _, result: {:ok, %{num_rows: count}}}, parent) do
    send(parent, {:sweep_rows, count})
  end

  def capture_rows(_event, _measurements, _metadata, _parent), do: :ok

  test "generation failures are observable, roll back the occurrence, and do not block later schedules" do
    client = insert(:client)
    template = insert(:form_template, business: client.business, purpose: :check_in)
    today = Date.utc_today()

    failed =
      insert(:check_in_schedule,
        id: "00000000-0000-0000-0000-000000000001",
        business: client.business,
        client: client,
        form_template: template,
        frequency: :once,
        next_due_on: today
      )

    other_client = insert(:client, business: client.business)

    successful =
      insert(:check_in_schedule,
        business: client.business,
        client: other_client,
        form_template: template,
        frequency: :once,
        next_due_on: today
      )

    # The trigger exists only inside this test's rolled-back transaction and
    # exercises a real constraint failure at the persistence boundary.
    Repo.query!("""
    CREATE FUNCTION pg_temp.reject_test_check_in() RETURNS trigger LANGUAGE plpgsql AS $$
    BEGIN
      RAISE EXCEPTION 'test constraint failure'
        USING ERRCODE = '23514', CONSTRAINT = 'form_assignments_status_check';
    END;
    $$;
    """)

    Repo.query!("""
    CREATE TRIGGER reject_test_check_in BEFORE INSERT ON form_assignments
    FOR EACH ROW WHEN (NEW.check_in_schedule_id = '#{failed.id}')
    EXECUTE FUNCTION pg_temp.reject_test_check_in()
    """)

    handler = {__MODULE__, make_ref()}
    :ok = :telemetry.attach(handler, [:easy, :check_ins, :generation, :error], &__MODULE__.capture_failure/4, self())
    on_exit(fn -> :telemetry.detach(handler) end)

    log = capture_log(fn -> assert {1, 0} = CheckIns.generate_due_check_ins(today) end)
    assert log =~ "Check-in generation failed"
    assert log =~ failed.id
    assert_receive {:generation_failed, %{count: 1}, %{schedule_id: schedule_id, reason: {:validation, errors}}}
    assert schedule_id == failed.id
    assert Keyword.has_key?(errors, :status)
    assert %{active: true, next_due_on: ^today} = Repo.get!(CheckInSchedule, failed.id)
    refute Repo.exists?(FormAssignment.for_schedule(client.business_id, failed.id))
    assert Repo.exists?(FormAssignment.for_schedule(client.business_id, successful.id))
  end

  def capture_failure(_event, measurements, metadata, parent) do
    send(parent, {:generation_failed, measurements, metadata})
  end

  defp received_row_counts(counts \\ []) do
    receive do
      {:sweep_rows, count} -> received_row_counts([count | counts])
    after
      0 -> counts
    end
  end

  defp reminder_assignment(email, due_date) do
    client = insert(:client, email: email)
    template = insert(:form_template, business: client.business, purpose: :check_in)

    insert(:form_assignment,
      business: client.business,
      client: client,
      form_template: template,
      purpose: :check_in,
      due_date: due_date
    )
  end
end
