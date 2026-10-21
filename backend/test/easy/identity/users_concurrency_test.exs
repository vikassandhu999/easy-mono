defmodule Easy.Identity.UsersConcurrencyTest do
  use ExUnit.Case, async: false

  import Ecto.Query

  alias Easy.Identity.{User, Users}
  alias Easy.Repo
  alias Ecto.Adapters.SQL.Sandbox

  setup do
    Sandbox.checkout(Repo, sandbox: false)
    email = "user-race-#{Ecto.UUID.generate()}@test.com"

    on_exit(fn ->
      Sandbox.checkout(Repo, sandbox: false)
      Repo.delete_all(from u in User, where: u.email == ^email)
    end)

    %{email: email}
  end

  test "invitation creation reuses a user committed by another transaction", %{email: email} do
    parent = self()

    assert {:ok, {winner, contender}} =
             Repo.transaction(fn ->
               {:ok, winner} = Users.create(%{email: email, full_name: "Original"})
               {:ok, winner} = Users.confirm_user_email(winner)

               contender =
                 Task.async(fn ->
                   Sandbox.checkout(Repo, sandbox: false)
                   %{rows: [[pid]]} = Repo.query!("SELECT pg_backend_pid()")
                   send(parent, {:contender, pid})
                   Users.create_if_absent(%{email: email, full_name: "Invitation"})
                 end)

               assert_receive {:contender, pid}, 1_000
               assert_blocked(pid, 100)
               {winner, contender}
             end)

    assert {:ok, existing} = Task.await(contender, 5_000)
    assert existing == winner
    assert Repo.aggregate(from(u in User, where: u.email == ^email), :count) == 1
  end

  test "creates a missing user and preserves validation errors", %{email: email} do
    assert {:error, %Ecto.Changeset{valid?: false}} = Users.create_if_absent(%{email: "invalid"})
    assert {:ok, user} = Users.create_if_absent(%{email: email, full_name: "Invitation"})
    assert user.email == email
    assert user.full_name == "Invitation"
    assert user.email_confirmed_at == nil
    assert Repo.get!(User, user.id) == user
  end

  defp assert_blocked(_pid, 0), do: flunk("creation never waited for the competing user insert")

  defp assert_blocked(pid, attempts) do
    case Repo.query!("SELECT cardinality(pg_blocking_pids($1)) > 0", [pid]).rows do
      [[true]] ->
        :ok

      [[false]] ->
        Process.sleep(10)
        assert_blocked(pid, attempts - 1)
    end
  end
end
