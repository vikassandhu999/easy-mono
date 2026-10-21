defmodule Easy.LibraryMediaTest do
  use Easy.DataCase, async: false

  alias Easy.Ctx
  alias Easy.LibraryMedia
  alias Easy.LibraryMedia.Media

  describe "create_upload/2" do
    test "rejects absent and cross-business coach membership without inserting media" do
      coach = insert(:coach)
      other_business = insert(:business)

      contexts = [
        Ctx.new(coach.business_id, insert(:user).id),
        %{trainer_ctx(coach) | business_id: other_business.id}
      ]

      for ctx <- contexts do
        assert {:error, :not_found} =
                 LibraryMedia.create_upload(ctx, %{content_type: "image/jpeg", byte_size: 1_024})
      end

      refute Repo.exists?(Media)
    end

    test "the schema derives storage keys from trusted identities" do
      business_id = Ecto.UUID.generate()
      id = Ecto.UUID.generate()

      changeset =
        Media.insert_changeset(business_id, :coach, Ecto.UUID.generate(), id, %{
          storage_key: "outside/tenant.jpg",
          business_id: Ecto.UUID.generate(),
          id: Ecto.UUID.generate(),
          content_type: :"image/jpeg",
          byte_size: 1024
        })

      assert changeset.valid?
      assert Ecto.Changeset.get_field(changeset, :storage_key) == "businesses/#{business_id}/library-media/#{id}.jpg"
    end

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
            %{"content_type" => %{}, "byte_size" => 100},
            %{"content_type" => [], "byte_size" => 100},
            %{"content_type" => "image/png", "byte_size" => 0},
            %{"content_type" => "image/png", "byte_size" => 15 * 1024 * 1024 + 1},
            %{"content_type" => "video/mp4", "byte_size" => 50 * 1024 * 1024 + 1}
          ] do
        assert {:error, %Ecto.Changeset{}} = LibraryMedia.create_upload(trainer_ctx(coach), attrs)
      end
    end

    test "a missing public storage origin rolls back the media row" do
      config = Application.fetch_env!(:easy, Easy.Storage)
      on_exit(fn -> Application.put_env(:easy, Easy.Storage, config) end)
      Application.put_env(:easy, Easy.Storage, Keyword.delete(config, :public_url))
      coach = insert(:coach)

      assert {:error, :storage_unavailable} =
               LibraryMedia.create_upload(trainer_ctx(coach), %{content_type: "image/jpeg", byte_size: 1_024})

      refute Repo.exists?(Media.for_business(coach.business_id))
    end
  end

  test "incomplete uploaded media cannot pass the source constraint through SQL NULL" do
    coach = insert(:coach)

    error =
      assert_raise Ecto.ConstraintError, fn ->
        Repo.insert!(%Media{
          id: Ecto.UUID.generate(),
          business_id: coach.business_id,
          uploaded_by_type: :coach,
          storage_key: "missing-size.jpg",
          content_type: "image/jpeg"
        })
      end

    assert error.constraint == "library_media_source_check"
  end

  describe "authorize_attach/2" do
    test "returns same-business media" do
      coach = insert(:coach)
      media = insert(:library_media, business: coach.business)

      assert :ok = LibraryMedia.authorize_attach(trainer_ctx(coach), media.id)
    end

    test "rejects cross-business and unknown media as not found" do
      coach = insert(:coach)
      other_media = insert(:library_media)

      assert {:error, :not_found} = LibraryMedia.authorize_attach(trainer_ctx(coach), other_media.id)
      assert {:error, :not_found} = LibraryMedia.authorize_attach(trainer_ctx(coach), Ecto.UUID.generate())
    end

    test "treats a nil id as nothing to attach" do
      coach = insert(:coach)
      assert :ok = LibraryMedia.authorize_attach(trainer_ctx(coach), nil)
    end
  end

  describe "public_representation/1" do
    test "unavailable storage omits the uploaded URL while external media remains usable" do
      config = Application.fetch_env!(:easy, Easy.Storage)
      on_exit(fn -> Application.put_env(:easy, Easy.Storage, config) end)
      Application.put_env(:easy, Easy.Storage, Keyword.delete(config, :public_url))
      media = insert(:library_media)

      assert %{id: id, url: nil, content_type: content_type} = LibraryMedia.public_representation(media)
      assert id == media.id
      assert content_type == media.content_type

      external = %Media{id: Ecto.UUID.generate(), external_url: "https://images.example.test/example.jpg"}
      assert %{url: "https://images.example.test/example.jpg"} = LibraryMedia.public_representation(external)
    end

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
