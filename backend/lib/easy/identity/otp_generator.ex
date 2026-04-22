defmodule Easy.Identity.OtpGenerator do
  @spec generate() :: String.t()
  def generate do
    :crypto.strong_rand_bytes(4)
    |> :binary.decode_unsigned()
    |> rem(900_000)
    |> Kernel.+(100_000)
    |> Integer.to_string()
  end
end
