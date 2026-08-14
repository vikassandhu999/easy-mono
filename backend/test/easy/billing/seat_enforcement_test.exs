defmodule Easy.Billing.SeatEnforcementTest do
  use Easy.DataCase, async: true

  alias Easy.{Billing, Clients}
  alias Easy.Clients.Client
  alias Easy.Repo

  import Easy.Factory
  import Ecto.Query

  # invite_client/2 looks up a Coach for ctx.user_id in ctx.business_id, so the
  # ctx actor must be a coach on the business — the owner's own coach row, so
  # visible_to also sees every client in the business regardless of assignment.
  defp ctx_for(business) do
    unless Repo.get_by(Easy.Orgs.Coach, business_id: business.id, user_id: business.owner_id) do
      insert(:coach, business: business, user: business.owner)
    end

    owner_ctx(business)
  end

  @webhook_secret "test_webhook_secret"

  defp charged_webhook(sub_id, quantity) do
    body =
      Jason.encode!(%{
        "event" => "subscription.charged",
        "payload" => %{
          "subscription" => %{"entity" => %{"id" => sub_id, "quantity" => quantity, "current_end" => 1_790_000_000}},
          "payment" => %{"entity" => %{"amount" => 10_000, "currency" => "INR"}}
        }
      })

    signature = :crypto.mac(:hmac, :sha256, @webhook_secret, body) |> Base.encode16(case: :lower)
    Billing.handle_razorpay_webhook(body, signature, "evt_#{System.unique_integer([:positive])}")
  end

  defp fill_free_seats(business) do
    insert(:client, business: business, status: :active)
    insert(:client, business: business, status: :active)
  end

  defp set_inserted_at(%Client{id: id}, %DateTime{} = inserted_at) do
    from(c in Client, where: c.id == ^id)
    |> Repo.update_all(set: [inserted_at: inserted_at])
  end

  test "invite is blocked at the seat limit" do
    business = insert(:business)
    insert(:business_billing, business: business, free_seats: 2)
    fill_free_seats(business)

    assert {:error, :seat_limit_reached} =
             Clients.invite_client(ctx_for(business), params_for(:client_attrs))
  end

  test "invite succeeds below the limit and a pending invite reserves a seat" do
    business = insert(:business)
    insert(:business_billing, business: business, free_seats: 2)
    insert(:client, business: business, status: :active)

    assert {:ok, _client} = Clients.invite_client(ctx_for(business), params_for(:client_attrs))
    assert {:ok, %{used_seats: 2}} = Billing.get_billing(ctx_for(business))

    assert {:error, :seat_limit_reached} =
             Clients.invite_client(ctx_for(business), params_for(:client_attrs))
  end

  test "reactivation is blocked at the seat limit" do
    business = insert(:business)
    insert(:business_billing, business: business, free_seats: 2)
    fill_free_seats(business)
    inactive = insert(:client, business: business, status: :inactive)

    assert {:error, :seat_limit_reached} =
             Clients.update_client(ctx_for(business), inactive.id, %{status: :active})
  end

  test "reactivation succeeds when a seat is free" do
    business = insert(:business)
    insert(:client, business: business, status: :active)
    inactive = insert(:client, business: business, status: :inactive)

    assert {:ok, %{status: :active}} =
             Clients.update_client(ctx_for(business), inactive.id, %{status: :active})
  end

  test "non-status updates are not seat-gated at the limit" do
    business = insert(:business)
    fill_free_seats(business)
    [client | _] = Repo.all(from c in Client, where: c.business_id == ^business.id)

    assert {:ok, _} = Clients.update_client(ctx_for(business), client.id, %{first_name: "New"})
  end

  test "update return recomputes the roster expiry fact" do
    business = insert(:business)
    client = insert(:client, business: business, status: :active, subscription_ends_on: nil)

    ends_on = Date.add(Date.utc_today(), 3)

    assert {:ok, updated} =
             Clients.update_client(ctx_for(business), client.id, %{subscription_ends_on: ends_on})

    assert updated.subscription_ends_on == ends_on
    assert updated.expiring_soon == true
  end

  test "accept-invite becomes active when capacity exists" do
    business = insert(:business)
    {:ok, invited} = Clients.invite_client(ctx_for(business), params_for(:client_attrs))
    user = insert(:user)

    assert {:ok, %{status: :active}} = Clients.accept_invite(invited, user.id, invited.email)
  end

  test "accept-invite becomes awaiting_seat when capacity does not exist" do
    business = insert(:business)
    insert(:business_billing, business: business, free_seats: 2)
    {:ok, invited} = Clients.invite_client(ctx_for(business), params_for(:client_attrs))
    # Capacity disappears after the invite: fill both free seats over the pending one.
    fill_free_seats(business)
    user = insert(:user)

    assert {:ok, %{status: :inactive, inactive_reason: :awaiting_seat}} =
             Clients.accept_invite(invited, user.id, invited.email)
  end

  test "a charge activates the oldest awaiting_seat clients up to capacity" do
    business = insert(:business)
    insert(:business_billing, business: business, razorpay_subscription_id: "sub_cap", free_seats: 2, status: :active)

    oldest = insert(:client, business: business, status: :inactive, inactive_reason: :awaiting_seat)
    set_inserted_at(oldest, ~U[2026-01-01 00:00:00Z])

    newer = insert(:client, business: business, status: :inactive, inactive_reason: :awaiting_seat)
    set_inserted_at(newer, ~U[2026-02-01 00:00:00Z])

    insert(:client, business: business, status: :active)
    # limit 2, used 1 -> capacity for exactly one

    assert :ok = charged_webhook("sub_cap", 0)
    assert Repo.get!(Client, oldest.id).status == :active
    assert Repo.get!(Client, oldest.id).inactive_reason == nil
    assert Repo.get!(Client, newer.id).status == :inactive
    assert Repo.get!(Client, newer.id).inactive_reason == :awaiting_seat
  end

  test "reactivating an inactive client at the seat limit is rejected" do
    business = insert(:business)
    insert(:business_billing, business: business, free_seats: 2)
    ctx = ctx_for(business)
    # free limit is 2; fill both with active clients
    insert(:client, business: business, status: :active)
    insert(:client, business: business, status: :active)
    dormant = insert(:client, business: business, status: :inactive, inactive_reason: :manual)

    assert {:error, :seat_limit_reached} = Clients.update_client(ctx, dormant.id, %{status: "active"})
    assert Repo.get!(Client, dormant.id).status == :inactive
  end

  test "existing active clients stay active after payment failure or cancellation" do
    business = insert(:business)
    insert(:business_billing, business: business, paid_seats: 0, status: :cancelled)
    fill_free_seats(business)
    extra = insert(:client, business: business, status: :active)

    assert Repo.get!(Client, extra.id).status == :active
    # ...but additions stay blocked:
    assert {:error, :seat_limit_reached} =
             Clients.invite_client(ctx_for(business), params_for(:client_attrs))
  end
end
