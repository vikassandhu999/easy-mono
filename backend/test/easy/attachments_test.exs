defmodule Easy.AttachmentsTest do
  use Easy.DataCase, async: false

  alias Easy.Attachments
  alias Easy.Attachments.Attachment
  alias Easy.Ctx

  test "creates tenant-scoped client upload metadata and a signed URL" do
    client = insert_client()

    assert {:ok, upload} =
             Attachments.create_client_upload(client_ctx(client), %{
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

  test "creates an upload for a client visible to the trainer" do
    trainer = insert(:coach)
    client = insert(:client, business: trainer.business, creator: trainer, assigned_coach: trainer)

    assert {:ok, upload} =
             Attachments.create_upload_for_client(trainer_ctx(trainer), client.id, %{
               "content_type" => "video/mp4",
               "byte_size" => 1_024,
               "duration_ms" => 30_000
             })

    assert upload.attachment.client_id == client.id
    assert upload.attachment.uploaded_by_type == :coach
    assert upload.attachment.uploaded_by_id == trainer.id
    assert upload.attachment.storage_key =~ "/attachments/#{upload.attachment.id}.mp4"
  end

  test "accepts generic media metadata without a purpose" do
    client = insert_client()

    assert {:ok, upload} =
             Attachments.create_client_upload(client_ctx(client), %{
               "content_type" => "audio/webm",
               "byte_size" => 1_024,
               "duration_ms" => 30_000
             })

    assert upload.attachment.duration_ms == 30_000
    refute Map.has_key?(Map.from_struct(upload.attachment), :purpose)
  end

  test "validates content type and byte size" do
    client = insert_client()

    for attrs <- [
          %{"content_type" => "image/gif", "byte_size" => 100},
          %{"content_type" => "image/png", "byte_size" => 0},
          %{"content_type" => "image/png", "byte_size" => 15 * 1024 * 1024 + 1}
        ] do
      assert {:error, %Ecto.Changeset{}} = Attachments.create_client_upload(client_ctx(client), attrs)
    end
  end

  test "enforces audio and video byte-size boundaries" do
    audio_max = 10 * 1024 * 1024
    video_max = 50 * 1024 * 1024

    for content_type <- ~w(audio/webm audio/mp4 audio/mpeg) do
      assert attachment_changeset(content_type, audio_max, 1).valid?
      refute attachment_changeset(content_type, audio_max + 1, 1).valid?
    end

    for content_type <- ~w(video/mp4 video/webm video/quicktime) do
      assert attachment_changeset(content_type, video_max, 300_000).valid?
      refute attachment_changeset(content_type, video_max + 1, 300_000).valid?
    end
  end

  test "enforces duration boundaries" do
    assert attachment_changeset("audio/mpeg", 1, 1).valid?
    assert attachment_changeset("audio/mp4", 1, 300_000).valid?
    refute attachment_changeset("audio/mpeg", 1, 0).valid?
    refute attachment_changeset("audio/mp4", 1, 300_001).valid?
  end

  test "for_ids no-ops for absent filters" do
    assert Attachment.for_ids(nil) == Attachment
    assert Attachment.for_ids("") == Attachment
  end

  test "rolls back metadata when storage signing is unavailable" do
    client = insert_client()
    previous = Application.get_env(:easy, Easy.Storage)
    Application.delete_env(:easy, Easy.Storage)

    on_exit(fn -> Application.put_env(:easy, Easy.Storage, previous) end)

    assert {:error, :storage_unavailable} =
             Attachments.create_client_upload(client_ctx(client), %{
               "content_type" => "image/webp",
               "byte_size" => 100
             })

    refute Easy.Repo.exists?(Attachment)
  end

  test "returns not found without a client membership" do
    business = insert(:business)

    assert {:error, :not_found} =
             Attachments.create_client_upload(Ctx.new(business.id, insert(:user).id), %{
               "content_type" => "image/png",
               "byte_size" => 100
             })
  end

  test "returns downloads to the client in request order" do
    client = insert_client()
    first = insert_attachment(client)
    second = insert_attachment(client)
    signing_started_at = DateTime.utc_now(:second)

    assert {:ok, downloads} = Attachments.get_client_downloads(client_ctx(client), [second.id, first.id])
    signing_finished_at = DateTime.utc_now(:second)

    assert Enum.map(downloads, & &1.id) == [second.id, first.id]
    assert Enum.all?(downloads, &(&1.download_url =~ "storage.example.test/easy-test/"))

    assert Enum.all?(downloads, fn download ->
             DateTime.compare(download.download_url_expires_at, DateTime.add(signing_started_at, 600)) != :lt and
               DateTime.compare(download.download_url_expires_at, DateTime.add(signing_finished_at, 600)) != :gt
           end)
  end

  test "returns downloads to the business owner" do
    business = insert(:business)
    owner = insert(:coach, business: business, user: business.owner)
    client = insert(:client, business: business, creator: owner)
    attachment = insert_attachment(client)

    assert {:ok, [%{id: id}]} = Attachments.get_downloads(owner_ctx(business), [attachment.id])
    assert id == attachment.id
  end

  test "returns downloads to the assigned trainer" do
    trainer = insert(:coach)
    client = insert(:client, business: trainer.business, creator: trainer, assigned_coach: trainer)
    attachment = insert_attachment(client)

    assert {:ok, [%{id: id}]} = Attachments.get_downloads(trainer_ctx(trainer), [attachment.id])
    assert id == attachment.id
  end

  test "hides downloads from an unassigned trainer" do
    trainer = insert(:coach)
    assigned = insert(:coach, business: trainer.business)
    client = insert(:client, business: trainer.business, creator: assigned, assigned_coach: assigned)
    attachment = insert_attachment(client)

    assert {:error, :not_found} = Attachments.get_downloads(trainer_ctx(trainer), [attachment.id])
  end

  test "hides cross-tenant attachments" do
    client = insert_client()
    other_client = insert_client()
    attachment = insert_attachment(other_client)

    assert {:error, :not_found} = Attachments.get_client_downloads(client_ctx(client), [attachment.id])
  end

  test "fails closed when the actor has no coach or client membership" do
    client = insert_client()
    attachment = insert_attachment(client)
    ctx = Ctx.new(client.business_id, insert(:user).id)

    assert {:error, :not_found} = Attachments.get_downloads(ctx, [attachment.id])
    assert {:error, :not_found} = Attachments.get_client_downloads(ctx, [attachment.id])
  end

  test "rejects invalid download id lists" do
    client = insert_client()
    attachment = insert_attachment(client)

    assert {:error, :invalid_attachments} = Attachments.get_client_downloads(client_ctx(client), [])

    assert {:error, :invalid_attachments} =
             Attachments.get_client_downloads(client_ctx(client), [attachment.id, attachment.id])

    assert {:error, :invalid_attachments} =
             Attachments.get_client_downloads(
               client_ctx(client),
               Enum.map(1..51, fn _index -> Ecto.UUID.generate() end)
             )
  end

  test "returns not found when any requested attachment is missing" do
    client = insert_client()
    attachment = insert_attachment(client)

    assert {:error, :not_found} =
             Attachments.get_client_downloads(client_ctx(client), [attachment.id, Ecto.UUID.generate()])
  end

  test "returns storage unavailable when download signing fails" do
    client = insert_client()
    attachment = insert_attachment(client)
    previous = Application.get_env(:easy, Easy.Storage)
    Application.delete_env(:easy, Easy.Storage)

    on_exit(fn -> Application.put_env(:easy, Easy.Storage, previous) end)

    assert {:error, :storage_unavailable} =
             Attachments.get_client_downloads(client_ctx(client), [attachment.id])
  end

  defp insert_client do
    coach = insert(:coach)
    insert(:client, creator: coach, business: coach.business, user: insert(:user))
  end

  defp client_ctx(client), do: Ctx.new(client.business_id, client.user_id)

  defp insert_attachment(client) do
    insert(:attachment,
      business: client.business,
      client: client,
      uploaded_by_type: :client,
      uploaded_by_id: client.id
    )
  end

  defp attachment_changeset(content_type, byte_size, duration_ms) do
    Attachment.insert_changeset(
      Ecto.UUID.generate(),
      :client,
      Ecto.UUID.generate(),
      Ecto.UUID.generate(),
      Ecto.UUID.generate(),
      %{
        "storage_key" => Ecto.UUID.generate(),
        "content_type" => content_type,
        "byte_size" => byte_size,
        "duration_ms" => duration_ms
      }
    )
  end
end
