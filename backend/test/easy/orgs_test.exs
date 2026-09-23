defmodule Easy.OrgsTest do
  use Easy.DataCase, async: true

  alias Easy.{Ctx, Orgs}
  alias Easy.Orgs.Business

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
               owner_id: other.owner_id,
               name: "Renamed"
             })

    assert updated.id == business.id
    assert updated.owner_id == business.owner_id
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
    attrs = %{name: "Coaching", handle: "context-onboarding"}

    assert {:error, :user_not_found} =
             Orgs.create_business(%Ctx{business_id: nil, user_id: Ecto.UUID.generate()}, attrs)

    ctx = %Ctx{business_id: nil, user_id: owner.id}
    assert {:ok, business} = Orgs.create_business(ctx, attrs)
    assert business.owner_id == owner.id

    assert {:error, changeset} = Orgs.create_business(ctx, attrs)
    assert errors_on(changeset).handle == ["has already been taken"]
    assert Repo.all(from(b in Business, where: b.owner_id == ^owner.id, select: b.id)) == [business.id]
  end
end
