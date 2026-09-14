defmodule Easy.Clients.ReadBoundaryTest do
  use Easy.SchemaCase

  alias Easy.{ClientAccess, Clients}
  alias Easy.ClientInvitations
  alias Easy.Clients.Client
  alias Easy.Nutrition.Plan, as: NutritionPlan
  alias Easy.Training.TrainingPlan

  @training_schemas [
    "lib/easy/training/training_exercise.ex",
    "lib/easy/training/training_plan.ex",
    "lib/easy/training/training_workout.ex",
    "lib/easy/training/prescribed_exercise.ex",
    "lib/easy/training/training_session.ex"
  ]

  test "bulk reassignment requires the owner and changes only the selected coach's clients" do
    business = insert(:business)
    owner = insert(:coach, business: business, user: business.owner)
    trainer = insert(:coach, business: business)
    assigned = insert(:client, business: business, creator: trainer, assigned_coach: trainer)
    retained = insert(:client, business: business, creator: owner, assigned_coach: owner)
    foreign = insert(:client)
    retained = Repo.get!(Client, retained.id)
    foreign = Repo.get!(Client, foreign.id)
    ctx = %{owner_ctx(business) | coach_id: owner.id}

    assert {:error, :not_owner} = Clients.reassign_clients_to_owner(trainer_ctx(trainer), trainer.id)
    assert Repo.get!(Client, assigned.id).assigned_coach_id == trainer.id
    assert {:ok, 0} = Clients.reassign_clients_to_owner(ctx, foreign.assigned_coach_id)
    assert {:ok, 1} = Clients.reassign_clients_to_owner(ctx, trainer.id)
    assert Repo.get!(Client, assigned.id).assigned_coach_id == owner.id
    assert Repo.get!(Client, retained.id) == retained
    assert Repo.get!(Client, foreign.id) == foreign
    assert {:ok, 0} = Clients.reassign_clients_to_owner(ctx, trainer.id)
  end

  test "training plan assignment does not hide a client lookup" do
    source = File.read!(Path.join(File.cwd!(), "lib/easy/training/training_plan.ex"))

    refute source =~ "Clients.Client.accessible?"
  end

  test "client detail and profile writes share trainer visibility and tenant scope" do
    coach = insert(:coach)
    colleague = insert(:coach, business: coach.business)
    visible = insert(:client, business: coach.business, creator: coach, assigned_coach: coach)
    hidden = insert(:client, business: coach.business, creator: coach, assigned_coach: colleague)
    foreign = insert(:client)
    ctx = trainer_ctx(coach)

    assert {:ok, loaded} = Clients.get_client_with_preloads(ctx, visible.id)
    assert loaded.id == visible.id
    assert Ecto.assoc_loaded?(loaded.business)
    assert {:ok, updated} = Clients.update_client(ctx, visible.id, %{first_name: "Updated"})
    assert updated.first_name == "Updated"

    for client <- [hidden, foreign] do
      before = Repo.get!(Client, client.id)
      assert {:error, :not_found} = Clients.get_client_with_preloads(ctx, client.id)
      assert {:error, :not_found} = Clients.update_client(ctx, client.id, %{first_name: "Forbidden"})
      assert Repo.get!(Client, client.id) == before
    end

    assert {:ok, loaded} = Clients.get_client_with_preloads(owner_ctx(coach.business), hidden.id)
    assert loaded.id == hidden.id
    assert {:error, :not_found} = Clients.get_client_with_preloads(owner_ctx(coach.business), foreign.id)
  end

  test "training schemas do not expose broad accessibility database checks" do
    for path <- @training_schemas do
      source = File.read!(Path.join(File.cwd!(), path))

      refute source =~ ~r/def accessible\?/, path
      refute source =~ ~r/def accessible_workout\?/, path
      refute source =~ ~r/def client_accessible_workout\?/, path
    end
  end

  test "authorize_client/2 returns only clients in the requested business" do
    business = insert(:business)
    coach = insert(:coach, business: business)
    client = insert(:client, business: business, creator: coach, user: insert(:user))

    other_business = insert(:business)
    other_coach = insert(:coach, business: other_business)

    other_client =
      insert(:client, business: other_business, creator: other_coach, user: insert(:user))

    ctx = owner_ctx(business)

    assert {:ok, %{id: client_id}} = ClientAccess.authorize_client(ctx, client.id)
    assert client_id == client.id
    assert {:error, :not_found} = ClientAccess.authorize_client(ctx, other_client.id)
  end

  test "bulk client authorization requires every client to be visible" do
    coach = insert(:coach)
    visible = insert(:client, business: coach.business, creator: coach, assigned_coach: coach)
    other_coach = insert(:coach, business: coach.business)
    hidden = insert(:client, business: coach.business, creator: coach, assigned_coach: other_coach)
    foreign = insert(:client)
    ctx = trainer_ctx(coach)

    assert :ok = ClientAccess.authorize_client_ids(ctx, [])
    assert :ok = ClientAccess.authorize_client_ids(ctx, [visible.id, visible.id])
    assert {:error, :not_found} = ClientAccess.authorize_client_ids(ctx, [visible.id, hidden.id])
    assert {:error, :not_found} = ClientAccess.authorize_client_ids(ctx, [foreign.id])
    assert {:error, :not_found} = ClientAccess.authorize_client_ids(ctx, [Ecto.UUID.generate()])
    assert :ok = ClientAccess.authorize_client_ids(owner_ctx(coach.business), [visible.id, hidden.id])
  end

  describe "visibility (Client.visible_to/2 via authorization and list_clients)" do
    test "client pagination defaults to twenty and allows up to one hundred" do
      coach = insert(:coach)
      insert_list(105, :client, business: coach.business, creator: coach, assigned_coach: coach)
      ctx = trainer_ctx(coach)

      for {opts, expected_size} <- [{[], 20}, {[limit: 25], 25}, {[limit: 500], 100}, {[offset: 100], 5}] do
        assert {:ok, %{count: 105, clients: clients}} = Clients.list_clients(ctx, opts)
        assert length(clients) == expected_size
      end
    end

    test "summary counts exactly three statuses" do
      business = insert(:business)
      insert(:client, business: business, status: :active)
      insert(:client, business: business, status: :pending, user: nil)
      insert(:client, business: business, status: :inactive, inactive_reason: :manual)
      ctx = owner_ctx(business)

      assert {:ok, %{summary: summary}} = Clients.list_clients(ctx)
      assert summary == %{active: 1, pending: 1, inactive: 1}
    end

    test "filters clients by stage" do
      business = insert(:business)
      onboarding = insert(:client, business: business, stage: :onboarding)
      insert(:client, business: business, stage: :coaching)
      ctx = owner_ctx(business)

      assert {:ok, %{count: 1, clients: [client]}} = Clients.list_clients(ctx, stage: :onboarding)
      assert client.id == onboarding.id
    end

    test "owner sees every client in the business" do
      business = insert(:business)
      trainer = insert(:coach, business: business)
      assigned = insert(:client, business: business, creator: trainer, assigned_coach: trainer)
      unassigned = insert(:client, business: business, assigned_coach: nil)

      ctx = owner_ctx(business)

      assert {:ok, %{count: 2, clients: clients}} = Clients.list_clients(ctx)
      assert Enum.map(clients, & &1.id) |> Enum.sort() == Enum.sort([assigned.id, unassigned.id])
    end

    test "a trainer only sees clients assigned to them" do
      business = insert(:business)
      trainer = insert(:coach, business: business)
      other_trainer = insert(:coach, business: business)

      mine = insert(:client, business: business, assigned_coach: trainer)
      insert(:client, business: business, assigned_coach: other_trainer)

      ctx = trainer_ctx(trainer)

      assert {:ok, %{count: 1, clients: [client]}} = Clients.list_clients(ctx)
      assert client.id == mine.id
    end

    test "a trainer fetching another trainer's client gets :not_found (never :forbidden)" do
      business = insert(:business)
      trainer = insert(:coach, business: business)
      other_trainer = insert(:coach, business: business)
      other_client = insert(:client, business: business, assigned_coach: other_trainer)

      assert {:error, :not_found} = ClientAccess.authorize_client(trainer_ctx(trainer), other_client.id)
    end

    test "cross-tenant access is unaffected — owner never sees another business's clients" do
      business = insert(:business)
      other_business = insert(:business)
      other_client = insert(:client, business: other_business)

      assert {:error, :not_found} = ClientAccess.authorize_client(owner_ctx(business), other_client.id)
    end

    test "a client with no assigned coach is visible only to the owner" do
      business = insert(:business)
      trainer = insert(:coach, business: business)
      unassigned = insert(:client, business: business, assigned_coach: nil)

      assert {:ok, %{id: id}} = ClientAccess.authorize_client(owner_ctx(business), unassigned.id)
      assert id == unassigned.id
      assert {:error, :not_found} = ClientAccess.authorize_client(trainer_ctx(trainer), unassigned.id)
    end
  end

  describe "roster expiry fact" do
    test "is derived from the accepted 14-day window" do
      business = insert(:business)
      ctx = owner_ctx(business)

      fresh = insert(:client, business: business, status: :active)

      expiring =
        insert(:client,
          business: business,
          status: :active,
          subscription_ends_on: Date.add(Date.utc_today(), 3)
        )

      {:ok, %{clients: clients}} = Clients.list_clients(ctx)
      by_id = Map.new(clients, &{&1.id, &1})

      refute by_id[fresh.id].expiring_soon
      assert by_id[expiring.id].expiring_soon
    end
  end

  describe "accept_invite/3" do
    test "accepting an invite over capacity lands inactive with awaiting_seat reason" do
      business = insert(:business)
      insert(:business_billing, business: business, free_seats: 0, paid_seats: 0)
      client = insert(:client, business: business, status: :pending, user: nil)
      user = insert(:user)

      assert {:ok, updated} = ClientInvitations.accept_invite(client, user.id, user.email)
      assert updated.status == :inactive
      assert updated.inactive_reason == :awaiting_seat
    end
  end

  describe "authorize_client/2 and authorize_client_id/2" do
    test "ClientAccess is the shared authorization seam" do
      business = insert(:business)
      trainer = insert(:coach, business: business)
      other_trainer = insert(:coach, business: business)
      client = insert(:client, business: business, assigned_coach: trainer)

      assert {:ok, %{id: id}} = ClientAccess.authorize_client(trainer_ctx(trainer), client.id)
      assert id == client.id
      assert :ok = ClientAccess.authorize_client_id(trainer_ctx(trainer), client.id)

      assert {:error, :not_found} =
               ClientAccess.authorize_client(trainer_ctx(other_trainer), client.id)
    end

    test "authorize_client/2 mirrors get_client/2's visibility rules" do
      business = insert(:business)
      trainer = insert(:coach, business: business)
      client = insert(:client, business: business, assigned_coach: trainer)

      assert {:ok, %{id: id}} = ClientAccess.authorize_client(trainer_ctx(trainer), client.id)
      assert id == client.id
    end

    test "authorize_client_id/2 rejects a missing client even for the owner" do
      business = insert(:business)
      assert {:error, :not_found} = ClientAccess.authorize_client_id(owner_ctx(business), nil)
    end

    test "authorize_client_id/2 wraps authorize_client/2 for a real client id" do
      business = insert(:business)
      trainer = insert(:coach, business: business)
      other_trainer = insert(:coach, business: business)
      client = insert(:client, business: business, assigned_coach: trainer)

      assert :ok = ClientAccess.authorize_client_id(trainer_ctx(trainer), client.id)
      assert {:error, :not_found} = ClientAccess.authorize_client_id(trainer_ctx(other_trainer), client.id)
    end
  end

  test "pending-invitation revocation does not manually delete assigned plans" do
    source = File.read!(Path.join(File.cwd!(), "lib/easy/clients.ex"))

    refute source =~ "Repo.delete_all"
  end

  test "pending-invitation revocation removes assigned plans through database cascades" do
    business = insert(:business)
    coach = insert(:coach, business: business)

    client =
      insert(:client,
        business: business,
        creator: coach,
        assigned_coach: coach,
        status: :pending,
        user: nil
      )

    {:ok, training_template} =
      business.id
      |> TrainingPlan.insert_changeset(coach.user_id, %{name: "Training template"})
      |> Repo.insert()

    {:ok, training_plan} =
      business.id
      |> TrainingPlan.insert_changeset(coach.user_id, client.id, training_template, %{})
      |> Repo.insert()

    {:ok, nutrition_template} =
      business.id
      |> NutritionPlan.insert_changeset(coach.user_id, %{name: "Nutrition template"})
      |> Repo.insert()

    {:ok, nutrition_plan} =
      business.id
      |> NutritionPlan.assign_changeset(coach.user_id, client.id, nutrition_template, %{})
      |> Repo.insert()

    assert {:ok, %{id: deleted_id}} = ClientInvitations.revoke_invitation(trainer_ctx(coach), client.id)
    assert deleted_id == client.id
    assert Repo.get(Client, client.id) == nil
    assert Repo.get(TrainingPlan, training_plan.id) == nil
    assert Repo.get(NutritionPlan, nutrition_plan.id) == nil
  end

  describe "assignment on client-create paths" do
    test "invite_client/2 assigns the inviting coach as assigned_coach_id" do
      business = insert(:business)
      trainer = insert(:coach, business: business)

      assert {:ok, client} = ClientInvitations.invite(trainer_ctx(trainer), params_for(:client_attrs))
      assert client.assigned_coach_id == trainer.id
    end

    test "new invitations inherit the current business timezone without changing earlier clients" do
      business = insert(:business, timezone: "Asia/Kolkata")
      trainer = insert(:coach, business: business)
      earlier = insert(:client, business: business, creator: trainer, timezone: "Asia/Kolkata")

      {:ok, _business} = Easy.Orgs.update_business(owner_ctx(business), %{timezone: "Europe/London"})

      assert {:ok, invited} = ClientInvitations.invite(trainer_ctx(trainer), params_for(:client_attrs))
      assert invited.timezone == "Europe/London"
      assert Repo.get!(Client, earlier.id).timezone == "Asia/Kolkata"
    end
  end

  describe "reassign_client/3" do
    test "owner reassigns a client to another active coach on the team" do
      business = insert(:business)
      original = insert(:coach, business: business)
      new_coach = insert(:coach, business: business, status: :active)

      client =
        insert(:client,
          business: business,
          assigned_coach: original,
          status: :active,
          subscription_ends_on: Date.add(Date.utc_today(), 7)
        )

      assert {:ok, updated} = Clients.reassign_client(owner_ctx(business), client.id, new_coach.id)
      assert updated.assigned_coach_id == new_coach.id
      assert updated.expiring_soon
      assert {:ok, reloaded} = Clients.get_client_with_preloads(owner_ctx(business), client.id)
      assert updated.expiring_soon == reloaded.expiring_soon
    end

    test "a non-owner cannot reassign" do
      business = insert(:business)
      trainer = insert(:coach, business: business)
      target_coach = insert(:coach, business: business, status: :active)
      client = insert(:client, business: business, assigned_coach: trainer)

      assert {:error, :not_owner} =
               Clients.reassign_client(trainer_ctx(trainer), client.id, target_coach.id)
    end

    test "reassigning to an inactive coach fails with :coach_not_active" do
      business = insert(:business)
      client = insert(:client, business: business)
      inactive_coach = insert(:coach, business: business, status: :inactive)

      assert {:error, :coach_not_active} =
               Clients.reassign_client(owner_ctx(business), client.id, inactive_coach.id)
    end

    test "reassigning to a coach from another business fails with :coach_not_active" do
      business = insert(:business)
      client = insert(:client, business: business)

      other_business = insert(:business)
      cross_tenant_coach = insert(:coach, business: other_business, status: :active)

      assert {:error, :coach_not_active} =
               Clients.reassign_client(owner_ctx(business), client.id, cross_tenant_coach.id)
    end

    test "reassigning a client from another business fails with :not_found" do
      business = insert(:business)
      new_coach = insert(:coach, business: business, status: :active)

      other_business = insert(:business)
      other_client = insert(:client, business: other_business)

      assert {:error, :not_found} =
               Clients.reassign_client(owner_ctx(business), other_client.id, new_coach.id)
    end
  end
end
