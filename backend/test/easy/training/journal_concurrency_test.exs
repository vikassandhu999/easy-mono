defmodule Easy.Training.JournalConcurrencyTest do
  use ExUnit.Case, async: false
  import Easy.Factory
  import Ecto.Query
  alias Easy.Clients.Client
  alias Easy.CoachingTerms.CoachingTerm
  alias Easy.Ctx
  alias Easy.Identity.User
  alias Easy.Orgs.Business
  alias Easy.Orgs.Coach
  alias Easy.RecordJournal
  alias Easy.Repo
  alias Easy.Training.Execution
  alias Easy.Training.PerformedSets
  alias Easy.Training.TrainingSession
  alias Ecto.Adapters.SQL.Sandbox

  setup do
    Sandbox.checkout(Repo, sandbox: false)
    client = insert(:client, timezone: "Etc/UTC")
    ctx = %Ctx{business_id: client.business_id, user_id: client.user_id, client_id: client.id}
    ids = [client.user_id, client.coach.user_id, client.business.owner_user_id]

    on_exit(fn ->
      Sandbox.checkout(Repo, sandbox: false)
      Repo.delete_all(CoachingTerm.for_business(client.business_id))
      Repo.delete_all(from(c in Client, where: c.business_id == ^client.business_id))
      Repo.delete_all(from(c in Coach, where: c.business_id == ^client.business_id))
      Repo.delete_all(from(b in Business, where: b.id == ^client.business_id))
      Repo.delete_all(from(u in User, where: u.id in ^ids))
    end)

    %{client: client, ctx: ctx}
  end

  test "parallel set writes serialize positions, records and journal sequence", f do
    assert {:ok, session} = Execution.start_client_session(f.ctx, %{})
    parent = self()

    tasks =
      for name <- ["A", "B"] do
        Task.async(fn ->
          Sandbox.checkout(Repo, sandbox: false)
          send(parent, {:ready, self()})
          receive do: (:go -> :ok)

          PerformedSets.create_client_performed_set(f.ctx, session.id, %{
            request_id: Ecto.UUID.generate(),
            exercise_name: name,
            reps: 5
          })
        end)
      end

    workers =
      for _ <- tasks do
        receive do: ({:ready, pid} -> pid)
      end

    Enum.each(workers, &send(&1, :go))
    results = Enum.map(tasks, &Task.await(&1, 5000))
    assert Enum.all?(results, &match?({:ok, _}, &1))
    assert {:ok, session} = Execution.get_client_session(f.ctx, session.id)
    assert Enum.map(session.performed_sets, & &1.position) == [0, 1]
    assert Repo.get!(Client, f.client.id).last_change_seq == 3

    assert Repo.query!("SELECT seq,count(*) FROM record_changes WHERE client_id=$1 GROUP BY seq ORDER BY seq", [
             Ecto.UUID.dump!(f.client.id)
           ]).rows == [[1, 1], [2, 2], [3, 2]]
  end

  test "a reader holding sequence cannot miss a writer whose rows are not yet committed", f do
    parent = self()

    writer =
      Task.async(fn ->
        Sandbox.checkout(Repo, sandbox: false)

        RecordJournal.write(f.ctx, fn client ->
          now = DateTime.utc_now(:second)

          {:ok, session} =
            TrainingSession.insert_changeset(f.ctx.business_id, client.id, RecordJournal.actor(f.ctx), %{
              local_date: Date.utc_today(),
              timezone: "Etc/UTC",
              started_at: now
            })
            |> Repo.insert()

          send(parent, {:writer_uncommitted, self()})
          receive do: (:commit -> :ok)
          {:ok, session, [RecordJournal.change(session.id, "session", nil, session)]}
        end)
      end)

    assert_receive {:writer_uncommitted, writer_pid}, 1000

    reader =
      Task.async(fn ->
        Sandbox.checkout(Repo, sandbox: false)

        Repo.snapshot(fn ->
          seq = Repo.get!(Client, f.client.id).last_change_seq
          count = Repo.aggregate(TrainingSession.for_client(f.ctx.business_id, f.client.id), :count)
          send(parent, {:reader_snapshot, self(), seq, count})
          receive do: (:writer_committed -> :ok)
          assert Repo.get!(Client, f.client.id).last_change_seq == seq
          assert Repo.aggregate(TrainingSession.for_client(f.ctx.business_id, f.client.id), :count) == count
          {:ok, seq}
        end)
      end)

    assert_receive {:reader_snapshot, reader_pid, 0, 0}, 1000
    send(writer_pid, :commit)
    assert {:ok, session} = Task.await(writer, 5000)
    send(reader_pid, :writer_committed)
    assert {:ok, reviewed_seq} = Task.await(reader, 5000)
    assert Repo.get!(Client, f.client.id).last_change_seq == 1

    assert Repo.query!("SELECT record_id FROM record_changes WHERE client_id=$1 AND seq>$2", [
             Ecto.UUID.dump!(f.client.id),
             reviewed_seq
           ]).rows == [[Ecto.UUID.dump!(session.id)]]
  end
end
