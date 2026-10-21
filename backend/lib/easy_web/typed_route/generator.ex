defmodule EasyWeb.TypedRoute.Generator do
  @spec validate!(map(), map()) :: :ok
  def validate!(route, typed) do
    validate_body!(route, typed)
    validate_path!(route, typed)
    :ok
  end

  defp validate_body!(%{verb: :get, path: path}, %{body: body}) when not is_nil(body) do
    raise ArgumentError, "GET #{path} cannot declare a typed body"
  end

  defp validate_body!(_route, _typed), do: :ok

  defp validate_path!(_route, %{path: nil}), do: :ok

  defp validate_path!(route, %{path: {:record, fields}}) do
    segments =
      route.path
      |> path_segments()
      |> MapSet.new()

    extras = fields |> Enum.map(&elem(&1, 0)) |> Enum.reject(&MapSet.member?(segments, &1))

    if extras != [] do
      raise ArgumentError,
            "typed path keys #{inspect(extras)} are not segments of #{route.path}"
    end
  end

  defp path_segments(path) do
    Regex.scan(~r/:([A-Za-z0-9_]+)/, path)
    |> Enum.map(fn [_, name] -> String.to_existing_atom(name) end)
  end
end
