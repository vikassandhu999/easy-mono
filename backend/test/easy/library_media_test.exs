defmodule Easy.LibraryMediaTest do
  use Easy.DataCase, async: false

  alias Easy.LibraryMedia

  describe "create_upload/2" do
    test "creates a business-scoped row and a signed PUT against the public bucket" do
      coach = insert(:coach)

      assert {:ok, upload} =
               LibraryMedia.create_upload(trainer_ctx(coach), %{
                 "content_type" => "image/jpeg",
                 "byte_size" => 1_024
               })

      assert upload.media.business_id == coach.business_id
      assert upload.media.uploaded_by_type == :coach
      assert upload.media.uploaded_by_id == coach.id
      assert upload.media.storage_key =~ "businesses/#{coach.business_id}/library-media/#{upload.media.id}.jpg"
      assert upload.upload_url =~ "storage.example.test/easy-test-public/"
      assert upload.public_url == "https://easy-test-public.storage.example.test/#{upload.media.storage_key}"
      assert upload.upload_headers["Content-Type"] == "image/jpeg"
      assert upload.upload_headers["Cache-Control"] =~ "immutable"
    end

    test "validates content type and byte size at the trust boundary" do
      coach = insert(:coach)

      for attrs <- [
            %{"content_type" => "image/gif", "byte_size" => 100},
            %{"content_type" => "audio/mpeg", "byte_size" => 100},
            %{"content_type" => "image/png", "byte_size" => 0},
            %{"content_type" => "image/png", "byte_size" => 15 * 1024 * 1024 + 1},
            %{"content_type" => "video/mp4", "byte_size" => 50 * 1024 * 1024 + 1}
          ] do
        assert {:error, %Ecto.Changeset{}} = LibraryMedia.create_upload(trainer_ctx(coach), attrs)
      end
    end
  end

  describe "fetch_attachable/2 and authorize_attach/2" do
    test "returns same-business media" do
      coach = insert(:coach)
      media = insert(:library_media, business: coach.business)

      assert {:ok, found} = LibraryMedia.fetch_attachable(trainer_ctx(coach), media.id)
      assert found.id == media.id
      assert :ok = LibraryMedia.authorize_attach(trainer_ctx(coach), media.id)
    end

    test "rejects cross-business and unknown media as not found" do
      coach = insert(:coach)
      other_media = insert(:library_media)

      assert {:error, :not_found} = LibraryMedia.fetch_attachable(trainer_ctx(coach), other_media.id)
      assert {:error, :not_found} = LibraryMedia.authorize_attach(trainer_ctx(coach), other_media.id)
      assert {:error, :not_found} = LibraryMedia.fetch_attachable(trainer_ctx(coach), Ecto.UUID.generate())
    end

    test "treats a nil id as nothing to attach" do
      coach = insert(:coach)
      assert :ok = LibraryMedia.authorize_attach(trainer_ctx(coach), nil)
    end
  end

  describe "public_representation/1" do
    test "derives kind and public url; nil passes through" do
      media = insert(:library_media, content_type: "video/mp4")

      assert %{
               id: id,
               kind: :video,
               content_type: "video/mp4",
               byte_size: 1_024,
               url: url
             } = LibraryMedia.public_representation(media)

      assert id == media.id
      assert url == "https://easy-test-public.storage.example.test/#{media.storage_key}"
      assert LibraryMedia.public_representation(nil) == nil
    end
  end
end
