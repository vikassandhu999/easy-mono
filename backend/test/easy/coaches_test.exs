defmodule Easy.CoachesTest do
  use Easy.DataCase, async: true

  alias Easy.Clients.Client
  alias Easy.Coaches
  alias Easy.Identity.User
  alias Easy.Identity.UserSession
  alias Easy.Orgs.Coach
  alias Easy.Repo

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

  describe "list_team/1" do
    test "returns every coach on the team, newest first" do
      business = insert(:business)
      ctx = owner_ctx_with_coach(business)
      older = invited_coach(business)

      from(c in Coach, where: c.id == ^older.id)
      |> Repo.update_all(set: [inserted_at: ~U[2026-01-01 00:00:00Z]])

      newer = insert(:coach, business: business, status: :active)

      from(c in Coach, where: c.id == ^newer.id)
      |> Repo.update_all(set: [inserted_at: ~U[2026-02-01 00:00:00Z]])

      assert {:ok, coaches} = Coaches.list_team(ctx)
      ids = Enum.map(coaches, & &1.id)

      assert newer.id in ids
      assert older.id in ids
      assert Enum.find_index(ids, &(&1 == newer.id)) < Enum.find_index(ids, &(&1 == older.id))
    end

    test "non-owner cannot list the team" do
      business = insert(:business)
      trainer = insert(:coach, business: business)

      assert {:error, :not_owner} = Coaches.list_team(trainer_ctx(trainer))
    end
  end

  describe "invite_trainer/2" do
    test "invites a new trainer with a downcased email" do
      business = insert(:business)
      ctx = owner_ctx_with_coach(business)

      assert {:ok, coach} =
               Coaches.invite_trainer(ctx, %{
                 email: "New.Trainer@Test.com",
                 first_name: "New",
                 last_name: "Trainer"
               })

      assert coach.status == :invited
      assert coach.email == "new.trainer@test.com"
      assert coach.invitation_token
    end

    test "re-inviting the same email is idempotent: same row, rotated token" do
      business = insert(:business)
      ctx = owner_ctx_with_coach(business)

      attrs = %{email: "dup@test.com", first_name: "D", last_name: "P"}

      assert {:ok, first} = Coaches.invite_trainer(ctx, attrs)
      assert {:ok, second} = Coaches.invite_trainer(ctx, attrs)

      assert first.id == second.id
      assert first.invitation_token != second.invitation_token
    end

    test "an active teammate's email returns :already_on_team" do
      business = insert(:business)
      ctx = owner_ctx_with_coach(business)
      insert(:coach, business: business, status: :active, email: "active@test.com")

      assert {:error, :already_on_team} =
               Coaches.invite_trainer(ctx, %{email: "active@test.com", first_name: "A", last_name: "B"})
    end

    test "an inactive teammate's email returns :already_on_team" do
      business = insert(:business)
      ctx = owner_ctx_with_coach(business)
      insert(:coach, business: business, status: :inactive, email: "inactive@test.com")

      assert {:error, :already_on_team} =
               Coaches.invite_trainer(ctx, %{email: "inactive@test.com", first_name: "A", last_name: "B"})
    end

    test "inviting the owner's own email returns :already_on_team" do
      business = insert(:business)
      ctx = owner_ctx_with_coach(business)
      owner_user = Repo.get!(User, business.owner_id)

      assert {:error, :already_on_team} =
               Coaches.invite_trainer(ctx, %{email: owner_user.email, first_name: "A", last_name: "B"})
    end

    test "non-owner cannot invite" do
      business = insert(:business)
      trainer = insert(:coach, business: business)

      assert {:error, :not_owner} =
               Coaches.invite_trainer(trainer_ctx(trainer), %{
                 email: "x@test.com",
                 first_name: "X",
                 last_name: "Y"
               })
    end
  end

  describe "resend_invite/2" do
    test "rotates the token for an invited row" do
      business = insert(:business)
      ctx = owner_ctx_with_coach(business)
      invited = invited_coach(business)

      assert {:ok, updated} = Coaches.resend_invite(ctx, invited.id)
      assert updated.id == invited.id
      assert updated.invitation_token != invited.invitation_token
    end

    test "returns :not_found for a non-invited row" do
      business = insert(:business)
      ctx = owner_ctx_with_coach(business)
      active = insert(:coach, business: business, status: :active)

      assert {:error, :not_found} = Coaches.resend_invite(ctx, active.id)
    end

    test "non-owner cannot resend" do
      business = insert(:business)
      trainer = insert(:coach, business: business)
      invited = invited_coach(business)

      assert {:error, :not_owner} = Coaches.resend_invite(trainer_ctx(trainer), invited.id)
    end
  end

  describe "revoke_invite/2" do
    test "deletes an invited row" do
      business = insert(:business)
      ctx = owner_ctx_with_coach(business)
      invited = invited_coach(business)

      assert {:ok, _} = Coaches.revoke_invite(ctx, invited.id)
      refute Repo.get(Coach, invited.id)
    end

    test "does not delete an active row" do
      business = insert(:business)
      ctx = owner_ctx_with_coach(business)
      active = insert(:coach, business: business, status: :active)

      assert {:error, :not_found} = Coaches.revoke_invite(ctx, active.id)
      assert Repo.get(Coach, active.id)
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

      assert {:ok, _} = Coaches.revoke_invite(ctx, invited.id)
      refute Repo.get(Coach, invited.id)

      assert {:ok, _reinvited} =
               Coaches.invite_trainer(ctx, %{email: "invitee@test.com", first_name: "A", last_name: "B"})
    end

    test "returns :not_found for an :inactive row" do
      business = insert(:business)
      ctx = owner_ctx_with_coach(business)
      inactive = insert(:coach, business: business, status: :inactive)

      assert {:error, :not_found} = Coaches.deactivate_trainer(ctx, inactive.id)
    end
  end

  describe "resolve_invitation_token/1" do
    test "a valid token resolves" do
      business = insert(:business)
      coach = invited_coach(business, %{invitation_token: "tok-valid"})

      assert {:ok, resolved} = Coaches.resolve_invitation_token("tok-valid")
      assert resolved.id == coach.id
    end

    test "an already-accepted (active) token returns :used" do
      business = insert(:business)
      insert(:coach, business: business, status: :active, invitation_token: "tok-used")

      assert {:error, :used} = Coaches.resolve_invitation_token("tok-used")
    end

    test "an expired token returns :expired" do
      business = insert(:business)

      invited_coach(business, %{
        invitation_token: "tok-expired",
        invitation_sent_at: DateTime.add(DateTime.utc_now(:second), -31, :day)
      })

      assert {:error, :expired} = Coaches.resolve_invitation_token("tok-expired")
    end

    test "an unknown token returns :invalid" do
      assert {:error, :invalid} = Coaches.resolve_invitation_token("does-not-exist")
    end
  end

  describe "accept_invite/2" do
    test "links the user and activates the row" do
      business = insert(:business)
      invited = invited_coach(business)
      user = insert(:user)

      assert {:ok, updated} = Coaches.accept_invite(invited, user.id)
      assert updated.status == :active
      assert updated.user_id == user.id
      assert updated.invitation_token == nil
    end

    test "a second accept loses the race" do
      business = insert(:business)
      invited = invited_coach(business)
      user = insert(:user)
      other_user = insert(:user)

      assert {:ok, _} = Coaches.accept_invite(invited, user.id)
      assert {:error, :race_lost} = Coaches.accept_invite(invited, other_user.id)
    end

    test "a user who already coaches elsewhere gets :already_a_coach" do
      business = insert(:business)
      invited = invited_coach(business)

      other_business = insert(:business)
      existing_coach = insert(:coach, business: other_business, status: :active)

      assert {:error, :already_a_coach} = Coaches.accept_invite(invited, existing_coach.user_id)
    end
  end
end
