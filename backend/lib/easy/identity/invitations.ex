defmodule Easy.Identity.Invitations do
  alias Easy.Clients.Client
  alias Easy.Identity.AuthTokens
  alias Easy.Identity.Errors
  alias Easy.Identity.Mailer
  alias Easy.Identity.OneTimeTokens
  alias Easy.Identity.OtpGenerator
  alias Easy.Identity.SessionFactory
  alias Easy.Identity.User
  alias Easy.Identity.Users
  alias Easy.Repo

  @spec accept_invite(map()) :: {:ok, :otp_sent} | {:error, any()}
  def accept_invite(%{"invitation_token" => token, "email" => email})
      when is_binary(email) and email != "" do
    otp = OtpGenerator.generate()

    # The "one active Client per User" invariant is NOT checked here on purpose:
    # this endpoint is public, and a pre-flight check would leak whether an
    # email belongs to an active client somewhere in the system. The invariant
    # is enforced atomically at verify time, once the caller has proven email
    # ownership via OTP.
    result =
      Repo.transaction(fn ->
        with {:ok, _client} <- Client.resolve_invitation_token(token),
             :ok <- rotate_invitation_otp(email),
             {:ok, _} <- OneTimeTokens.create_invitation_acceptance_token(otp, email, token) do
          :ok
        else
          {:error, :invalid} -> Repo.rollback(Errors.invitation_invalid())
          {:error, :used} -> Repo.rollback(Errors.invitation_used())
          {:error, :expired} -> Repo.rollback(Errors.invitation_expired())
          {:error, reason} -> Repo.rollback(reason)
        end
      end)

    case result do
      {:ok, :ok} ->
        Mailer.send_invitation_otp(email, otp)
        {:ok, :otp_sent}

      {:error, _} = err ->
        err
    end
  end

  @spec verify_accept_invite(map(), %{
          ip: String.t(),
          user_agent: String.t()
        }) :: {:ok, AuthTokens.auth_token()} | {:error, any()}
  def verify_accept_invite(
        %{"invitation_token" => token, "email" => email, "otp" => otp},
        session_opts
      )
      when is_binary(email) and email != "" and is_binary(otp) and otp != "" do
    token_hash = OneTimeTokens.invitation_acceptance_hash(otp, email, token)

    Repo.transaction(fn ->
      with {:ok, ott} <- OneTimeTokens.get_by_hash(token_hash, :invitation_acceptance),
           :ok <- validate_invitation_ott_fresh(ott),
           {:ok, client} <- Client.resolve_invitation_token(token),
           {:ok, user} <- find_or_create_confirmed_user(client, email),
           {:ok, _client} <- Client.accept_invite(client, user.id, email),
           {:ok, _} <- OneTimeTokens.delete(ott),
           {:ok, session} <-
             SessionFactory.create_session(user, Map.merge(session_opts, %{role: :client})) do
        AuthTokens.build(user, session)
      else
        {:error, :token_not_found} -> Repo.rollback(Errors.invalid_otp())
        {:error, :otp_expired} -> Repo.rollback(Errors.otp_expired())
        {:error, :invalid} -> Repo.rollback(Errors.invitation_invalid())
        {:error, :used} -> Repo.rollback(Errors.invitation_used())
        {:error, :expired} -> Repo.rollback(Errors.invitation_expired())
        {:error, :race_lost} -> Repo.rollback(Errors.invitation_used())
        {:error, :already_active_elsewhere} -> Repo.rollback(Errors.already_active_client())
        {:error, reason} -> Repo.rollback(reason)
      end
    end)
  end

  defp rotate_invitation_otp(email) do
    OneTimeTokens.delete_all_for_relates_to_and_type(email, :invitation_acceptance)
    :ok
  end

  defp validate_invitation_ott_fresh(ott) do
    if OneTimeTokens.invitation_acceptance_token_expired?(ott) do
      {:error, :otp_expired}
    else
      :ok
    end
  end

  defp find_or_create_confirmed_user(client, email) do
    case Users.get_by_email(email) do
      {:ok, user} ->
        if User.is_email_confirmed?(user) do
          {:ok, user}
        else
          Users.confirm_user_email(user)
        end

      {:error, _} ->
        user_attrs = %{
          "email" => email,
          "first_name" => client.first_name || "",
          "last_name" => client.last_name || "",
          "confirmation_sent_at" => DateTime.utc_now(:second)
        }

        with {:ok, user} <- Users.create(user_attrs),
             {:ok, confirmed} <- Users.confirm_user_email(user) do
          {:ok, confirmed}
        end
    end
  end
end
