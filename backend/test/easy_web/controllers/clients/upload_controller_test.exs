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
        "purpose" => "check_in_photo",
        "content_type" => "image/png",
        "byte_size" => 2_048
      })

    assert %{"data" => data} = json_response(conn, 201)
    assert data["content_type"] == "image/png"
    assert data["byte_size"] == 2_048
    assert data["purpose"] == "check_in_photo"
    assert data["upload_url"] =~ "storage.example.test/easy-test/"
    assert data["upload_url_expires_at"]
    assert data["upload_headers"] == %{"Content-Type" => "image/png"}
    assert Easy.Repo.get!(Easy.Attachments.Attachment, data["id"]).client_id == client.id
    assert_schema(data, "ClientUpload", EasyWeb.ApiSpec.spec())
  end

  test "rejects invalid metadata", %{conn: conn} do
    conn =
      post(conn, "/v1/client/uploads", %{
        "purpose" => "check_in_photo",
        "content_type" => "image/gif",
        "byte_size" => 2_048
      })

    assert json_response(conn, 422)
  end

  test "requires client auth" do
    conn = build_conn() |> post("/v1/client/uploads", %{})
    assert json_response(conn, 403)
  end
end
