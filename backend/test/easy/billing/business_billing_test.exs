defmodule Easy.Billing.BusinessBillingTest do
  use Easy.SchemaCase

  alias Easy.Billing
  alias Easy.Billing.BusinessBilling
  alias Easy.Clients.Client
  alias Easy.Ctx

  test "seat capacity preserves overage and accepts already-counted invitations at the limit" do
    billing = %BusinessBilling{free_seats: 2, paid_seats: 3}

    assert BusinessBilling.available_seats(billing, 4) == 1
    assert BusinessBilling.available_seats(billing, 5) == 0
    assert BusinessBilling.available_seats(billing, 6) == -1
    assert BusinessBilling.invitation_status(billing, 4) == {:active, nil}
    assert BusinessBilling.invitation_status(billing, 5) == {:active, nil}
    assert BusinessBilling.invitation_status(billing, 6) == {:inactive, :awaiting_seat}
  end

  test "billing workflows propagate default record failures without running reserved writes" do
    ctx = %Ctx{business_id: Ecto.UUID.generate(), user_id: Ecto.UUID.generate()}

    for result <- [
          Billing.get_billing(ctx),
          Billing.grant_free_seats(ctx, 3),
          Billing.seat_status_for_invitation(%Client{business_id: ctx.business_id}),
          Billing.reserve_seat(ctx, fn -> flunk("reserved write must not run") end)
        ] do
      assert {:error, changeset} = result
      assert errors_on(changeset).business_id == ["does not exist"]
    end
  end

  test "creation owns business identity and keeps uneditable seat defaults" do
    business = insert(:business)

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
