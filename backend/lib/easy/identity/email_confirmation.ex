defmodule Easy.Identity.EmailConfirmation do
  alias Easy.Identity.AuthTokens
  alias Easy.Identity.OneTimeTokens
  alias Easy.Identity.User
  alias Easy.Identity.Users
  alias Easy.Identity.UserSessions
  alias Easy.Repo

  @spec verify(String.t(), map()) :: {:ok, AuthTokens.auth_token()} | {:error, any()}
  def verify(token_hash, opts) do
    Repo.transaction(fn ->
      with {:ok, token} <- verify_confirmation_hash(token_hash),
           {:ok, user} <- Users.confirm_user_email(token.user),
           {:ok, _} <- OneTimeTokens.delete(token),
           {:ok, session} <-
             UserSessions.create_session(
               user,
               nil,
               :guest,
               nil,
               false,
               %{ip: opts.ip || "", user_agent: opts.user_agent || ""}
             ) do
        AuthTokens.build(user, session)
      else
        {:error, reason} -> Repo.rollback(reason)
      end
    end)
  end

  defp verify_confirmation_hash(token_hash) do
    with {:ok, token} <- OneTimeTokens.get_by_hash(token_hash, :email_confirmation),
         false <- User.confirmation_expired?(token.user) do
      {:ok, token}
    else
      {:error, :token_not_found} -> {:error, :token_invalid}
      true -> {:error, :token_expired}
    end
  end
end
