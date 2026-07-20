defmodule Easy.Search do
  @spec like_pattern(String.t()) :: String.t()
  def like_pattern(term) do
    "%" <> Regex.replace(~r/[\\%_]/, term, fn char -> "\\" <> char end) <> "%"
  end
end
