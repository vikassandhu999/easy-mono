defmodule Easy.Identity.OtpDelivery do
  alias Easy.Identity.Mailer, as: Mailer
  alias Easy.Identity.OneTimeTokens
  alias Easy.Identity.OtpGenerator
  alias Easy.Identity.User
  alias Easy.Identity.Users

  @type error() :: :user_not_found | :email_already_confirmed | :email_not_confirmed | Ecto.Changeset.t()

  @spec send_otp(String.t(), String.t()) :: {:ok, :sent} | {:error, error()}
  def send_otp(email, type) do
    otp = OtpGenerator.generate()
    otp_type = normalise_type(type)

    result =
      OneTimeTokens.with_issuance_lock(email, fn ->
        with {:ok, user} <- Users.get_by_email(email),
             :ok <- OneTimeTokens.delete_user_tokens(user, otp_type),
             {:ok, user} <- Users.lock_by_id(user.id),
             :ok <- validate_can_send_otp(user, otp_type),
             {:ok, _} <- OneTimeTokens.create_token(user, otp_type, otp) do
          {:ok, user}
        end
      end)

    # Email dispatch is outside the transaction so a failed commit never
    # leaks an OTP for a state that never existed.
    case result do
      {:ok, user} ->
        Mailer.send_otp(user.email, otp)
        {:ok, :sent}

      {:error, _} = err ->
        err
    end
  end

  defp normalise_type("email_confirmation"), do: :email_confirmation
  defp normalise_type("authentication"), do: :authentication
  defp normalise_type(_), do: :authentication

  @spec validate_can_send_otp(User.t(), :email_confirmation | :authentication) ::
          :ok | {:error, :email_already_confirmed | :email_not_confirmed}
  defp validate_can_send_otp(user, :email_confirmation) do
    if User.email_confirmed?(user) do
      {:error, :email_already_confirmed}
    else
      :ok
    end
  end

  defp validate_can_send_otp(user, :authentication) do
    if User.email_confirmed?(user) do
      :ok
    else
      {:error, :email_not_confirmed}
    end
  end
end
