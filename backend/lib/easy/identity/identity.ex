defmodule Easy.Identity do
  alias Easy.Clients.Client
  alias Easy.Identity.UserSessions
  alias Easy.Identity.UserSession
  alias Easy.Identity.User
  alias Easy.Identity.Users
  alias Easy.Identity.OneTimeTokens
  alias Easy.Identity.Token
  alias Easy.Identity.Errors
  alias Easy.Identity.OtpGenerator
  alias Easy.Identity.Mailer
  alias Easy.Identity.SessionFactory
  alias Easy.Repo

  # TODO: Add rate limiting to signup and otp sending
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

  @spec accept_invite(map()) :: {:ok, :otp_sent} | {:error, any()}
  def accept_invite(%{"invitation_token" => token, "email" => email})
      when is_binary(email) and email != "" do
    otp = OtpGenerator.generate()

    # The "one active Client per User" invariant is NOT checked here on purpose:
    # this endpoint is public, and a pre-flight check would leak whether an
    # email belongs to an active client somewhere in the system. The invariant
    # is enforced atomically at verify time, once the caller has proven email
    # ownership via OTP.
    Repo.transaction(fn ->
      with {:ok, _client} <- Client.resolve_invitation_token(token),
           :ok <- rotate_invitation_otp(email),
           {:ok, _} <- OneTimeTokens.create_invitation_acceptance_token(otp, email, token) do
        Mailer.send_invitation_otp(email, otp)
        :otp_sent
      else
        {:error, :invalid} -> Repo.rollback(Errors.invitation_invalid())
        {:error, :used} -> Repo.rollback(Errors.invitation_used())
        {:error, :expired} -> Repo.rollback(Errors.invitation_expired())
        {:error, reason} -> Repo.rollback(reason)
      end
    end)
  end

  defp rotate_invitation_otp(email) do
    OneTimeTokens.delete_all_for_relates_to_and_type(email, :invitation_acceptance)
    :ok
  end

  @spec verify_accept_invite(map(), %{
          ip: String.t(),
          user_agent: String.t()
        }) :: {:ok, auth_token()} | {:error, any()}
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
        generate_auth_token(user, session)
      else
        {:error, :token_not_found} ->
          Repo.rollback(Errors.invalid_otp())

        {:error, :otp_expired} ->
          Repo.rollback(Errors.otp_expired())

        {:error, :invalid} ->
          Repo.rollback(Errors.invitation_invalid())

        {:error, :used} ->
          Repo.rollback(Errors.invitation_used())

        {:error, :expired} ->
          Repo.rollback(Errors.invitation_expired())

        {:error, :race_lost} ->
          Repo.rollback(Errors.invitation_used())

        {:error, :already_active_elsewhere} ->
          Repo.rollback(Errors.already_active_client())

        {:error, reason} ->
          Repo.rollback(reason)
      end
    end)
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

  @spec verify(String.t(), map()) :: {:ok, auth_token()} | {:error, any()}
  def verify(token_hash, opts) do
    Repo.transaction(fn ->
      with {:ok, token} <- verify_confirmation_hash(token_hash),
           {:ok, user} <- Users.confirm_user_email(token.user),
           {:ok, _} <- OneTimeTokens.delete(token) do
        session_attrs = %{
          ip: opts.ip || "",
          user_agent: opts.user_agent || "",
          role: :guest
        }

        session = UserSessions.create_session!(user, session_attrs)

        generate_auth_token(user, session)
      else
        {:error, reason} -> Repo.rollback(reason)
      end
    end)
  end

  # TODO: Add rate limiting to send_otp

  @spec send_otp(String.t(), String.t()) :: {:ok, :sent} | {:error, any()}
  def send_otp(email, type) do
    otp = OtpGenerator.generate()

    otp_type =
      case type do
        "email_confirmation" -> :email_confirmation
        "authentication" -> :authentication
        _ -> :authentication
      end

    Repo.transaction(fn ->
      with {:ok, user} <- Users.get_by_email(email),
           {:ok, _} <- validate_can_send_otp?(user, otp_type),
           _ <- OneTimeTokens.delete_all_for_user_and_type(user, otp_type),
           {:ok, _} <- OneTimeTokens.create_token(user, otp_type, otp) do
        Mailer.send_otp(user.email, otp)
        {:ok, :sent}
      else
        {:error, reason} -> Repo.rollback(reason)
      end
    end)
  end

  @type auth_token :: %{
          access_token: String.t(),
          token_type: String.t(),
          expires_in: pos_integer(),
          refresh_token: String.t(),
          scope: String.t()
        }

  @type refresh_token_opts :: %{
          refresh_token: String.t(),
          ip: String.t(),
          user_agent: String.t(),
          role: atom() | nil
        }

  @type otp_token_opts :: %{
          token_hash: String.t(),
          ip: String.t(),
          user_agent: String.t(),
          role: atom() | nil
        }

  @spec token(:refresh_token, refresh_token_opts()) :: {:ok, auth_token()} | {:error, any()}
  @spec token(:otp, otp_token_opts()) :: {:ok, auth_token()} | {:error, any()}
  def token(:refresh_token, %{refresh_token: refresh_token} = opts) do
    require Logger

    Logger.info("Generating token using refresh_token grant type #{inspect(opts)}")

    Repo.transaction(fn ->
      with {:ok, session} <- UserSessions.get_by_refresh_token(refresh_token),
           {:ok, _} <- SessionFactory.validate_session(session),
           {:ok, user} <- Users.get_by_id(session.user_id),
           {:ok, refreshed_session} <- SessionFactory.refresh_session(user, session, opts) do
        generate_auth_token(user, refreshed_session)
      else
        {:error, reason} -> Repo.rollback(reason)
      end
    end)
  end

  def token(:otp, %{token_hash: token_hash} = opts) do
    Repo.transaction(fn ->
      with {:ok, token} <- OneTimeTokens.get_by_hash(token_hash, :authentication),
           {:ok, _} <- validate_email_confirmed(token.user),
           {:ok, _} <- OneTimeTokens.delete(token),
           {:ok, session} <- SessionFactory.create_session(token.user, opts) do
        generate_auth_token(token.user, session)
      else
        {:error, reason} -> Repo.rollback(reason)
      end
    end)
  end

  @spec validate_can_send_otp?(User.t(), atom()) :: {:ok, true} | {:error, any()}

  defp validate_can_send_otp?(user, :email_confirmation) do
    if User.is_email_confirmed?(user) do
      {:error,
       Easy.Error.new(
         "email_already_confirmed",
         "The email address is already confirmed"
       )}
    else
      {:ok, true}
    end
  end

  defp validate_can_send_otp?(user, :authentication) do
    if User.is_email_confirmed?(user) do
      {:ok, true}
    else
      {:error,
       Easy.Error.new(
         "email_not_confirmed",
         "The email address is not confirmed, please confirm your email first"
       )}
    end
  end

  @spec validate_email_confirmed(User.t()) :: {:ok, User.t()} | {:error, any()}
  defp validate_email_confirmed(user) do
    if !User.is_email_confirmed?(user) do
      {:error,
       Easy.Error.new(
         "email_not_confirmed",
         "The email address is not confirmed, please confirm your email first"
       )}
    else
      {:ok, user}
    end
  end

  @spec generate_auth_token(User.t(), UserSession.t()) :: auth_token()
  defp generate_auth_token(user, session) do
    %{
      access_token: Token.generate_access_token(user, session),
      token_type: "Bearer",
      expires_in: 300,
      refresh_token: session.refresh_token,
      scope: session.role |> Atom.to_string()
    }
  end

  defp verify_confirmation_hash(token_hash) do
    with {:ok, token} <- OneTimeTokens.get_by_hash(token_hash, :email_confirmation),
         false <- User.is_confirmation_expired?(token.user) do
      {:ok, token}
    else
      {:error, :token_not_found} -> {:error, :token_invalid}
      true -> {:error, :token_expired}
    end
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
        Easy.Error.new("confirmation_resent", "Confirmation OTP has been sent to your email")
      )
    else
      true ->
        Repo.rollback(
          Easy.Error.new("email_already_exists", "An account with this email already exists")
        )

      _ ->
        Repo.rollback(changeset)
    end
  end
end
