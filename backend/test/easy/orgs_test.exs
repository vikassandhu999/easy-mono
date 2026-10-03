defmodule Easy.OrgsTest do
  use Easy.DataCase, async: true

  alias Easy.Billing.BusinessBilling
  alias Easy.Ctx
  alias Easy.Orgs
  alias Easy.Orgs.Business
  alias Easy.Orgs.Coach

  test "onboarding creates the owner profile and billing atomically from explicit names" do
    owner = insert(:user, full_name: "")
    ctx = %Ctx{business_id: nil, user_id: owner.id}

    assert {:ok, business} = Orgs.create_business(ctx, %{name: "Studio", handle: "named-owner", full_name: "Taylor Coach", preferred_name: "Tay"})
    assert %Coach{full_name: "Taylor Coach", preferred_name: "Tay"} = Repo.get_by!(Coach, business_id: business.id, user_id: owner.id)
    assert %BusinessBilling{free_seats: 10, paid_seats: 0} = Repo.get_by!(BusinessBilling, business_id: business.id)
    assert business.billing.id
    assert {:ok, summary} = Easy.Billing.get_billing(%{ctx | business_id: business.id})
    assert summary.seat_limit == 10
  end

  test "invalid owner names roll back both business and billing" do
    owner = insert(:user)
    ctx = %Ctx{business_id: nil, user_id: owner.id}

    invalid_profiles = [
      %{},
      %{full_name: ""},
      %{full_name: String.duplicate("x", 256)},
      %{full_name: "Coach", preferred_name: String.duplicate("x", 256)}
    ]

    for profile <- invalid_profiles do
      attrs = Map.merge(%{name: "Studio", handle: "invalid-owner"}, profile)
      assert {:error, %Ecto.Changeset{}} = Orgs.create_business(ctx, attrs)
      refute Repo.exists?(from b in Business, where: b.owner_user_id == ^owner.id)
      refute Repo.exists?(from b in BusinessBilling, join: business in Business, on: business.id == b.business_id, where: business.owner_user_id == ^owner.id)
    end
  end

  test "profile reads and updates use the context tenant and ignore supplied identities" do
    business = insert(:business)
    other = insert(:business)
    ctx = owner_ctx(business)

    assert {:ok, %{id: id}} = Orgs.get_business(ctx)
    assert id == business.id

    assert {:ok, updated} =
             Orgs.update_business(ctx, %{
               id: other.id,
               business_id: other.id,
               owner_user_id: other.owner_user_id,
               name: "Renamed"
             })

    assert updated.id == business.id
    assert updated.owner_user_id == business.owner_user_id
    assert updated.name == "Renamed"
    assert Repo.get!(Business, other.id).name == other.name
  end

  test "tenant operations return not_found when the context business does not exist" do
    ctx = %Ctx{business_id: Ecto.UUID.generate(), user_id: Ecto.UUID.generate(), owner?: true}

    assert {:error, :not_found} = Orgs.get_business(ctx)
    assert {:error, :not_found} = Orgs.update_business(ctx, %{name: "Missing"})
  end

  test "onboarding rejects an unknown user and duplicate handles without creating another business" do
    owner = insert(:user)
    attrs = %{name: "Coaching", handle: "context-onboarding", full_name: "Coach Owner"}

    assert {:error, :user_not_found} =
             Orgs.create_business(%Ctx{business_id: nil, user_id: Ecto.UUID.generate()}, attrs)

    ctx = %Ctx{business_id: nil, user_id: owner.id}
    assert {:ok, business} = Orgs.create_business(ctx, attrs)
    assert business.owner_user_id == owner.id

    assert {:error, changeset} = Orgs.create_business(ctx, attrs)
    assert errors_on(changeset).handle == ["has already been taken"]
    assert Repo.all(from(b in Business, where: b.owner_user_id == ^owner.id, select: b.id)) == [business.id]
  end
end
