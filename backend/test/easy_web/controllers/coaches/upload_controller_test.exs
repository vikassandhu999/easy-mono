defmodule EasyWeb.Coaches.UploadControllerTest do
  use Easy.ConnCase

  import OpenApiSpex.TestAssertions

  setup do
    owner_user = insert(:user)
    business = insert(:business, owner: owner_user)
    owner = insert(:coach, business: business, user: owner_user)
    trainer = insert(:coach, business: business)
    owner_client = insert(:client, business: business, creator: owner, assigned_coach: owner)
    trainer_client = insert(:client, business: business, creator: owner, assigned_coach: trainer)

    %{
      owner_conn:
        build_conn()
        |> authenticate_coach(owner)
        |> put_req_header("content-type", "application/json"),
      trainer_conn:
        build_conn()
        |> authenticate_coach(trainer)
        |> put_req_header("content-type", "application/json"),
      owner_client: owner_client,
      trainer_client: trainer_client
    }
  end

  test "POST /v1/coach/clients/:client_id/uploads lets the owner create an upload", %{
    owner_conn: conn,
    trainer_client: client
  } do
    conn =
      post(conn, "/v1/coach/clients/#{client.id}/uploads", %{
        "content_type" => "video/mp4",
        "byte_size" => 2_048,
        "duration_ms" => 30_000
      })

    assert %{"data" => data} = json_response(conn, 201)
    assert data["content_type"] == "video/mp4"
    assert data["byte_size"] == 2_048
    assert data["duration_ms"] == 30_000
    refute Map.has_key?(data, "purpose")
    assert_schema(data, "AttachmentUpload", EasyWeb.ApiSpec.spec())
  end

  test "POST /v1/coach/clients/:client_id/uploads lets an assigned trainer create an upload", %{
    trainer_conn: conn,
    trainer_client: client
  } do
    conn =
      post(conn, "/v1/coach/clients/#{client.id}/uploads", %{
        "content_type" => "image/png",
        "byte_size" => 2_048
      })

    assert %{"data" => %{"content_type" => "image/png", "duration_ms" => nil}} =
             json_response(conn, 201)
  end

  test "POST /v1/coach/clients/:client_id/uploads rejects an unassigned trainer", %{
    trainer_conn: conn,
    owner_client: client
  } do
    conn =
      post(conn, "/v1/coach/clients/#{client.id}/uploads", %{
        "content_type" => "image/png",
        "byte_size" => 2_048
      })

    assert json_response(conn, 404)
  end

  test "POST /v1/coach/attachments/download-urls returns URLs in request order", %{
    owner_conn: conn,
    trainer_client: client
  } do
    first = insert(:attachment, business: client.business, client: client)
    second = insert(:attachment, business: client.business, client: client)

    conn =
      post(conn, "/v1/coach/attachments/download-urls", %{
        "attachment_ids" => [second.id, first.id]
      })

    assert %{"data" => [second_download, first_download]} = json_response(conn, 200)
    assert second_download["id"] == second.id
    assert first_download["id"] == first.id
    assert second_download["download_url"] =~ "storage.example.test/easy-test/"
    assert second_download["download_url_expires_at"]
    refute Map.has_key?(second_download, "storage_key")
    assert_schema(second_download, "AttachmentDownload", EasyWeb.ApiSpec.spec())
  end
end
