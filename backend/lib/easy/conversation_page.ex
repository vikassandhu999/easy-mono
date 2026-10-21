defmodule Easy.ConversationPage do
  import Ecto.Query

  alias Easy.CursorPage

  @spec query(Ecto.Queryable.t(), String.t(), pos_integer()) ::
          {:ok, Ecto.Query.t()} | {:error, :invalid_cursor}
  def query(query, cursor, limit) do
    with {:ok, position} <- decode(cursor) do
      query =
        from(c in query,
          order_by: [desc: coalesce(c.last_message_at, c.inserted_at), desc: c.id],
          limit: ^(limit + 1)
        )

      {:ok, after_position(query, position)}
    end
  end

  @spec finish([map()], pos_integer(), non_neg_integer()) :: CursorPage.t(map())
  def finish(rows, limit, count) do
    {data, remaining} = Enum.split(rows, limit)
    %{data: data, count: count, next_cursor: if(remaining == [], do: nil, else: encode(List.last(data)))}
  end

  defp after_position(query, nil), do: query

  defp after_position(query, {timestamp, id}) do
    from(c in query,
      where:
        fragment(
          "(COALESCE(?, ?), ?) < (?, ?)",
          c.last_message_at,
          c.inserted_at,
          c.id,
          type(^timestamp, :utc_datetime_usec),
          type(^id, :binary_id)
        )
    )
  end

  defp encode(row) do
    Base.url_encode64(DateTime.to_iso8601(row.last_message_at || row.inserted_at) <> "|" <> row.id,
      padding: false
    )
  end

  defp decode("start"), do: {:ok, nil}

  defp decode(cursor) when is_binary(cursor) and byte_size(cursor) <= 256 do
    with {:ok, value} <- Base.url_decode64(cursor, padding: false),
         [timestamp, id] <- String.split(value, "|"),
         {:ok, timestamp, 0} <- DateTime.from_iso8601(timestamp),
         {:ok, id} <- Ecto.UUID.cast(id) do
      {:ok, {timestamp, id}}
    else
      _ -> {:error, :invalid_cursor}
    end
  end

  defp decode(_cursor), do: {:error, :invalid_cursor}
end
