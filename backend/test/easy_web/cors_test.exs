defmodule EasyWeb.CorsTest do
  use Easy.ConnCase, async: true

  test "client nutrition saves allow authenticated PATCH requests", %{conn: conn} do
    conn =
      conn
      |> put_req_header("origin", "http://localhost:1314")
      |> put_req_header("access-control-request-method", "PATCH")
      |> put_req_header("access-control-request-headers", "authorization,content-type")
      |> options("/v1/client/nutrition-days/2026-08-21")

    assert response(conn, 204)

    allowed_headers =
      conn
      |> get_resp_header("access-control-allow-headers")
      |> List.first()
      |> String.downcase()
      |> String.split(",")

    assert "authorization" in allowed_headers
    assert "content-type" in allowed_headers
    refute "idempotency-key" in allowed_headers
  end
end
