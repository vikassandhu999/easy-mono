defmodule Easy.Identity.Token do
  use Joken.Config

  alias Easy.Identity

  @type claims :: %{required(String.t()) => term()}

  @impl true
  @spec token_config() :: Joken.token_config()
  def token_config do
    default_claims(default_exp: 300, iss: "easy_app", aud: "easy_app")
  end

  @spec signer() :: Joken.Signer.t()
  def signer do
    Joken.Signer.create(
      "HS256",
      Application.get_env(:easy, :jwt_secret)
    )
  end

  @spec generate_access_token(Identity.User.t(), Identity.UserSession.t()) :: String.t()
  def generate_access_token(user, session) do
    token =
      Joken.generate_and_sign!(
        token_config(),
        %{
          "user_id" => user.id,
          "session_id" => session.id,
          "role" => session.role,
          "business_id" => session.business_id,
          "coach_id" => session.coach_id,
          "is_owner" => session.is_owner
        },
        signer()
      )

    token
  end

  @spec verify_access_token(term()) :: {:ok, claims()} | {:error, :invalid_token}
  def verify_access_token(token) when is_binary(token) do
    case Joken.verify_and_validate(token_config(), token, signer()) do
      {:ok, %{"exp" => expires_at, "iss" => "easy_app", "aud" => "easy_app"} = claims}
      when is_integer(expires_at) ->
        {:ok, claims}

      _ ->
        {:error, :invalid_token}
    end
  end

  def verify_access_token(_token), do: {:error, :invalid_token}
end
