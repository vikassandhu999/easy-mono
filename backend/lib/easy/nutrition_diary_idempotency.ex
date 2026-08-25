defmodule Easy.Nutrition.Diary.Idempotency do
  alias Easy.Clients.Client
  alias Easy.Nutrition.DiaryCommandLedger
  alias Easy.Repo

  import Ecto.Query

  @purge_batch_size 1000

  @type command_identity ::
          :add_extra
          | :log_planned_item
          | :log_planned_option
          | :log_planned_day
          | :switch_option
          | :replace_planned_item
          | {:update_entry, String.t()}
          | {:delete_entry, String.t()}

  @type outcome :: {:ok, map()} | {:error, term()}
  @type callback_outcome :: outcome() | {:rollback, term()}

  @spec run(Client.t(), String.t(), command_identity(), Date.t(), map(), (DateTime.t() -> callback_outcome())) ::
          outcome()
  def run(%Client{} = client, key, command, %Date{} = date, payload, fun)
      when is_binary(key) and is_map(payload) and is_function(fun, 1) do
    command_fingerprint = fingerprint(command, date, payload)

    Repo.transaction(fn ->
      case reserve_ledger(client, key, command_fingerprint) do
        {:replay, outcome} -> outcome
        :conflict -> Repo.rollback(:conflict)
        {:run, ledger} -> run_and_store(ledger, fun)
      end
    end)
    |> case do
      {:ok, {status, _value} = outcome} when status in [:ok, :error] -> outcome
      {:error, reason} -> {:error, reason}
    end
    |> normalize_legacy_day_outcome()
  end

  @spec normalize_legacy_day_outcome(outcome()) :: outcome()
  def normalize_legacy_day_outcome({:ok, %{slots: slots} = day}) when is_list(slots) do
    {:ok, Map.put(day, :slots, Enum.map(slots, &normalize_slot/1))}
  end

  def normalize_legacy_day_outcome(outcome), do: outcome

  @spec fingerprint(command_identity(), Date.t(), map()) :: String.t()
  def fingerprint(command, %Date{} = date, payload) when is_map(payload) do
    {method, segment} = legacy_route(command)

    DiaryCommandLedger.fingerprint(
      method,
      "/v1/client/nutrition-days/#{Date.to_iso8601(date)}/#{segment}",
      payload
    )
  end

  @spec purge_expired(DateTime.t()) :: {:ok, non_neg_integer()}
  def purge_expired(%DateTime{} = now) do
    case Repo.all(from(row in DiaryCommandLedger.expired(now), select: row.id, limit: @purge_batch_size)) do
      [] ->
        {:ok, 0}

      ids ->
        {count, nil} = Repo.delete_all(from(row in DiaryCommandLedger, where: row.id in ^ids))
        {:ok, count}
    end
  end

  defp legacy_route(:add_extra), do: {"POST", "extras"}
  defp legacy_route(:log_planned_item), do: {"POST", "planned-items"}
  defp legacy_route(:log_planned_option), do: {"POST", "planned-options"}
  defp legacy_route(:log_planned_day), do: {"POST", "planned-day"}
  defp legacy_route(:switch_option), do: {"POST", "active-option"}
  defp legacy_route(:replace_planned_item), do: {"POST", "replacements"}
  defp legacy_route({:update_entry, entry_id}), do: {"PATCH", "entries/#{entry_id}"}
  defp legacy_route({:delete_entry, entry_id}), do: {"DELETE", "entries/#{entry_id}"}

  defp run_and_store(ledger, fun) do
    now = DateTime.utc_now(:second)

    case fun.(now) do
      {:rollback, reason} ->
        Repo.rollback(reason)

      outcome ->
        case outcome do
          {:ok, _day} -> stamp_client_activity!(ledger.business_id, ledger.client_id, now)
          {:error, _reason} -> :ok
        end

        store_outcome!(ledger, outcome)
    end
  end

  defp stamp_client_activity!(business_id, client_id, now) do
    Client
    |> Client.last_active_stamp(business_id, client_id, now)
    |> Repo.update_all([])
    |> case do
      {1, nil} -> :ok
      {0, nil} -> Repo.rollback(:not_found)
    end
  end

  defp reserve_ledger(client, key, command_fingerprint) do
    case lock_ledger(client, key) do
      %DiaryCommandLedger{} = ledger -> compare_reserved(ledger, command_fingerprint)
      nil -> insert_fresh_ledger(client, key, command_fingerprint)
    end
  end

  defp insert_fresh_ledger(client, key, command_fingerprint) do
    now = DateTime.utc_now(:second)

    {_count, rows} =
      Repo.insert_all(
        DiaryCommandLedger,
        [
          %{
            id: Ecto.UUID.generate(),
            idempotency_key: key,
            fingerprint: command_fingerprint,
            outcome: nil,
            expires_at: DateTime.add(now, DiaryCommandLedger.retention_days(), :day),
            business_id: client.business_id,
            client_id: client.id,
            inserted_at: now,
            updated_at: now
          }
        ],
        on_conflict: :nothing,
        returning: true
      )

    case rows do
      [ledger] ->
        {:run, ledger}

      [] ->
        # Our insert lost the (client, key) race. If the winner rolled back
        # before we can lock its row, the key is free and can be reserved again.
        case lock_ledger(client, key) do
          nil -> insert_fresh_ledger(client, key, command_fingerprint)
          ledger -> compare_reserved(ledger, command_fingerprint)
        end
    end
  end

  defp compare_reserved(%DiaryCommandLedger{fingerprint: fingerprint} = ledger, fingerprint) do
    if ledger.outcome do
      {:replay, :erlang.binary_to_term(ledger.outcome)}
    else
      {:run, ledger}
    end
  end

  defp compare_reserved(_ledger, _command_fingerprint), do: :conflict

  defp lock_ledger(client, key) do
    DiaryCommandLedger
    |> DiaryCommandLedger.for_client(client.business_id, client.id)
    |> DiaryCommandLedger.lock_key(key)
    |> Repo.one()
  end

  defp store_outcome!(ledger, outcome) do
    case Repo.update(DiaryCommandLedger.update_changeset(ledger, %{outcome: :erlang.term_to_binary(outcome)})) do
      {:ok, _ledger} -> outcome
      {:error, changeset} -> Repo.rollback(changeset)
    end
  end

  defp normalize_slot(slot) do
    slot
    |> Map.update(:options, [], &Enum.map(&1, fn option -> normalize_option(option) end))
    |> Map.update(:rows, [], &Enum.map(&1, fn row -> normalize_row(row) end))
  end

  defp normalize_option(option),
    do: Map.update(option, :items, [], &Enum.map(&1, fn item -> normalize_item(item) end))

  defp normalize_row(row), do: Map.update(row, :planned, nil, &normalize_item/1)

  defp normalize_item(nil), do: nil

  defp normalize_item(%{meal_item_id: ref} = item) do
    item
    |> Map.delete(:meal_item_id)
    |> Map.put(:planned_item_ref, ref)
  end

  defp normalize_item(%{} = item), do: item
end
