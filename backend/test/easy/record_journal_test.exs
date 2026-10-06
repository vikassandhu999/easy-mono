defmodule Easy.RecordJournalTest do
  use Easy.DataCase, async: true
  alias Easy.Clients.Client
  alias Easy.CoachingTerms.CoachingTerm
  alias Easy.{Ctx, RecordJournal}
  alias Easy.Training.{Execution, TrainingSession}

  setup do
    client = insert(:client, timezone: "Etc/UTC")
    ctx = %Ctx{business_id: client.business_id, user_id: client.user_id, client_id: client.id}
    %{client: client, ctx: ctx}
  end

  test "record and journal identify the client membership, not the account", f do
    assert {:ok, session} = Execution.start_client_session(f.ctx, %{})
    assert session.recorded_by_type == :client
    assert session.recorded_by_id == f.client.id
    assert journal_actor(session.id) == ["client", Ecto.UUID.dump!(f.client.id)]
  end

  test "journal accepts writes without a coaching term", f do
    Repo.delete_all(from(t in CoachingTerm, where: t.client_id == ^f.client.id))
    assert {:ok, :accepted} = RecordJournal.write(f.ctx, fn _ -> {:ok, :accepted, []} end)
  end

  test "coach journal writes use the coach membership for both actor fields", f do
    ctx = trainer_ctx(f.client.coach)
    Repo.delete_all(from(t in CoachingTerm, where: t.client_id == ^f.client.id))

    assert {:ok, session} =
             RecordJournal.write_for_client(ctx, f.client.id, fn client ->
               {:ok, row} =
                 ctx.business_id
                 |> TrainingSession.insert_changeset(client.id, RecordJournal.actor(ctx), %{
                   local_date: Date.utc_today(),
                   timezone: "Etc/UTC",
                   started_at: DateTime.utc_now(:second)
                 })
                 |> Repo.insert()

               {:ok, row, [RecordJournal.change(row.id, "session", nil, row)]}
             end)

    assert session.recorded_by_type == :coach
    assert session.recorded_by_id == f.client.coach.id
    assert journal_actor(session.id) == ["coach", Ecto.UUID.dump!(f.client.coach.id)]
    assert Repo.get!(Client, f.client.id).last_change_seq == 1

    assert {:error, :not_found} =
             RecordJournal.write_for_client(trainer_ctx(insert(:coach)), f.client.id, fn _ ->
               flunk("foreign coach reached the write")
             end)
  end

  test "a failed operation rolls back its writes and does not allocate a sequence", f do
    assert {:error, :conflict} =
             RecordJournal.write(f.ctx, fn client ->
               client |> change(timezone: "Europe/London") |> Repo.update!()
               {:error, :conflict}
             end)

    client = Repo.get!(Client, f.client.id)
    assert client.timezone == "Etc/UTC"
    assert client.last_change_seq == 0
  end

  test "operation sees the previous sequence and a no-op never allocates one", f do
    assert {:ok, session} = Execution.start_client_session(f.ctx, %{request_id: Ecto.UUID.generate()})

    assert {:ok, :unchanged} =
             RecordJournal.write(f.ctx, fn client ->
               assert client.last_change_seq == 1
               assert Repo.get!(Client, client.id).last_change_seq == 1
               {:ok, :unchanged, []}
             end)

    assert Repo.get!(Client, f.client.id).last_change_seq == 1
    assert {:ok, retry} = Execution.start_client_session(f.ctx, %{request_id: session.request_id})
    assert retry.id == session.id
  end

  defp journal_actor(id) do
    Repo.query!("SELECT changed_by_type, changed_by_id FROM record_changes WHERE record_id=$1", [Ecto.UUID.dump!(id)])
    |> Map.fetch!(:rows)
    |> hd()
  end
end
