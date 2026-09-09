defmodule Easy.Identity.Invitations do
  alias Easy.ClientInvitations
  alias Easy.CoachInvitations
  alias Easy.Identity.AuthTokens
  alias Easy.Identity.Mailer, as: Mailer
  alias Easy.Identity.OneTimeToken
  alias Easy.Identity.OneTimeTokens
  alias Easy.Identity.OtpGenerator
  alias Easy.Identity.SessionFactory
  alias Easy.Identity.User
  alias Easy.Identity.Users
  alias Easy.Repo

  @type accept_error() :: :invitation_invalid | :invitation_used | :invitation_expired | Ecto.Changeset.t()
  @type client_verify_error() ::
          accept_error()
          | :invalid_otp
          | :otp_expired
          | :already_active_client
          | :client_membership_not_found
          | :not_found
  @type coach_verify_error() ::
          accept_error() | :invalid_otp | :otp_expired | :already_a_coach | :coach_membership_not_found

  @spec accept_invite(map()) :: {:ok, :otp_sent} | {:error, accept_error()}
  def accept_invite(%{"invitation_token" => token, "email" => email})
      when is_binary(email) and email != "" do
    issue_invitation_otp(:client, token, email)
  end

  @spec verify_accept_invite(map(), SessionFactory.session_opts()) ::
          {:ok, AuthTokens.auth_token()} | {:error, client_verify_error()}
  def verify_accept_invite(%{"invitation_token" => _, "email" => email, "otp" => otp} = attrs, session_opts)
      when is_binary(email) and email != "" and is_binary(otp) and otp != "" do
    verify_invitation(:client, attrs, session_opts)
  end

  @spec accept_trainer_invite(map()) :: {:ok, :otp_sent} | {:error, accept_error()}
  def accept_trainer_invite(%{"invitation_token" => token, "email" => email})
      when is_binary(email) and email != "" do
    issue_invitation_otp(:coach, token, email)
  end

  @spec verify_accept_trainer_invite(map(), SessionFactory.session_opts()) ::
          {:ok, AuthTokens.auth_token()} | {:error, coach_verify_error()}
  def verify_accept_trainer_invite(%{"invitation_token" => _, "email" => email, "otp" => otp} = attrs, session_opts)
      when is_binary(email) and email != "" and is_binary(otp) and otp != "" do
    verify_invitation(:coach, attrs, session_opts)
  end

  # Membership conflicts are checked only after OTP verification. Checking them
  # during public issuance would expose whether an email has a membership.
  defp issue_invitation_otp(role, token, email) do
    otp = OtpGenerator.generate()

    result =
      OneTimeTokens.with_issuance_lock(email, fn ->
        with {:ok, _invitee} <- resolve_invitee(role, token),
             :ok <- OneTimeTokens.delete_all_for_relates_to_and_type(email, :invitation_acceptance),
             {:ok, _token} <- OneTimeTokens.create_invitation_acceptance_token(otp, email, token) do
          {:ok, :ok}
        else
          {:error, reason} -> {:error, invitation_error(reason)}
        end
      end)

    case result do
      {:ok, :ok} ->
        Mailer.send_invitation_otp(email, otp)
        {:ok, :otp_sent}

      {:error, _reason} = error ->
        error
    end
  end

  defp verify_invitation(role, %{"invitation_token" => token, "email" => email, "otp" => otp}, session_opts) do
    token_hash = OneTimeTokens.invitation_acceptance_hash(otp, email, token)

    Repo.transact(fn ->
      with {:ok, ott} <- OneTimeTokens.lock_by_hash(token_hash, :invitation_acceptance),
           :ok <- validate_invitation_ott_fresh(ott),
           {:ok, invitee} <- resolve_invitee(role, token),
           {:ok, user} <- find_or_create_confirmed_user(invitee, email),
           {:ok, _membership} <- accept_membership(role, invitee, user.id, email),
           {:ok, _token} <- OneTimeTokens.delete(ott),
           {:ok, session} <- SessionFactory.create_session(user, Map.put(session_opts, :role, role)) do
        {:ok, AuthTokens.build(user, session)}
      else
        {:error, reason} -> {:error, invitation_error(reason)}
      end
    end)
  end

  defp resolve_invitee(:client, token), do: ClientInvitations.resolve_invitation_token(token)
  defp resolve_invitee(:coach, token), do: CoachInvitations.resolve_invitation_token(token)

  defp accept_membership(:client, client, user_id, email), do: ClientInvitations.accept_invite(client, user_id, email)
  defp accept_membership(:coach, coach, user_id, _email), do: CoachInvitations.accept_invite(coach, user_id)

  defp invitation_error(:invalid), do: :invitation_invalid
  defp invitation_error(:used), do: :invitation_used
  defp invitation_error(:expired), do: :invitation_expired
  defp invitation_error(:token_not_found), do: :invalid_otp
  defp invitation_error(:race_lost), do: :invitation_used
  defp invitation_error(:already_active_elsewhere), do: :already_active_client
  defp invitation_error(reason), do: reason

  defp validate_invitation_ott_fresh(ott) do
    if OneTimeToken.expired?(ott, DateTime.utc_now()) do
      {:error, :otp_expired}
    else
      :ok
    end
  end

  defp find_or_create_confirmed_user(invitee, email) do
    case Users.get_by_email(email) do
      {:ok, user} ->
        confirm_if_needed(user)

      {:error, :user_not_found} ->
        user_attrs = %{
          "email" => email,
          "first_name" => invitee.first_name || "",
          "last_name" => invitee.last_name || ""
        }

        with {:ok, user} <- Users.create_if_absent(DateTime.utc_now(:second), user_attrs) do
          confirm_if_needed(user)
        end
    end
  end

  defp confirm_if_needed(user) do
    if User.email_confirmed?(user), do: {:ok, user}, else: Users.confirm_user_email(user)
  end
end
