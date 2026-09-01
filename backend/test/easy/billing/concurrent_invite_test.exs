defmodule Easy.Billing.ConcurrentInviteTest do
  # Deliberately NOT Easy.DataCase. The SQL sandbox gives each process an
  # isolated, never-committed connection, so it cannot exercise the FOR UPDATE
  # lock in Billing.reserve_seat — two sandboxed processes never see each other's
  # rows. This test uses real committed connections (sandbox: false) so two
  # invites genuinely contend, and deletes its throwaway business in on_exit.
  # async: false, so ExUnit runs it without overlapping other tests.
  use ExUnit.Case, async: false

  import Ecto.Query
  import Easy.Factory

  alias Easy.Billing.{BusinessBilling, Event}
  alias Easy.Clients
  alias Easy.Clients.Client
  alias Easy.Ctx
  alias Easy.Forms.{FormAssignment, FormTemplate}
  alias Easy.Identity.User
  alias Easy.Orgs.{Business, Coach}
  alias Easy.Repo
  alias Ecto.Adapters.SQL.Sandbox

  setup do
    Sandbox.checkout(Repo, sandbox: false)

    business = insert(:business)
    # invite_client resolves a Coach from ctx.user_id — the owner needs one.
    coach = insert(:coach, business: business, user: business.owner)
    # exactly one seat, none used
    insert(:business_billing, business: business, free_seats: 1, paid_seats: 0)

    on_exit(fn ->
      Sandbox.checkout(Repo, sandbox: false)
      cleanup(business.id, business.owner_id)
    end)

    %{business: business, coach: coach}
  end

  test "two invites racing for the last seat: exactly one succeeds", %{business: business, coach: coach} do
    ctx = Ctx.new(business.id, business.owner_id, coach.id, true)
    parent = self()

    spawn_invite = fn ->
      Task.async(fn ->
        Sandbox.checkout(Repo, sandbox: false)
        send(parent, {:ready, self()})

        receive do
          :go -> :ok
        end

        Clients.invite_client(ctx, params_for(:client_attrs))
      end)
    end

    t1 = spawn_invite.()
    t2 = spawn_invite.()

    # Release both only once both hold a connection, so they collide on the lock.
    ready =
      for _ <- 1..2,
          do:
            (receive do
               {:ready, pid} -> pid
             end)

    for pid <- ready, do: send(pid, :go)

    results = [Task.await(t1, 5_000), Task.await(t2, 5_000)]

    assert Enum.count(results, &match?({:ok, _}, &1)) == 1
    assert Enum.count(results, &match?({:error, :seat_limit_reached}, &1)) == 1
    assert seat_used(business.id) == 1
  end

  defp seat_used(business_id) do
    Repo.one(
      from c in Client,
        where: c.business_id == ^business_id and c.status in [:active, :pending],
        select: count(c.id)
    )
  end

  defp cleanup(business_id, owner_id) do
    for schema <- [FormAssignment, FormTemplate, Client, Event, BusinessBilling, Coach] do
      Repo.delete_all(from r in schema, where: r.business_id == ^business_id)
    end

    Repo.delete_all(from b in Business, where: b.id == ^business_id)
    Repo.delete_all(from u in User, where: u.id == ^owner_id)
  end
end
