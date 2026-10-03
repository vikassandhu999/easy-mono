defmodule Easy.Clients.ReadBoundaryTest do
  use Easy.SchemaCase, async: true
  alias Easy.{ClientAccess, Clients}

  test "client profile, list and assignment are tenant scoped and trainer scoped" do
    coach = insert(:coach)
    colleague = insert(:coach, business: coach.business)
    mine = insert(:client, business: coach.business, coach: coach)
    hidden = insert(:client, business: coach.business, coach: colleague)
    foreign = insert(:client)
    ctx = trainer_ctx(coach)
    assert {:ok, %{clients: [visible]}} = Clients.list_clients(ctx)
    assert visible.id == mine.id
    assert {:ok, updated} = Clients.update_client(ctx, mine.id, %{full_name: "Updated", preferred_name: "Mononym"})
    assert updated.full_name == "Updated"
    assert updated.preferred_name == "Mononym"

    for client <- [hidden, foreign] do
      assert {:error, :not_found} = Clients.get_client_with_preloads(ctx, client.id)
      assert {:error, :not_found} = Clients.update_client(ctx, client.id, %{full_name: "Forbidden"})
      assert {:error, :not_found} = ClientAccess.authorize_client(ctx, client.id)
    end

    assert {:error, :not_owner} = Clients.update_client(ctx, mine.id, %{coach_id: colleague.id})
    assert {:ok, reassigned} = Clients.update_client(owner_ctx(coach.business), mine.id, %{coach_id: colleague.id})
    assert reassigned.coach_id == colleague.id
    assert {:error, :coach_not_active} = Clients.update_client(owner_ctx(coach.business), mine.id, %{coach_id: foreign.coach_id})
  end

  test "pagination and coach filters retain client visibility" do
    coach = insert(:coach)
    insert_list(22, :client, business: coach.business, coach: coach)
    other = insert(:coach, business: coach.business)
    insert(:client, business: coach.business, coach: other)
    assert {:ok, %{count: 22, clients: clients}} = Clients.list_clients(trainer_ctx(coach))
    assert length(clients) == 20
    assert {:ok, %{count: 22, clients: clients}} = Clients.list_clients(owner_ctx(coach.business), coach_id: coach.id, offset: 20)
    assert length(clients) == 2
  end
end
