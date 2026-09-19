defmodule Easy.WeightEntriesConcurrencyTest do
  use ExUnit.Case, async: false

  import Ecto.Query

  alias Easy.Clients.Client
  alias Easy.Coaches
  alias Easy.Ctx
  alias Easy.Fitness.WeightEntry
  alias Easy.Identity.User
  alias Easy.Orgs.{Business, Coach}
  alias Easy.Repo
  alias Easy.WeightEntries
  alias Ecto.Adapters.SQL.Sandbox

  setup do
    Sandbox.checkout(Repo, sandbox: false)
    user_id = Ecto.UUID.generate()
    business_id = Ecto.UUID.generate()

    on_exit(fn ->
      Sandbox.checkout(Repo, sandbox: false)

      for schema <- [WeightEntry, Client, Coach] do
        Repo.delete_all(from row in schema, where: row.business_id == ^business_id)
      end

      Repo.delete_all(from b in Business, where: b.id == ^business_id)
      Repo.delete_all(from u in User, where: u.id == ^user_id)
    end)

    user =
      %{email: "weight-race-#{user_id}@example.test"}
      |> User.insert_changeset()
      |> Ecto.Changeset.put_change(:id, user_id)
      |> Repo.insert!()

    business =
      user.id
      |> Business.insert_changeset(%{name: "Weight concurrency", handle: "weight-#{business_id}"})
      |> Ecto.Changeset.put_change(:id, business_id)
      |> Repo.insert!()

    {:ok, coach} = Coaches.create(user, business)

    client =
      %Client{}
      |> Ecto.Changeset.change(%{
        business_id: business.id,
        user_id: user.id,
        creator_id: coach.id,
        assigned_coach_id: coach.id,
        status: :active
      })
      |> Repo.insert!()

    %{ctx: %Ctx{business_id: business.id, user_id: user.id, client_id: client.id}}
  end

  test "simultaneous first writes both succeed with the same self-logged entry", %{ctx: ctx} do
    parent = self()
    today = Date.utc_today()

    {:ok, contenders} =
      Repo.transaction(fn ->
        Client |> lock("FOR UPDATE") |> Repo.get!(ctx.client_id)

        contenders =
          for value <- ["80", "81"] do
            Task.async(fn ->
              Sandbox.checkout(Repo, sandbox: false)
              %{rows: [[backend_pid]]} = Repo.query!("SELECT pg_backend_pid()")
              send(parent, {:contender, backend_pid})

              try do
                WeightEntries.upsert_client_weight_entry(ctx, %{date: today, value: value, unit: :kg})
              rescue
                error -> {:raised, error.__struct__}
              end
            end)
          end

        for _ <- contenders do
          assert_receive {:contender, backend_pid}, 1_000
          assert_blocked(backend_pid, 100)
        end

        contenders
      end)

    entries =
      Enum.map(contenders, fn contender ->
        assert {:ok, entry} = Task.await(contender, 5_000)
        entry
      end)

    assert entries |> Enum.map(& &1.id) |> Enum.uniq() |> length() == 1
    assert Repo.aggregate(WeightEntry.for_client(ctx.business_id, ctx.client_id), :count) == 1
    assert Repo.get!(Client, ctx.client_id).last_active_at
  end

  test "a competing delete returns not found after the first deletion commits", %{ctx: ctx} do
    {:ok, entry} =
      WeightEntries.upsert_client_weight_entry(ctx, %{date: Date.utc_today(), value: "80", unit: :kg})

    {:ok, contender} =
      Repo.transaction(fn ->
        Client |> lock("FOR UPDATE") |> Repo.get!(ctx.client_id)
        WeightEntry |> lock("FOR UPDATE") |> Repo.get!(entry.id)

        contender = start_delete(ctx, entry.id)

        assert_receive {:contender, backend_pid}, 1_000
        assert_blocked(backend_pid, 100)
        assert {:ok, _entry} = WeightEntries.delete_client_weight_entry(ctx, entry.id)
        contender
      end)

    assert {:error, :not_found} = Task.await(contender, 5_000)
    refute Repo.get(WeightEntry, entry.id)
  end

  test "a delete waiting on an update returns the committed entry", %{ctx: ctx} do
    today = Date.utc_today()
    {:ok, entry} = WeightEntries.upsert_client_weight_entry(ctx, %{date: today, value: "80", unit: :kg})

    {:ok, contender} =
      Repo.transaction(fn ->
        Client |> lock("FOR UPDATE") |> Repo.get!(ctx.client_id)
        WeightEntry |> lock("FOR UPDATE") |> Repo.get!(entry.id)
        contender = start_delete(ctx, entry.id)

        assert_receive {:contender, backend_pid}, 1_000
        assert_blocked(backend_pid, 100)
        assert {:ok, _updated} = WeightEntries.upsert_client_weight_entry(ctx, %{date: today, value: "85"})
        contender
      end)

    assert {:ok, deleted} = Task.await(contender, 5_000)
    assert Decimal.equal?(deleted.value, Decimal.new("85"))
    refute Repo.get(WeightEntry, entry.id)
  end

  test "observed simultaneous creates and updates have one winner", %{ctx: ctx} do
    attrs = %{date: Date.utc_today(), unit: :kg, expected_entry: nil}
    results = race_observed_writes(ctx, attrs, ["80", "81"])
    assert [{:error, :conflict}] = Enum.filter(results, &match?({:error, _}, &1))
    assert [{:ok, created}] = Enum.filter(results, &match?({:ok, _}, &1))
    assert created.revision == 1
    assert Repo.aggregate(WeightEntry.for_client(ctx.business_id, ctx.client_id), :count) == 1
    observed = %{attrs | expected_entry: %{id: created.id, revision: created.revision}}
    updates = race_observed_writes(ctx, observed, ["82", "83"])
    assert [{:error, :conflict}] = Enum.filter(updates, &match?({:error, _}, &1))
    assert [{:ok, updated}] = Enum.filter(updates, &match?({:ok, _}, &1))
    assert updated.revision == 2
    assert updated.id == created.id
    assert Decimal.eq?(Repo.get!(WeightEntry, created.id).value, updated.value)
  end

  test "an observed deletion waiting on an update preserves the updated record", %{ctx: ctx} do
    today = Date.utc_today()
    {:ok, entry} = WeightEntries.upsert_client_weight_entry(ctx, %{date: today, value: "80", unit: :kg})

    {:ok, contender} =
      Repo.transaction(fn ->
        Client |> lock("FOR UPDATE") |> Repo.get!(ctx.client_id)
        contender = start_delete(ctx, entry.id, expected_revision: entry.revision)
        assert_receive {:contender, backend_pid}, 1_000
        assert_blocked(backend_pid, 100)
        assert {:ok, _updated} = WeightEntries.upsert_client_weight_entry(ctx, %{date: today, value: "85"})
        contender
      end)

    assert {:error, :conflict} = Task.await(contender, 5_000)
    assert Decimal.eq?(Repo.get!(WeightEntry, entry.id).value, Decimal.new("85"))
  end

  defp race_observed_writes(ctx, attrs, values) do
    {:ok, contenders} =
      Repo.transaction(fn ->
        Client |> lock("FOR UPDATE") |> Repo.get!(ctx.client_id)

        contenders = Enum.map(values, &start_write(ctx, Map.put(attrs, :value, &1)))

        for _ <- contenders do
          assert_receive {:contender, backend_pid}, 1_000
          assert_blocked(backend_pid, 100)
        end

        contenders
      end)

    Enum.map(contenders, &Task.await(&1, 5_000))
  end

  defp start_write(ctx, attrs) do
    parent = self()

    Task.async(fn ->
      Sandbox.checkout(Repo, sandbox: false)
      %{rows: [[backend_pid]]} = Repo.query!("SELECT pg_backend_pid()")
      send(parent, {:contender, backend_pid})
      WeightEntries.upsert_client_weight_entry(ctx, attrs)
    end)
  end

  defp start_delete(ctx, entry_id, opts \\ []) do
    parent = self()

    Task.async(fn ->
      Sandbox.checkout(Repo, sandbox: false)
      %{rows: [[backend_pid]]} = Repo.query!("SELECT pg_backend_pid()")
      send(parent, {:contender, backend_pid})

      try do
        WeightEntries.delete_client_weight_entry(ctx, entry_id, opts)
      rescue
        error -> {:raised, error.__struct__}
      end
    end)
  end

  defp assert_blocked(_backend_pid, 0), do: flunk("weight write never waited on a database lock")

  defp assert_blocked(backend_pid, attempts) do
    case Repo.query!("SELECT cardinality(pg_blocking_pids($1)) > 0", [backend_pid]).rows do
      [[true]] ->
        :ok

      [[false]] ->
        Process.sleep(10)
        assert_blocked(backend_pid, attempts - 1)
    end
  end
end
