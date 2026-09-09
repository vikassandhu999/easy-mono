defmodule Easy.Identity.SessionFactoryTest do
  use Easy.DataCase, async: true

  alias Easy.Identity.SessionFactory

  describe "create_session/2 with coach role" do
    test "owner logs in: coach_id resolves to owner's coach row, is_owner true" do
      business = insert(:business)
      coach = insert(:coach, business: business, user: business.owner, status: :active)
      business_id = business.id
      coach_id = coach.id

      assert {:ok, %{role: :coach, business_id: ^business_id, coach_id: ^coach_id, is_owner: true}} =
               SessionFactory.create_session(business.owner, %{role: :coach})
    end

    test "invited trainer (unlinked coach row) has no active row to match" do
      business = insert(:business)
      insert(:coach, business: business, user: nil, status: :invited, email: "invitee@test.com")
      unrelated_user = insert(:user)

      assert {:error, :coach_membership_not_found} = SessionFactory.create_session(unrelated_user, %{role: :coach})
    end

    test "deactivated trainer cannot log in" do
      business = insert(:business)
      trainer_user = insert(:user)
      insert(:coach, business: business, user: trainer_user, status: :inactive)

      assert {:error, :coach_membership_not_found} = SessionFactory.create_session(trainer_user, %{role: :coach})
    end

    test "plain trainer: is_owner false, correct coach_id" do
      business = insert(:business)
      trainer_user = insert(:user)
      coach = insert(:coach, business: business, user: trainer_user, status: :active)
      business_id = business.id
      coach_id = coach.id

      assert {:ok, %{role: :coach, business_id: ^business_id, coach_id: ^coach_id, is_owner: false}} =
               SessionFactory.create_session(trainer_user, %{role: :coach})
    end
  end
end
