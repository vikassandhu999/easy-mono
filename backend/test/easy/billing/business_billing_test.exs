defmodule Easy.Billing.BusinessBillingTest do
  use Easy.SchemaCase

  alias Easy.Billing
  alias Easy.Billing.BusinessBilling
  alias Easy.Ctx

  test "seat capacity is the sum of free and paid seats" do
    assert BusinessBilling.seat_limit(%BusinessBilling{free_seats: 2, paid_seats: 3}) == 5
  end

  test "billing workflows reject a missing business" do
    ctx = %Ctx{business_id: Ecto.UUID.generate(), user_id: Ecto.UUID.generate()}
    assert {:error, :not_found} = Billing.get_billing(ctx)
    assert {:error, :not_found} = Billing.grant_free_seats(ctx, 3)
  end

  test "creation owns business identity and keeps uneditable seat defaults" do
    business = insert(:business, billing: nil)

    assert {:ok, billing} =
             business.id
             |> BusinessBilling.insert_changeset(%{
               "business_id" => Ecto.UUID.generate(),
               "free_seats" => 3,
               "paid_seats" => 90,
               "status" => "active"
             })
             |> Repo.insert()

    assert billing.business_id == business.id
    assert billing.free_seats == 3
    assert billing.paid_seats == 0
    assert billing.status == :free
    assert BusinessBilling.seat_limit(billing) == 3
  end

  test "missing and negative seat values return validation errors" do
    assert {:error, changeset} =
             Ecto.UUID.generate() |> BusinessBilling.insert_changeset(%{free_seats: nil}) |> Repo.insert()

    assert errors_on(changeset).free_seats == ["can't be blank"]

    for field <- [:free_seats, :paid_seats, :status] do
      changeset = BusinessBilling.update_changeset(%BusinessBilling{}, %{field => nil})
      assert errors_on(changeset)[field] == ["can't be blank"]
    end

    changeset = BusinessBilling.update_changeset(%BusinessBilling{}, %{free_seats: -1, paid_seats: -1})
    assert errors_on(changeset).free_seats == ["must be greater than or equal to 0"]
    assert errors_on(changeset).paid_seats == ["must be greater than or equal to 0"]
  end

  test "provider identifiers respect database character limits" do
    for field <- [:razorpay_subscription_id, :razorpay_plan_id] do
      assert BusinessBilling.update_changeset(%BusinessBilling{}, %{field => String.duplicate("é", 255)}).valid?
      changeset = BusinessBilling.update_changeset(%BusinessBilling{}, %{field => String.duplicate("é", 256)})
      assert errors_on(changeset)[field] == ["should be at most 255 character(s)"]
    end
  end

  test "missing business returns a changeset error" do
    assert {:error, changeset} = Ecto.UUID.generate() |> BusinessBilling.insert_changeset() |> Repo.insert()
    assert errors_on(changeset).business_id == ["does not exist"]
  end
end
