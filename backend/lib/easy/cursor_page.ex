defmodule Easy.CursorPage do
  import Ecto.Query

  @type t(item) :: %{data: [item], count: non_neg_integer(), next_cursor: String.t() | nil}

  @spec query(Ecto.Queryable.t(), String.t(), pos_integer()) ::
          {:ok, Ecto.Query.t()} | {:error, :invalid_cursor}
  def query(query, cursor, limit) do
    with {:ok, position} <- decode(cursor) do
      query = from(row in query, order_by: [desc: row.inserted_at, desc: row.id], limit: ^(limit + 1))
      {:ok, after_position(query, position)}
    end
  end

  @spec finish([map()], pos_integer(), non_neg_integer()) :: t(map())
  def finish(rows, limit, count) do
    {data, remaining} = Enum.split(rows, limit)
    next_cursor = if remaining == [], do: nil, else: encode(List.last(data))
    %{data: data, count: count, next_cursor: next_cursor}
  end

  @spec limit(keyword()) :: pos_integer()
  def limit(opts), do: (Keyword.get(opts, :limit) || 20) |> max(1) |> min(100)

  defp after_position(query, nil), do: query

  defp after_position(query, {inserted_at, id}) do
    from(row in query,
      where: fragment("(?, ?) < (?, ?)", row.inserted_at, row.id, type(^inserted_at, :utc_datetime), type(^id, :binary_id))
    )
  end

  defp encode(%{inserted_at: inserted_at, id: id}) do
    Base.url_encode64(DateTime.to_iso8601(inserted_at) <> "|" <> id, padding: false)
  end

  defp decode("start"), do: {:ok, nil}

  defp decode(cursor) when is_binary(cursor) and byte_size(cursor) <= 256 do
    with {:ok, value} <- Base.url_decode64(cursor, padding: false),
         [timestamp, id] <- String.split(value, "|"),
         {:ok, inserted_at, 0} <- DateTime.from_iso8601(timestamp),
         {:ok, id} <- Ecto.UUID.cast(id) do
      {:ok, {inserted_at, id}}
    else
      _ -> {:error, :invalid_cursor}
    end
  end

  defp decode(_cursor), do: {:error, :invalid_cursor}
end
