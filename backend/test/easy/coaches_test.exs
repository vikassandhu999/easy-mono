defmodule Easy.CoachesTest do
  use Easy.DataCase, async: true

  alias Easy.Clients.Client
  alias Easy.Coaches
  alias Easy.CoachInvitations
  alias Easy.Identity.UserSession
  alias Easy.Orgs.Coach
  alias Easy.Repo

  test "onboarding creates a loaded membership and returns duplicate membership errors" do
    business = insert(:business)
    user = business.owner

    assert {:ok, coach} = Coaches.create(user, business)
    assert coach.user == user
    assert coach.business == business
    assert coach.user_id == user.id
    assert coach.business_id == business.id
    before = Repo.get!(Coach, coach.id)

    for target <- [business, insert(:business)] do
      assert {:error, %Ecto.Changeset{} = changeset} = Coaches.create(user, target)
      assert %{user_id: ["has already been taken"]} = errors_on(changeset)
      assert Repo.get!(Coach, coach.id) == before
      assert [persisted] = Repo.all(Coach.for_user(user.id))
      assert persisted.id == coach.id
    end
  end

  test "coach lookups scope identity to the tenant and distinguish active membership" do
    coach = insert(:coach)
    inactive = insert(:coach, business: coach.business, status: :inactive)
    outsider = insert(:coach)
    ctx = trainer_ctx(coach)

    assert {:ok, loaded} = Coaches.get_coach(ctx, coach.id)
    assert loaded.user.id == coach.user_id
    assert loaded.business.id == coach.business_id
    assert {:ok, _inactive} = Coaches.get_coach(ctx, inactive.id)
    assert {:ok, active} = Coaches.get_active_coach(ctx, coach.id)
    assert active.id == coach.id
    assert {:error, :not_found} = Coaches.get_active_coach(ctx, inactive.id)

    for id <- [outsider.id, Ecto.UUID.generate()] do
      assert {:error, :not_found} = Coaches.get_coach(ctx, id)
      assert {:error, :not_found} = Coaches.get_active_coach(ctx, id)
    end
  end

  defp owner_ctx_with_coach(business) do
    unless Repo.get_by(Coach, business_id: business.id, user_id: business.owner_id) do
      insert(:coach, business: business, user: business.owner)
    end

    owner_ctx(business)
  end

  defp invited_coach(business, attrs \\ %{}) do
    insert(
      :coach,
      Map.merge(
        %{
          business: business,
          user: nil,
          status: :invited,
          email: "invited-#{System.unique_integer([:positive])}@test.com",
          invitation_token: "tok-#{System.unique_integer([:positive])}",
          invitation_sent_at: DateTime.utc_now(:second)
        },
        attrs
      )
    )
  end

  describe "update_profile/2" do
    test "missing and foreign-business membership cannot load or update a profile" do
      coach = insert(:coach)
      other_business = insert(:business)
      ctx = trainer_ctx(coach)

      for invalid_ctx <- [%{ctx | user_id: Ecto.UUID.generate()}, %{ctx | business_id: other_business.id}] do
        assert {:error, :not_found} = Coaches.get_coach(invalid_ctx)
        assert {:error, :not_found} = Coaches.update_profile(invalid_ctx, %{first_name: "Unexpected"})
      end

      assert Repo.get!(Coach, coach.id).first_name == coach.first_name
    end

    test "string-keyed profile updates persist coach and business fields atomically" do
      business = insert(:business)
      ctx = owner_ctx_with_coach(business)

      assert {:ok, coach} =
               Coaches.update_profile(ctx, %{
                 "first_name" => "Updated",
                 "phone" => "123",
                 "business_name" => "Updated business",
                 "whatsapp_number" => "456"
               })

      assert coach.first_name == "Updated"
      assert coach.phone == "123"
      assert coach.business.name == "Updated business"
      assert coach.business.whatsapp_number == "456"

      assert {:ok, cleared} = Coaches.update_profile(ctx, %{"phone" => nil, "whatsapp_number" => nil})
      assert cleared.phone == nil
      assert cleared.business.whatsapp_number == nil

      assert {:error, changeset} =
               Coaches.update_profile(ctx, %{"first_name" => "Rolled back", "business_name" => nil})

      assert errors_on(changeset).name == ["can't be blank"]
      assert Repo.get!(Coach, coach.id).first_name == "Updated"
    end
  end

  describe "list_team/1" do
    test "returns every coach on the team, newest first" do
      business = insert(:business)
      ctx = owner_ctx_with_coach(business)
      older = invited_coach(business)

      from(c in Coach, where: c.id == ^older.id)
      |> Repo.update_all(set: [inserted_at: ~U[2026-01-01 00:00:00Z]])

      newer = insert(:coach, business: business, status: :active)
      outsider = insert(:coach)

      from(c in Coach, where: c.id == ^newer.id)
      |> Repo.update_all(set: [inserted_at: ~U[2026-02-01 00:00:00Z]])

      assert {:ok, %{coaches: coaches, owner_id: owner_id}} = Coaches.list_team(ctx)
      assert owner_id == ctx.user_id
      ids = Enum.map(coaches, & &1.id)

      assert newer.id in ids
      assert older.id in ids
      refute outsider.id in ids
      assert Enum.find_index(ids, &(&1 == newer.id)) < Enum.find_index(ids, &(&1 == older.id))
    end

    test "non-owner cannot list the team" do
      business = insert(:business)
      trainer = insert(:coach, business: business)

      assert {:error, :not_owner} = Coaches.list_team(trainer_ctx(trainer))
    end
  end

  describe "deactivate_trainer/2" do
    test "flips status, revokes sessions, and reassigns clients to the owner's coach row" do
      business = insert(:business)
      ctx = owner_ctx_with_coach(business)
      trainer = insert(:coach, business: business, status: :active)
      client = insert(:client, business: business, creator: trainer, assigned_coach: trainer)
      session = insert(:user_session, user: trainer.user, role: :coach)

      assert {:ok, updated} = Coaches.deactivate_trainer(ctx, trainer.id)
      assert updated.status == :inactive

      owner_coach = Repo.get_by!(Coach, business_id: business.id, user_id: business.owner_id)
      assert Repo.get!(Client, client.id).assigned_coach_id == owner_coach.id
      assert Repo.get!(UserSession, session.id).revoked_at
    end

    test "cannot deactivate the owner's own row" do
      business = insert(:business)
      ctx = owner_ctx_with_coach(business)
      owner_coach = Repo.get_by!(Coach, business_id: business.id, user_id: business.owner_id)

      assert {:error, :cannot_deactivate_owner} = Coaches.deactivate_trainer(ctx, owner_coach.id)
    end

    test "non-owner cannot deactivate" do
      business = insert(:business)
      trainer = insert(:coach, business: business)
      other = insert(:coach, business: business)

      assert {:error, :not_owner} = Coaches.deactivate_trainer(trainer_ctx(trainer), other.id)
    end

    test "returns :not_found for a coach in another business" do
      business = insert(:business)
      ctx = owner_ctx_with_coach(business)
      other_business = insert(:business)
      other_coach = insert(:coach, business: other_business)

      assert {:error, :not_found} = Coaches.deactivate_trainer(ctx, other_coach.id)
    end

    test "returns :not_found for an :invited row instead of bricking the invite" do
      business = insert(:business)
      ctx = owner_ctx_with_coach(business)
      invited = invited_coach(business, %{email: "invitee@test.com"})

      assert {:error, :not_found} = Coaches.deactivate_trainer(ctx, invited.id)
      assert Repo.get!(Coach, invited.id).status == :invited

      assert {:ok, _} = CoachInvitations.revoke_invite(ctx, invited.id)
      refute Repo.get(Coach, invited.id)

      assert {:ok, _reinvited} =
               CoachInvitations.invite_trainer(ctx, %{email: "invitee@test.com", first_name: "A", last_name: "B"})
    end

    test "returns :not_found for an :inactive row" do
      business = insert(:business)
      ctx = owner_ctx_with_coach(business)
      inactive = insert(:coach, business: business, status: :inactive)

      assert {:error, :not_found} = Coaches.deactivate_trainer(ctx, inactive.id)
    end
  end

  describe "reactivate_trainer/2" do
    test "flips an inactive trainer back to active without moving clients" do
      business = insert(:business)
      ctx = owner_ctx_with_coach(business)
      trainer = insert(:coach, business: business, status: :inactive)
      owner_coach = Repo.get_by!(Coach, business_id: business.id, user_id: business.owner_id)
      client = insert(:client, business: business, creator: owner_coach, assigned_coach: owner_coach)

      assert {:ok, updated} = Coaches.reactivate_trainer(ctx, trainer.id)
      assert updated.status == :active
      assert Repo.get!(Client, client.id).assigned_coach_id == owner_coach.id
    end

    test "non-owner cannot reactivate" do
      business = insert(:business)
      trainer = insert(:coach, business: business)
      inactive = insert(:coach, business: business, status: :inactive)

      assert {:error, :not_owner} = Coaches.reactivate_trainer(trainer_ctx(trainer), inactive.id)
    end

    test "returns :not_found for a coach in another business" do
      business = insert(:business)
      ctx = owner_ctx_with_coach(business)
      other_business = insert(:business)
      other_coach = insert(:coach, business: other_business, status: :inactive)

      assert {:error, :not_found} = Coaches.reactivate_trainer(ctx, other_coach.id)
    end

    test "returns :not_found for an :active or :invited row" do
      business = insert(:business)
      ctx = owner_ctx_with_coach(business)
      active = insert(:coach, business: business, status: :active)
      invited = invited_coach(business, %{email: "invitee@test.com"})

      assert {:error, :not_found} = Coaches.reactivate_trainer(ctx, active.id)
      assert {:error, :not_found} = Coaches.reactivate_trainer(ctx, invited.id)
    end
  end
end
