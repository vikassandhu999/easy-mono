defmodule EasyWeb.Clients.UploadControllerTest do
  use Easy.ConnCase

  import OpenApiSpex.TestAssertions

  setup do
    coach = insert(:coach)
    client = insert(:client, creator: coach, business: coach.business, user: insert(:user), status: :active)
    conn = build_conn() |> authenticate_client(client) |> put_req_header("content-type", "application/json")
    %{client: client, conn: conn}
  end

  test "POST /v1/client/uploads creates upload metadata", %{conn: conn, client: client} do
    conn =
      post(conn, "/v1/client/uploads", %{
        "content_type" => "audio/mpeg",
        "byte_size" => 2_048,
        "duration_ms" => 30_000
      })

    assert %{"data" => data} = json_response(conn, 201)
    assert data["content_type"] == "audio/mpeg"
    assert data["byte_size"] == 2_048
    assert data["duration_ms"] == 30_000
    refute Map.has_key?(data, "purpose")
    assert data["upload_url"] =~ "storage.example.test/easy-test/"
    assert data["upload_url_expires_at"]
    assert data["upload_headers"] == %{"Content-Type" => "audio/mpeg"}
    assert Easy.Repo.get!(Easy.Attachments.Attachment, data["id"]).client_id == client.id
    assert_schema(data, "AttachmentUpload", EasyWeb.ApiSpec.spec())
  end

  test "rejects invalid metadata", %{conn: conn} do
    conn =
      post(conn, "/v1/client/uploads", %{
        "content_type" => "image/gif",
        "byte_size" => 2_048
      })

    assert json_response(conn, 422)
  end

  test "requires client auth" do
    conn = build_conn() |> post("/v1/client/uploads", %{})
    assert json_response(conn, 403)
  end

  test "POST /v1/client/attachments/download-urls returns URLs in request order", %{
    conn: conn,
    client: client
  } do
    first = insert(:attachment, business: client.business, client: client)
    second = insert(:attachment, business: client.business, client: client)

    conn =
      post(conn, "/v1/client/attachments/download-urls", %{
        "attachment_ids" => [second.id, first.id]
      })

    assert %{"data" => [second_download, first_download]} = json_response(conn, 200)
    assert second_download["id"] == second.id
    assert first_download["id"] == first.id
    refute Map.has_key?(second_download, "storage_key")
    assert_schema(second_download, "AttachmentDownload", EasyWeb.ApiSpec.spec())
  end
end
