defmodule Easy.Identity.Token do
  @spec generate_access_token(Easy.Identity.User.t(), Easy.Identity.UserSession.t()) :: String.t()
  def generate_access_token(user, session) do
    signer = Joken.Signer.create("HS256", Application.get_env(:easy, :jwt_secret))

    Joken.Config.default_claims(iss: "easy_app", aud: "easy_app", default_exp: 300)
    |> Joken.Config.add_claim("user_id", fn -> user.id end)
    |> Joken.Config.add_claim("session_id", fn -> session.id end)
    |> Joken.Config.add_claim("role", fn -> session.role end)
    |> Joken.generate_and_sign!(%{}, signer)
  end
end
