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

    invitation =
      insert(:coach,
        business: business,
        user: nil,
        invite_token: Ecto.UUID.generate(),
        invited_at: DateTime.utc_now(:second)
      )

    user = insert(:user)

    on_exit(fn ->
      Sandbox.checkout(Repo, sandbox: false)
      coach_user_ids = Repo.all(from c in Coach, where: c.business_id == ^business.id, select: c.user_id)
      Repo.delete_all(from t in Easy.CoachingTerms.CoachingTerm, join: c in Client, on: c.id == t.client_id, where: c.business_id == ^business.id)
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
      assert %Coach{removed_on: nil} = Repo.get(Coach, ctx.invitation.id)
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
    accepted = Task.await(accept, 5_000)
    resent = Task.await(resend, 5_000)

    coach = Repo.get!(Coach, ctx.invitation.id)

    case accepted do
      {:ok, _} ->
        assert Coach.state(coach) == :active
        assert coach.invite_token == nil
        assert resent == {:error, :not_found}

      {:error, :race_lost} ->
        assert {:ok, renewed} = resent
        assert Coach.state(coach) == :invited
        assert coach.invite_token == renewed.invite_token
        refute coach.invite_token == ctx.invitation.invite_token
    end
  end

  test "two invitations cannot activate the same user concurrently", ctx do
    second =
      insert(:coach,
        business: ctx.business,
        user: nil,
        invite_token: Ecto.UUID.generate(),
        invited_at: DateTime.utc_now(:second)
      )

    parent = self()

    tasks =
      Enum.map([ctx.invitation, second], fn invitation ->
        Task.async(fn -> checked_task(parent, :accept, fn -> CoachInvitations.accept_invite(invitation, ctx.user.id) end) end)
      end)

    release_workers(2)
    results = Enum.map(tasks, &Task.await(&1, 5_000))
    assert Enum.count(results, &match?({:ok, %Coach{}}, &1)) == 1
    assert Enum.count(results, &(&1 == {:error, :already_a_coach})) == 1
    assert Repo.aggregate(Coach.for_user(ctx.user.id) |> Coach.active(), :count) == 1
  end

  test "accept racing revoke of a returning coach preserves the historical membership", ctx do
    owner_ctx = Easy.Ctx.new(ctx.business.id, ctx.owner.user_id, ctx.owner.id, true)
    {:ok, accepted} = CoachInvitations.accept_invite(ctx.invitation, ctx.user.id)
    {:ok, removed} = Easy.Coaches.remove_coach(owner_ctx, accepted.id)
    {:ok, renewed} = CoachInvitations.invite_trainer(owner_ctx, %{full_name: removed.full_name, email: removed.email})
    parent = self()

    accept = Task.async(fn -> checked_task(parent, :accept, fn -> CoachInvitations.accept_invite(renewed, ctx.user.id) end) end)
    revoke = Task.async(fn -> checked_task(parent, :revoke, fn -> CoachInvitations.revoke_invite(owner_ctx, renewed.id) end) end)
    release_workers(2)
    accepted_result = Task.await(accept, 5_000)
    revoked_result = Task.await(revoke, 5_000)
    coach = Repo.get!(Coach, renewed.id)
    assert coach.user_id == ctx.user.id
    assert coach.invite_token == nil

    case accepted_result do
      {:ok, _} ->
        assert Coach.state(coach) == :active
        assert coach.removed_on == nil
        assert revoked_result == {:error, :not_found}

      {:error, :race_lost} ->
        assert {:ok, _} = revoked_result
        assert Coach.state(coach) == :removed
        assert coach.removed_on == removed.removed_on
    end
  end

  for first <- [:reassign, :deactivate] do
    @first first
    test "#{first} acquires the target lock first without leaving clients with an inactive coach", ctx do
      target = insert(:coach, business: ctx.business)
      client = insert(:client, business: ctx.business, coach: ctx.owner)
      owner_ctx = Easy.Ctx.new(ctx.business.id, ctx.owner.user_id, ctx.owner.id, true)
      parent = self()

      operations = %{
        reassign: fn -> Clients.update_client(owner_ctx, client.id, %{coach_id: target.id}) end,
        deactivate: fn -> Easy.Coaches.remove_coach(owner_ctx, target.id) end
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
      assert Repo.get!(Coach, target.id).removed_on == Date.utc_today()
      assert Repo.get!(Client, client.id).coach_id == ctx.owner.id
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
