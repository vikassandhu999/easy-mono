defmodule Easy.Accounts.Token do
  use Joken.Config

  # Token TTL is configured in config/config.exs under :easy, :jwt
  defp access_token_ttl do
    days = Application.get_env(:easy, :jwt)[:access_token_ttl_days] || 7
    days * 24 * 60 * 60
  end

  @spec generate_access_token(any(), any(), any()) ::
          {:error, atom() | keyword()} | {:ok, binary()}
  def generate_access_token(user, session_id, roles, business_context \\ %{}) do
    extra_claims = %{
      "sub" => to_string(user.id),
      "roles" => roles,
      "jti" => to_string(session_id),
      "type" => "access"
    }

    # Add business context claims if present
    extra_claims =
      extra_claims
      |> maybe_add_claim("business_id", business_context[:business_id])
      |> maybe_add_claim("coach_id", business_context[:coach_id])
      |> maybe_add_claim("client_id", business_context[:client_id])

    case generate_and_sign(extra_claims, signer(), access_token_ttl()) do
      {:ok, token, _claims} -> {:ok, token}
      {:error, reason} -> {:error, reason}
    end
  end

  @doc """
  Verifies and validates a JWT token.
  """
  def verify_token(token) do
    verify_and_validate(token, signer())
  end

  @doc """
  Extracts the user ID from token claims.
  """
  def get_user_id(%{"sub" => sub}) when is_binary(sub) do
    sub
  end

  @doc """
  Extracts the session ID from token claims.
  """
  def get_session_id(%{"jti" => jti}) when is_binary(jti) do
    jti
  end

  @doc """
  Extracts business context from token claims.
  """
  def extract_business_context(claims) when is_map(claims) do
    %{
      business_id: Map.get(claims, "business_id"),
      coach_id: Map.get(claims, "coach_id"),
      client_id: Map.get(claims, "client_id")
    }
  end

  # --- Private functions ---

  # This clause catches nil values
  defp maybe_add_claim(claims, _key, nil), do: claims

  # This clause catches all other values and converts them to strings
  defp maybe_add_claim(claims, key, value) do
    Map.put(claims, key, to_string(value))
  end

  defp generate_and_sign(extra_claims, signer, ttl) do
    now = System.system_time(:second)

    claims =
      %{
        "iat" => now,
        "exp" => now + ttl,
        "nonce" => Ecto.UUID.generate()
      }
      |> Map.merge(extra_claims)

    Joken.generate_and_sign(%{}, claims, signer)
  end

  defp signer do
    secret_key =
      Application.get_env(:easy, :jwt_secret) ||
        raise "JWT secret not configured"

    Joken.Signer.create("HS256", secret_key)
  end
end
