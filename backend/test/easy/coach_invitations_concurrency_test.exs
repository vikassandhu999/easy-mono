defmodule Easy.CoachInvitationsConcurrencyTest do
  use ExUnit.Case, async: false

  import Ecto.Query
  import Easy.Factory

  alias Easy.Clients
  alias Easy.Clients.Client
  alias Easy.CoachInvitations
  alias Easy.Identity.User
  alias Easy.Orgs.{Business, Coach}
  alias Easy.Repo
  alias Ecto.Adapters.SQL.Sandbox

  setup do
    Sandbox.checkout(Repo, sandbox: false)
    business = insert(:business)
    owner = insert(:coach, business: business, user: business.owner)
    invitation = insert(:coach, business: business, user: nil, status: :invited)
    user = insert(:user)

    on_exit(fn ->
      Sandbox.checkout(Repo, sandbox: false)
      coach_user_ids = Repo.all(from c in Coach, where: c.business_id == ^business.id, select: c.user_id)
      Repo.delete_all(from c in Client, where: c.business_id == ^business.id)
      Repo.delete_all(from c in Coach, where: c.id == ^invitation.id)
      Repo.delete_all(from c in Coach, where: c.business_id == ^business.id)
      Repo.delete_all(from b in Business, where: b.id == ^business.id)
      Repo.delete_all(from u in User, where: u.id in ^Enum.reject([user.id | coach_user_ids], &is_nil/1))
    end)

    %{business: business, invitation: invitation, owner: owner, user: user}
  end

  test "accept racing revoke leaves either a removed invitation or an active coach, never deletes acceptance", ctx do
    parent = self()

    accept = Task.async(fn -> checked_task(parent, :accept, fn -> CoachInvitations.accept_invite(ctx.invitation, ctx.user.id) end) end)
    owner_ctx = Easy.Ctx.new(ctx.business.id, ctx.owner.user_id, ctx.owner.id, true)
    revoke = Task.async(fn -> checked_task(parent, :revoke, fn -> CoachInvitations.revoke_invite(owner_ctx, ctx.invitation.id) end) end)
    release_workers(2)
    accept_result = Task.await(accept, 5_000)
    revoke_result = Task.await(revoke, 5_000)

    assert match?({:ok, %Coach{}}, accept_result) or match?({:error, :race_lost}, accept_result)
    assert match?({:ok, %Coach{}}, revoke_result) or match?({:error, :not_found}, revoke_result)

    if match?({:ok, %Coach{}}, accept_result) do
      assert %Coach{status: :active} = Repo.get(Coach, ctx.invitation.id)
    else
      assert revoke_result == {:ok, elem(revoke_result, 1)}
      assert Repo.get(Coach, ctx.invitation.id) == nil
    end
  end

  test "accept racing resend cannot restore an invitation token on an active coach", ctx do
    parent = self()
    owner_ctx = Easy.Ctx.new(ctx.business.id, ctx.owner.user_id, ctx.owner.id, true)

    accept = Task.async(fn -> checked_task(parent, :accept, fn -> CoachInvitations.accept_invite(ctx.invitation, ctx.user.id) end) end)
    resend = Task.async(fn -> checked_task(parent, :resend, fn -> CoachInvitations.resend_invite(owner_ctx, ctx.invitation.id) end) end)
    release_workers(2)
    _ = Task.await(accept, 5_000)
    _ = Task.await(resend, 5_000)

    coach = Repo.get!(Coach, ctx.invitation.id)
    assert coach.status == :active
    assert coach.invitation_token == nil
  end

  for first <- [:reassign, :deactivate] do
    @first first
    test "#{first} acquires the target lock first without leaving clients with an inactive coach", ctx do
      target = insert(:coach, business: ctx.business)
      client = insert(:client, business: ctx.business, assigned_coach: ctx.owner)
      owner_ctx = Easy.Ctx.new(ctx.business.id, ctx.owner.user_id, ctx.owner.id, true)
      parent = self()

      operations = %{
        reassign: fn -> Clients.reassign_client(owner_ctx, client.id, target.id) end,
        deactivate: fn -> Easy.Coaches.deactivate_trainer(owner_ctx, target.id) end
      }

      second = if @first == :reassign, do: :deactivate, else: :reassign

      holder =
        Task.async(fn ->
          Sandbox.checkout(Repo, sandbox: false)

          Repo.transaction(fn ->
            Repo.one!(from c in Coach, where: c.business_id == ^ctx.business.id and c.id == ^target.id, lock: "FOR UPDATE")
            result = operations[@first].()
            send(parent, {:applied, self(), result})
            receive do: (:commit -> result)
          end)
        end)

      assert_receive {:applied, holder_pid, {:ok, _}}, 2_000
      waiter = Task.async(fn -> checked_task(parent, second, operations[second]) end)
      release_workers(1)
      send(holder_pid, :commit)
      assert {:ok, {:ok, _}} = Task.await(holder, 5_000)
      result = Task.await(waiter, 5_000)
      if @first == :reassign, do: assert(match?({:ok, _}, result)), else: assert(result == {:error, :coach_not_active})
      assert Repo.get!(Coach, target.id).status == :inactive
      assert Repo.get!(Client, client.id).assigned_coach_id == ctx.owner.id
    end
  end

  defp checked_task(parent, tag, operation) do
    Sandbox.checkout(Repo, sandbox: false)
    send(parent, {:ready, tag, self()})
    receive do: (:go -> operation.())
  end

  defp release_workers(count) do
    workers =
      for _ <- 1..count do
        assert_receive {:ready, _tag, pid}, 1_000
        pid
      end

    Enum.each(workers, &send(&1, :go))
  end
end
