defmodule Easy.StorageTest do
  use ExUnit.Case, async: false

  alias Easy.Storage

  @now ~U[2026-07-11 12:00:00Z]

  setup do
    previous = Application.get_env(:easy, Storage)

    Application.put_env(:easy, Storage,
      endpoint: "https://t3.storage.dev",
      region: "auto",
      bucket: "coach-photos",
      access_key_id: "test-access",
      secret_access_key: "test-secret"
    )

    on_exit(fn ->
      if previous,
        do: Application.put_env(:easy, Storage, previous),
        else: Application.delete_env(:easy, Storage)
    end)

    :ok
  end

  test "creates stable, encoded PUT and GET URLs" do
    assert {:ok, put} = Storage.presign_put("clients/a b/ü.jpg", now: @now, expires_in: 900)
    assert {:ok, same_put} = Storage.presign_put("clients/a b/ü.jpg", now: @now, expires_in: 900)
    assert {:ok, get} = Storage.presign_get("clients/a b/ü.jpg", now: @now, expires_in: 600)

    assert put == same_put
    assert put.expires_at == ~U[2026-07-11 12:15:00Z]
    assert get.expires_at == ~U[2026-07-11 12:10:00Z]

    put_uri = URI.parse(put.url)
    get_uri = URI.parse(get.url)

    assert put_uri.host == "t3.storage.dev"
    assert put_uri.path == "/coach-photos/clients/a%20b/%C3%BC.jpg"
    assert put.url =~ "/coach-photos/clients/a%20b/%C3%BC.jpg?"

    put_query = URI.decode_query(put_uri.query)
    get_query = URI.decode_query(get_uri.query)

    assert put_query["X-Amz-Algorithm"] == "AWS4-HMAC-SHA256"
    assert put_query["X-Amz-Credential"] == "test-access/20260711/auto/s3/aws4_request"
    assert put_query["X-Amz-Date"] == "20260711T120000Z"
    assert put_query["X-Amz-Expires"] == "900"
    assert put_query["X-Amz-SignedHeaders"] == "host"
    assert byte_size(put_query["X-Amz-Signature"]) == 64
    refute put_query["X-Amz-Signature"] == get_query["X-Amz-Signature"]
  end

  test "rejects invalid expiry values" do
    assert {:error, :invalid_expiry} = Storage.presign_get("photo.jpg", now: @now, expires_in: 0)
    assert {:error, :invalid_expiry} = Storage.presign_get("photo.jpg", now: @now, expires_in: 604_801)
  end

  test "returns storage unavailable when credentials are missing" do
    Application.put_env(:easy, Storage, endpoint: "https://t3.storage.dev")

    assert {:error, :storage_unavailable} = Storage.presign_put("photo.jpg", now: @now)
  end
end
