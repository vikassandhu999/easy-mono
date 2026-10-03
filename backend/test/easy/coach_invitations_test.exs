defmodule Easy.CoachInvitationsTest do
  use Easy.SchemaCase, async: true
  alias Easy.{Coaches, CoachInvitations, Repo}
  alias Easy.Identity.SessionFactory
  alias Easy.Orgs.Coach

  setup do
    business = insert(:business)
    owner = insert(:coach, business: business, user: business.owner)
    %{ctx: %{owner_ctx(business) | coach_id: owner.id}}
  end

  test "invite resend accept lifecycle keeps canonical facts and blocks reuse", %{ctx: ctx} do
    assert {:ok, invite} = CoachInvitations.invite_trainer(ctx, %{full_name: "New Coach", preferred_name: "New", email: "NEW@example.test"})
    assert Coach.state(invite) == :invited
    assert {:ok, preview} = CoachInvitations.invitation_preview(invite.invite_token)
    assert preview.full_name == "New Coach"
    assert {:ok, resent} = CoachInvitations.resend_invite(ctx, invite.id)
    assert resent.invite_token != invite.invite_token
    assert {:error, :invalid} = CoachInvitations.resolve_invitation_token(invite.invite_token)
    user = insert(:user)
    assert {:ok, accepted} = CoachInvitations.accept_invite(resent, user.id)
    assert Coach.state(accepted) == :active
    assert accepted.invite_token == nil
    assert {:error, :not_found} = CoachInvitations.revoke_invite(ctx, invite.id)
    assert {:error, :not_found} = CoachInvitations.resend_invite(ctx, invite.id)
    assert {:ok, _} = Coaches.get_active_coach_by_user_id(user.id)
  end

  test "expired invitations can be resent and only owners of their tenant may revoke", %{ctx: ctx} do
    {:ok, invite} = CoachInvitations.invite_trainer(ctx, %{full_name: "Expired", email: "expired@example.test"})
    invite |> Ecto.Changeset.change(invited_at: DateTime.add(DateTime.utc_now(:second), -31, :day)) |> Repo.update!()
    assert {:error, :expired} = CoachInvitations.resolve_invitation_token(invite.invite_token)
    assert {:error, :not_owner} = CoachInvitations.resend_invite(%{ctx | owner?: false}, invite.id)
    assert {:error, :not_found} = CoachInvitations.revoke_invite(%{ctx | business_id: Ecto.UUID.generate()}, invite.id)
    assert {:ok, renewed} = CoachInvitations.resend_invite(ctx, invite.id)
    assert {:ok, _} = CoachInvitations.resolve_invitation_token(renewed.invite_token)
    assert {:ok, _} = CoachInvitations.revoke_invite(ctx, invite.id)
    assert Repo.get(Coach, invite.id) == nil
  end

  test "a removed coach is reinvited on the same row and becomes active after acceptance", %{ctx: ctx} do
    user = insert(:user)
    {:ok, invite} = CoachInvitations.invite_trainer(ctx, %{full_name: "Returning Coach", email: user.email})
    {:ok, coach} = CoachInvitations.accept_invite(invite, user.id)
    {:ok, removed} = Coaches.remove_coach(ctx, coach.id)

    assert {:ok, renewed} = CoachInvitations.invite_trainer(ctx, %{full_name: "Returning Coach", email: user.email})
    assert renewed.id == coach.id
    assert renewed.removed_on == removed.removed_on
    assert renewed.user_id == user.id
    assert renewed.invite_token != invite.invite_token
    assert Coach.state(renewed) == :invited
    assert {:ok, _} = CoachInvitations.resolve_invitation_token(renewed.invite_token)
    assert {:error, :not_found} = Coaches.get_active_coach_by_user_id(user.id)
    assert {:ok, %{coaches: [listed]}} = Coaches.list_team(ctx, state: :invited)
    assert listed.id == coach.id
    assert {:ok, %{coaches: []}} = Coaches.list_team(ctx, state: :removed)

    assert {:ok, accepted} = CoachInvitations.accept_invite(renewed, user.id)
    assert accepted.id == coach.id
    assert accepted.user_id == user.id
    assert accepted.invite_token == nil
    assert accepted.removed_on == nil
    assert Coach.state(accepted) == :active
  end

  test "revoking a returning coach invitation preserves the removed membership", %{ctx: ctx} do
    user = insert(:user)
    {:ok, invite} = CoachInvitations.invite_trainer(ctx, %{full_name: "Returning Coach", email: user.email})
    {:ok, coach} = CoachInvitations.accept_invite(invite, user.id)
    {:ok, removed} = Coaches.remove_coach(ctx, coach.id)
    {:ok, renewed} = CoachInvitations.invite_trainer(ctx, %{full_name: "Returning Coach", email: user.email})

    assert {:ok, revoked} = CoachInvitations.revoke_invite(ctx, renewed.id)
    assert revoked.user_id == user.id
    assert revoked.removed_on == removed.removed_on
    assert revoked.invite_token == nil
    assert Coach.state(Repo.get!(Coach, coach.id)) == :removed
    assert {:error, :race_lost} = CoachInvitations.accept_invite(renewed, user.id)
  end

  test "a removed coach can join another business and sessions use the current team", %{ctx: ctx} do
    user = insert(:user)
    {:ok, invite} = CoachInvitations.invite_trainer(ctx, %{full_name: "Moving Coach", email: user.email})
    {:ok, coach} = CoachInvitations.accept_invite(invite, user.id)
    {:ok, _} = Coaches.remove_coach(ctx, coach.id)
    other = insert(:business)
    {:ok, other_invite} = CoachInvitations.invite_trainer(owner_ctx(other), %{full_name: "Moving Coach", email: user.email})

    assert {:ok, joined} = CoachInvitations.accept_invite(other_invite, user.id)
    assert joined.business_id == other.id
    assert {:ok, session} = SessionFactory.create_session(user, %{role: :coach})
    assert session.business_id == other.id
    assert session.coach_id == joined.id
    assert Coach.state(Repo.get!(Coach, coach.id)) == :removed
    {:ok, renewed} = CoachInvitations.invite_trainer(ctx, %{full_name: "Moving Coach", email: user.email})
    assert {:error, :already_a_coach} = CoachInvitations.accept_invite(renewed, user.id)
  end

  test "a removed coach can create their own business", %{ctx: ctx} do
    user = insert(:user, full_name: "")
    {:ok, invite} = CoachInvitations.invite_trainer(ctx, %{full_name: "Independent Coach", email: user.email})
    {:ok, coach} = CoachInvitations.accept_invite(invite, user.id)
    {:ok, _} = Coaches.remove_coach(ctx, coach.id)

    assert {:ok, business} =
             Easy.Orgs.create_business(%Easy.Ctx{business_id: nil, user_id: user.id}, %{name: "Independent", handle: "independent-coach", full_name: "Independent Coach"})

    assert business.owner_user_id == user.id
    assert {:ok, current} = Coaches.get_active_coach_by_user_id(user.id)
    assert current.business_id == business.id
    assert Coach.state(Repo.get!(Coach, coach.id)) == :removed
  end
end
