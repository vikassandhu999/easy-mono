defmodule Easy.CoachInvitationsTest do
  use Easy.DataCase, async: true

  alias Easy.CoachInvitations
  alias Easy.Identity.User
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

  describe "invite_trainer/2" do
    test "creation, lookup, and owner checks use the same normalized email" do
      business = insert(:business)
      ctx = owner_ctx_with_coach(business)

      assert {:ok, first} = CoachInvitations.invite_trainer(ctx, %{"email" => "  Mixed.Case@Test.com  "})
      assert first.email == "mixed.case@test.com"
      assert {:ok, second} = CoachInvitations.invite_trainer(ctx, %{email: " MIXED.CASE@test.com "})
      assert second.id == first.id
      refute second.invitation_token == first.invitation_token

      assert {:error, :already_on_team} =
               CoachInvitations.invite_trainer(ctx, %{email: "  " <> String.upcase(business.owner.email) <> "  "})
    end

    test "string-keyed invitations enforce self-invite and reuse the existing invitation" do
      business = insert(:business)
      ctx = owner_ctx_with_coach(business)
      assert {:error, :already_on_team} = CoachInvitations.invite_trainer(ctx, %{"email" => business.owner.email})

      attrs = %{"email" => "string-invite@test.com", "first_name" => "Trainer"}
      assert {:ok, first} = CoachInvitations.invite_trainer(ctx, attrs)
      assert {:ok, second} = CoachInvitations.invite_trainer(ctx, attrs)
      assert first.id == second.id
      refute first.invitation_token == second.invitation_token
    end

    test "invites a new trainer with a downcased email" do
      business = insert(:business)
      ctx = owner_ctx_with_coach(business)

      assert {:ok, coach} =
               CoachInvitations.invite_trainer(ctx, %{
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

      assert {:ok, first} = CoachInvitations.invite_trainer(ctx, attrs)
      assert {:ok, second} = CoachInvitations.invite_trainer(ctx, attrs)

      assert first.id == second.id
      assert first.invitation_token != second.invitation_token
    end

    test "an active teammate's email returns :already_on_team" do
      business = insert(:business)
      ctx = owner_ctx_with_coach(business)
      insert(:coach, business: business, status: :active, email: "active@test.com")

      assert {:error, :already_on_team} =
               CoachInvitations.invite_trainer(ctx, %{email: "active@test.com", first_name: "A", last_name: "B"})
    end

    test "an inactive teammate's email returns :already_on_team" do
      business = insert(:business)
      ctx = owner_ctx_with_coach(business)
      insert(:coach, business: business, status: :inactive, email: "inactive@test.com")

      assert {:error, :already_on_team} =
               CoachInvitations.invite_trainer(ctx, %{email: "inactive@test.com", first_name: "A", last_name: "B"})
    end

    test "inviting the owner's own email returns :already_on_team" do
      business = insert(:business)
      ctx = owner_ctx_with_coach(business)
      owner_user = Repo.get!(User, business.owner_id)

      assert {:error, :already_on_team} =
               CoachInvitations.invite_trainer(ctx, %{email: owner_user.email, first_name: "A", last_name: "B"})
    end

    test "non-owner cannot invite" do
      business = insert(:business)
      trainer = insert(:coach, business: business)

      assert {:error, :not_owner} =
               CoachInvitations.invite_trainer(trainer_ctx(trainer), %{
                 email: "x@test.com",
                 first_name: "X",
                 last_name: "Y"
               })
    end
  end

  describe "resend_invite/2" do
    test "resend and revoke reject foreign tenants and non-owners without changing the invitation" do
      business = insert(:business)
      trainer = insert(:coach, business: business)
      invited = invited_coach(business)
      foreign_owner = owner_ctx_with_coach(insert(:business))

      for {ctx, reason} <- [{trainer_ctx(trainer), :not_owner}, {foreign_owner, :not_found}] do
        assert {:error, ^reason} = CoachInvitations.resend_invite(ctx, invited.id)
        assert {:error, ^reason} = CoachInvitations.revoke_invite(ctx, invited.id)
        unchanged = Repo.get!(Coach, invited.id)
        assert unchanged.invitation_token == invited.invitation_token
        assert unchanged.status == :invited
      end
    end

    test "rotates the token for an invited row" do
      business = insert(:business)
      ctx = owner_ctx_with_coach(business)
      invited = invited_coach(business)

      assert {:ok, updated} = CoachInvitations.resend_invite(ctx, invited.id)
      assert updated.id == invited.id
      assert updated.invitation_token != invited.invitation_token
    end

    test "returns :not_found for a non-invited row" do
      business = insert(:business)
      ctx = owner_ctx_with_coach(business)
      active = insert(:coach, business: business, status: :active)

      assert {:error, :not_found} = CoachInvitations.resend_invite(ctx, active.id)
    end

    test "non-owner cannot resend" do
      business = insert(:business)
      trainer = insert(:coach, business: business)
      invited = invited_coach(business)

      assert {:error, :not_owner} = CoachInvitations.resend_invite(trainer_ctx(trainer), invited.id)
    end
  end

  describe "revoke_invite/2" do
    test "deletes an invited row" do
      business = insert(:business)
      ctx = owner_ctx_with_coach(business)
      invited = invited_coach(business)

      assert {:ok, _} = CoachInvitations.revoke_invite(ctx, invited.id)
      refute Repo.get(Coach, invited.id)
    end

    test "does not delete an active row" do
      business = insert(:business)
      ctx = owner_ctx_with_coach(business)
      active = insert(:coach, business: business, status: :active)

      assert {:error, :not_found} = CoachInvitations.revoke_invite(ctx, active.id)
      assert Repo.get(Coach, active.id)
    end
  end

  describe "resolve_invitation_token/1" do
    test "a valid token resolves" do
      business = insert(:business)
      coach = invited_coach(business, %{invitation_token: "tok-valid"})

      assert {:ok, resolved} = CoachInvitations.resolve_invitation_token("tok-valid")
      assert resolved.id == coach.id

      assert {:ok, preview} = CoachInvitations.invitation_preview("tok-valid")
      assert preview == %{business_name: business.name, email: coach.email, first_name: coach.first_name}
    end

    test "an already-accepted (active) token returns :used" do
      business = insert(:business)
      insert(:coach, business: business, status: :active, invitation_token: "tok-used")

      assert {:error, :used} = CoachInvitations.resolve_invitation_token("tok-used")
      assert {:error, :used} = CoachInvitations.invitation_preview("tok-used")
    end

    test "an expired token returns :expired" do
      business = insert(:business)

      invited_coach(business, %{
        invitation_token: "tok-expired",
        invitation_sent_at: DateTime.add(DateTime.utc_now(:second), -31, :day)
      })

      assert {:error, :expired} = CoachInvitations.resolve_invitation_token("tok-expired")
      assert {:error, :expired} = CoachInvitations.invitation_preview("tok-expired")
    end

    test "an unknown token returns :invalid" do
      assert {:error, :invalid} = CoachInvitations.resolve_invitation_token("does-not-exist")
      assert {:error, :invalid} = CoachInvitations.invitation_preview("does-not-exist")
    end
  end

  describe "accept_invite/2" do
    test "links the user and activates the row" do
      business = insert(:business)
      invited = invited_coach(business)
      user = insert(:user)

      assert {:ok, updated} = CoachInvitations.accept_invite(invited, user.id)
      assert updated.status == :active
      assert updated.user_id == user.id
      assert updated.invitation_token == nil
    end

    test "a second accept loses the race" do
      business = insert(:business)
      invited = invited_coach(business)
      user = insert(:user)
      other_user = insert(:user)

      assert {:ok, _} = CoachInvitations.accept_invite(invited, user.id)
      assert {:error, :race_lost} = CoachInvitations.accept_invite(invited, other_user.id)
    end

    test "a user who already coaches elsewhere gets :already_a_coach" do
      business = insert(:business)
      invited = invited_coach(business)

      other_business = insert(:business)
      existing_coach = insert(:coach, business: other_business, status: :active)

      assert {:error, :already_a_coach} = CoachInvitations.accept_invite(invited, existing_coach.user_id)
    end
  end
end
