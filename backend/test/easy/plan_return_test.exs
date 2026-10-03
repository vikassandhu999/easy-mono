defmodule Easy.PlanReturnTest do
  use Easy.DataCase, async: true

  alias Easy.ClientInvitations
  alias Easy.CoachingTerms
  alias Easy.CoachingTerms.CoachingTerm
  alias Easy.Ctx

  for {factory, programming} <- [training_plan: Easy.Training.Programming, plan: Easy.Nutrition.Programming] do
    @factory factory
    @programming programming

    test "#{factory}: a plan assigned before acceptance comes into force when the invitation is accepted" do
      coach = insert(:coach)
      ctx = trainer_ctx(coach)
      assert {:ok, invite} = ClientInvitations.create(ctx, %{full_name: "Prepared Client", email: "prepared@example.test", timezone: "Etc/UTC"})
      assert {:ok, template} = @programming.create_template(ctx, %{name: "Prepared"})
      assert {:ok, prepared} = @programming.assign_template_to_client(ctx, invite.id, template.id, %{start_date: Date.utc_today()})
      assert prepared.lifecycle == :waiting

      user = insert(:user)
      assert {:ok, accepted} = CoachingTerms.accept_invite(%Ctx{business_id: invite.business_id, user_id: user.id}, invite, user.email)
      assert accepted.current_term.starts_on == Date.utc_today()
      plan = Repo.preload(prepared, [client: [:business, :terms]], force: true)
      assert Easy.PlanCoverage.lifecycle(plan, Date.utc_today()) == :current
      query = from(p in prepared.__struct__, where: p.id == ^prepared.id, select: p.id)
      assert query |> Easy.PlanCoverage.in_force(Date.utc_today()) |> Repo.all() == [prepared.id]
    end

    test "#{factory}: rescheduling, clearing and restoring a stopped plan never revives it" do
      today = Date.utc_today()
      original_start = Date.add(today, -30)
      client = returning_client(today)
      ctx = trainer_ctx(client.coach)
      plan = old_plan(@factory, client, original_start)
      assert {:ok, template} = @programming.create_template(ctx, %{name: "Source"})
      assert {:ok, fresh} = @programming.assign_template_to_client(ctx, client.id, template.id, %{start_date: today})
      assert fresh.lifecycle == :current

      assert {:ok, moved} = @programming.update_plan(ctx, plan.id, plan.revision, %{start_date: today})
      assert moved.lifecycle == :ended
      assert moved.inserted_at == plan.inserted_at
      assert {:ok, cleared} = @programming.update_plan(ctx, plan.id, moved.revision, %{start_date: nil})
      assert cleared.start_date == nil
      assert {:ok, scheduled} = @programming.update_plan(ctx, plan.id, cleared.revision, %{start_date: Date.add(today, 10)})
      assert scheduled.lifecycle == :ended
      assert {:ok, archived} = @programming.archive_plan(ctx, plan.id, scheduled.revision)
      assert {:ok, restored} = @programming.restore_plan(ctx, plan.id, archived.revision)
      assert restored.lifecycle == :ended
      assert restored.end_date == nil
    end

    test "#{factory}: a stopped plan scheduled beyond its term has empty coverage for new assignments" do
      today = Date.utc_today()
      client = returning_client(today)
      ctx = trainer_ctx(client.coach)
      old = old_plan(@factory, client, Date.add(today, 7))
      assert {:ok, template} = @programming.create_template(ctx, %{name: "Return"})
      assert {:ok, fresh} = @programming.assign_template_to_client(ctx, client.id, template.id, %{start_date: today})
      assert fresh.lifecycle == :current
      assert fresh.id != old.id
    end

    test "#{factory}: assignment, update and restoration reject inclusive overlap" do
      client = insert(:client, timezone: "Etc/UTC")
      ctx = trainer_ctx(client.coach)
      today = Date.utc_today()
      assert {:ok, template} = @programming.create_template(ctx, %{name: "Source"})
      assert {:ok, first} = @programming.assign_template_to_client(ctx, client.id, template.id, %{start_date: today, end_date: Date.add(today, 7)})
      assert {:error, assignment} = @programming.assign_template_to_client(ctx, client.id, template.id, %{start_date: Date.add(today, 7)})
      assert %{start_date: [_]} = errors_on(assignment)
      assert {:ok, second} = @programming.assign_template_to_client(ctx, client.id, template.id, %{start_date: Date.add(today, 8)})
      assert {:error, update} = @programming.update_plan(ctx, second.id, second.revision, %{start_date: Date.add(today, 7)})
      assert %{start_date: [_]} = errors_on(update)
      assert {:ok, archived} = @programming.archive_plan(ctx, first.id, first.revision)
      assert {:ok, _extended} = @programming.update_plan(ctx, second.id, second.revision, %{start_date: today})
      assert {:error, restoration} = @programming.restore_plan(ctx, first.id, archived.revision)
      assert %{start_date: [_]} = errors_on(restoration)
    end

    test "#{factory}: planned term ends reserve coverage until the end date passes" do
      today = Date.utc_today()
      client = insert(:client, timezone: "Etc/UTC", terms: [build(:coaching_term, starts_on: Date.add(today, -30), ends_on: Date.add(today, 1))])
      ctx = trainer_ctx(client.coach)
      old_plan(@factory, client, Date.add(today, -20))
      assert {:ok, template} = @programming.create_template(ctx, %{name: "Next"})
      attrs = %{start_date: Date.add(today, 2)}
      assert {:error, future_end} = @programming.assign_template_to_client(ctx, client.id, template.id, attrs)
      assert %{start_date: [_]} = errors_on(future_end)
      Repo.update_all(from(t in CoachingTerm, where: t.client_id == ^client.id), set: [ends_on: today])
      assert {:error, last_day} = @programming.assign_template_to_client(ctx, client.id, template.id, attrs)
      assert %{start_date: [_]} = errors_on(last_day)
      Repo.update_all(from(t in CoachingTerm, where: t.client_id == ^client.id), set: [ends_on: Date.add(today, -1)])
      assert {:ok, upcoming} = @programming.assign_template_to_client(ctx, client.id, template.id, attrs)
      assert upcoming.start_date == Date.add(today, 2)
    end
  end

  defp returning_client(today) do
    insert(:client,
      timezone: "Etc/UTC",
      terms: [
        build(:coaching_term, starts_on: Date.add(today, -30), ends_on: Date.add(today, -1)),
        build(:coaching_term, starts_on: today)
      ]
    )
  end

  defp old_plan(factory, client, start_date) do
    inserted_at = DateTime.new!(Date.add(Date.utc_today(), -20), ~T[12:00:00], "Etc/UTC")
    insert(factory, business: client.business, creator: client.coach.user, client: client, start_date: start_date, inserted_at: inserted_at)
  end
end
