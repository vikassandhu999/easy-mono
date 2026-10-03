defmodule Easy.Identity.SessionFactoryTest do
  use Easy.DataCase, async: true

  alias Easy.CoachingTerms
  alias Easy.Ctx
  alias Easy.Identity.SessionFactory

  test "client login and refresh select a returning active relationship before a newer ended relationship" do
    user = insert(:user)
    today = Date.utc_today()
    now = DateTime.utc_now(:microsecond)

    earlier =
      insert(:client,
        user: user,
        joined_at: DateTime.add(now, -60, :day),
        inserted_at: DateTime.add(DateTime.utc_now(:second), -60, :day),
        terms: [
          build(:coaching_term, starts_on: Date.add(today, -60), ends_on: Date.add(today, -40)),
          build(:coaching_term, starts_on: today)
        ]
      )

    later =
      insert(:client,
        user: user,
        joined_at: DateTime.add(now, -30, :day),
        terms: [build(:coaching_term, starts_on: Date.add(today, -30), ends_on: Date.add(today, -1))]
      )

    assert {:ok, session} = SessionFactory.create_session(user, %{role: :client})
    assert session.business_id == earlier.business_id
    stale_session = insert(:user_session, user: user, business_id: later.business_id, role: :client)
    assert {:ok, refreshed} = SessionFactory.refresh_session(user, stale_session, %{})
    assert refreshed.business_id == earlier.business_id
  end

  test "accepting an older invitation without a seat selects the newly joined relationship" do
    user = insert(:user)
    today = Date.utc_today()
    business = insert(:business, billing: build(:business_billing, business: nil, free_seats: 0))

    invite =
      insert(:client,
        business: business,
        user: nil,
        invite_token: Ecto.UUID.generate(),
        invited_at: DateTime.utc_now(:second),
        inserted_at: DateTime.add(DateTime.utc_now(:second), -20, :day)
      )

    insert(:client,
      user: user,
      joined_at: DateTime.add(DateTime.utc_now(:microsecond), -10, :day),
      terms: [build(:coaching_term, starts_on: Date.add(today, -10), ends_on: Date.add(today, -1))]
    )

    assert {:ok, accepted} = CoachingTerms.accept_invite(%Ctx{business_id: invite.business_id, user_id: user.id}, invite, user.email)
    assert accepted.state == :joined
    assert {:ok, session} = SessionFactory.create_session(user, %{role: :client})
    assert session.business_id == business.id
  end

  describe "create_session/2 with coach role" do
    test "owner logs in: coach_id resolves to owner's coach row, is_owner true" do
      business = insert(:business)
      coach = insert(:coach, business: business, user: business.owner)
      business_id = business.id
      coach_id = coach.id

      assert {:ok, %{role: :coach, business_id: ^business_id, coach_id: ^coach_id, is_owner: true}} =
               SessionFactory.create_session(business.owner, %{role: :coach})
    end

    test "invited trainer (unlinked coach row) has no active row to match" do
      business = insert(:business)
      insert(:coach, business: business, user: nil, email: "invitee@test.com")
      unrelated_user = insert(:user)

      assert {:error, :coach_membership_not_found} = SessionFactory.create_session(unrelated_user, %{role: :coach})
    end

    test "deactivated trainer cannot log in" do
      business = insert(:business)
      trainer_user = insert(:user)
      insert(:coach, business: business, user: trainer_user, removed_on: Date.utc_today())

      assert {:error, :coach_membership_not_found} = SessionFactory.create_session(trainer_user, %{role: :coach})
    end

    test "plain trainer: is_owner false, correct coach_id" do
      business = insert(:business)
      trainer_user = insert(:user)
      coach = insert(:coach, business: business, user: trainer_user)
      business_id = business.id
      coach_id = coach.id

      assert {:ok, %{role: :coach, business_id: ^business_id, coach_id: ^coach_id, is_owner: false}} =
               SessionFactory.create_session(trainer_user, %{role: :coach})
    end
  end
end
