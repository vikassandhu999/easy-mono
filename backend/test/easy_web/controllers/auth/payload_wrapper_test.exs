defmodule EasyWeb.AuthControllerPayloadTest do
  use Easy.ConnCase, async: true

  describe "wrapped generated-client request bodies" do
    test "signup accepts signupRequest wrapper", %{conn: conn} do
      email = "wrapped-signup-#{System.unique_integer([:positive])}@example.com"

      conn =
        post(conn, ~p"/v1/auth/signup", %{
          "signupRequest" => %{"email" => email, "first_name" => "Wrap", "last_name" => "Test"}
        })

      assert %{"email" => ^email} = json_response(conn, 201)
    end

    test "otp accepts otpRequest wrapper", %{conn: conn} do
      conn =
        post(conn, ~p"/v1/auth/otp", %{
          "otpRequest" => %{"email" => "missing@example.com", "type" => "authentication"}
        })

      assert %{"error_code" => "not_found", "error_message" => "user_not_found"} = json_response(conn, 404)
    end

    test "verify accepts verifyRequest wrapper", %{conn: conn} do
      conn =
        post(conn, ~p"/v1/auth/verify", %{
          "verifyRequest" => %{"email" => "missing@example.com", "otp" => "000000"}
        })

      assert %{"error_code" => "otp_invalid"} = json_response(conn, 400)
    end

    test "token accepts tokenRequest wrapper", %{conn: conn} do
      conn =
        post(conn, ~p"/v1/auth/token", %{
          "tokenRequest" => %{"grant_type" => "refresh_token", "refresh_token" => "bad"}
        })

      assert %{"error_code" => _} = json_response(conn, 400)
    end

    test "accept invite accepts acceptInviteRequest wrapper", %{conn: conn} do
      conn =
        post(conn, ~p"/v1/auth/accept-invite", %{
          "acceptInviteRequest" => %{"invitation_token" => "bad", "email" => "client@example.com"}
        })

      assert %{"error_code" => _} = json_response(conn, 404)
    end

    test "accept invite verify accepts acceptInviteVerifyRequest wrapper", %{conn: conn} do
      conn =
        post(conn, ~p"/v1/auth/accept-invite/verify", %{
          "acceptInviteVerifyRequest" => %{
            "invitation_token" => "bad",
            "email" => "client@example.com",
            "otp" => "000000"
          }
        })

      assert %{"error_code" => _} = json_response(conn, 401)
    end
  end
end
