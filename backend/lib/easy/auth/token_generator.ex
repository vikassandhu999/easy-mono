defmodule Easy.Auth.TokenGenerator do
  def generate_secret do
    :crypto.strong_rand_bytes(32)
    |> Base.url_encode64(padding: false)
  end

  def generate_refresh_token do
    :crypto.strong_rand_bytes(32)
    |> Base.url_encode64(padding: false)
  end

  def generate_token(bytes \\ 32) when is_integer(bytes) and bytes > 0 do
    :crypto.strong_rand_bytes(bytes)
    |> Base.url_encode64(padding: false)
  end

  def expires_at(minutes \\ 15) when is_integer(minutes) and minutes > 0 do
    DateTime.utc_now()
    |> DateTime.add(minutes * 60, :second)
    |> DateTime.truncate(:second)
  end

  def expires_at_days(days) when is_integer(days) and days > 0 do
    DateTime.utc_now()
    |> DateTime.add(days * 24 * 60 * 60, :second)
    |> DateTime.truncate(:second)
  end

  def generate_uuid do
    Ecto.UUID.generate()
  end
end
