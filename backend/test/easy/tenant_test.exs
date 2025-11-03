defmodule Easy.TenantTest do
  use Easy.DataCase

  alias Easy.Tenant

  describe "businesses" do
    alias Easy.Tenant.Business

    import Easy.TenantFixtures

    @invalid_attrs %{handle: nil, name: nil, about: nil, logo_url: nil}

    test "list_businesses/0 returns all businesses" do
      business = business_fixture()
      assert Tenant.list_businesses() == [business]
    end

    test "get_business!/1 returns the business with given id" do
      business = business_fixture()
      assert Tenant.get_business!(business.id) == business
    end

    test "create_business/1 with valid data creates a business" do
      valid_attrs = %{
        handle: "some handle",
        name: "some name",
        about: "some about",
        logo_url: "some logo_url"
      }

      assert {:ok, %Business{} = business} = Tenant.create_business(valid_attrs)
      assert business.handle == "some handle"
      assert business.name == "some name"
      assert business.about == "some about"
      assert business.logo_url == "some logo_url"
    end

    test "create_business/1 with invalid data returns error changeset" do
      assert {:error, %Ecto.Changeset{}} = Tenant.create_business(@invalid_attrs)
    end

    test "update_business/2 with valid data updates the business" do
      business = business_fixture()

      update_attrs = %{
        handle: "some updated handle",
        name: "some updated name",
        about: "some updated about",
        logo_url: "some updated logo_url"
      }

      assert {:ok, %Business{} = business} = Tenant.update_business(business, update_attrs)
      assert business.handle == "some updated handle"
      assert business.name == "some updated name"
      assert business.about == "some updated about"
      assert business.logo_url == "some updated logo_url"
    end

    test "update_business/2 with invalid data returns error changeset" do
      business = business_fixture()
      assert {:error, %Ecto.Changeset{}} = Tenant.update_business(business, @invalid_attrs)
      assert business == Tenant.get_business!(business.id)
    end

    test "delete_business/1 deletes the business" do
      business = business_fixture()
      assert {:ok, %Business{}} = Tenant.delete_business(business)
      assert_raise Ecto.NoResultsError, fn -> Tenant.get_business!(business.id) end
    end

    test "change_business/1 returns a business changeset" do
      business = business_fixture()
      assert %Ecto.Changeset{} = Tenant.change_business(business)
    end
  end
end
