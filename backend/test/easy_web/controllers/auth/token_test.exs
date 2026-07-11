defmodule EasyWeb.Auth.TokenTest do
  use Easy.ConnCase, async: true

  alias EasyWeb.OpenApi.Schemas.{TokenRequest, VerifyRequest}

  describe "TokenRequest" do
    test "casts each valid grant and rejects a mismatched grant body" do
      assert {:ok, %{grant_type: "refresh_token", refresh_token: "refresh-token"}} =
               OpenApiSpex.cast_value(
                 %{"grant_type" => "refresh_token", "refresh_token" => "refresh-token"},
                 TokenRequest.schema()
               )

      assert {:ok, %{grant_type: "otp", email: "coach@example.com", otp: "123456", role: "coach"}} =
               OpenApiSpex.cast_value(
                 %{
                   "grant_type" => "otp",
                   "email" => "coach@example.com",
                   "otp" => "123456",
                   "role" => "coach"
                 },
                 TokenRequest.schema()
               )

      assert {:error, _errors} =
               OpenApiSpex.cast_value(
                 %{"grant_type" => "otp", "refresh_token" => "refresh-token"},
                 TokenRequest.schema()
               )
    end
  end

  describe "POST /v1/auth/token" do
    test "refreshes a valid session", %{conn: conn} do
      session = insert(:user_session, role: :guest)

      conn =
        post(conn, "/v1/auth/token", %{
          "grant_type" => "refresh_token",
          "refresh_token" => session.refresh_token
        })

      assert %{
               "access_token" => access_token,
               "refresh_token" => refresh_token,
               "scope" => "guest",
               "token_type" => "Bearer"
             } = json_response(conn, 200)

      assert is_binary(access_token)
      assert is_binary(refresh_token)
    end

    test "rejects a garbage body with a 4xx response", %{conn: conn} do
      conn = post(conn, "/v1/auth/token", %{"garbage" => "value"})

      assert conn.status in 400..499
    end
  end

  describe "POST /v1/auth/verify" do
    test "returns 400 for a wrong OTP", %{conn: conn} do
      conn =
        post(conn, "/v1/auth/verify", %{
          "email" => "coach@example.com",
          "otp" => "wrong-code"
        })

      assert %{"error_code" => "invalid_otp"} = json_response(conn, 400)
    end

    test "returns 400 for an invalid token", %{conn: conn} do
      conn = post(conn, "/v1/auth/verify", %{"token" => "invalid-token"})

      assert %{"error_code" => "token_invalid"} = json_response(conn, 400)
    end
  end

  test "VerifyRequest casts each valid verification shape" do
    assert {:ok, %{token: "token"}} =
             OpenApiSpex.cast_value(%{"token" => "token"}, VerifyRequest.schema())

    assert {:ok, %{email: "coach@example.com", otp: "123456"}} =
             OpenApiSpex.cast_value(
               %{"email" => "coach@example.com", "otp" => "123456"},
               VerifyRequest.schema()
             )
  end
end
