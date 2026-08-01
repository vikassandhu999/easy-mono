defmodule Easy.Training.PerformedSetConcurrencyTest do
  use ExUnit.Case, async: false

  import Ecto.Query
  import Easy.Factory

  alias Easy.Clients.Client
  alias Easy.Identity.User
  alias Easy.Orgs.{Business, Coach}
  alias Easy.Training.{TrainingExercise, TrainingPerformedSet, TrainingSession}
  alias Easy.{Ctx, Repo, Sessions}
  alias Ecto.Adapters.SQL.Sandbox

  @append_count 8

  setup do
    Sandbox.checkout(Repo, sandbox: false)

    business = insert(:business)
    coach = insert(:coach, business: business)
    client = insert(:client, user: insert(:user), creator: coach, business: business)
    session = insert(:workout_session, client: client, business: business, state: :active)
    exercise = insert(:exercise, business: business)
    ctx = %Ctx{user_id: client.user_id, business_id: business.id, client_id: client.id}

    on_exit(fn ->
      Sandbox.checkout(Repo, sandbox: false)
      cleanup(business, [business.owner_id, coach.user_id, client.user_id])
    end)

    %{ctx: ctx, session: session, exercise: exercise}
  end

  test "same-session concurrent appends receive distinct positions", ctx do
    parent = self()

    tasks =
      for _ <- 1..@append_count do
        Task.async(fn ->
          Sandbox.checkout(Repo, sandbox: false)
          send(parent, {:ready, self()})

          receive do
            :go -> :ok
          end

          Sessions.create_client_performed_set(ctx.ctx, ctx.session.id, %{
            exercise_id: ctx.exercise.id,
            set_type: "working",
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

  defp cleanup(business, user_ids) do
    for schema <- [TrainingPerformedSet, TrainingSession, TrainingExercise, Client, Coach] do
      Repo.delete_all(from row in schema, where: row.business_id == ^business.id)
    end

    Repo.delete_all(from row in Business, where: row.id == ^business.id)
    Repo.delete_all(from row in User, where: row.id in ^user_ids)
  end
end
