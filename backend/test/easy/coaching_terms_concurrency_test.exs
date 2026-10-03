defmodule Easy.CoachingTermsConcurrencyTest do
  use ExUnit.Case, async: false
  import Ecto.Query
  import Easy.Factory
  alias Easy.{ClientInvitations, CoachingTerms, Ctx, Repo}
  alias Easy.Clients.Client
  alias Easy.CoachingTerms.CoachingTerm
  alias Easy.Identity.User
  alias Easy.Orgs.{Business, Coach}
  alias Ecto.Adapters.SQL.Sandbox

  test "concurrent accepts and starts share one capacity lock without losing accepted accounts" do
    Sandbox.checkout(Repo, sandbox: false)
    business = insert(:business, billing: build(:business_billing, business: nil, free_seats: 1))
    owner = insert(:coach, business: business, user: business.owner)
    ctx = %Ctx{business_id: business.id, user_id: owner.user_id, coach_id: owner.id, owner?: true}
    first_user = insert(:user)
    second_user = insert(:user)
    joined = insert(:client, business: business, coach: owner, terms: [])
    {:ok, first} = ClientInvitations.create(ctx, %{full_name: "First", email: first_user.email})
    {:ok, second} = ClientInvitations.create(ctx, %{full_name: "Second", email: second_user.email})
    user_ids = [owner.user_id, first_user.id, second_user.id, joined.user_id]

    on_exit(fn ->
      Sandbox.checkout(Repo, sandbox: false)
      Repo.delete_all(from t in CoachingTerm, join: c in Client, on: c.id == t.client_id, where: c.business_id == ^business.id)
      Repo.delete_all(from c in Client, where: c.business_id == ^business.id)
      Repo.delete_all(from c in Coach, where: c.business_id == ^business.id)
      Repo.delete_all(from b in Business, where: b.id == ^business.id)
      Repo.delete_all(from u in User, where: u.id in ^user_ids)
    end)

    parent = self()

    operations = [
      fn -> CoachingTerms.accept_invite(%Ctx{business_id: first.business_id, user_id: first_user.id}, first, first_user.email) end,
      fn -> CoachingTerms.accept_invite(%Ctx{business_id: second.business_id, user_id: second_user.id}, second, second_user.email) end,
      fn -> CoachingTerms.start_term_for_client(ctx, joined.id) end
    ]

    tasks =
      Enum.map(operations, fn operation ->
        Task.async(fn ->
          Sandbox.checkout(Repo, sandbox: false)
          send(parent, {:ready, self()})
          receive do: (:go -> operation.())
        end)
      end)

    workers =
      for _ <- 1..3 do
        assert_receive {:ready, pid}, 1_000
        pid
      end

    Enum.each(workers, &send(&1, :go))
    [first_result, second_result, start_result] = Enum.map(tasks, &Task.await(&1, 5_000))
    assert {:ok, accepted_first} = first_result
    assert {:ok, accepted_second} = second_result
    assert accepted_first.user_id == first_user.id
    assert accepted_second.user_id == second_user.id
    assert match?({:ok, %CoachingTerm{}}, start_result) or start_result == {:error, :seat_limit_reached}
    assert CoachingTerms.used_seats(%Easy.Ctx{business_id: business.id, user_id: business.owner_user_id}) == {:ok, 1}
    assert Repo.aggregate(CoachingTerm.for_business(business.id), :count, :id) == 1
  end
end
