defmodule EasyWeb.ErrorTestControllerTest do
  use Easy.ConnCase

  describe "GET /api/test/error - error structure validation" do
    test "returns correct structure for changeset validation error", %{conn: conn} do
      conn = get(conn, ~p"/api/test/error", %{type: "changeset"})

      assert json_response(conn, 422) == %{
               "error" => %{
                 "code" => "VALIDATION_ERROR",
                 "message" => "Validation failed",
                 "details" => %{
                   "email" => ["is invalid"]
                 }
               }
             }
    end

    test "returns correct structure for api_error (not found)", %{conn: conn} do
      conn = get(conn, ~p"/api/test/error", %{type: "api_error"})

      assert json_response(conn, 404) == %{
               "error" => %{
                 "code" => "NOT_FOUND",
                 "message" => "User not found",
                 "details" => nil
               }
             }
    end

    test "returns correct structure for unauthorized error", %{conn: conn} do
      conn = get(conn, ~p"/api/test/error", %{type: "unauthorized"})

      response = json_response(conn, 401)

      assert response == %{
               "error" => %{
                 "code" => "UNAUTHORIZED",
                 "message" => "Authentication required",
                 "details" => nil
               }
             }

      assert get_resp_header(conn, "www-authenticate") == ["Bearer"]
    end

    test "returns correct structure for forbidden error", %{conn: conn} do
      conn = get(conn, ~p"/api/test/error", %{type: "forbidden"})

      assert json_response(conn, 403) == %{
               "error" => %{
                 "code" => "FORBIDDEN",
                 "message" => "Access denied",
                 "details" => nil
               }
             }
    end

    test "returns correct structure for not_found error", %{conn: conn} do
      conn = get(conn, ~p"/api/test/error", %{type: "not_found"})

      assert json_response(conn, 404) == %{
               "error" => %{
                 "code" => "NOT_FOUND",
                 "message" => "Resource not found",
                 "details" => nil
               }
             }
    end

    test "returns correct structure for bad_request error", %{conn: conn} do
      conn = get(conn, ~p"/api/test/error", %{type: "bad_request"})

      assert json_response(conn, 400) == %{
               "error" => %{
                 "code" => "BAD_REQUEST",
                 "message" => "Bad request",
                 "details" => nil
               }
             }
    end

    test "returns correct structure for unprocessable_entity error", %{conn: conn} do
      conn = get(conn, ~p"/api/test/error", %{type: "unprocessable_entity"})

      assert json_response(conn, 422) == %{
               "error" => %{
                 "code" => "UNPROCESSABLE_ENTITY",
                 "message" => "Unprocessable entity",
                 "details" => nil
               }
             }
    end

    test "returns correct structure for atom error", %{conn: conn} do
      conn = get(conn, ~p"/api/test/error", %{type: "atom_error"})

      assert json_response(conn, 422) == %{
               "error" => %{
                 "code" => "UNPROCESSABLE_ENTITY",
                 "message" => "some_custom_error",
                 "details" => nil
               }
             }
    end

    test "returns correct structure for string error", %{conn: conn} do
      conn = get(conn, ~p"/api/test/error", %{type: "string_error"})

      assert json_response(conn, 422) == %{
               "error" => %{
                 "code" => "UNPROCESSABLE_ENTITY",
                 "message" => "Custom error message",
                 "details" => nil
               }
             }
    end

    test "returns correct structure for rate_limited error with default retry", %{conn: conn} do
      conn = get(conn, ~p"/api/test/error", %{type: "rate_limited"})

      response = json_response(conn, 429)

      assert response == %{
               "error" => %{
                 "code" => "RATE_LIMIT_EXCEEDED",
                 "message" => "Rate limit exceeded. Please try again in 60 seconds",
                 "details" => %{
                   "retry_after" => 60
                 }
               }
             }

      assert get_resp_header(conn, "retry-after") == ["60"]
    end

    test "returns correct structure for rate_limited error with custom retry", %{conn: conn} do
      conn = get(conn, ~p"/api/test/error", %{type: "rate_limited", retry_after: "300"})

      response = json_response(conn, 429)

      assert response == %{
               "error" => %{
                 "code" => "RATE_LIMIT_EXCEEDED",
                 "message" => "Rate limit exceeded. Please try again in 300 seconds",
                 "details" => %{
                   "retry_after" => 300
                 }
               }
             }

      assert get_resp_header(conn, "retry-after") == ["300"]
    end

    test "returns correct structure for conflict error", %{conn: conn} do
      conn = get(conn, ~p"/api/test/error", %{type: "conflict"})

      assert json_response(conn, 409) == %{
               "error" => %{
                 "code" => "CONFLICT",
                 "message" => "Email already exists",
                 "details" => nil
               }
             }
    end

    test "returns correct structure for validation error with multiple fields", %{conn: conn} do
      conn = get(conn, ~p"/api/test/error", %{type: "validation_with_details"})

      assert json_response(conn, 422) == %{
               "error" => %{
                 "code" => "VALIDATION_ERROR",
                 "message" => "Validation failed",
                 "details" => %{
                   "email" => ["can't be blank"],
                   "password" => ["is too short"]
                 }
               }
             }
    end

    test "returns success response when no error is triggered", %{conn: conn} do
      conn = get(conn, ~p"/api/test/error", %{type: "success"})

      assert json_response(conn, 200) == %{
               "message" => "Success"
             }
    end
  end

  describe "error response structure validation" do
    test "all error responses have required fields", %{conn: conn} do
      error_types = [
        "changeset",
        "api_error",
        "unauthorized",
        "forbidden",
        "not_found",
        "bad_request",
        "unprocessable_entity",
        "atom_error",
        "string_error",
        "conflict"
      ]

      for error_type <- error_types do
        conn = get(build_conn(), ~p"/api/test/error", %{type: error_type})
        response = json_response(conn, conn.status)

        assert Map.has_key?(response, "error"),
               "Error type '#{error_type}' missing 'error' key"

        error = response["error"]

        assert Map.has_key?(error, "code"),
               "Error type '#{error_type}' missing 'code' field"

        assert Map.has_key?(error, "message"),
               "Error type '#{error_type}' missing 'message' field"

        assert Map.has_key?(error, "details"),
               "Error type '#{error_type}' missing 'details' field"

        assert is_binary(error["code"]),
               "Error type '#{error_type}' has non-string code"

        assert is_binary(error["message"]),
               "Error type '#{error_type}' has non-string message"

        assert error["details"] == nil or is_map(error["details"]),
               "Error type '#{error_type}' has invalid details (must be null or object)"
      end
    end

    test "error codes are uppercase with underscores", %{conn: conn} do
      conn = get(conn, ~p"/api/test/error", %{type: "not_found"})
      response = json_response(conn, 404)

      assert response["error"]["code"] =~ ~r/^[A-Z_]+$/,
             "Error code should be uppercase with underscores"
    end

    test "validation errors include field-level details", %{conn: conn} do
      conn = get(conn, ~p"/api/test/error", %{type: "validation_with_details"})
      response = json_response(conn, 422)

      assert is_map(response["error"]["details"])
      assert map_size(response["error"]["details"]) > 0

      for {_field, messages} <- response["error"]["details"] do
        assert is_list(messages)
        assert Enum.all?(messages, &is_binary/1)
      end
    end
  end

  describe "HTTP status codes" do
    test "returns 400 for bad request errors", %{conn: conn} do
      conn = get(conn, ~p"/api/test/error", %{type: "bad_request"})
      assert conn.status == 400
    end

    test "returns 401 for unauthorized errors", %{conn: conn} do
      conn = get(conn, ~p"/api/test/error", %{type: "unauthorized"})
      assert conn.status == 401
    end

    test "returns 403 for forbidden errors", %{conn: conn} do
      conn = get(conn, ~p"/api/test/error", %{type: "forbidden"})
      assert conn.status == 403
    end

    test "returns 404 for not found errors", %{conn: conn} do
      conn = get(conn, ~p"/api/test/error", %{type: "not_found"})
      assert conn.status == 404
    end

    test "returns 409 for conflict errors", %{conn: conn} do
      conn = get(conn, ~p"/api/test/error", %{type: "conflict"})
      assert conn.status == 409
    end

    test "returns 422 for validation errors", %{conn: conn} do
      conn = get(conn, ~p"/api/test/error", %{type: "changeset"})
      assert conn.status == 422
    end

    test "returns 422 for unprocessable entity errors", %{conn: conn} do
      conn = get(conn, ~p"/api/test/error", %{type: "unprocessable_entity"})
      assert conn.status == 422
    end

    test "returns 429 for rate limit errors", %{conn: conn} do
      conn = get(conn, ~p"/api/test/error", %{type: "rate_limited"})
      assert conn.status == 429
    end
  end

  describe "HTTP headers" do
    test "unauthorized errors include WWW-Authenticate header", %{conn: conn} do
      conn = get(conn, ~p"/api/test/error", %{type: "unauthorized"})

      assert get_resp_header(conn, "www-authenticate") == ["Bearer"]
    end

    test "rate limited errors include Retry-After header", %{conn: conn} do
      conn = get(conn, ~p"/api/test/error", %{type: "rate_limited", retry_after: "120"})

      assert get_resp_header(conn, "retry-after") == ["120"]
    end

    test "non-auth errors do not include WWW-Authenticate header", %{conn: conn} do
      conn = get(conn, ~p"/api/test/error", %{type: "not_found"})

      assert get_resp_header(conn, "www-authenticate") == []
    end

    test "non-rate-limited errors do not include Retry-After header", %{conn: conn} do
      conn = get(conn, ~p"/api/test/error", %{type: "forbidden"})

      assert get_resp_header(conn, "retry-after") == []
    end
  end
end
