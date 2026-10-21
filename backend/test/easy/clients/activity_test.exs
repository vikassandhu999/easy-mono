defmodule Easy.Clients.ActivityTest do
  use Easy.DataCase, async: true

  alias Easy.ClientAccount
  alias Easy.Ctx

  test "records the trusted client's latest activity without moving it backwards" do
    client = insert(:client, last_active_at: nil)
    ctx = %Ctx{business_id: client.business_id, user_id: client.user_id, client_id: client.id}
    now = DateTime.utc_now(:second)

    assert {:ok, :recorded} = ClientAccount.record_client_activity(ctx, now)
    assert Repo.reload(client).last_active_at == now
    assert {:ok, :recorded} = ClientAccount.record_client_activity(ctx, DateTime.add(now, -60, :second))
    assert Repo.reload(client).last_active_at == now
  end

  test "rejects absent clients and cross-tenant client identities" do
    client = insert(:client, last_active_at: nil)
    other = insert(:business)
    now = DateTime.utc_now(:second)

    contexts = [
      %Ctx{business_id: client.business_id, user_id: client.user_id},
      %Ctx{business_id: client.business_id, user_id: client.user_id, client_id: Ecto.UUID.generate()},
      %Ctx{business_id: other.id, user_id: client.user_id, client_id: client.id}
    ]

    for ctx <- contexts do
      assert {:error, :not_found} = ClientAccount.record_client_activity(ctx, now)
    end

    assert Repo.reload(client).last_active_at == nil
  end
end
