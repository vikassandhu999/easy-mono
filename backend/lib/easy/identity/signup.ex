defmodule Easy.Identity.Signup do
  alias Easy.Error
  alias Easy.Identity.Mailer
  alias Easy.Identity.OneTimeTokens
  alias Easy.Identity.OtpGenerator
  alias Easy.Identity.User
  alias Easy.Identity.Users
  alias Easy.Repo

  # TODO: Add rate limiting to signup
  @spec signup(map()) :: {:ok, User.t()} | {:error, any()}
  def signup(attrs) do
    otp = OtpGenerator.generate()

    user_attrs =
      Map.merge(attrs, %{
        "confirmation_sent_at" => DateTime.utc_now(:second)
      })

    Repo.transaction(fn ->
      with {:ok, user} <- Users.create(user_attrs),
           {:ok, _token} <- OneTimeTokens.create_token(user, :email_confirmation, otp) do
        Mailer.send_otp(user.email, otp)
        user
      else
        {:error, %Ecto.Changeset{} = changeset} ->
          handle_duplicate_email(changeset, otp)

        {:error, reason} ->
          Repo.rollback(reason)
      end
    end)
  end

  defp handle_duplicate_email(changeset, otp) do
    email = Ecto.Changeset.get_field(changeset, :email)

    with {:ok, user} <- Users.get_by_email(email),
         false <- User.is_email_confirmed?(user) do
      Users.touch_confirmation_sent_at(user)
      OneTimeTokens.delete_all_for_user_and_type(user, :email_confirmation)
      OneTimeTokens.create_token(user, :email_confirmation, otp)
      Mailer.send_otp(email, otp)

      Repo.rollback(
        Error.new("confirmation_resent", "Confirmation OTP has been sent to your email")
      )
    else
      true ->
        Repo.rollback(
          Error.new("email_already_exists", "An account with this email already exists")
        )

      _ ->
        Repo.rollback(changeset)
    end
  end
end
