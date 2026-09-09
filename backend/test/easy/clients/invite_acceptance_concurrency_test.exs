defmodule Easy.Clients.InviteAcceptanceConcurrencyTest do
  use ExUnit.Case, async: false

  import Ecto.Query
  import Easy.Factory

  alias Easy.Billing.BusinessBilling
  alias Easy.ClientInvitations
  alias Easy.Clients.Client
  alias Easy.Identity.User
  alias Easy.Orgs.Business
  alias Easy.Orgs.Coach
  alias Easy.Repo
  alias Ecto.Adapters.SQL.Sandbox

  setup do
    Sandbox.checkout(Repo, sandbox: false)

    business = insert(:business)
    coach = insert(:coach, business: business)
    insert(:business_billing, business: business, free_seats: 2, paid_seats: 0)
    invitation = insert(:client, business: business, creator: coach, status: :pending, user: nil)
    users = [insert(:user), insert(:user)]

    on_exit(fn ->
      Sandbox.checkout(Repo, sandbox: false)
      cleanup(business, coach, invitation, users)
    end)

    %{invitation: invitation, users: users}
  end

  test "concurrent acceptance sets joined_at once and cannot rewrite it", %{
    invitation: invitation,
    users: users
  } do
    parent = self()

    tasks =
      Enum.map(users, fn user ->
        Task.async(fn ->
          Sandbox.checkout(Repo, sandbox: false)
          send(parent, {:ready, self()})

          receive do
            :go -> :ok
          end

          ClientInvitations.accept_invite(invitation, user.id, user.email)
        end)
      end)

    workers =
      for _ <- tasks do
        receive do
          {:ready, pid} -> pid
        end
      end

    Enum.each(workers, &send(&1, :go))
    results = Enum.map(tasks, &Task.await(&1, 5_000))

    assert Enum.count(results, &match?({:ok, %Client{}}, &1)) == 1
    assert Enum.count(results, &match?({:error, :race_lost}, &1)) == 1

    accepted = Repo.reload(invitation)
    assert accepted.joined_at

    joined_at = accepted.joined_at
    losing_user = Enum.find(users, &(&1.id != accepted.user_id))

    assert {:error, :race_lost} =
             ClientInvitations.accept_invite(invitation, losing_user.id, losing_user.email)

    assert Repo.reload(invitation).joined_at == joined_at
  end

  defp cleanup(business, coach, invitation, users) do
    Repo.delete_all(from c in Client, where: c.id == ^invitation.id)
    Repo.delete_all(from billing in BusinessBilling, where: billing.business_id == ^business.id)
    Repo.delete_all(from c in Coach, where: c.id == ^coach.id)
    Repo.delete_all(from b in Business, where: b.id == ^business.id)

    user_ids = [business.owner_id, coach.user_id | Enum.map(users, & &1.id)]
    Repo.delete_all(from u in User, where: u.id in ^user_ids)
  end
end
