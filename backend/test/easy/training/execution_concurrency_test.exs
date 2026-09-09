defmodule Easy.Training.ExecutionConcurrencyTest do
  use ExUnit.Case, async: false

  import Ecto.Changeset
  import Ecto.Query

  alias Easy.Clients.Client
  alias Easy.Ctx
  alias Easy.Identity.User
  alias Easy.Orgs.{Business, Coach}
  alias Easy.Repo
  alias Easy.Training.{Execution, TrainingSession}
  alias Ecto.Adapters.SQL.Sandbox

  setup do
    Sandbox.checkout(Repo, sandbox: false)

    fixture = insert_fixture()
    business = fixture.business
    client = fixture.client
    ctx = %Ctx{business_id: business.id, user_id: client.user_id, client_id: client.id}

    on_exit(fn ->
      Sandbox.checkout(Repo, sandbox: false)
      cleanup(business, fixture.user_ids)
    end)

    %{business: business, client: client, ctx: ctx}
  end

  test "concurrent starts create exactly one active Training Session", ctx do
    parent = self()

    tasks =
      for _ <- 1..2 do
        Task.async(fn ->
          Sandbox.checkout(Repo, sandbox: false)
          send(parent, {:ready, self()})

          receive do
            :go -> Execution.start_client_session(ctx.ctx, nil, %{})
          end
        end)
      end

    workers =
      for _ <- 1..2 do
        receive do
          {:ready, pid} -> pid
        end
      end

    Enum.each(workers, &send(&1, :go))

    results = Enum.map(tasks, &Task.await(&1, 5_000))
    assert Enum.count(results, &match?({:ok, _session}, &1)) == 1
    assert Enum.count(results, &(&1 == {:error, :conflict})) == 1

    assert Repo.aggregate(
             TrainingSession.for_client(TrainingSession, ctx.business.id, ctx.client.id),
             :count,
             :id
           ) == 1
  end

  defp insert_fixture do
    suffix = System.unique_integer([:positive])
    owner = insert_user!("execution-owner-#{suffix}@test.com")

    business =
      owner.id
      |> Business.insert_changeset(%{name: "Execution concurrency", handle: "execution-#{suffix}"})
      |> Repo.insert!()

    coach_user = insert_user!("execution-coach-#{suffix}@test.com")

    coach =
      business.id
      |> Coach.insert_changeset(coach_user.id, %{first_name: "Execution", last_name: "Coach"})
      |> put_change(:email, coach_user.email)
      |> Repo.insert!()

    client_user = insert_user!("execution-client-#{suffix}@test.com")

    client =
      change(%Client{}, %{
        business_id: business.id,
        creator_id: coach.id,
        assigned_coach_id: coach.id,
        user_id: client_user.id,
        email: client_user.email,
        first_name: "Execution",
        last_name: "Client",
        status: :active
      })
      |> Repo.insert!()

    %{business: business, client: client, coach: coach, user_ids: [owner.id, coach_user.id, client_user.id]}
  end

  defp insert_user!(email) do
    %{email: email, first_name: "Execution", last_name: "User"}
    |> User.insert_changeset()
    |> Repo.insert!()
  end

  defp cleanup(business, user_ids) do
    Repo.delete_all(from session in TrainingSession, where: session.business_id == ^business.id)
    Repo.delete_all(from client in Client, where: client.business_id == ^business.id)
    Repo.delete_all(from coach in Coach, where: coach.business_id == ^business.id)
    Repo.delete_all(from stored_business in Business, where: stored_business.id == ^business.id)
    Repo.delete_all(from user in User, where: user.id in ^user_ids)
  end
end
