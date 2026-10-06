defmodule Easy.PlanReturnTest do
  use Easy.DataCase, async: true

  alias Easy.ClientInvitations
  alias Easy.CoachingTerms
  alias Easy.CoachingTerms.CoachingTerm
  alias Easy.Ctx
  alias Easy.Plans.{Programming, Reader}

  for {domain, factory} <- [{:training, :training_plan}, {:nutrition, :nutrition_plan}] do
    @domain domain
    @factory factory

    test "#{domain}: a prepared plan covers an accepted invitation" do
      coach = insert(:coach)
      ctx = trainer_ctx(coach)

      assert {:ok, invite} =
               ClientInvitations.create(ctx, %{
                 full_name: "Prepared Client",
                 email: "prepared@example.test",
                 timezone: "Etc/UTC"
               })

      assert {:ok, template} = Programming.create_template(ctx, @domain, %{name: "Prepared"})

      assert {:ok, prepared} =
               Programming.assign_template_to_client(
                 ctx,
                 invite.id,
                 @domain,
                 template.id,
                 %{start_date: Date.utc_today()}
               )

      assert prepared.lifecycle == :waiting
      user = insert(:user)

      assert {:ok, accepted} =
               CoachingTerms.accept_invite(
                 %Ctx{business_id: invite.business_id, user_id: user.id},
                 invite,
                 user.email
               )

      assert accepted.current_term.starts_on == Date.utc_today()
      assert {:ok, current} = Reader.get_plan(ctx, @domain, prepared.id)
      assert current.lifecycle == :current
    end

    test "#{domain}: a started plan cannot be moved or cleared when coaching returns" do
      today = Date.utc_today()
      client = returning_client(today)
      ctx = trainer_ctx(client.coach)
      plan = old_plan(@factory, client, Date.add(today, -30))
      assert {:ok, template} = Programming.create_template(ctx, @domain, %{name: "Return"})
      assert {:ok, fresh} = Programming.assign_template_to_client(ctx, client.id, @domain, template.id, %{start_date: today})
      assert fresh.lifecycle == :current

      for date <- [nil, today, Date.add(today, 10)] do
        assert {:error, %Ecto.Changeset{}} = Programming.update_plan(ctx, @domain, plan.id, plan.revision, %{start_date: date})
      end

      assert {:ok, archived} = Programming.archive_plan(ctx, @domain, plan.id, plan.revision)
      assert {:ok, restored} = Programming.restore_plan(ctx, @domain, plan.id, archived.revision)
      assert restored.lifecycle == :ended
    end

    test "#{domain}: a stopped future plan does not reserve dates after a completed term" do
      today = Date.utc_today()
      client = returning_client(today)
      ctx = trainer_ctx(client.coach)
      previous = old_plan(@factory, client, Date.add(today, 7))
      assert {:ok, template} = Programming.create_template(ctx, @domain, %{name: "Return"})
      assert {:ok, fresh} = Programming.assign_template_to_client(ctx, client.id, @domain, template.id, %{start_date: today})
      assert fresh.lifecycle == :current
      assert fresh.id != previous.id
    end

    test "#{domain}: assignments and date changes reject inclusive overlap" do
      client = insert(:client, timezone: "Etc/UTC")
      ctx = trainer_ctx(client.coach)
      today = Date.utc_today()
      assert {:ok, template} = Programming.create_template(ctx, @domain, %{name: "Source"})

      assert {:ok, _first} =
               Programming.assign_template_to_client(ctx, client.id, @domain, template.id, %{
                 start_date: today,
                 end_date: Date.add(today, 7)
               })

      assert {:error, :plan_overlap} =
               Programming.assign_template_to_client(
                 ctx,
                 client.id,
                 @domain,
                 template.id,
                 %{start_date: Date.add(today, 7)}
               )

      assert {:ok, second} =
               Programming.assign_template_to_client(
                 ctx,
                 client.id,
                 @domain,
                 template.id,
                 %{start_date: Date.add(today, 8)}
               )

      assert {:error, :plan_overlap} =
               Programming.update_plan(
                 ctx,
                 @domain,
                 second.id,
                 second.revision,
                 %{start_date: Date.add(today, 7)}
               )
    end

    test "#{domain}: scheduled coaching ends reserve dates until the end passes" do
      today = Date.utc_today()

      client =
        insert(:client,
          timezone: "Etc/UTC",
          terms: [
            build(:coaching_term, starts_on: Date.add(today, -30), ends_on: Date.add(today, 1))
          ]
        )

      ctx = trainer_ctx(client.coach)
      old_plan(@factory, client, Date.add(today, -20))
      assert {:ok, template} = Programming.create_template(ctx, @domain, %{name: "Next"})
      attrs = %{start_date: Date.add(today, 2)}
      assert {:error, :plan_overlap} = Programming.assign_template_to_client(ctx, client.id, @domain, template.id, attrs)
      Repo.update_all(from(t in CoachingTerm, where: t.client_id == ^client.id), set: [ends_on: today])
      assert {:error, :plan_overlap} = Programming.assign_template_to_client(ctx, client.id, @domain, template.id, attrs)
      Repo.update_all(from(t in CoachingTerm, where: t.client_id == ^client.id), set: [ends_on: Date.add(today, -1)])
      assert {:ok, upcoming} = Programming.assign_template_to_client(ctx, client.id, @domain, template.id, attrs)
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
    date = Date.add(Date.utc_today(), -20)

    insert(factory,
      business: client.business,
      creator: client.coach,
      client: client,
      start_date: start_date,
      inserted_at: DateTime.new!(date, ~T[12:00:00], "Etc/UTC"),
      created_local_date: date
    )
  end
end
