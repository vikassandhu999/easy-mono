defmodule Easy.Orgs.BusinessTest do
  use Easy.SchemaCase, async: true
  alias Easy.Orgs
  alias Easy.Orgs.Business

  test "handle syntax, reserved words and case are validated" do
    user = insert(:user)

    for handle <- ["ab", "-abc", "abc-", "a--b", "ABC", "a_b", "admin", String.duplicate("a", 41)] do
      assert {:error, changeset} = user.id |> Business.insert_changeset(%{name: "Studio", handle: handle}) |> Repo.insert()
      assert changeset.errors[:handle]
    end

    assert {:ok, business} = user.id |> Business.insert_changeset(%{name: "Studio", handle: "studio-123", owner_user_id: Ecto.UUID.generate(), seats: 100}) |> Repo.insert()
    assert business.owner_user_id == user.id
    refute Map.has_key?(business, :seats)
    assert {:error, duplicate} = user.id |> Business.insert_changeset(%{name: "Other", handle: "studio-123"}) |> Repo.insert()
    assert errors_on(duplicate).handle == ["has already been taken"]
  end

  test "owner can retain own handle and edit only their business" do
    business = insert(:business)
    ctx = owner_ctx(business)
    assert {:ok, %{available: true}} = Orgs.handle_availability(ctx, business.handle)
    assert {:ok, %{available: false}} = Orgs.handle_availability(owner_ctx(insert(:business)), business.handle)
    assert {:ok, %{available: false}} = Orgs.handle_availability(ctx, "admin")
    assert {:ok, updated} = Orgs.update_business(ctx, %{handle: "new-studio", timezone: "Europe/London"})
    assert updated.handle == "new-studio"
    assert updated.timezone == "Europe/London"
    assert {:error, :not_owner} = Orgs.update_business(%{ctx | owner?: false}, %{name: "Forbidden"})
    assert {:error, _} = Orgs.update_business(ctx, %{timezone: "Invalid/Zone"})
  end
end
