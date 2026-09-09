defmodule EasyWeb.Auth.TokenTest do
  use Easy.ConnCase, async: true

  import Ecto.Query

  alias Easy.Identity.{OneTimeToken, OneTimeTokens, Users, UserSession}
  alias Easy.Repo
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
      conn = %{conn | remote_ip: {0x2001, 0xDB8, 0, 0, 0, 0, 0, 1}}
      conn = put_req_header(conn, "user-agent", "Token test client")

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
      refreshed = Repo.get!(UserSession, session.id)
      assert refreshed.ip == "2001:db8::1"
      assert refreshed.user_agent == "Token test client"
    end

    test "rejects a garbage body with a 4xx response", %{conn: conn} do
      conn = post(conn, "/v1/auth/token", %{"garbage" => "value"})

      assert conn.status in 400..499
    end

    # Regression: a hash miss used to roll back the raw `:token_not_found`, which
    # FallbackController has no clause for, so every mistyped login code answered
    # 500 "An internal error occurred". Both apps map `invalid_otp` to real copy
    # ("Invalid code. Please check and try again."), and that copy was unreachable.
    test "returns 400 invalid_otp for a wrong OTP, not a 500", %{conn: conn} do
      user = insert(:user)

      conn =
        post(conn, "/v1/auth/token", %{
          "grant_type" => "otp",
          "email" => user.email,
          "otp" => "999999",
          "role" => "client"
        })

      assert %{"error_code" => "invalid_otp"} = json_response(conn, 400)
    end

    # Pairs with the expiry test below: proves the freshness check lets a fresh
    # code through. `guest` because role resolution is a separate concern from
    # OTP validity and a client role would need a whole business/coach fixture.
    test "exchanges a fresh OTP for a session", %{conn: conn} do
      user = confirmed_user_with_otp("123456")

      conn =
        post(conn, "/v1/auth/token", %{
          "grant_type" => "otp",
          "email" => user.email,
          "otp" => "123456",
          "role" => "guest"
        })

      assert %{"access_token" => _, "scope" => "guest"} = json_response(conn, 200)
      session = Repo.get_by!(UserSession, user_id: user.id)
      assert session.ip == "127.0.0.1"
      assert session.user_agent == "unknown"
    end

    # Regression: only invitation-acceptance codes were checked for freshness, so
    # a login OTP nobody re-requested stayed valid forever — a 2-day-old code
    # still minted a session.
    test "rejects an OTP older than its 10-minute validity", %{conn: conn} do
      user = confirmed_user_with_otp("123456")
      backdate_tokens(user, minutes: 11)

      conn =
        post(conn, "/v1/auth/token", %{
          "grant_type" => "otp",
          "email" => user.email,
          "otp" => "123456",
          "role" => "client"
        })

      assert %{"error_code" => "otp_expired"} = json_response(conn, 410)
    end
  end

  defp confirmed_user_with_otp(otp) do
    user = insert(:user)
    {:ok, user} = Users.confirm_user_email(user)
    {:ok, _} = OneTimeTokens.create_token(user, :authentication, otp)
    user
  end

  defp backdate_tokens(user, minutes: minutes) do
    stale = NaiveDateTime.utc_now() |> NaiveDateTime.add(-minutes * 60) |> NaiveDateTime.truncate(:second)

    Repo.update_all(
      from(t in OneTimeToken, where: t.user_id == ^user.id),
      set: [inserted_at: stale]
    )
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
