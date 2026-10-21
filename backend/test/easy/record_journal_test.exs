defmodule Easy.RecordJournalTest do
  use Easy.DataCase, async: true
  alias Easy.Clients.Client
  alias Easy.CoachingTerms.CoachingTerm
  alias Easy.{Ctx, RecordJournal}

  setup do
    client = insert(:client, timezone: "Etc/UTC")
    ctx = %Ctx{business_id: client.business_id, user_id: client.user_id, client_id: client.id}
    %{client: client, ctx: ctx}
  end

  test "journal accepts writes without a coaching term", f do
    Repo.delete_all(from(t in CoachingTerm, where: t.client_id == ^f.client.id))
    assert {:ok, :accepted} = RecordJournal.write(f.ctx, fn _ -> {:ok, :accepted, []} end)
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
end
