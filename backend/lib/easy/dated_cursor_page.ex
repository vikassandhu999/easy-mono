defmodule Easy.DatedCursorPage do
  import Ecto.Query

  alias Easy.CursorPage

  @spec query(Ecto.Queryable.t(), String.t(), pos_integer()) ::
          {:ok, Ecto.Query.t()} | {:error, :invalid_cursor}
  def query(query, cursor, limit) do
    with {:ok, position} <- decode(cursor) do
      query = from(row in query, order_by: [desc: row.date, desc: row.inserted_at, desc: row.id], limit: ^(limit + 1))
      {:ok, after_position(query, position)}
    end
  end

  @spec finish([map()], pos_integer(), non_neg_integer()) :: CursorPage.t(map())
  def finish(rows, limit, count) do
    {data, remaining} = Enum.split(rows, limit)
    next_cursor = if remaining == [], do: nil, else: encode(List.last(data))
    %{data: data, count: count, next_cursor: next_cursor}
  end

  defp after_position(query, nil), do: query

  defp after_position(query, {date, inserted_at, id}) do
    from(row in query,
      where: fragment("(?, ?, ?) < (?, ?, ?)", row.date, row.inserted_at, row.id, type(^date, :date), type(^inserted_at, :utc_datetime), type(^id, :binary_id))
    )
  end

  defp encode(%{date: date, inserted_at: inserted_at, id: id}) do
    Base.url_encode64(Enum.join([Date.to_iso8601(date), DateTime.to_iso8601(inserted_at), id], "|"), padding: false)
  end

  defp decode("start"), do: {:ok, nil}

  defp decode(cursor) when is_binary(cursor) and byte_size(cursor) <= 256 do
    with {:ok, value} <- Base.url_decode64(cursor, padding: false),
         [date, timestamp, id] <- String.split(value, "|"),
         {:ok, date} <- Date.from_iso8601(date),
         {:ok, inserted_at, 0} <- DateTime.from_iso8601(timestamp),
         {:ok, id} <- Ecto.UUID.cast(id) do
      {:ok, {date, inserted_at, id}}
    else
      _ -> {:error, :invalid_cursor}
    end
  end

  defp decode(_cursor), do: {:error, :invalid_cursor}
end
