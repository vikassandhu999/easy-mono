defmodule Easy.Accounts do
  import Ecto.Query, warn: false

  alias Easy.Clients.Client
  alias Easy.Organizations.Coach
  alias Easy.Repo
  alias Easy.Accounts.{User, OneTimeToken, Session, Token}
  alias Easy.Organizations

  def register(user_attrs, business_attrs) do
    with {:ok, result} <-
           Repo.transaction(fn ->
             with {:ok, user} <- create_user(user_attrs),
                  {:ok, _} <- Organizations.create_business_with_owner(user, business_attrs),
                  {:ok, token, code} <- create_otp_token(user, "email_verification") do
               %{user: user, token: token, code: code}
             else
               {:error, reason} -> Repo.rollback(reason)
             end
           end) do
      send_otp_email(result.user.email, result.code, "email_verification")
      {:ok, result}
    else
      {:error, reason} -> {:error, reason}
    end
  end

  def verify_email(token_id, code, expected_type \\ nil) do
    with {:ok, token} <- validate_code(token_id, code, expected_type) do
      Repo.transaction(fn ->
        case Repo.get(User, token.user_id) do
          nil ->
            Repo.rollback(Easy.Error.new("verification_failed", "Could not verify user"))

          %User{} = user ->
            with {:ok, verified_user} <- user |> User.verify_email_changeset() |> Repo.update(),
                 {:ok, _} <- Repo.delete(token) do
              verified_user
            else
              {:error, _changeset} ->
                Repo.rollback(Easy.Error.new("verification_failed", "Could not verify user"))
            end
        end
      end)
    else
      {:error, reason} -> {:error, reason}
    end
  end

  def login(token_id, code) do
    with {:ok, token} <- validate_code(token_id, code, "login"),
         %User{} = user <- Repo.get(User, token.user_id),
         {:ok, session_data} <- create_session(user),
         {:ok, _} <- Repo.delete(token) do
      {:ok,
       %{
         access_token: session_data.access_token,
         refresh_token: session_data.refresh_token,
         expires_at: session_data.expires_at,
         expires_in: session_data.expires_in,
         user: user
       }}
    else
      nil -> {:error, Easy.Error.new("not_found", "User not found")}
      {:error, reason} -> {:error, reason}
    end
  end

  @doc """
  Creates an access token for a coach user.
  Used during coach registration flow.
  """
  def create_coach_access_token(user) do
    with %Coach{} = coach <- get_coach_by_user(user),
         {:ok, access_token} <-
           generate_session(user, coach, nil) do
      {:ok, Map.merge(access_token, %{user: user, coach: coach})}
    else
      {:error, reason} -> {:error, reason}
    end
  end

  def send_login_code(email) do
    # <-- This is the fixed part
    with {:ok, user} <- fetch_user_by_email(email),
         {:ok, token, code} <- create_otp_token(user, "login") do
      # Assuming send_otp_email is successful or you don't need to check its error
      send_otp_email(user.email, code, "login")

      {:ok, %{token: token, user: user}}
    end
  end

  def refresh_access_token(refresh_token) do
    with %Session{} = session <- Repo.get_by(Session, refresh_token: refresh_token),
         true <- Session.valid?(session),
         %User{} = user <- Repo.get(User, session.user_id),
         {:ok, token_roles, token_context} <- get_session_roles_and_context(user, session),
         {:ok, _updated_session} <-
           session |> Session.update_activity_changeset() |> Repo.update(),
         {:ok, access_token} <-
           Token.generate_access_token(user, session.id, token_roles, token_context) do
      {:ok, %{access_token: access_token, refresh_token: refresh_token}}
    else
      nil ->
        {:error, Easy.Error.new("invalid_refresh_token", "Refresh token is invalid")}

      false ->
        {:error,
         Easy.Error.new("invalid_refresh_token", "Refresh token has expired or been revoked")}

      {:error, reason} ->
        {:error, reason}
    end
  end

  defp get_session_roles_and_context(user, session) do
    coach =
      Repo.one(
        from c in Coach,
          where: c.user_id == ^user.id and c.business_id == ^session.business_id
      )

    client =
      Repo.one(
        from c in Client,
          where: c.user_id == ^user.id and c.business_id == ^session.business_id
      )

    case {coach, client} do
      {%Coach{} = coach, nil} ->
        {:ok, ["coach"], %{business_id: coach.business_id, coach_id: coach.id, client_id: nil}}

      {nil, %Client{} = client} ->
        {:ok, ["client"], %{business_id: client.business_id, coach_id: nil, client_id: client.id}}

      _ ->
        {:error, Easy.Error.new("invalid_session", "Could not determine user role")}
    end
  end

  defp fetch_user_by_email(email) do
    case Repo.get_by(User, email: email) do
      nil ->
        # Return an error tuple that 'with' can handle
        {:error, Easy.Error.new("not_found", "No user found with that email.")}

      user ->
        # Return an :ok tuple for 'with' to match
        {:ok, user}
    end
  end

  def create_session(user) do
    # Create a session for the user (defaulting to no specific context initially, or we can infer)
    # For a new client, context is their client profile.
    client = get_client_by_user(user)
    coach = get_coach_by_user(user)

    cond do
      coach -> generate_session(user, coach, nil)
      client -> generate_session(user, nil, client)
      true -> {:error, Easy.Error.new("invalid_session", "User has no active profile")}
    end
  end

  defp generate_session(user, coach, client) do
    refresh_token = :crypto.strong_rand_bytes(64) |> Base.url_encode64(padding: false)

    base_session_attrs = %{
      user_id: user.id,
      refresh_token: refresh_token,
      expires_at: DateTime.add(DateTime.utc_now(), 30 * 24 * 60 * 60, :second),
      last_activity_at: DateTime.utc_now()
    }

    with {:ok, session_attrs, token_roles, token_context} <-
           build_session_context(base_session_attrs, coach, client),
         {:ok, session} <-
           %Session{}
           |> Session.changeset(session_attrs)
           |> Repo.insert(),
         {:ok, access_token} <-
           Token.generate_access_token(user, session.id, token_roles, token_context) do
      # Calculate expires_in (time until session expires in seconds)
      expires_in = DateTime.diff(session.expires_at, DateTime.utc_now(), :second)

      {:ok,
       %{
         access_token: access_token,
         refresh_token: refresh_token,
         expires_at: session.expires_at,
         expires_in: expires_in
       }}
    else
      {:error, reason} -> {:error, reason}
    end
  end

  # Get coach context
  defp build_session_context(base_attrs, %Coach{} = coach, nil) do
    session_attrs =
      base_attrs
      |> Map.put(:coach_id, coach.id)
      |> Map.put(:business_id, coach.business_id)

    token_roles = ["coach"]

    token_context = %{
      business_id: coach.business_id,
      coach_id: coach.id,
      client_id: nil
    }

    {:ok, session_attrs, token_roles, token_context}
  end

  # Get client context
  defp build_session_context(base_attrs, nil, %Client{} = client) do
    session_attrs =
      base_attrs
      |> Map.put(:client_id, client.id)
      |> Map.put(:business_id, client.business_id)

    token_roles = ["client"]

    token_context = %{
      business_id: client.business_id,
      coach_id: nil,
      client_id: client.id
    }

    {:ok, session_attrs, token_roles, token_context}
  end

  defp build_session_context(_base_attrs, _, _) do
    {:error, Easy.Error.new("invalid_session", "Session must be for either a coach or a client.")}
  end

  defp create_otp_token(user, type) do
    code = generate_otp_code()
    expires_at = DateTime.add(DateTime.utc_now(), 15 * 60, :second)

    case %OneTimeToken{}
         |> OneTimeToken.changeset(%{
           email: user.email,
           code: code,
           type: type,
           expires_at: expires_at,
           user_id: user.id
         })
         |> Repo.insert() do
      {:ok, token} ->
        {:ok, token, code}

      {:error, reason} ->
        {:error, reason}
    end
  end

  def create_user(user_attrs) do
    %User{}
    |> User.changeset(user_attrs)
    |> Repo.insert()
  end

  defp validate_code(token_id, code, expected_type) do
    case Repo.get(OneTimeToken, token_id) do
      nil ->
        {:error, Easy.Error.new("invalid_code", "Invalid code")}

      %OneTimeToken{} = token ->
        with true <- is_nil(expected_type) or token.type == expected_type,
             true <- OneTimeToken.verify_code?(token, code) do
          {:ok, token}
        else
          _ -> {:error, Easy.Error.new("invalid_code", "Invalid code")}
        end
    end
  end

  def get_coach_by_user(user) do
    Repo.one(
      from c in Coach,
        where: c.user_id == ^user.id,
        preload: [:business],
        limit: 1
    )
  end

  def get_client_by_user(user) do
    Repo.one(
      from c in Client,
        where: c.user_id == ^user.id,
        preload: [:business],
        limit: 1
    )
  end

  defp send_otp_email(email, code, type, metadata \\ %{}) do
    IO.inspect(%{email: email, code: code})

    email_struct =
      case type do
        "email_verification" -> Easy.Emails.otp_verification_email(email, code)
        "login" -> Easy.Emails.login_otp_email(email, code)
        _ -> Easy.Emails.otp_verification_email(email, code)
      end

    # Send email asynchronously with error handling
    Easy.MailerDelivery.deliver_async(email_struct,
      metadata: Map.merge(metadata, %{type: type, email: email})
    )

    :ok
  end

  defp generate_otp_code do
    :rand.uniform(999_999)
    |> Integer.to_string()
    |> String.pad_leading(6, "0")
  end
end
