defmodule Easy.Identity.TokenTest do
  use ExUnit.Case, async: true

  import Easy.Factory

  alias Easy.Identity.Token

  test "generated access tokens preserve identity and session scope" do
    user = build(:user, id: Ecto.UUID.generate())
    session = build(:user_session, id: Ecto.UUID.generate(), role: :guest)

    assert {:ok, claims} = user |> Token.generate_access_token(session) |> Token.verify_access_token()
    assert claims["user_id"] == user.id
    assert claims["session_id"] == session.id
    assert claims["role"] == "guest"
  end

  test "malformed and non-string inputs return a domain error" do
    for token <- ["", "not.a.jwt", nil, 123, %{}, []] do
      assert {:error, :invalid_token} = Token.verify_access_token(token)
    end
  end

  test "expired tokens and tokens signed with a different key are rejected" do
    expired = sign(%{"exp" => System.os_time(:second) - 60})
    wrong_key = Joken.Signer.create("HS256", "a-different-signing-secret")
    invalid_signature = Joken.generate_and_sign!(Token.token_config(), %{}, wrong_key)

    for token <- [expired, invalid_signature] do
      assert {:error, :invalid_token} = Token.verify_access_token(token)
    end
  end

  test "expiry, issuer, and audience are required even with a valid signature" do
    {:ok, claims} = Joken.generate_claims(Token.token_config())

    for key <- ["exp", "iss", "aud"] do
      {:ok, token, _claims} = Joken.encode_and_sign(Map.delete(claims, key), Token.signer())
      assert {:error, :invalid_token} = Token.verify_access_token(token)
    end

    for attrs <- [%{"exp" => "never"}, %{"iss" => "another_app"}, %{"aud" => "another_app"}] do
      assert {:error, :invalid_token} = attrs |> sign() |> Token.verify_access_token()
    end
  end

  defp sign(claims), do: Joken.generate_and_sign!(Token.token_config(), claims, Token.signer())
end
