defmodule Easy.CopyName do
  # Names for duplicated records: "Name (Copy)", then "Name (Copy 2)", … — the
  # first candidate not already in `existing_names`, sliced so the base plus
  # suffix stays within the 255-char name limit.
  @spec next(String.t(), Enumerable.t()) :: String.t()
  def next(original_name, existing_names) do
    base = original_name |> String.replace(~r/\s+\(Copy(?: \d+)?\)$/, "") |> String.trim()
    existing = MapSet.new(existing_names)

    Enum.find_value(1..100, fn attempt ->
      suffix = if attempt == 1, do: " (Copy)", else: " (Copy #{attempt})"
      candidate = "#{String.slice(base, 0, 255 - String.length(suffix))}#{suffix}"

      if !MapSet.member?(existing, candidate), do: candidate
    end) || "#{String.slice(base, 0, 237)} (Copy #{System.system_time(:second)})"
  end
end
