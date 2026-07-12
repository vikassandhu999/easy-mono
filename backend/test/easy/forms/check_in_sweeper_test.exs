defmodule Easy.Forms.CheckInSweeperTest do
  use Easy.SchemaCase, async: false

  import Swoosh.TestAssertions

  alias Easy.CheckInSweeper
  alias Easy.Forms
  alias Easy.Forms.FormAssignment
  alias Easy.Ctx
  alias Easy.Repo

  test "sends and stamps one due reminder per occurrence" do
    coach = insert(:coach)
    client = insert(:client, business: coach.business, creator: coach, email: "client@example.com")
    template = insert(:form_template, business: coach.business, purpose: :check_in)
    ctx = %Ctx{business_id: coach.business_id, user_id: coach.business.owner_id, owner?: true}

    assert {:ok, _schedule} =
             Forms.create_check_in_schedule_for_client(ctx, client.id, %{
               form_template_id: template.id,
               frequency: :once,
               next_due_on: ~D[2026-07-11]
             })

    assert {1, 0} = Forms.send_due_check_in_reminders(~D[2026-07-11])
    assert_email_sent(to: "client@example.com", subject: "Your check-in is due")

    assignment = Repo.one!(FormAssignment.for_client(coach.business_id, client.id))
    assert assignment.due_reminder_sent_at

    assert {0, 0} = Forms.send_due_check_in_reminders(~D[2026-07-11])
    refute_email_sent()
  end

  test "sends one overdue reminder after two days" do
    client = insert(:client, email: "late@example.com")
    template = insert(:form_template, business: client.business, purpose: :check_in)

    assignment =
      insert(:form_assignment,
        business: client.business,
        client: client,
        form_template: template,
        purpose: :check_in,
        due_date: ~D[2026-07-09]
      )

    assert {1, 0} = Forms.send_overdue_check_in_reminders(~D[2026-07-11])
    assert_email_sent(to: "late@example.com", subject: "Your check-in is overdue")
    assert Repo.reload(assignment).overdue_reminder_sent_at

    assert {0, 0} = Forms.send_overdue_check_in_reminders(~D[2026-07-11])
    refute_email_sent()
  end

  test "sweep is idempotent" do
    client = insert(:client, email: "sweep@example.com")
    template = insert(:form_template, business: client.business, purpose: :check_in)

    insert(:check_in_schedule,
      business: client.business,
      client: client,
      form_template: template,
      frequency: :weekly,
      next_due_on: ~D[2026-07-11]
    )

    assert %{generated: 1, due_reminders: 1} = CheckInSweeper.sweep(~D[2026-07-11])
    assert_email_sent(to: "sweep@example.com")

    assert %{generated: 0, due_reminders: 0} = CheckInSweeper.sweep(~D[2026-07-11])
    refute_email_sent()
    assert Repo.aggregate(FormAssignment.for_client(client.business_id, client.id), :count) == 1
  end
end
