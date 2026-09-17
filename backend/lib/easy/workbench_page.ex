defmodule Easy.WorkbenchPage do
  alias Easy.CursorPage

  @type mode :: :legacy | {:cursor, map() | nil}

  @spec mode(keyword(), map()) :: {:ok, mode()} | {:error, :cursor_incompatible | :invalid_cursor}
  def mode(opts, scope) do
    case Keyword.fetch(opts, :cursor) do
      :error ->
        {:ok, :legacy}

      {:ok, cursor} ->
        with :ok <- cursor_compatible_with_offset(opts),
             {:ok, position} <- decode(cursor, scope) do
          {:ok, {:cursor, position}}
        end
    end
  end

  @spec limit(keyword()) :: pos_integer()
  def limit(opts), do: CursorPage.limit(opts)

  @spec finish([item], pos_integer(), non_neg_integer() | nil, map(), (item -> map())) :: %{
          count: non_neg_integer() | nil,
          items: [item],
          next_cursor: String.t() | nil
        }
        when item: map()
  def finish(rows, limit, count, scope, position) do
    {items, remaining} = Enum.split(rows, limit)

    %{
      count: count,
      items: items,
      next_cursor: if(remaining == [], do: nil, else: encode(position.(List.last(items)), scope))
    }
  end

  defp cursor_compatible_with_offset(opts) do
    if Keyword.get(opts, :offset, 0) == 0, do: :ok, else: {:error, :cursor_incompatible}
  end

  defp encode(position, scope) do
    %{"position" => position, "scope" => scope}
    |> Jason.encode!()
    |> Base.url_encode64(padding: false)
  end

  defp decode("start", _scope), do: {:ok, nil}

  defp decode(cursor, scope) when is_binary(cursor) and byte_size(cursor) <= 1024 do
    with {:ok, value} <- Base.url_decode64(cursor, padding: false),
         {:ok, %{"position" => position, "scope" => ^scope}} <- Jason.decode(value),
         true <- is_map(position) do
      {:ok, position}
    else
      _ -> {:error, :invalid_cursor}
    end
  end

  defp decode(_cursor, _scope), do: {:error, :invalid_cursor}
end
