defmodule Easy.WorkbenchLifecycleCommunicationQueuesTest do
  use Easy.DataCase

  alias Easy.Chat
  alias Easy.Ctx
  alias Easy.Forms
  alias Easy.Workbench

  describe "Onboarding queue" do
    test "uses lifecycle-gated reason facts and strict due boundaries" do
      business = insert(:business)
      coach = insert(:coach, business: business, user: business.owner)
      now = DateTime.utc_now(:second)
      today = Date.utc_today()

      fresh =
        insert(:client,
          business: business,
          creator: coach,
          status: :pending,
          user: nil,
          invitation_sent_at: now |> DateTime.add(-3, :day) |> DateTime.add(1, :second)
        )

      invitation =
        insert(:client,
          business: business,
          creator: coach,
          status: :pending,
          user: nil,
          invitation_sent_at: DateTime.add(now, -4, :day)
        )

      insert_intake(invitation, Date.add(today, -7))

      intake =
        insert(:client,
          business: business,
          creator: coach,
          status: :active,
          joined_at: DateTime.add(now, -2, :day),
          invitation_sent_at: DateTime.add(now, -10, :day)
        )

      assignment = insert_intake(intake, Date.add(today, -5))

      due_today =
        insert(:client,
          business: business,
          creator: coach,
          status: :active,
          joined_at: DateTime.add(now, -2, :day)
        )

      insert_intake(due_today, today)

      no_due_date =
        insert(:client,
          business: business,
          creator: coach,
          status: :active,
          joined_at: DateTime.add(now, -2, :day)
        )

      insert_intake(no_due_date, nil)

      inactive =
        insert(:client,
          business: business,
          creator: coach,
          status: :inactive,
          inactive_reason: :manual,
          joined_at: DateTime.add(now, -2, :day)
        )

      insert_intake(inactive, Date.add(today, -8))

      assert {:ok, %{count: 2, items: [intake_item, invitation_item]}} =
               Workbench.list_onboarding_queue(owner_ctx(business))

      assert intake_item.client.id == intake.id

      assert intake_item.reasons == [
               %{code: :intake_overdue, assignment_id: assignment.id, due_on: assignment.due_date}
             ]

      assert invitation_item.client.id == invitation.id

      assert invitation_item.reasons == [
               %{
                 code: :invitation_follow_up_due,
                 invitation_id: invitation.id,
                 sent_at: invitation.invitation_sent_at,
                 follow_up_due_at: DateTime.add(invitation.invitation_sent_at, 3, :day)
               }
             ]

      refute fresh.id in Enum.map([intake_item, invitation_item], & &1.client.id)
    end

    test "resending, completing, and dismissing drain work while pagination preserves the total" do
      business = insert(:business)
      coach = insert(:coach, business: business, user: business.owner)
      sent_at = DateTime.add(DateTime.utc_now(:second), -5, :day)

      invitations =
        for _ <- 1..2 do
          insert(:client,
            business: business,
            creator: coach,
            status: :pending,
            user: nil,
            invitation_sent_at: sent_at
          )
        end

      assert {:ok, %{count: 2, items: [item]}} =
               Workbench.list_onboarding_queue(owner_ctx(business), limit: 1)

      assert item.client.id == invitations |> Enum.map(& &1.id) |> Enum.sort() |> hd()

      invitation = hd(invitations)
      {:ok, _resent} = Easy.Clients.resend_invitation(owner_ctx(business), invitation.id)

      completed_client =
        insert(:client,
          business: business,
          creator: coach,
          joined_at: DateTime.utc_now(:microsecond)
        )

      insert_intake(completed_client, Date.add(Date.utc_today(), -2), :completed)

      dismissed_client =
        insert(:client,
          business: business,
          creator: coach,
          joined_at: DateTime.utc_now(:microsecond)
        )

      insert_intake(dismissed_client, Date.add(Date.utc_today(), -2), :dismissed)

      assert {:ok, %{count: 1, items: [remaining]}} =
               Workbench.list_onboarding_queue(owner_ctx(business))

      assert remaining.client.id == List.last(invitations).id
      refute remaining.client.id in [completed_client.id, dismissed_client.id]
    end

    test "is tenant-scoped, trainer-visible, and fail-closed" do
      business = insert(:business)
      trainer = insert(:coach, business: business)
      other_trainer = insert(:coach, business: business)
      sent_at = DateTime.add(DateTime.utc_now(:second), -4, :day)

      visible =
        insert(:client,
          business: business,
          creator: trainer,
          assigned_coach: trainer,
          status: :pending,
          user: nil,
          invitation_sent_at: sent_at
        )

      insert(:client,
        business: business,
        creator: other_trainer,
        assigned_coach: other_trainer,
        status: :pending,
        user: nil,
        invitation_sent_at: sent_at
      )

      other_business = insert(:business)
      insert(:client, business: other_business, status: :pending, user: nil, invitation_sent_at: sent_at)

      assert {:ok, %{count: 1, items: [item]}} =
               Workbench.list_onboarding_queue(trainer_ctx(trainer))

      assert item.client.id == visible.id

      assert {:ok, %{count: 0, items: []}} =
               Workbench.list_onboarding_queue(Ctx.new(business.id, Ecto.UUID.generate(), nil, false))
    end
  end

  describe "Check-ins queue" do
    test "uses submission identity, oldest-first order, and survives client deactivation" do
      business = insert(:business)
      coach = insert(:coach, business: business, user: business.owner)

      client =
        insert(:client,
          business: business,
          creator: coach,
          status: :inactive,
          inactive_reason: :manual
        )

      assignment = insert_check_in(client)
      submitted_at = DateTime.add(DateTime.utc_now(:second), -2, :day)

      submissions =
        for _ <- 1..2 do
          insert(:form_submission,
            business: business,
            client: client,
            form_assignment: assignment,
            submitted_at: submitted_at
          )
        end

      reviewed = insert(:form_submission, business: business, client: client, form_assignment: assignment)
      {:ok, _} = Forms.review_form_submission(owner_ctx(business), reviewed.id)

      assert {:ok, %{count: 2, items: items}} =
               Workbench.list_check_in_queue(owner_ctx(business))

      assert Enum.map(items, & &1.submission.id) == submissions |> Enum.map(& &1.id) |> Enum.sort()

      Enum.each(items, fn item ->
        assert Map.keys(item) |> Enum.sort() == [:assignment, :client, :reasons, :submission]
        assert item.client.id == client.id
        assert item.assignment.id == assignment.id

        assert item.reasons == [
                 %{
                   code: :check_in_awaiting_review,
                   submission_id: item.submission.id,
                   submitted_at: submitted_at
                 }
               ]
      end)
    end

    test "keeps count/list parity across pagination and trainer visibility" do
      business = insert(:business)
      trainer = insert(:coach, business: business)
      other_trainer = insert(:coach, business: business)
      visible = insert(:client, business: business, creator: trainer, assigned_coach: trainer)
      hidden = insert(:client, business: business, creator: other_trainer, assigned_coach: other_trainer)

      for client <- [visible, visible, hidden] do
        assignment = insert_check_in(client)
        insert(:form_submission, business: business, client: client, form_assignment: assignment)
      end

      assert {:ok, %{count: 2, items: [_item]}} =
               Workbench.list_check_in_queue(trainer_ctx(trainer), offset: 1, limit: 1)

      assert {:ok, %{count: 0, items: []}} =
               Workbench.list_check_in_queue(Ctx.new(business.id, Ecto.UUID.generate(), nil, false))
    end
  end

  describe "Replies queue" do
    test "uses conversation identity, oldest waiting clock, and survives client deactivation" do
      business = insert(:business)
      coach = insert(:coach, business: business, user: business.owner)

      inactive =
        insert(:client,
          business: business,
          creator: coach,
          status: :inactive,
          inactive_reason: :manual
        )

      waiting_since = DateTime.add(DateTime.utc_now(:microsecond), -2, :day)
      waiting = insert(:conversation, business: business, client: inactive, waiting_since: waiting_since)

      answered_client = insert(:client, business: business, creator: coach)
      insert(:conversation, business: business, client: answered_client, waiting_since: nil)

      active = insert(:client, business: business, creator: coach)
      later = insert(:conversation, business: business, client: active, waiting_since: DateTime.add(waiting_since, 1, :day))

      assert {:ok, %{count: 2, items: [first, second]}} =
               Workbench.list_replies_queue(owner_ctx(business))

      assert Map.keys(first) |> Enum.sort() == [:conversation, :reasons]
      assert first.reasons == [%{code: :reply_needed, waiting_since: waiting_since}]
      assert first.conversation.id == waiting.id
      assert second.conversation.id == later.id
    end

    test "keeps count/list parity, visibility, and drains after a coach reply" do
      business = insert(:business)
      trainer = insert(:coach, business: business)
      other_trainer = insert(:coach, business: business)
      visible = insert(:client, business: business, creator: trainer, assigned_coach: trainer)
      hidden = insert(:client, business: business, creator: other_trainer, assigned_coach: other_trainer)
      waiting_since = DateTime.add(DateTime.utc_now(:microsecond), -1, :day)

      conversation = insert(:conversation, business: business, client: visible, waiting_since: waiting_since)
      insert(:conversation, business: business, client: hidden, waiting_since: waiting_since)

      ctx = trainer_ctx(trainer)

      assert {:ok, %{count: 1, items: []}} =
               Workbench.list_replies_queue(ctx, offset: 1, limit: 1)

      assert {:ok, _message} = Chat.send_message(ctx, conversation.id, %{body: "Handled"})
      assert {:ok, %{count: 0, items: []}} = Workbench.list_replies_queue(ctx)

      assert {:ok, %{count: 0, items: []}} =
               Workbench.list_replies_queue(Ctx.new(business.id, Ecto.UUID.generate(), nil, false))
    end
  end

  test "counts use the same canonical facts as the three lists" do
    business = insert(:business)
    coach = insert(:coach, business: business, user: business.owner)
    ctx = owner_ctx(business)

    insert(:client,
      business: business,
      creator: coach,
      status: :pending,
      user: nil,
      invitation_sent_at: DateTime.add(DateTime.utc_now(:second), -4, :day)
    )

    active = insert(:client, business: business, creator: coach)
    assignment = insert_check_in(active)
    insert(:form_submission, business: business, client: active, form_assignment: assignment)
    insert(:conversation, business: business, client: active, waiting_since: DateTime.utc_now(:microsecond))

    assert {:ok, counts} = Workbench.counts(ctx)
    assert counts.onboarding == 1
    assert counts.check_ins == 1
    assert counts.replies == 1

    assert {:ok, %{count: 1}} = Workbench.list_onboarding_queue(ctx)
    assert {:ok, %{count: 1}} = Workbench.list_check_in_queue(ctx)
    assert {:ok, %{count: 1}} = Workbench.list_replies_queue(ctx)
  end

  defp insert_intake(client, due_date, status \\ :assigned) do
    template = insert(:form_template, business: client.business, purpose: :intake)

    insert(:form_assignment,
      business: client.business,
      client: client,
      form_template: template,
      purpose: :intake,
      status: status,
      due_date: due_date
    )
  end

  defp insert_check_in(client) do
    template = insert(:form_template, business: client.business, purpose: :check_in)

    insert(:form_assignment,
      business: client.business,
      client: client,
      form_template: template,
      purpose: :check_in,
      status: :completed
    )
  end
end
