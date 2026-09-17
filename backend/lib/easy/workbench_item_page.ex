defmodule Easy.WorkbenchItemPage do
  import Ecto.Changeset

  alias Easy.Ctx
  alias Easy.WorkbenchPage

  @spec prepare(Ctx.t(), keyword()) :: {:ok, map()} | {:error, atom() | Ecto.Changeset.t()}
  def prepare(%Ctx{} = ctx, opts) do
    opts = Keyword.update(opts, :view, "awaiting", &view_string/1)
    defaults = %{view: "awaiting", search: "", limit: 25, include_count: true, cursor: "start"}
    types = %{view: :string, search: :string, limit: :integer, include_count: :boolean, cursor: :string}

    changeset =
      {defaults, types}
      |> cast(Map.new(opts), Map.keys(types))
      |> validate_required([:view, :limit, :include_count, :cursor])
      |> validate_inclusion(:view, ["awaiting", "follow-ups"])
      |> validate_number(:limit, greater_than: 0, less_than_or_equal_to: 100)

    with {:ok, params} <- apply_action(changeset, :insert) do
      params = %{params | search: String.trim(params.search || "")}
      scope = scope(ctx, params)

      with {:ok, mode} <- WorkbenchPage.mode([cursor: params.cursor], scope),
           {:ok, evaluated_at, position} <- decode(mode) do
        {:ok, Map.merge(params, %{scope: scope, evaluated_at: evaluated_at, position: position})}
      end
    end
  end

  @spec position(map(), DateTime.t()) :: map()
  def position(row, evaluated_at) do
    row
    |> Map.take([:band, :order_value, :kind_rank, :source_id, :service_rank])
    |> Map.put(:evaluated_at, DateTime.to_iso8601(evaluated_at))
  end

  defp view_string(:awaiting), do: "awaiting"
  defp view_string(:"follow-ups"), do: "follow-ups"
  defp view_string(value), do: value

  defp scope(ctx, params) do
    binding = [ctx.business_id, ctx.coach_id, ctx.user_id, ctx.owner?]
    digest = :sha256 |> :crypto.hash(Jason.encode!(binding)) |> Base.url_encode64(padding: false)
    %{"version" => 1, "view" => params.view, "search" => params.search, "actor" => digest}
  end

  defp decode({:cursor, nil}), do: {:ok, DateTime.utc_now(:second), nil}

  defp decode(
         {:cursor,
          %{
            "band" => band,
            "order_value" => value,
            "kind_rank" => kind,
            "source_id" => id,
            "service_rank" => service,
            "evaluated_at" => at
          }}
       )
       when band in 0..2 and is_integer(value) and value >= -9_223_372_036_854_775_808 and
              value <= 9_223_372_036_854_775_807 and kind in 0..6 and service in 0..1 and is_binary(at) do
    with {:ok, id} <- Ecto.UUID.cast(id),
         {:ok, evaluated_at, 0} <- DateTime.from_iso8601(at),
         true <- DateTime.compare(evaluated_at, DateTime.utc_now()) != :gt do
      {:ok, evaluated_at, %{band: band, order_value: value, kind_rank: kind, source_id: id, service_rank: service}}
    else
      _ -> {:error, :invalid_cursor}
    end
  end

  defp decode(_mode), do: {:error, :invalid_cursor}
end
