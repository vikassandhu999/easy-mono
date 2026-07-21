defmodule Easy.LibraryMedia do
  alias Easy.Ctx
  alias Easy.LibraryMedia.Media
  alias Easy.Orgs.Coach
  alias Easy.Repo
  alias Easy.Storage

  @cache_control "public, max-age=31536000, immutable"

  @type upload_result ::
          {:ok,
           %{
             media: Media.t(),
             upload_url: String.t(),
             upload_url_expires_at: DateTime.t(),
             upload_headers: map(),
             public_url: String.t()
           }}
          | {:error, :not_found | :storage_unavailable | Ecto.Changeset.t()}

  @spec create_upload(Ctx.t(), map()) :: upload_result()
  def create_upload(%Ctx{} = ctx, attrs) do
    with {:ok, coach} <- get_coach(ctx) do
      # Repo.transaction already returns {:ok, upload} | {:error, reason}.
      Repo.transaction(fn -> insert_and_sign_upload(ctx.business_id, coach.id, attrs) end)
    end
  end

  @spec fetch_attachable(Ctx.t(), String.t()) :: {:ok, Media.t()} | {:error, :not_found}
  def fetch_attachable(%Ctx{} = ctx, media_id) do
    Media
    |> Media.for_business(ctx.business_id)
    |> Repo.get(media_id)
    |> case do
      nil -> {:error, :not_found}
      media -> {:ok, media}
    end
  end

  @spec authorize_attach(Ctx.t(), String.t() | nil) :: :ok | {:error, :not_found}
  def authorize_attach(%Ctx{}, nil), do: :ok

  def authorize_attach(%Ctx{} = ctx, media_id) do
    with {:ok, _media} <- fetch_attachable(ctx, media_id), do: :ok
  end

  @spec public_representation(Media.t() | nil) :: map() | nil
  def public_representation(nil), do: nil

  def public_representation(%Media{} = media) do
    %{
      id: media.id,
      kind: Media.kind(media.content_type),
      content_type: media.content_type,
      byte_size: media.byte_size,
      url: public_url(media.storage_key)
    }
  end

  defp insert_and_sign_upload(business_id, coach_id, attrs) do
    attrs = Map.new(attrs, fn {key, value} -> {to_string(key), value} end)
    id = Ecto.UUID.generate()
    storage_key = storage_key(business_id, id, attrs["content_type"])
    media_attrs = Map.put(attrs, "storage_key", storage_key)

    media =
      case Media.insert_changeset(business_id, :coach, coach_id, id, media_attrs) |> Repo.insert() do
        {:ok, media} -> media
        {:error, changeset} -> Repo.rollback(changeset)
      end

    case Storage.presign_put(media.storage_key, store: :public) do
      {:ok, signed} ->
        %{
          media: media,
          upload_url: signed.url,
          upload_url_expires_at: signed.expires_at,
          upload_headers: %{"Content-Type" => media.content_type, "Cache-Control" => @cache_control},
          public_url: public_url(media.storage_key)
        }

      {:error, reason} ->
        Repo.rollback(reason)
    end
  end

  defp public_url(storage_key) do
    case Storage.public_url(storage_key) do
      {:ok, url} -> url
      {:error, _reason} -> nil
    end
  end

  defp get_coach(%Ctx{} = ctx) do
    Coach
    |> Coach.for_business(ctx.business_id)
    |> Coach.for_user(ctx.user_id)
    |> Repo.one()
    |> case do
      nil -> {:error, :not_found}
      coach -> {:ok, coach}
    end
  end

  defp storage_key(business_id, media_id, content_type) do
    extension = Map.get(extension_by_content_type(), content_type, "bin")

    "businesses/#{business_id}/library-media/#{media_id}.#{extension}"
  end

  defp extension_by_content_type do
    %{
      "image/jpeg" => "jpg",
      "image/png" => "png",
      "image/webp" => "webp",
      "video/mp4" => "mp4",
      "video/webm" => "webm"
    }
  end
end
