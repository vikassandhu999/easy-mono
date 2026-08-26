defmodule EasyWeb.TypedRoute.SchemaMerge do
  @types_start "/* typed-routes:types */"
  @types_end "/* typed-routes:types-end */"
  @paths_start "/* typed-routes:paths */"
  @paths_end "/* typed-routes:paths-end */"

  @spec inject(String.t(), String.t(), String.t()) :: String.t()
  def inject(source, types_ts, paths_ts) do
    source
    |> strip()
    |> put_types(types_ts)
    |> put_paths(paths_ts)
  end

  @spec current?(String.t(), String.t(), String.t()) :: boolean()
  def current?(source, types_ts, paths_ts) do
    current_block?(source, @types_start, types_ts) and
      current_block?(source, @paths_start, paths_ts)
  end

  @spec strip(String.t()) :: String.t()
  def strip(source) do
    source
    |> strip_block(@types_start, @types_end)
    |> strip_block(@paths_start, @paths_end)
  end

  defp strip_block(source, start, stop) do
    {:ok, pattern} = Regex.compile("#{Regex.escape(start)}.*?#{Regex.escape(stop)},?", [:dotall])

    source
    |> String.replace(pattern, "")
    |> String.replace(~r/\n[ \t]+\n/, "\n")
    |> String.replace(~r/\n{3,}/, "\n\n")
  end

  defp put_types(source, ""), do: source

  defp put_types(source, types_ts) do
    block =
      "\n#{@types_start}\n#{hash_comment(types_ts)}\n#{String.trim(types_ts)}\n#{@types_end}\n\n"

    String.replace(source, "export interface paths {", block <> "export interface paths {", global: false)
  end

  defp put_paths(source, ""), do: source

  defp put_paths(source, paths_ts) do
    block =
      "\n  #{@paths_start}\n  #{hash_comment(paths_ts)}\n#{indent(String.trim(paths_ts), 2)}\n  #{@paths_end},"

    String.replace(source, ~r/export interface paths \{\n*/, "export interface paths {" <> block <> "\n", global: false)
  end

  defp current_block?(source, marker, content) do
    if String.trim(content) == "" do
      not String.contains?(source, marker)
    else
      String.contains?(source, marker <> "\n" <> hash_comment(content)) or
        String.contains?(source, marker <> "\n  " <> hash_comment(content))
    end
  end

  defp hash_comment(content) do
    hash = content |> String.trim() |> then(&:crypto.hash(:sha256, &1)) |> Base.encode16(case: :lower)
    "/* typed-routes:hash #{hash} */"
  end

  defp indent(text, n) do
    pad = String.duplicate(" ", n)

    text
    |> String.split("\n")
    |> Enum.map_join("\n", &(pad <> &1))
  end
end
