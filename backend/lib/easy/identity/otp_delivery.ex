defmodule Easy.Identity.OtpDelivery do
  alias Easy.Identity.Mailer, as: Mailer
  alias Easy.Identity.OneTimeTokens
  alias Easy.Identity.OtpGenerator
  alias Easy.Identity.User
  alias Easy.Identity.Users
  alias Easy.Repo

  @spec send_otp(String.t(), String.t()) :: {:ok, :sent} | {:error, any()}
  def send_otp(email, type) do
    otp = OtpGenerator.generate()
    otp_type = normalise_type(type)

    result =
      Repo.transaction(fn ->
        with {:ok, user} <- Users.get_by_email(email),
             {:ok, _} <- validate_can_send_otp(user, otp_type),
             _ <- OneTimeTokens.delete_user_tokens(user, otp_type),
             {:ok, _} <- OneTimeTokens.create_token(user, otp_type, otp) do
          user
        else
          {:error, reason} -> Repo.rollback(reason)
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

  @spec validate_can_send_otp(User.t(), atom()) :: {:ok, true} | {:error, any()}
  defp validate_can_send_otp(user, :email_confirmation) do
    if User.email_confirmed?(user) do
      {:error, :email_already_confirmed}
    else
      {:ok, true}
    end
  end

  defp validate_can_send_otp(user, :authentication) do
    if User.email_confirmed?(user) do
      {:ok, true}
    else
      {:error, :email_not_confirmed}
    end
  end
end
