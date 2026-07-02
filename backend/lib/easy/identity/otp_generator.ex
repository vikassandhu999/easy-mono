defmodule Easy.Identity.OtpGenerator do
  @spec generate() :: String.t()
  def generate do
    # Dev sets :fixed_otp ("123456") so login never depends on reading
    # emails; unset (nil) everywhere else → random.
    Application.get_env(:easy, :fixed_otp) || random_otp()
  end

  defp random_otp do
    :crypto.strong_rand_bytes(4)
    |> :binary.decode_unsigned()
    |> rem(900_000)
    |> Kernel.+(100_000)
    |> Integer.to_string()
  end
end
