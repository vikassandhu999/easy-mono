defmodule Easy.Identity.Signup do
  alias Easy.Identity.Mailer, as: Mailer
  alias Easy.Identity.OneTimeTokens
  alias Easy.Identity.OtpGenerator
  alias Easy.Identity.User
  alias Easy.Identity.Users
  alias Easy.Repo

  @type error() :: :email_already_exists | :user_not_found | Ecto.Changeset.t()

  @spec signup(map()) :: {:ok, User.t()} | {:error, error()}
  def signup(attrs) do
    otp = OtpGenerator.generate()

    confirmation_sent_at = DateTime.utc_now(:second)

    result =
      Repo.transact(fn ->
        with {:ok, user} <- Users.create(confirmation_sent_at, attrs),
             {:ok, _token} <- OneTimeTokens.create_token(user, :email_confirmation, otp) do
          {:ok, user}
        end
      end)

    with {:ok, user} <- resolve_signup_result(result, otp) do
      Mailer.send_otp(user.email, otp)
      {:ok, user}
    end
  end

  defp resolve_signup_result({:error, %Ecto.Changeset{} = changeset}, otp) do
    if duplicate_email_error?(changeset) do
      email = Ecto.Changeset.get_field(changeset, :email)

      with {:ok, user} <- Users.get_by_email(email) do
        rotate_confirmation_otp(user, otp)
      end
    else
      {:error, changeset}
    end
  end

  defp resolve_signup_result(result, _otp), do: result

  defp duplicate_email_error?(%Ecto.Changeset{errors: errors}) do
    Enum.any?(errors, fn
      {:email, {_message, opts}} -> Keyword.get(opts, :constraint) == :unique
      _ -> false
    end)
  end

  defp rotate_confirmation_otp(user, otp) do
    OneTimeTokens.with_issuance_lock(user.email, fn ->
      with :ok <- OneTimeTokens.delete_user_tokens(user, :email_confirmation),
           {:ok, user} <- Users.lock_by_id(user.id),
           false <- User.email_confirmed?(user),
           {:ok, user} <- Users.touch_confirmation_sent_at(user),
           {:ok, _} <- OneTimeTokens.create_token(user, :email_confirmation, otp) do
        {:ok, user}
      else
        true -> {:error, :email_already_exists}
        {:error, reason} -> {:error, reason}
      end
    end)
  end
end
