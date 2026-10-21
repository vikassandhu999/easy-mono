defmodule Easy.Billing.EventTest do
  use Easy.SchemaCase

  alias Easy.Billing.Event

  test "persists trusted event identity and time while ignoring submitted replacements" do
    business = insert(:business)
    occurred_at = DateTime.utc_now(:second)

    assert {:ok, event} =
             business.id
             |> Event.insert_changeset(:seats_added, occurred_at, %{
               "business_id" => Ecto.UUID.generate(),
               "kind" => "payment_failed",
               "occurred_at" => "2000-01-01T00:00:00Z",
               "seat_delta" => 3,
               "metadata" => %{"source" => "checkout"}
             })
             |> Repo.insert()

    assert event.business_id == business.id
    assert event.kind == :seats_added
    assert event.occurred_at == occurred_at
    assert event.seat_delta == 3
    assert event.metadata == %{"source" => "checkout"}
  end

  test "returns changeset errors for missing fields and invalid amounts" do
    changeset = Event.insert_changeset(nil, nil, nil, %{seat_delta: -1, amount_paid: -1})
    assert errors_on(changeset).business_id == ["can't be blank"]
    assert errors_on(changeset).kind == ["can't be blank"]
    assert errors_on(changeset).occurred_at == ["can't be blank"]
    assert errors_on(changeset).seat_delta == ["must be greater than or equal to 0"]
    assert errors_on(changeset).amount_paid == ["must be greater than or equal to 0"]
  end

  test "maps a missing business to a changeset error" do
    assert {:error, changeset} =
             Ecto.UUID.generate()
             |> Event.insert_changeset(:payment_failed, DateTime.utc_now(:second), %{})
             |> Repo.insert()

    assert errors_on(changeset).business_id == ["does not exist"]
  end
end
