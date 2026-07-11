defmodule Easy.AttachmentsTest do
  use Easy.DataCase, async: false

  alias Easy.Attachments
  alias Easy.Attachments.Attachment
  alias Easy.Ctx

  test "creates tenant-scoped client upload metadata and a signed URL" do
    client = insert_client()

    assert {:ok, upload} =
             Attachments.create_client_upload(client_ctx(client), %{
               "purpose" => "check_in_photo",
               "content_type" => "image/jpeg",
               "byte_size" => 1_024
             })

    assert upload.attachment.business_id == client.business_id
    assert upload.attachment.client_id == client.id
    assert upload.attachment.uploaded_by_type == :client
    assert upload.attachment.uploaded_by_id == client.id
    assert upload.attachment.storage_key =~ "/#{upload.attachment.id}.jpg"
    refute upload.upload_url =~ client.email
    assert upload.upload_url =~ "storage.example.test/easy-test/"
    assert upload.upload_headers == %{"Content-Type" => "image/jpeg"}
  end

  test "validates content type and byte size" do
    client = insert_client()

    for attrs <- [
          %{"purpose" => "check_in_photo", "content_type" => "image/gif", "byte_size" => 100},
          %{"purpose" => "check_in_photo", "content_type" => "image/png", "byte_size" => 0},
          %{"purpose" => "check_in_photo", "content_type" => "image/png", "byte_size" => 15 * 1024 * 1024 + 1}
        ] do
      assert {:error, %Ecto.Changeset{}} = Attachments.create_client_upload(client_ctx(client), attrs)
    end
  end

  test "rolls back metadata when storage signing is unavailable" do
    client = insert_client()
    previous = Application.get_env(:easy, Easy.Storage)
    Application.delete_env(:easy, Easy.Storage)

    on_exit(fn -> Application.put_env(:easy, Easy.Storage, previous) end)

    assert {:error, :storage_unavailable} =
             Attachments.create_client_upload(client_ctx(client), %{
               "purpose" => "check_in_photo",
               "content_type" => "image/webp",
               "byte_size" => 100
             })

    refute Easy.Repo.exists?(Attachment)
  end

  test "returns not found without a client membership" do
    business = insert(:business)

    assert {:error, :not_found} =
             Attachments.create_client_upload(Ctx.new(business.id, insert(:user).id), %{
               "purpose" => "check_in_photo",
               "content_type" => "image/png",
               "byte_size" => 100
             })
  end

  defp insert_client do
    coach = insert(:coach)
    insert(:client, creator: coach, business: coach.business, user: insert(:user))
  end

  defp client_ctx(client), do: Ctx.new(client.business_id, client.user_id)
end
