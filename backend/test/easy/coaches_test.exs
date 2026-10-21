defmodule Easy.CoachesTest do
  use Easy.SchemaCase, async: true
  alias Easy.Clients.Client
  alias Easy.{Coaches, Repo}
  alias Easy.Orgs.Coach

  test "removal reassigns every client to owner, preserves facts and denies further login" do
    business = insert(:business)
    owner = insert(:coach, business: business, user: business.owner)
    trainer = insert(:coach, business: business)
    client = insert(:client, business: business, coach: trainer)
    ctx = %{owner_ctx(business) | coach_id: owner.id}
    assert {:error, :not_owner} = Coaches.remove_coach(trainer_ctx(trainer), owner.id)
    assert {:error, :cannot_remove_owner} = Coaches.remove_coach(ctx, owner.id)
    assert {:ok, removed} = Coaches.remove_coach(ctx, trainer.id)
    assert removed.removed_on == Date.utc_today()
    assert Repo.get!(Client, client.id).coach_id == owner.id
    assert {:error, :not_found} = Coaches.get_active_coach_by_user_id(trainer.user_id)
    assert {:error, :not_found} = Coaches.remove_coach(ctx, insert(:coach).id)
  end

  test "profile and team lookup retain tenancy and owner restrictions" do
    business = insert(:business)
    owner = insert(:coach, business: business, user: business.owner)
    ctx = %{owner_ctx(business) | coach_id: owner.id}
    trainer = insert(:coach, business: business)
    assert {:ok, updated} = Coaches.update_profile(ctx, %{full_name: "Coach Full", preferred_name: "Coach", business_name: "New Studio"})
    assert updated.full_name == "Coach Full"
    assert updated.preferred_name == "Coach"
    assert updated.business.name == "New Studio"
    assert {:error, :not_owner} = Coaches.update_profile(trainer_ctx(trainer), %{business_name: "Forbidden"})
    assert {:error, :not_owner} = Coaches.list_team(trainer_ctx(trainer))
    assert {:ok, %{coaches: coaches, count: 2}} = Coaches.list_team(ctx, state: :active)
    assert Enum.all?(coaches, &(Coach.state(&1) == :active))
    assert {:error, :not_found} = Coaches.get_team_member(ctx, insert(:coach).id)
  end
end
