defmodule Easy.ReviewsConcurrencyTest do
  alias Easy.Clients.Client
  alias Easy.CoachingTerms.CoachingTerm
  alias Easy.Ctx
  alias Easy.Orgs.Coach
  alias Easy.Repo
  alias Easy.Reviews
  alias Easy.Trackers
  alias Easy.Trackers.Records
  alias Ecto.Adapters.SQL.Sandbox
  use ExUnit.Case, async: false
  import Easy.Factory
  import Ecto.Query

  setup do
    Sandbox.checkout(Repo, sandbox: false)
    client = insert(:client, timezone: "Etc/UTC")
    ctx = Ctx.new(client.business_id, client.coach.user_id, client.coach_id, false)
    {:ok, tracker} = Trackers.create_tracker(ctx, %{name: "Concurrent reflection", kind: :text})
    ids = [client.user_id, client.coach.user_id, client.business.owner_user_id]

    on_exit(fn ->
      Sandbox.checkout(Repo, sandbox: false)
      Repo.delete_all(CoachingTerm.for_business(client.business_id))
      Repo.delete_all(Client.for_business(client.business_id))
      Repo.delete_all(Coach.for_business(client.business_id))
      Repo.delete!(client.business)
      Repo.delete_all(from(u in Easy.Identity.User, where: u.id in ^ids))
    end)

    %{
      ctx: ctx,
      client: client,
      tracker: tracker,
      cc: %Ctx{business_id: client.business_id, user_id: client.user_id, client_id: client.id}
    }
  end

  test "a commit during the real review screen read is visible at the next review", f do
    parent = self()
    handler = {__MODULE__, make_ref()}
    :ok = :telemetry.attach(handler, [:easy, :repo, :query], &__MODULE__.barrier/4, parent)
    on_exit(fn -> :telemetry.detach(handler) end)

    reader =
      Task.async(fn ->
        Sandbox.checkout(Repo, sandbox: false)
        Process.put(:review_reader, true)
        Reviews.screen_for_client(f.ctx, f.client.id)
      end)

    assert_receive {:snapshot_started, reader_pid}, 5000
    assert reader_pid == reader.pid

    writer =
      Task.async(fn ->
        Sandbox.checkout(Repo, sandbox: false)

        Records.create_for_client(f.cc, f.client.id, %{
          tracker_id: f.tracker.id,
          local_date: Date.utc_today(),
          request_id: Ecto.UUID.generate(),
          text_value: "Committed during read"
        })
      end)

    assert {:ok, entry} = Task.await(writer, 5000)
    send(reader_pid, :continue_screen)
    assert {:ok, screen} = Task.await(reader, 5000)
    assert screen.reviewed_through_seq == 0
    assert screen.changes == [] && screen.trackers == []

    assert {:ok, review} =
             Reviews.create_for_client(f.ctx, f.client.id, %{
               snapshot_token: screen.snapshot_token,
               assessment: :on_track
             })

    assert review.reviewed_through_seq == 0
    assert {:ok, next} = Reviews.screen_for_client(f.ctx, f.client.id)
    assert [%{record_id: record_id, changes: [%{seq: 1}]}] = next.changes
    assert record_id == entry.id
    assert [%{count: 1, latest: %{text_value: "Committed during read"}}] = next.trackers
  end

  @spec barrier(term(), map(), map(), pid()) :: :ok
  def barrier(_event, _measurements, metadata, parent) do
    if Process.get(:review_reader) == true and metadata[:source] == "clients" do
      Process.put(:review_reader, false)
      send(parent, {:snapshot_started, self()})

      receive do
        :continue_screen -> :ok
      after
        5000 -> raise "review screen barrier timed out"
      end
    end

    :ok
  end
end
