defmodule Easy.Training.PerformedSetConcurrencyTest do
  use ExUnit.Case, async: false

  import Ecto.Changeset
  import Ecto.Query

  alias Easy.Clients.Client
  alias Easy.{Ctx, Repo}
  alias Easy.Identity.User
  alias Easy.Orgs.{Business, Coach}
  alias Easy.Training.{Execution, PerformedSets, TrainingExercise, TrainingPerformedSet, TrainingSession}
  alias Ecto.Adapters.SQL.Sandbox

  @append_count 8

  setup do
    Sandbox.checkout(Repo, sandbox: false)

    fixture = insert_fixture()
    ctx = %Ctx{business_id: fixture.business.id, user_id: fixture.client.user_id, client_id: fixture.client.id}
    {:ok, session} = Execution.start_client_session(ctx, nil, %{})

    on_exit(fn ->
      Sandbox.checkout(Repo, sandbox: false)
      cleanup(fixture.business, fixture.user_ids)
    end)

    %{ctx: ctx, exercise: fixture.exercise, session: session}
  end

  test "same-session concurrent appends receive contiguous positions", ctx do
    parent = self()

    tasks =
      for _ <- 1..@append_count do
        Task.async(fn ->
          Sandbox.checkout(Repo, sandbox: false)
          send(parent, {:ready, self()})

          receive do
            :go -> :ok
          end

          PerformedSets.create_client_performed_set(ctx.ctx, ctx.session.id, %{
            exercise_id: ctx.exercise.id,
            reps: "10"
          })
        end)
      end

    workers =
      for _ <- 1..@append_count do
        receive do
          {:ready, pid} -> pid
        end
      end

    Enum.each(workers, &send(&1, :go))

    positions =
      tasks
      |> Enum.map(&Task.await(&1, 5_000))
      |> Enum.map(fn {:ok, set} -> set.position end)
      |> Enum.sort()

    assert positions == Enum.to_list(0..(@append_count - 1))
  end

  test "an update waiting on session completion cannot change terminal history", ctx do
    assert_terminal_transition_wins(ctx, fn set ->
      PerformedSets.update_client_performed_set(ctx.ctx, set.id, %{reps: "12"})
    end)
  end

  test "concurrent retries of one request create one set and reserve one append position", ctx do
    parent = self()
    attrs = %{request_id: Ecto.UUID.generate(), exercise_id: ctx.exercise.id, reps: "10"}

    tasks =
      for _ <- 1..@append_count do
        Task.async(fn ->
          Sandbox.checkout(Repo, sandbox: false)
          send(parent, {:retry_ready, self()})

          receive do
            :go -> PerformedSets.create_client_performed_set(ctx.ctx, ctx.session.id, attrs)
          end
        end)
      end

    for _ <- 1..@append_count do
      receive do
        {:retry_ready, pid} -> send(pid, :go)
      end
    end

    sets =
      Enum.map(tasks, fn task ->
        assert {:ok, set} = Task.await(task, 5_000)
        set
      end)

    assert length(Enum.uniq_by(sets, & &1.id)) == 1
    assert Enum.all?(sets, &(&1.position == 0))
    {:ok, next} = PerformedSets.create_client_performed_set(ctx.ctx, ctx.session.id, %{attrs | request_id: Ecto.UUID.generate()})
    assert next.position == 1
  end

  test "a delete waiting on session completion cannot change terminal history", ctx do
    assert_terminal_transition_wins(ctx, fn set ->
      PerformedSets.delete_client_performed_set(ctx.ctx, set.id)
    end)
  end

  defp assert_terminal_transition_wins(ctx, mutation) do
    {:ok, set} =
      PerformedSets.create_client_performed_set(ctx.ctx, ctx.session.id, %{
        exercise_id: ctx.exercise.id,
        reps: "10"
      })

    parent = self()

    terminal_transition =
      Task.async(fn ->
        Sandbox.checkout(Repo, sandbox: false)

        Repo.transaction(fn ->
          session =
            TrainingSession
            |> TrainingSession.for_business(ctx.ctx.business_id)
            |> lock("FOR UPDATE")
            |> Repo.get!(ctx.session.id)

          send(parent, {:session_locked, self()})

          receive do
            :complete ->
              session
              |> change(state: :completed, closed_at: DateTime.utc_now(:second))
              |> Repo.update!()
          end
        end)
      end)

    locker =
      receive do
        {:session_locked, pid} -> pid
      end

    attempted_mutation =
      Task.async(fn ->
        Sandbox.checkout(Repo, sandbox: false)
        mutation.(set)
      end)

    assert Task.yield(attempted_mutation, 100) == nil
    send(locker, :complete)

    assert {:ok, %TrainingSession{state: :completed}} = Task.await(terminal_transition, 5_000)
    assert {:error, :not_found} = Task.await(attempted_mutation, 5_000)
  end

  defp insert_fixture do
    suffix = System.unique_integer([:positive])
    owner = insert_user!("performed-set-owner-#{suffix}@test.com")

    business =
      owner.id
      |> Business.insert_changeset(%{name: "Performed set concurrency", handle: "performed-set-#{suffix}"})
      |> Repo.insert!()

    coach_user = insert_user!("performed-set-coach-#{suffix}@test.com")

    coach =
      business.id
      |> Coach.insert_changeset(coach_user.id, %{first_name: "Performed", last_name: "Coach"})
      |> put_change(:email, coach_user.email)
      |> Repo.insert!()

    client_user = insert_user!("performed-set-client-#{suffix}@test.com")

    client =
      change(%Client{}, %{
        business_id: business.id,
        creator_id: coach.id,
        assigned_coach_id: coach.id,
        user_id: client_user.id,
        email: client_user.email,
        first_name: "Performed",
        last_name: "Client",
        status: :active
      })
      |> Repo.insert!()

    exercise =
      business.id
      |> TrainingExercise.insert_changeset(coach.id, %{name: "Race exercise"})
      |> Repo.insert!()

    %{
      business: business,
      client: client,
      exercise: exercise,
      user_ids: [owner.id, coach_user.id, client_user.id]
    }
  end

  defp insert_user!(email) do
    %{email: email, first_name: "Performed", last_name: "User"}
    |> User.insert_changeset()
    |> Repo.insert!()
  end

  defp cleanup(business, user_ids) do
    for schema <- [TrainingPerformedSet, TrainingSession, TrainingExercise, Client, Coach] do
      Repo.delete_all(from row in schema, where: row.business_id == ^business.id)
    end

    Repo.delete_all(from row in Business, where: row.id == ^business.id)
    Repo.delete_all(from row in User, where: row.id in ^user_ids)
  end
end
