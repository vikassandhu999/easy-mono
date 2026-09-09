defmodule Easy.Identity.EmailConfirmation do
  alias Easy.Identity.AuthTokens
  alias Easy.Identity.OneTimeToken
  alias Easy.Identity.OneTimeTokens
  alias Easy.Identity.SessionFactory
  alias Easy.Identity.Users
  alias Easy.Repo

  @type error() :: :token_invalid | :token_expired | Ecto.Changeset.t()

  @spec verify_otp(String.t(), String.t(), SessionFactory.session_opts()) ::
          {:ok, AuthTokens.auth_token()} | {:error, :invalid_otp | :otp_expired | Ecto.Changeset.t()}
  def verify_otp(email, otp, opts) do
    token_hash = OneTimeTokens.generate_token_hash(email <> otp)

    case verify(token_hash, opts) do
      {:error, :token_invalid} -> {:error, :invalid_otp}
      {:error, :token_expired} -> {:error, :otp_expired}
      result -> result
    end
  end

  @spec verify(String.t(), SessionFactory.session_opts()) :: {:ok, AuthTokens.auth_token()} | {:error, error()}
  def verify(token_hash, opts) do
    Repo.transact(fn ->
      with {:ok, token} <- verify_confirmation_hash(token_hash),
           {:ok, user} <- Users.confirm_user_email(token.user),
           {:ok, _} <- OneTimeTokens.delete(token),
           {:ok, session} <-
             SessionFactory.create_session(user, Map.put(opts, :role, :guest)) do
        {:ok, AuthTokens.build(user, session)}
      end
    end)
  end

  defp verify_confirmation_hash(token_hash) do
    with {:ok, token} <- OneTimeTokens.lock_by_hash(token_hash, :email_confirmation),
         false <- OneTimeToken.expired?(token, DateTime.utc_now()) do
      {:ok, token}
    else
      {:error, :token_not_found} -> {:error, :token_invalid}
      true -> {:error, :token_expired}
    end
  end
end
