defmodule EasyWeb.Coaches.LibraryMediaControllerTest do
  use Easy.ConnCase

  setup do
    coach = insert(:coach)

    conn =
      build_conn()
      |> authenticate_coach(coach)
      |> put_req_header("content-type", "application/json")

    %{conn: conn}
  end

  describe "POST /v1/coach/library-media/uploads" do
    test "creates library media upload metadata with the public response shape", %{conn: conn} do
      conn =
        post(conn, "/v1/coach/library-media/uploads", %{
          "content_type" => "image/jpeg",
          "byte_size" => 1_024
        })

      assert %{"data" => data} = json_response(conn, 201)

      assert %{
               "id" => id,
               "kind" => "image",
               "content_type" => "image/jpeg",
               "byte_size" => 1_024,
               "url" => public_url,
               "public_url" => public_url,
               "upload_url" => upload_url,
               "upload_url_expires_at" => upload_url_expires_at,
               "upload_headers" => %{
                 "Content-Type" => "image/jpeg",
                 "Cache-Control" => cache_control
               }
             } = data

      assert is_binary(id)
      assert public_url =~ "easy-test-public.storage.example.test/"
      assert upload_url =~ "storage.example.test/easy-test-public/"
      assert is_binary(upload_url_expires_at)
      assert cache_control =~ "immutable"

      assert Map.keys(data) |> Enum.sort() == [
               "byte_size",
               "content_type",
               "id",
               "kind",
               "public_url",
               "upload_headers",
               "upload_url",
               "upload_url_expires_at",
               "url"
             ]
    end

    test "returns 422 when the body has an extra key", %{conn: conn} do
      conn =
        post(conn, "/v1/coach/library-media/uploads", %{
          "content_type" => "image/jpeg",
          "byte_size" => 1_024,
          "nope" => true
        })

      assert %{"error_code" => "invalid_input"} = json_response(conn, 422)
    end

    test "returns 403 without auth token" do
      conn =
        build_conn()
        |> post("/v1/coach/library-media/uploads", %{
          "content_type" => "image/jpeg",
          "byte_size" => 1_024
        })

      assert json_response(conn, 403)
    end
  end
end
