defmodule Easy.Orgs.BusinessTest do
  use Easy.SchemaCase, async: true

  alias Easy.Orgs
  alias Easy.Orgs.Business

  test "creation requires a trusted existing owner and ignores owner attributes" do
    owner = insert(:user)
    attrs = %{name: "Owned", handle: "owned", owner_id: Ecto.UUID.generate()}

    assert {:ok, business} = owner.id |> Business.insert_changeset(attrs) |> Repo.insert()
    assert business.owner_id == owner.id

    changeset = Business.insert_changeset(nil, attrs)
    assert errors_on(changeset).owner_id == ["can't be blank"]

    assert {:error, changeset} =
             Ecto.UUID.generate()
             |> Business.insert_changeset(%{attrs | handle: "missing-owner"})
             |> Repo.insert()

    assert errors_on(changeset).owner_id == ["does not exist"]
  end

  test "updates preserve required name and weight unit" do
    business = insert(:business) |> Repo.reload!()

    for attrs <- [%{name: nil}, %{"name" => "   "}, %{default_weight_unit: nil}] do
      assert {:error, changeset} = Orgs.update_business(owner_ctx(business), attrs)
      refute changeset.valid?
      assert Repo.get!(Business, business.id) == business
    end
  end

  test "creation rejects a blank default weight unit" do
    changeset =
      Business.insert_changeset(Ecto.UUID.generate(), %{name: "Coaching", handle: "coaching", default_weight_unit: nil})

    assert errors_on(changeset).default_weight_unit == ["can't be blank"]
  end

  test "creation validates every stored profile string against its column limit" do
    user_id = Ecto.UUID.generate()
    attrs = %{name: "Coaching", handle: "coaching"}

    for field <- [:name, :handle, :about] do
      assert Business.insert_changeset(user_id, Map.put(attrs, field, String.duplicate("a", 255))).valid?
      refute Business.insert_changeset(user_id, Map.put(attrs, field, String.duplicate("a", 256))).valid?
    end
  end

  test "update limits count Unicode codepoints as PostgreSQL does" do
    business = build(:business)
    too_long = String.duplicate("e\u0301", 128)
    assert String.length(too_long) == 128

    for field <- [:name, :about, :whatsapp_number] do
      assert Business.update_changeset(business, %{field => String.duplicate("a", 255)}).valid?
      refute Business.update_changeset(business, %{field => too_long}).valid?
    end
  end

  test "partial updates preserve required fields and may clear optional text" do
    business = insert(:business, about: "About")
    assert {:ok, updated} = Orgs.update_business(owner_ctx(business), %{about: nil})
    assert updated.about == nil
    assert updated.name == business.name
    assert updated.default_weight_unit == business.default_weight_unit
  end

  test "dashboard setup changesets persist consistent state and preserve completion" do
    business = insert(:business)
    now = DateTime.utc_now(:second)

    assert {:ok, dismissed} =
             business
             |> Business.update_changeset(:dashboard_setup, now, %{dashboard_setup_hidden_reason: :dismissed})
             |> Repo.update()

    assert %DateTime{} = dismissed.dashboard_setup_hidden_at

    assert {:ok, visible} =
             dismissed
             |> Business.update_changeset(:dashboard_setup, now, %{dashboard_setup_hidden_reason: nil})
             |> Repo.update()

    assert visible.dashboard_setup_hidden_reason == nil
    assert visible.dashboard_setup_hidden_at == nil

    assert {:ok, completed} =
             visible
             |> Business.update_changeset(:dashboard_setup, now, %{dashboard_setup_hidden_reason: :completed})
             |> Repo.update()

    assert %DateTime{} = completed.dashboard_setup_hidden_at

    for reason <- [nil, :dismissed] do
      assert {:ok, ^completed} =
               completed
               |> Business.update_changeset(:dashboard_setup, now, %{dashboard_setup_hidden_reason: reason})
               |> Repo.update()
    end
  end
end
