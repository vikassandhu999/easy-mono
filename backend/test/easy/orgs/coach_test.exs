defmodule Easy.Orgs.CoachTest do
  use Easy.SchemaCase, async: true

  alias Easy.Orgs.Coach

  test "coach profile changesets enforce stored string limits" do
    coach = build(:coach)
    business_id = Ecto.UUID.generate()
    user_id = Ecto.UUID.generate()
    too_long = String.duplicate("e\u0301", 128)

    for field <- [:first_name, :last_name] do
      assert Coach.insert_changeset(business_id, user_id, %{field => String.duplicate("a", 255)}).valid?
      refute Coach.insert_changeset(business_id, user_id, %{field => too_long}).valid?
      attrs = %{field => too_long, :email => "a@test.com"}
      refute Coach.invite_changeset(Ecto.UUID.generate(), Ecto.UUID.generate(), DateTime.utc_now(:second), attrs).valid?
    end

    for field <- [:first_name, :last_name, :phone] do
      assert Coach.update_changeset(coach, %{field => String.duplicate("a", 255)}).valid?
      refute Coach.update_changeset(coach, %{field => too_long}).valid?
    end
  end

  test "creation uses required trusted identities and ignores supplied membership state" do
    business = insert(:business)
    user = insert(:user)
    attrs = %{business_id: Ecto.UUID.generate(), user_id: Ecto.UUID.generate(), status: :inactive}

    assert {:ok, coach} = business.id |> Coach.insert_changeset(user.id, attrs) |> Repo.insert()
    assert coach.business_id == business.id
    assert coach.user_id == user.id
    assert coach.status == :active

    changeset = Coach.insert_changeset(nil, nil, attrs)
    assert errors_on(changeset).business_id == ["can't be blank"]
    assert errors_on(changeset).user_id == ["can't be blank"]
  end

  test "creation translates missing trusted references into changeset errors" do
    business = insert(:business)
    user = insert(:user)

    for {business_id, user_id, field} <- [
          {business.id, Ecto.UUID.generate(), :user_id},
          {Ecto.UUID.generate(), user.id, :business_id}
        ] do
      assert {:error, changeset} = business_id |> Coach.insert_changeset(user_id, %{}) |> Repo.insert()
      assert errors_on(changeset)[field] == ["does not exist"]
    end
  end

  test "invitation email length matches the database column" do
    business_id = Ecto.UUID.generate()
    inviter_id = Ecto.UUID.generate()
    email = String.duplicate("a", 246) <> "@test.com"
    assert Coach.invite_changeset(business_id, inviter_id, DateTime.utc_now(:second), %{email: email}).valid?
    refute Coach.invite_changeset(business_id, inviter_id, DateTime.utc_now(:second), %{email: "a" <> email}).valid?
  end

  test "creating a second membership returns a changeset error" do
    coach = insert(:coach)
    assert {:error, changeset} = Easy.Coaches.create(coach.user, insert(:business))
    assert errors_on(changeset).user_id == ["has already been taken"]

    handle = "duplicate-membership-#{System.unique_integer([:positive])}"
    ctx = %Easy.Ctx{business_id: nil, user_id: coach.user_id}

    assert {:error, changeset} =
             Easy.Orgs.create_business(ctx, %{name: "Duplicate", handle: handle})

    assert errors_on(changeset).user_id == ["has already been taken"]
    refute Repo.get_by(Easy.Orgs.Business, handle: handle)
  end

  test "invitation changesets translate missing parent references" do
    business = insert(:business)

    assert {:error, changeset} =
             business.id
             |> Coach.invite_changeset(Ecto.UUID.generate(), DateTime.utc_now(:second), %{email: "missing-inviter@test.com"})
             |> Repo.insert()

    assert errors_on(changeset).invited_by_id == ["does not exist"]
  end

  describe "invite_changeset/4" do
    test "valid input sets :invited status, a token, and a downcased email" do
      business = insert(:business)
      inviter = insert(:coach, business: business)

      cs =
        Coach.invite_changeset(business.id, inviter.id, DateTime.utc_now(:second), %{
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
      cs = Coach.invite_changeset(Ecto.UUID.generate(), Ecto.UUID.generate(), DateTime.utc_now(:second), %{})

      refute cs.valid?
      assert "can't be blank" in errors_on(cs).email
    end

    test "invalid email format is invalid" do
      cs =
        Coach.invite_changeset(Ecto.UUID.generate(), Ecto.UUID.generate(), DateTime.utc_now(:second), %{
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
        Coach.invite_changeset(business_id, invited_by_id, DateTime.utc_now(:second), %{
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
      |> Coach.invite_changeset(inviter.id, DateTime.utc_now(:second), attrs)
      |> Repo.insert!()

      {:error, cs} =
        business.id
        |> Coach.invite_changeset(inviter.id, DateTime.utc_now(:second), attrs)
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

  describe "active/1" do
    test "filters to status == :active" do
      business = insert(:business)
      active_coach = insert(:coach, business: business, status: :active)

      invited_coach =
        business.id
        |> Coach.invite_changeset(active_coach.id, DateTime.utc_now(:second), %{"email" => "invited@test.com"})
        |> Repo.insert!()

      results = Coach |> Coach.active() |> Repo.all()
      ids = Enum.map(results, & &1.id)

      assert active_coach.id in ids
      refute invited_coach.id in ids
    end
  end
end
