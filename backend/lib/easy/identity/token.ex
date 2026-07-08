defmodule Easy.Identity.Token do
  use Joken.Config

  alias Easy.Identity
  alias Easy.Identity

  @type claims :: %{required(String.t()) => term()}

  @impl true
  def token_config do
    default_claims(default_exp: 300, iss: "easy_app", aud: "easy_app")
  end

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

  @spec verify_access_token(String.t()) :: {:ok, claims()} | {:error, any()}
  def verify_access_token(token) do
    Joken.verify_and_validate(token_config(), token, signer())
  end

  @spec has_role?(map(), atom()) :: boolean()
  def has_role?(claims, role) do
    Map.get(claims, "role") == Atom.to_string(role)
  end
end
