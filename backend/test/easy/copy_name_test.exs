defmodule Easy.CopyNameTest do
  use ExUnit.Case, async: true

  test "keeps searching for a bounded distinguishable copy name" do
    original = String.duplicate("A", 255)

    existing_names =
      for attempt <- 1..100 do
        suffix = if attempt == 1, do: " (Copy)", else: " (Copy #{attempt})"
        "#{String.slice(original, 0, 255 - String.length(suffix))}#{suffix}"
      end

    name = Easy.CopyName.next(original, existing_names)

    assert String.length(name) == 255
    assert String.ends_with?(name, " (Copy 101)")
    refute name in existing_names
  end
end
