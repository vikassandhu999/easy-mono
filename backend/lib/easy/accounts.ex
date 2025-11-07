defmodule Easy.Accounts do
  @moduledoc """
  Accounts context handles user authentication and session management.

  This is the public API for:
  - User management (CRUD operations)
  - OTP generation and verification
  - Session management
  - Authentication flows
  """

  import Ecto.Query, warn: false

  alias Easy.Repo
  alias Easy.Accounts.{User, OneTimeToken, Session, Token}

  # ============================================
  # OTP MANAGEMENT
  # ============================================

  @doc """
  Generates an OTP token and sends it via email.

  Enforces rate limiting: maximum 3 OTP requests per 15 minutes per email.
  Implements idempotency: returns existing token if one was created within 60 seconds.

  ## Parameters
    - email: The email address to send the OTP to
    - type: The type of OTP ("email_verification", "login", "client_invitation")
    - metadata: Optional metadata to store with the token (default: %{})

  ## Returns
    - {:ok, token_uuid} on success
    - {:error, :rate_limited, retry_after_seconds} if rate limit exceeded
    - {:error, changeset} on validation failure

  ## Examples

      iex> generate_otp("user@example.com", "email_verification")
      {:ok, "550e8400-e29b-41d4-a716-446655440000"}

      iex> generate_otp("user@example.com", "client_invitation", %{client_id: 123})
      {:ok, "550e8400-e29b-41d4-a716-446655440000"}
  """
  def generate_otp(email, type, metadata \\ %{}) do
    # Check for existing valid token within 60 seconds (idempotency)
    case get_recent_token(email, type, 60) do
      %OneTimeToken{} = recent_token ->
        # Return existing token for idempotency
        {:ok, recent_token.token}

      nil ->
        # No recent token found, proceed with generation
        generate_new_otp(email, type, metadata)
    end
  end

  @doc """
  Gets a recent unused token for the given email and type within the specified time window.

  This function is used for idempotency checks to prevent duplicate token generation
  from network retries.

  ## Parameters
    - email: The email address to check
    - type: The token type to check
    - within_seconds: The time window in seconds to check for recent tokens (default: 60)

  ## Returns
    - %OneTimeToken{} if a recent unused token exists
    - nil if no recent token found

  ## Examples

      iex> get_recent_token("user@example.com", "email_verification", 60)
      %OneTimeToken{}

      iex> get_recent_token("user@example.com", "login", 60)
      nil
  """
  def get_recent_token(email, type, within_seconds \\ 60) do
    cutoff_time = DateTime.add(DateTime.utc_now(), -within_seconds, :second)

    from(t in OneTimeToken,
      where:
        t.email == ^email and
          t.type == ^type and
          is_nil(t.used_at) and
          t.inserted_at > ^cutoff_time and
          t.expires_at > ^DateTime.utc_now(),
      order_by: [desc: t.inserted_at],
      limit: 1
    )
    |> Repo.one()
  end

  # Private function that actually generates a new OTP token
  defp generate_new_otp(email, type, metadata) do
    # Check rate limit
    case check_rate_limit(email) do
      {:ok, :allowed} ->
        # Generate 6-digit OTP code
        otp_code = generate_otp_code()

        # Generate UUID token for invitation links
        token_uuid = Ecto.UUID.generate()

        # Set expiration based on type using configuration
        auth_config = Application.get_env(:easy, :auth, [])

        expires_at =
          case type do
            "client_invitation" ->
              days = Keyword.get(auth_config, :invitation_expiry_days, 7)
              DateTime.add(DateTime.utc_now(), days * 24 * 60 * 60, :second)

            _ ->
              minutes = Keyword.get(auth_config, :otp_expiry_minutes, 10)
              DateTime.add(DateTime.utc_now(), minutes * 60, :second)
          end

        attrs = %{
          token: token_uuid,
          code: otp_code,
          type: type,
          email: email,
          expires_at: expires_at,
          metadata: metadata
        }

        case %OneTimeToken{}
             |> OneTimeToken.changeset(attrs)
             |> Repo.insert() do
          {:ok, _token} ->
            # Send email with OTP code
            send_otp_email(email, otp_code, type)
            {:ok, token_uuid}

          {:error, changeset} ->
            {:error, changeset}
        end

      {:error, :rate_limited, retry_after} ->
        {:error, :rate_limited, retry_after}
    end
  end

  @doc """
  Verifies an OTP code using token_id.

  This is the primary verification method for the new authentication flow where
  the client receives a token_id after requesting an OTP.

  ## Parameters
    - token_id: The UUID of the OneTimeToken record
    - code: The 6-digit OTP code to verify
    - expected_type: Optional expected token type for validation

  ## Returns
    - {:ok, token} on successful verification
    - {:error, :invalid_otp} if code doesn't match
    - {:error, :token_expired} if token has expired
    - {:error, :token_used} if token was already used
    - {:error, :max_attempts} if maximum attempts exceeded
    - {:error, :token_not_found} if no matching token found
    - {:error, :invalid_token_type} if token type doesn't match expected type

  ## Examples

      iex> verify_otp("550e8400-e29b-41d4-a716-446655440000", "123456")
      {:ok, %OneTimeToken{}}

      iex> verify_otp("550e8400-e29b-41d4-a716-446655440000", "wrong")
      {:error, :invalid_otp}

      iex> verify_otp("550e8400-e29b-41d4-a716-446655440000", "123456", "login")
      {:error, :invalid_token_type}
  """
  def verify_otp(token_id, code, expected_type \\ nil) do
    token = get_token_by_id(token_id)

    case token do
      nil ->
        {:error, :token_not_found}

      token ->
        cond do
          # Validate token type matches expected type if provided
          not is_nil(expected_type) and token.type != expected_type ->
            {:error, :invalid_token_type}

          OneTimeToken.used?(token) ->
            {:error, :token_used}

          OneTimeToken.expired?(token) ->
            {:error, :token_expired}

          token.attempts >= get_max_otp_attempts() ->
            {:error, :max_attempts}

          OneTimeToken.verify_code(token, code) ->
            # Mark token as used
            token
            |> OneTimeToken.mark_used_changeset()
            |> Repo.update()

          true ->
            # Increment attempts
            token
            |> OneTimeToken.increment_attempts_changeset()
            |> Repo.update()

            {:error, :invalid_otp}
        end
    end
  end

  @doc """
  Verifies an OTP code for a given email and type.

  DEPRECATED: Use verify_otp/3 with token_id instead.
  This function is kept for backward compatibility during migration.

  ## Parameters
    - email: The email address associated with the OTP
    - code: The 6-digit OTP code to verify
    - type: The type of OTP to verify
    - expected_type: Optional expected token type for validation (defaults to type parameter)

  ## Returns
    - {:ok, token} on successful verification
    - {:error, :invalid_otp} if code doesn't match
    - {:error, :token_expired} if token has expired
    - {:error, :token_used} if token was already used
    - {:error, :max_attempts} if maximum attempts exceeded
    - {:error, :token_not_found} if no matching token found
    - {:error, :invalid_token_type} if token type doesn't match expected type

  ## Examples

      iex> verify_otp_by_email("user@example.com", "123456", "email_verification")
      {:ok, %OneTimeToken{}}

      iex> verify_otp_by_email("user@example.com", "wrong", "email_verification")
      {:error, :invalid_otp}
  """
  def verify_otp_by_email(email, code, type, expected_type \\ nil) do
    # Default expected_type to type if not provided
    expected_type = expected_type || type

    # Find the most recent unused token for this email and type
    token =
      from(t in OneTimeToken,
        where: t.email == ^email and t.type == ^type and is_nil(t.used_at),
        order_by: [desc: t.inserted_at],
        limit: 1
      )
      |> Repo.one()

    case token do
      nil ->
        {:error, :token_not_found}

      token ->
        cond do
          # Validate token type matches expected type
          token.type != expected_type ->
            {:error, :invalid_token_type}

          OneTimeToken.used?(token) ->
            {:error, :token_used}

          OneTimeToken.expired?(token) ->
            {:error, :token_expired}

          token.attempts >= get_max_otp_attempts() ->
            {:error, :max_attempts}

          OneTimeToken.verify_code(token, code) ->
            # Mark token as used
            token
            |> OneTimeToken.mark_used_changeset()
            |> Repo.update()

          true ->
            # Increment attempts
            token
            |> OneTimeToken.increment_attempts_changeset()
            |> Repo.update()

            {:error, :invalid_otp}
        end
    end
  end

  @doc """
  Resends an OTP by invalidating the old one and creating a new one.

  ## Parameters
    - email: The email address to resend the OTP to
    - type: The type of OTP to resend

  ## Returns
    - {:ok, token_uuid} on success
    - {:error, reason} on failure

  ## Examples

      iex> resend_otp("user@example.com", "email_verification")
      {:ok, "550e8400-e29b-41d4-a716-446655440000"}
  """
  def resend_otp(email, type) do
    # Invalidate all previous unused tokens for this email and type
    from(t in OneTimeToken,
      where: t.email == ^email and t.type == ^type and is_nil(t.used_at)
    )
    |> Repo.update_all(set: [used_at: DateTime.utc_now() |> DateTime.truncate(:second)])

    # Generate new OTP
    generate_otp(email, type)
  end

  @doc """
  Gets a token by its ID (primary key).
  Used to retrieve token details after generation.

  ## Examples

      iex> get_token_by_id("550e8400-e29b-41d4-a716-446655440000")
      %OneTimeToken{}

      iex> get_token_by_id("invalid-uuid")
      nil
  """
  def get_token_by_id(token_id) do
    Repo.get(OneTimeToken, token_id)
  end

  @doc """
  Gets a token by its token UUID field.
  Used to retrieve token details after generation.

  ## Examples

      iex> get_token_by_uuid("550e8400-e29b-41d4-a716-446655440000")
      %OneTimeToken{}

      iex> get_token_by_uuid("invalid-uuid")
      nil
  """
  def get_token_by_uuid(token_uuid) do
    from(t in OneTimeToken,
      where: t.token == ^token_uuid
    )
    |> Repo.one()
  end

  @doc """
  Gets an invitation token by its UUID.
  Used for client invitation flow.

  ## Examples

      iex> get_invitation_token("550e8400-e29b-41d4-a716-446655440000")
      %OneTimeToken{}

      iex> get_invitation_token("invalid-uuid")
      nil
  """
  def get_invitation_token(token_uuid) do
    from(t in OneTimeToken,
      where: t.token == ^token_uuid and t.type == "client_invitation" and is_nil(t.used_at)
    )
    |> Repo.one()
  end

  @doc """
  Checks if an email has exceeded the OTP request rate limit.

  Rate limit: Maximum 3 OTP requests per 15 minutes per email.

  ## Parameters
    - email: The email address to check

  ## Returns
    - {:ok, :allowed} if the request is allowed
    - {:error, :rate_limited, retry_after_seconds} if rate limit exceeded

  ## Examples

      iex> check_rate_limit("user@example.com")
      {:ok, :allowed}

      iex> check_rate_limit("spammer@example.com")
      {:error, :rate_limited, 300}
  """
  def check_rate_limit(email) do
    # Get rate limit configuration
    auth_config = Application.get_env(:easy, :auth, [])
    window_minutes = Keyword.get(auth_config, :rate_limit_window_minutes, 15)
    max_requests = Keyword.get(auth_config, :rate_limit_max_requests, 3)

    window_seconds = window_minutes * 60
    window_ago = DateTime.add(DateTime.utc_now(), -window_seconds, :second)

    # Count OTP requests in the rate limit window for this email
    count =
      from(t in OneTimeToken,
        where: t.email == ^email and t.inserted_at > ^window_ago,
        select: count(t.id)
      )
      |> Repo.one()

    if count >= max_requests do
      # Find the oldest token to calculate retry_after
      oldest_token =
        from(t in OneTimeToken,
          where: t.email == ^email and t.inserted_at > ^window_ago,
          order_by: [asc: t.inserted_at],
          limit: 1,
          select: t.inserted_at
        )
        |> Repo.one()

      if oldest_token do
        # Calculate when the rate limit window will reset
        reset_time = DateTime.add(oldest_token, window_seconds, :second)
        retry_after = DateTime.diff(reset_time, DateTime.utc_now())
        {:error, :rate_limited, max(retry_after, 0)}
      else
        {:ok, :allowed}
      end
    else
      {:ok, :allowed}
    end
  end

  # ============================================
  # USER MANAGEMENT
  # ============================================

  @doc """
  Creates a new user with the given attributes.

  ## Examples

      iex> create_user(%{email: "user@example.com", full_name: "John Doe"})
      {:ok, %User{}}

      iex> create_user(%{email: "invalid"})
      {:error, %Ecto.Changeset{}}
  """
  def create_user(attrs) do
    %User{}
    |> User.changeset(attrs)
    |> Repo.insert()
  end

  @doc """
  Gets a user by ID.
  Returns the user struct or nil if not found.

  ## Examples

      iex> get_user(123)
      %User{}

      iex> get_user(999)
      nil
  """
  def get_user(id), do: Repo.get(User, id)

  @doc """
  Gets a user by email address.
  Returns the user struct or nil if not found.

  ## Examples

      iex> get_user_by_email("user@example.com")
      %User{}

      iex> get_user_by_email("nonexistent@example.com")
      nil
  """
  def get_user_by_email(email) when is_binary(email) do
    Repo.get_by(User, email: String.downcase(email))
  end

  @doc """
  Marks a user's email as verified with the current timestamp.

  ## Examples

      iex> mark_email_verified(user)
      {:ok, %User{email_verified: true}}
  """
  def mark_email_verified(%User{} = user) do
    user
    |> User.verify_email_changeset()
    |> Repo.update()
  end

  @doc """
  Updates a user with the given attributes.

  ## Examples

      iex> update_user(user, %{full_name: "Jane Doe"})
      {:ok, %User{}}

      iex> update_user(user, %{email: "invalid"})
      {:error, %Ecto.Changeset{}}
  """
  def update_user(%User{} = user, attrs) do
    user
    |> User.changeset(attrs)
    |> Repo.update()
  end

  @doc """
  Checks if an email address is already taken.
  Returns true if the email exists, false otherwise.

  ## Examples

      iex> email_taken?("existing@example.com")
      true

      iex> email_taken?("new@example.com")
      false
  """
  def email_taken?(email) when is_binary(email) do
    query = from u in User, where: u.email == ^String.downcase(email)
    Repo.exists?(query)
  end

  @doc """
  Validates that a token type matches the expected type for a flow.

  This function provides clear error messages for token type mismatches
  to prevent tokens from being used in unintended flows.

  ## Parameters
    - token: The OneTimeToken struct
    - expected_type: The expected token type for the current flow

  ## Returns
    - :ok if token type matches expected type
    - {:error, :invalid_token_type, message} if types don't match

  ## Examples

      iex> validate_token_type(%OneTimeToken{type: "login"}, "login")
      :ok

      iex> validate_token_type(%OneTimeToken{type: "email_verification"}, "login")
      {:error, :invalid_token_type, "Cannot use email verification token for login. Please request a login code."}
  """
  def validate_token_type(%OneTimeToken{type: token_type}, expected_type) do
    if token_type == expected_type do
      :ok
    else
      message = get_token_type_mismatch_message(token_type, expected_type)
      {:error, :invalid_token_type, message}
    end
  end

  @doc """
  Gets a human-readable error message for token type mismatches.

  ## Parameters
    - actual_type: The actual token type
    - expected_type: The expected token type

  ## Returns
    - A string with a clear error message

  ## Examples

      iex> get_token_type_mismatch_message("email_verification", "login")
      "Cannot use email verification token for login. Please request a login code."
  """
  def get_token_type_mismatch_message(actual_type, expected_type) do
    case {actual_type, expected_type} do
      {"email_verification", "login"} ->
        "Cannot use email verification token for login. Please request a login code."

      {"login", "email_verification"} ->
        "Cannot use login token for email verification. Please complete the registration process."

      {"client_invitation", "email_verification"} ->
        "Cannot use client invitation token for email verification. Please use the invitation link provided."

      {"client_invitation", "login"} ->
        "Cannot use client invitation token for login. Please use the invitation link provided."

      {"email_verification", "client_invitation"} ->
        "Cannot use email verification token for client invitation. This token is for account verification only."

      {"login", "client_invitation"} ->
        "Cannot use login token for client invitation. This token is for login only."

      _ ->
        "Token type mismatch. Expected #{expected_type} but got #{actual_type}."
    end
  end

  # ============================================
  # PRIVATE HELPERS
  # ============================================

  # Gets the maximum OTP attempts from configuration
  defp get_max_otp_attempts do
    auth_config = Application.get_env(:easy, :auth, [])
    Keyword.get(auth_config, :otp_max_attempts, 3)
  end

  # Generates a random 6-digit OTP code
  defp generate_otp_code do
    :rand.uniform(999_999)
    |> Integer.to_string()
    |> String.pad_leading(6, "0")
  end

  # Sends OTP email based on type
  defp send_otp_email(email, code, type, metadata \\ %{}) do
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

  # ============================================
  # SESSION MANAGEMENT
  # ============================================

  @doc """
  Creates a session for a user and generates JWT tokens.

  This function:
  1. Preloads coach and client associations
  2. Determines the user's roles (coach, client, or both)
  3. Generates access and refresh JWT tokens
  4. Creates a session record in the database
  5. Returns the session with tokens and complete user profile including roles and profiles

  ## Parameters
    - user: The user struct (will be preloaded with coach and client associations)

  ## Returns
    - {:ok, %{user: user_data, session: session_data}} where:
      - user_data includes id, email, full_name, email_verified, roles, and coach_profile/client_profile if applicable
      - session_data includes session struct, access_token, refresh_token, and expires_in
    - {:error, changeset} on failure

  ## Examples

      iex> create_session(user)
      {:ok, %{
        user: %{
          id: "...",
          email: "user@example.com",
          full_name: "John Doe",
          email_verified: true,
          roles: ["coach"],
          coach_profile: %{...}
        },
        session: %{
          session: %Session{},
          access_token: "eyJhbGc...",
          refresh_token: "eyJhbGc...",
          expires_in: 604800
        }
      }}
  """
  def create_session(%User{} = user) do
    # Preload associations to determine roles
    user = Repo.preload(user, [:coach, :client])

    # Determine user roles based on associations
    roles = determine_user_roles(user)

    # Create a temporary session record to get an ID for the JWT
    now = DateTime.utc_now() |> DateTime.truncate(:second)
    auth_config = Application.get_env(:easy, :auth, [])
    session_expiry_days = Keyword.get(auth_config, :session_expiry_days, 7)
    expires_at = DateTime.add(now, session_expiry_days * 24 * 60 * 60, :second)

    session_attrs = %{
      # Will be replaced with actual JWT
      token: "temp",
      # Will be replaced with actual JWT
      refresh_token: "temp",
      expires_at: expires_at,
      last_activity_at: now,
      user_id: user.id
    }

    case %Session{}
         |> Session.changeset(session_attrs)
         |> Repo.insert() do
      {:ok, session} ->
        # Generate JWT tokens with the session ID
        with {:ok, access_token} <- Token.generate_access_token(user, session.id, roles),
             {:ok, refresh_token} <- Token.generate_refresh_token(user, session.id) do
          # Update session with actual tokens
          session
          |> Session.changeset(%{
            token: access_token,
            refresh_token: refresh_token
          })
          |> Repo.update()
          |> case do
            {:ok, updated_session} ->
              jwt_config = Application.get_env(:easy, :jwt, [])
              access_token_ttl_days = Keyword.get(jwt_config, :access_token_ttl_days, 7)

              # Build complete user response with roles and profiles
              user_response = build_user_response(user)

              # Build session response
              session_response = %{
                session: updated_session,
                access_token: access_token,
                refresh_token: refresh_token,
                # days in seconds
                expires_in: access_token_ttl_days * 24 * 60 * 60
              }

              {:ok,
               %{
                 user: user_response,
                 session: session_response
               }}

            {:error, changeset} ->
              # Clean up the temporary session
              Repo.delete(session)
              {:error, changeset}
          end
        else
          {:error, reason} ->
            # Clean up the temporary session
            Repo.delete(session)
            {:error, reason}
        end

      {:error, changeset} ->
        {:error, changeset}
    end
  end

  @doc """
  Verifies OTP by token_id and creates a session with complete user profile.

  This function:
  1. Verifies the OTP code against the token_id
  2. Validates token type matches expected flow
  3. Marks the user's email as verified (for email_verification type)
  4. Creates a session with JWT tokens
  5. Returns complete user profile with roles and coach/client profiles

  ## Parameters
    - token_id: The UUID of the OneTimeToken record
    - code: The 6-digit OTP code to verify
    - expected_type: Optional expected token type for validation

  ## Returns
    - {:ok, %{user: user_data, session: session_data}} on success
    - {:error, reason} on failure

  ## Examples

      iex> verify_otp_and_create_session("550e8400-...", "123456")
      {:ok, %{
        user: %{
          id: "...",
          email: "user@example.com",
          full_name: "John Doe",
          email_verified: true,
          roles: ["coach"],
          coach_profile: %{...}
        },
        session: %{
          access_token: "eyJhbGc...",
          refresh_token: "eyJhbGc...",
          expires_at: "2024-01-08T12:00:00Z",
          expires_in: 604800
        }
      }}
  """
  def verify_otp_and_create_session(token_id, code, expected_type \\ nil) do
    with {:ok, token} <- verify_otp(token_id, code, expected_type),
         %User{} = user <- get_user_by_email(token.email) do
      # Mark email as verified if this is an email_verification token
      user =
        if token.type == "email_verification" and not user.email_verified do
          case mark_email_verified(user) do
            {:ok, verified_user} -> verified_user
            {:error, _} -> user
          end
        else
          user
        end

      # Create session (which now includes user data with roles and profiles)
      case create_session(user) do
        {:ok, %{user: user_data, session: session_data}} ->
          # Format session response for API
          session_response = %{
            session_id: to_string(session_data.session.id),
            access_token: session_data.access_token,
            refresh_token: session_data.refresh_token,
            expires_at: DateTime.to_iso8601(session_data.session.expires_at),
            expires_in: session_data.expires_in
          }

          {:ok, %{user: user_data, session: session_response}}

        {:error, reason} ->
          {:error, reason}
      end
    else
      nil -> {:error, :user_not_found}
      {:error, reason} -> {:error, reason}
    end
  end

  @doc """
  Refreshes a session using a refresh token.

  Validates the refresh token, checks if the session is still valid,
  and generates a new access token.

  ## Parameters
    - refresh_token: The refresh token string

  ## Returns
    - {:ok, %{access_token: token, expires_in: seconds}} on success
    - {:error, reason} on failure

  ## Examples

      iex> refresh_session("eyJhbGc...")
      {:ok, %{access_token: "eyJhbGc...", expires_in: 604800}}
  """
  def refresh_session(refresh_token) do
    with {:ok, claims} <- Token.verify_token(refresh_token),
         true <- claims["type"] == "refresh",
         session_id <- Token.get_session_id(claims),
         %Session{} = session <- get_session_by_id(session_id),
         true <- Session.valid?(session),
         %User{} = user <- get_user(session.user_id) do
      # Preload associations to determine roles
      user = Repo.preload(user, [:coach, :client])
      roles = determine_user_roles(user)

      # Generate new access token
      case Token.generate_access_token(user, session.id, roles) do
        {:ok, access_token} ->
          # Update last activity
          session
          |> Session.update_activity_changeset()
          |> Repo.update()

          jwt_config = Application.get_env(:easy, :jwt, [])
          access_token_ttl_days = Keyword.get(jwt_config, :access_token_ttl_days, 7)

          {:ok,
           %{
             access_token: access_token,
             # days in seconds
             expires_in: access_token_ttl_days * 24 * 60 * 60
           }}

        {:error, reason} ->
          {:error, reason}
      end
    else
      false -> {:error, :invalid_token}
      nil -> {:error, :session_not_found}
      {:error, reason} -> {:error, reason}
    end
  end

  @doc """
  Revokes a session by marking it as revoked.

  ## Parameters
    - token: The access token or session ID

  ## Returns
    - {:ok, session} on success
    - {:error, :session_not_found} if session doesn't exist

  ## Examples

      iex> revoke_session("eyJhbGc...")
      {:ok, %Session{revoked_at: ~U[2024-01-01 00:00:00Z]}}
  """
  def revoke_session(token) when is_binary(token) do
    case Token.verify_token(token) do
      {:ok, claims} ->
        session_id = Token.get_session_id(claims)
        revoke_session_by_id(session_id)

      {:error, _reason} ->
        {:error, :invalid_token}
    end
  end

  def revoke_session(session_id) when is_integer(session_id) do
    revoke_session_by_id(session_id)
  end

  @doc """
  Revokes all sessions for a user.

  ## Parameters
    - user_id: The user ID

  ## Returns
    - {:ok, count} where count is the number of sessions revoked

  ## Examples

      iex> revoke_all_user_sessions(123)
      {:ok, 3}
  """
  def revoke_all_user_sessions(user_id) do
    now = DateTime.utc_now() |> DateTime.truncate(:second)

    {count, _} =
      from(s in Session,
        where: s.user_id == ^user_id and is_nil(s.revoked_at)
      )
      |> Repo.update_all(set: [revoked_at: now])

    {:ok, count}
  end

  @doc """
  Gets a session by its ID.

  ## Examples

      iex> get_session_by_id(123)
      %Session{}

      iex> get_session_by_id(999)
      nil
  """
  def get_session_by_id(id), do: Repo.get(Session, id)

  @doc """
  Gets a session by its token (JWT).

  ## Examples

      iex> get_session_by_token("eyJhbGc...")
      %Session{}
  """
  def get_session_by_token(token) do
    case Token.verify_token(token) do
      {:ok, claims} ->
        session_id = Token.get_session_id(claims)
        get_session_by_id(session_id)

      {:error, _reason} ->
        nil
    end
  end

  @doc """
  Cleans up expired sessions.

  This should be run periodically as a background job.
  Deletes sessions that expired more than the configured cleanup threshold.

  ## Returns
    - {:ok, count} where count is the number of sessions deleted

  ## Examples

      iex> cleanup_expired_sessions()
      {:ok, 42}
  """
  def cleanup_expired_sessions do
    require Logger

    auth_config = Application.get_env(:easy, :auth, [])
    cleanup_days = Keyword.get(auth_config, :cleanup_old_sessions_older_than_days, 90)
    cleanup_threshold = DateTime.add(DateTime.utc_now(), -cleanup_days * 24 * 60 * 60, :second)

    Logger.info(
      "Starting session cleanup: deleting sessions expired before #{DateTime.to_iso8601(cleanup_threshold)}"
    )

    {count, _} =
      from(s in Session,
        where: s.expires_at < ^cleanup_threshold
      )
      |> Repo.delete_all()

    Logger.info("Session cleanup completed: deleted #{count} expired sessions")

    {:ok, count}
  end

  @doc """
  Cleans up expired one-time tokens.

  This should be run periodically as a background job.
  Deletes tokens that expired more than the configured cleanup threshold.

  ## Returns
    - {:ok, count} where count is the number of tokens deleted

  ## Examples

      iex> cleanup_expired_tokens()
      {:ok, 15}
  """
  def cleanup_expired_tokens do
    require Logger

    auth_config = Application.get_env(:easy, :auth, [])
    cleanup_days = Keyword.get(auth_config, :cleanup_expired_tokens_older_than_days, 7)
    cleanup_threshold = DateTime.add(DateTime.utc_now(), -cleanup_days * 24 * 60 * 60, :second)

    Logger.info(
      "Starting token cleanup: deleting tokens expired before #{DateTime.to_iso8601(cleanup_threshold)}"
    )

    {count, _} =
      from(t in OneTimeToken,
        where: t.expires_at < ^cleanup_threshold
      )
      |> Repo.delete_all()

    Logger.info("Token cleanup completed: deleted #{count} expired tokens")

    {:ok, count}
  end

  # ============================================
  # AUTHENTICATION FLOWS
  # ============================================

  @doc """
  Registers a new user and sends verification OTP.

  This is the first step in the coach signup flow.

  ## Parameters
    - email: User's email address
    - full_name: User's full name

  ## Returns
    - {:ok, %{user: user, token_uuid: uuid}} on success
    - {:error, changeset} on validation failure
    - {:error, :rate_limited, retry_after} if rate limit exceeded

  ## Examples

      iex> register_user("coach@example.com", "John Coach")
      {:ok, %{user: %User{}, token_uuid: "550e8400-..."}}
  """
  def register_user(email, full_name) do
    case create_user(%{email: email, full_name: full_name}) do
      {:ok, user} ->
        case generate_otp(email, "email_verification") do
          {:ok, token_uuid} ->
            {:ok, %{user: user, token_uuid: token_uuid}}

          {:error, :rate_limited, retry_after} ->
            {:error, :rate_limited, retry_after}

          {:error, reason} ->
            {:error, reason}
        end

      {:error, changeset} ->
        {:error, changeset}
    end
  end

  @doc """
  Verifies OTP and creates a session (login).

  This completes the registration or login flow.

  ## Parameters
    - email: User's email address
    - code: The 6-digit OTP code

  ## Returns
    - {:ok, %{user: user_data, session: session_data}} where user_data includes roles and profiles
    - {:error, reason} on failure

  ## Examples

      iex> verify_and_login("user@example.com", "123456")
      {:ok, %{user: %{...}, session: %{...}}}
  """
  def verify_and_login(email, code) do
    with {:ok, _token} <-
           verify_otp_by_email(email, code, "email_verification", "email_verification"),
         %User{} = user <- get_user_by_email(email),
         {:ok, user} <- mark_email_verified(user),
         {:ok, result} <- create_session(user) do
      {:ok, result}
    else
      nil -> {:error, :user_not_found}
      {:error, reason} -> {:error, reason}
    end
  end

  @doc """
  Requests a login OTP for an existing user.

  ## Parameters
    - email: User's email address

  ## Returns
    - {:ok, token_uuid} on success
    - {:error, :user_not_found} if user doesn't exist
    - {:error, reason} on other failures

  ## Examples

      iex> request_login_otp("user@example.com")
      {:ok, "550e8400-..."}
  """
  def request_login_otp(email) do
    case get_user_by_email(email) do
      nil ->
        {:error, :user_not_found}

      _user ->
        generate_otp(email, "login")
    end
  end

  @doc """
  Logs in a user with OTP and creates a session.

  ## Parameters
    - email: User's email address
    - code: The 6-digit OTP code

  ## Returns
    - {:ok, %{user: user_data, session: session_data}} where user_data includes roles and profiles
    - {:error, reason} on failure

  ## Examples

      iex> login_with_otp("user@example.com", "123456")
      {:ok, %{user: %{...}, session: %{...}}}
  """
  def login_with_otp(email, code) do
    with {:ok, _token} <- verify_otp_by_email(email, code, "login", "login"),
         %User{} = user <- get_user_by_email(email),
         {:ok, result} <- create_session(user) do
      {:ok, result}
    else
      nil -> {:error, :user_not_found}
      {:error, reason} -> {:error, reason}
    end
  end

  # ============================================
  # PRIVATE HELPERS
  # ============================================

  # Determines user roles based on associations
  defp determine_user_roles(user) do
    roles = []

    # Check if user has a coach profile
    # Note: coach and client associations will be nil until those schemas are created
    roles = if Map.get(user, :coach), do: ["coach" | roles], else: roles

    # Check if user has a client profile
    roles = if Map.get(user, :client), do: ["client" | roles], else: roles

    # Default to empty list if no roles (will be populated when coach/client schemas exist)
    roles
  end

  # Builds a complete user response with roles and profiles
  defp build_user_response(user) do
    roles = determine_user_roles(user)

    base_response = %{
      id: to_string(user.id),
      email: user.email,
      full_name: user.full_name,
      email_verified: user.email_verified,
      roles: roles
    }

    # Add coach profile if user has coach role
    base_response =
      if user.coach do
        coach_profile = %{
          id: to_string(user.coach.id),
          business_id: to_string(user.coach.business_id),
          status: user.coach.status,
          bio: user.coach.bio,
          specialties: user.coach.specialties || [],
          credentials: user.coach.credentials || %{}
        }

        Map.put(base_response, :coach_profile, coach_profile)
      else
        base_response
      end

    # Add client profile if user has client role
    base_response =
      if user.client do
        client_profile = %{
          id: to_string(user.client.id),
          business_id: to_string(user.client.business_id),
          status: user.client.status,
          phone: user.client.phone,
          notes: user.client.notes
        }

        Map.put(base_response, :client_profile, client_profile)
      else
        base_response
      end

    base_response
  end

  # Revokes a session by ID
  defp revoke_session_by_id(session_id) do
    case get_session_by_id(session_id) do
      nil ->
        {:error, :session_not_found}

      session ->
        session
        |> Session.revoke_changeset()
        |> Repo.update()
    end
  end
end
