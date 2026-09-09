defmodule Easy.Clients.ReactivationTest do
  use Easy.DataCase, async: true

  alias Easy.ClientInvitations
  alias Easy.Clients

  test "invitation policy checks use cast email values for either key form" do
    coach = insert(:coach)
    other_client = insert(:client, status: :active)
    ctx = trainer_ctx(coach)

    for {email, reason} <- [{coach.user.email, :self_invite}, {other_client.user.email, :client_email_taken}],
        attrs <- [%{email: email}, %{"email" => email}] do
      assert {:error, ^reason} = ClientInvitations.invite(ctx, attrs)
    end

    refute Repo.exists?(Clients.Client.for_business(coach.business_id))
  end

  setup do
    coach = insert(:coach)
    client = insert(:client, business: coach.business, creator: coach, status: :inactive, inactive_reason: :manual)
    insert(:business_billing, business: coach.business, free_seats: 0, paid_seats: 0)
    %{ctx: trainer_ctx(coach), client: client}
  end

  test "both atom and string keyed status changes reserve capacity", %{ctx: ctx, client: client} do
    for attrs <- [%{status: :active}, %{"status" => "active"}] do
      assert {:error, :seat_limit_reached} = Clients.update_client(ctx, client.id, attrs)
      assert Repo.reload!(client).status == :inactive
    end
  end

  test "invalid status types return changeset errors", %{ctx: ctx, client: client} do
    for value <- [%{}, [], 123] do
      assert {:error, changeset} = Clients.update_client(ctx, client.id, %{status: value})
      assert errors_on(changeset).status == ["is invalid"]
      assert Repo.reload!(client).status == :inactive
    end
  end
end
