defmodule Easy.Orgs.CoachTest do
  use Easy.DataCase, async: true

  alias Easy.Orgs.Coach

  describe "invite_changeset/3" do
    test "valid input sets :invited status, a token, and a downcased email" do
      business = insert(:business)
      inviter = insert(:coach, business: business)

      cs =
        Coach.invite_changeset(business.id, inviter.id, %{
          "email" => "New.Coach@Test.com",
          "first_name" => "New",
          "last_name" => "Coach"
        })

      assert cs.valid?
      assert Ecto.Changeset.get_field(cs, :status) == :invited
      assert Ecto.Changeset.get_field(cs, :email) == "new.coach@test.com"
      assert Ecto.Changeset.get_field(cs, :business_id) == business.id
      assert Ecto.Changeset.get_field(cs, :invited_by_id) == inviter.id
      assert is_binary(Ecto.Changeset.get_field(cs, :invitation_token))
      assert %DateTime{} = Ecto.Changeset.get_field(cs, :invitation_sent_at)
    end

    test "missing email is invalid" do
      cs = Coach.invite_changeset(Ecto.UUID.generate(), Ecto.UUID.generate(), %{})

      refute cs.valid?
      assert "can't be blank" in errors_on(cs).email
    end

    test "invalid email format is invalid" do
      cs =
        Coach.invite_changeset(Ecto.UUID.generate(), Ecto.UUID.generate(), %{
          "email" => "not-an-email"
        })

      refute cs.valid?
      assert "has invalid format" in errors_on(cs).email
    end

    test "business_id, invited_by_id, status, and invitation_token are not castable from attrs" do
      business_id = Ecto.UUID.generate()
      invited_by_id = Ecto.UUID.generate()
      other_business_id = Ecto.UUID.generate()

      cs =
        Coach.invite_changeset(business_id, invited_by_id, %{
          "email" => "someone@test.com",
          "business_id" => other_business_id,
          "invited_by_id" => Ecto.UUID.generate(),
          "status" => "active",
          "invitation_token" => "evil-token"
        })

      assert Ecto.Changeset.get_field(cs, :business_id) == business_id
      assert Ecto.Changeset.get_field(cs, :invited_by_id) == invited_by_id
      assert Ecto.Changeset.get_field(cs, :status) == :invited
      refute Ecto.Changeset.get_field(cs, :invitation_token) == "evil-token"
    end

    test "same email twice in one business violates the unique constraint" do
      business = insert(:business)
      inviter = insert(:coach, business: business)

      attrs = %{"email" => "dup@test.com", "first_name" => "A"}

      business.id
      |> Coach.invite_changeset(inviter.id, attrs)
      |> Repo.insert!()

      {:error, cs} =
        business.id
        |> Coach.invite_changeset(inviter.id, attrs)
        |> Repo.insert()

      assert "has already been taken" in errors_on(cs).email
    end

    test "same user_id on two coach rows violates the unique constraint" do
      business = insert(:business)
      user = insert(:user)

      insert(:coach, business: business, user: user)

      assert_raise Ecto.ConstraintError, fn ->
        insert(:coach, business: insert(:business), user: user)
      end
    end
  end

  describe "accept_changeset/2" do
    test "sets user_id and :active status, and clears the invitation token" do
      business = insert(:business)
      inviter = insert(:coach, business: business)

      coach =
        business.id
        |> Coach.invite_changeset(inviter.id, %{"email" => "invitee@test.com"})
        |> Repo.insert!()

      user = insert(:user)
      cs = Coach.accept_changeset(coach, user.id)

      assert cs.valid?
      assert Ecto.Changeset.get_field(cs, :user_id) == user.id
      assert Ecto.Changeset.get_field(cs, :status) == :active
      assert Ecto.Changeset.get_field(cs, :invitation_token) == nil
    end
  end

  describe "active/1" do
    test "filters to status == :active" do
      business = insert(:business)
      active_coach = insert(:coach, business: business, status: :active)

      invited_coach =
        business.id
        |> Coach.invite_changeset(active_coach.id, %{"email" => "invited@test.com"})
        |> Repo.insert!()

      results = Coach |> Coach.active() |> Repo.all()
      ids = Enum.map(results, & &1.id)

      assert active_coach.id in ids
      refute invited_coach.id in ids
    end
  end
end
