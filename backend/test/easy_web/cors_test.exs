defmodule EasyWeb.CorsTest do
  use Easy.ConnCase, async: true

  test "client Diary writes allow the Idempotency-Key header", %{conn: conn} do
    conn =
      conn
      |> put_req_header("origin", "http://localhost:1314")
      |> put_req_header("access-control-request-method", "POST")
      |> put_req_header(
        "access-control-request-headers",
        "authorization,content-type,idempotency-key"
      )
      |> options("/v1/client/nutrition-days/2026-08-21/extras")

    assert response(conn, 204)

    allowed_headers =
      conn
      |> get_resp_header("access-control-allow-headers")
      |> List.first()
      |> String.downcase()
      |> String.split(",")

    assert "idempotency-key" in allowed_headers
  end
end
