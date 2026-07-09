defmodule Easy.Clients.ReadBoundaryTest do
  use Easy.SchemaCase

  alias Easy.Clients

  @training_schemas [
    "lib/easy/training/training_exercise.ex",
    "lib/easy/training/training_plan.ex",
    "lib/easy/training/training_workout.ex",
    "lib/easy/training/training_workout_exercise.ex",
    "lib/easy/training/training_session.ex"
  ]

  test "training plan assignment does not hide a client lookup" do
    source = File.read!(Path.join(File.cwd!(), "lib/easy/training/training_plan.ex"))

    refute source =~ "Clients.Client.accessible?"
  end

  test "training schemas do not expose broad accessibility database checks" do
    for path <- @training_schemas do
      source = File.read!(Path.join(File.cwd!(), path))

      refute source =~ ~r/def accessible\?/, path
      refute source =~ ~r/def accessible_workout\?/, path
      refute source =~ ~r/def client_accessible_workout\?/, path
    end
  end

  test "get_client/2 returns only clients in the requested business" do
    business = insert(:business)
    coach = insert(:coach, business: business)
    client = insert(:client, business: business, creator: coach, user: insert(:user))

    other_business = insert(:business)
    other_coach = insert(:coach, business: other_business)

    other_client =
      insert(:client, business: other_business, creator: other_coach, user: insert(:user))

    ctx = owner_ctx(business)

    assert {:ok, %{id: client_id}} = Clients.get_client(ctx, client.id)
    assert client_id == client.id
    assert {:error, :not_found} = Clients.get_client(ctx, other_client.id)
  end

  describe "visibility (Client.visible_to/2 via get_client and list_clients)" do
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

      assert {:error, :not_found} = Clients.get_client(trainer_ctx(trainer), other_client.id)
    end

    test "cross-tenant access is unaffected — owner never sees another business's clients" do
      business = insert(:business)
      other_business = insert(:business)
      other_client = insert(:client, business: other_business)

      assert {:error, :not_found} = Clients.get_client(owner_ctx(business), other_client.id)
    end

    test "a client with no assigned coach is visible only to the owner" do
      business = insert(:business)
      trainer = insert(:coach, business: business)
      unassigned = insert(:client, business: business, assigned_coach: nil)

      assert {:ok, %{id: id}} = Clients.get_client(owner_ctx(business), unassigned.id)
      assert id == unassigned.id
      assert {:error, :not_found} = Clients.get_client(trainer_ctx(trainer), unassigned.id)
    end
  end

  describe "accept_invite/3" do
    test "accepting an invite over capacity lands inactive with awaiting_seat reason" do
      business = insert(:business)
      insert(:business_billing, business: business, free_seats: 0, paid_seats: 0)
      client = insert(:client, business: business, status: :pending, user: nil)
      user = insert(:user)

      assert {:ok, updated} = Clients.accept_invite(client, user.id, user.email)
      assert updated.status == :inactive
      assert updated.inactive_reason == :awaiting_seat
    end
  end

  describe "authorize_client/2 and authorize_client_id/2" do
    test "authorize_client/2 mirrors get_client/2's visibility rules" do
      business = insert(:business)
      trainer = insert(:coach, business: business)
      client = insert(:client, business: business, assigned_coach: trainer)

      assert {:ok, %{id: id}} = Clients.authorize_client(trainer_ctx(trainer), client.id)
      assert id == client.id
    end

    test "authorize_client_id/2 returns :ok for nil (template/non-client resource)" do
      business = insert(:business)
      assert :ok = Clients.authorize_client_id(owner_ctx(business), nil)
    end

    test "authorize_client_id/2 wraps authorize_client/2 for a real client id" do
      business = insert(:business)
      trainer = insert(:coach, business: business)
      other_trainer = insert(:coach, business: business)
      client = insert(:client, business: business, assigned_coach: trainer)

      assert :ok = Clients.authorize_client_id(trainer_ctx(trainer), client.id)
      assert {:error, :not_found} = Clients.authorize_client_id(trainer_ctx(other_trainer), client.id)
    end
  end

  describe "assignment on client-create paths" do
    test "invite_client/2 assigns the inviting coach as assigned_coach_id" do
      business = insert(:business)
      trainer = insert(:coach, business: business)

      assert {:ok, client} = Clients.invite_client(trainer_ctx(trainer), params_for(:client_attrs))
      assert client.assigned_coach_id == trainer.id
    end

    test "create_inquiry/2 (public funnel) assigns the business owner's coach row" do
      business = insert(:business)
      owner_coach = insert(:coach, business: business, user: business.owner, status: :active)

      ctx = Easy.Ctx.new(business.id, nil)

      assert {:ok, client} =
               Clients.create_inquiry(ctx, %{
                 first_name: "Prospect",
                 email: "prospect@test.com",
                 phone: "123-000-0000"
               })

      assert client.assigned_coach_id == owner_coach.id
    end

    test "create_inquiry/2 leaves assigned_coach_id nil (fail closed) when the owner has no coach row" do
      business = insert(:business)
      ctx = Easy.Ctx.new(business.id, nil)

      assert {:ok, client} =
               Clients.create_inquiry(ctx, %{
                 first_name: "Prospect",
                 email: "no-owner-coach@test.com",
                 phone: "123-000-0001"
               })

      assert client.assigned_coach_id == nil
      # The owner still sees this client via visible_to's owner? clause.
      assert {:ok, _} = Clients.get_client(owner_ctx(business), client.id)
    end
  end

  describe "reassign_client/3" do
    test "owner reassigns a client to another active coach on the team" do
      business = insert(:business)
      original = insert(:coach, business: business)
      new_coach = insert(:coach, business: business, status: :active)
      client = insert(:client, business: business, assigned_coach: original)

      assert {:ok, updated} = Clients.reassign_client(owner_ctx(business), client.id, new_coach.id)
      assert updated.assigned_coach_id == new_coach.id
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
