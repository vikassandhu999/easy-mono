defmodule Easy.RecordJournal do
  import Ecto.Query
  alias Easy.{ClientAccess, Ctx, Repo}
  alias Easy.Clients.Client

  @spec actor(Ctx.t()) :: {:client | :coach, String.t()}
  def actor(%Ctx{coach_id: id}) when is_binary(id), do: {:coach, id}
  def actor(%Ctx{client_id: id}) when is_binary(id), do: {:client, id}

  @spec write(Ctx.t(), (Client.t() -> {:ok, term(), [map()]} | {:error, term()})) :: {:ok, term()} | {:error, term()}
  def write(%Ctx{} = ctx, operation) do
    with {:ok, client_id} <- Ctx.fetch_client_id(ctx) do
      Repo.transact(fn -> write_locked(ctx, client_id, operation) end)
    end
  end

  @spec write_for_client(Ctx.t(), String.t(), (Client.t() -> {:ok, term(), [map()]} | {:error, term()})) ::
          {:ok, term()} | {:error, term()}
  def write_for_client(%Ctx{} = ctx, client_id, operation) do
    with :ok <- Ctx.ensure_coach(ctx),
         :ok <- ClientAccess.authorize_client_id(ctx, client_id) do
      Repo.transact(fn -> write_locked(ctx, client_id, operation) end)
    end
  end

  defp write_locked(ctx, client_id, operation) do
    client =
      Repo.one(from(c in Client, where: c.id == ^client_id and c.business_id == ^ctx.business_id, lock: "FOR UPDATE"))

    with true <- not is_nil(client) || {:error, :not_found} do
      client = Repo.preload(client, [:business, :terms])
      finish_write(ctx, client, operation.(client))
    end
  end

  defp finish_write(_ctx, _client, {:ok, result, []}), do: {:ok, result}

  defp finish_write(ctx, client, {:ok, result, changes}) do
    {1, [seq]} =
      Repo.update_all(
        from(c in Client, where: c.id == ^client.id and c.business_id == ^ctx.business_id, select: c.last_change_seq),
        inc: [last_change_seq: 1]
      )

    Repo.insert_all("record_changes", Enum.map(changes, &journal_row(ctx, client.id, seq, &1)))
    {:ok, result}
  end

  defp finish_write(_ctx, _client, {:error, _} = error), do: error

  @spec change(String.t(), String.t(), struct() | nil, struct() | nil, String.t()) :: map()
  def change(record_id, row_type, old, new, record_type \\ "tracker_entry") do
    row = new || old

    %{
      record_type: record_type,
      record_id: record_id,
      row_type: row_type,
      row_id: row.id,
      action: action(old, new),
      old_value: value(old),
      new_value: value(new)
    }
  end

  defp action(nil, _), do: "added"
  defp action(_, nil), do: "removed"
  defp action(_, _), do: "changed"
  defp value(nil), do: nil

  defp value(row) do
    row.__struct__.__schema__(:fields) |> Map.new(fn k -> {to_string(k), encode(Map.get(row, k))} end)
  end

  defp encode(%Date{} = v), do: Date.to_iso8601(v)
  defp encode(%DateTime{} = v), do: DateTime.to_iso8601(v)
  defp encode(%Decimal{} = v), do: Decimal.to_string(v)
  defp encode(v), do: v

  defp journal_row(ctx, client_id, seq, change) do
    {actor_type, actor_id} = actor(ctx)

    change
    |> Map.merge(%{
      id: Ecto.UUID.dump!(Ecto.UUID.generate()),
      business_id: Ecto.UUID.dump!(ctx.business_id),
      client_id: Ecto.UUID.dump!(client_id),
      seq: seq,
      changed_by_type: to_string(actor_type),
      changed_by_id: Ecto.UUID.dump!(actor_id),
      changed_at: DateTime.utc_now(:second)
    })
    |> Map.update!(:record_id, &Ecto.UUID.dump!/1)
    |> Map.update!(:row_id, &Ecto.UUID.dump!/1)
  end
end
