defmodule Easy.LibraryMedia do
  alias Easy.Coaches
  alias Easy.Ctx
  alias Easy.LibraryMedia.Media
  alias Easy.Repo
  alias Easy.Storage

  @cache_control "public, max-age=31536000, immutable"

  @type public_media :: %{
          id: String.t(),
          kind: :image | :video | nil,
          content_type: String.t() | nil,
          byte_size: non_neg_integer() | nil,
          url: String.t() | nil
        }

  @type upload_result ::
          {:ok,
           %{
             media: Media.t(),
             upload_url: String.t(),
             upload_url_expires_at: DateTime.t(),
             upload_headers: %{String.t() => String.t()},
             public_url: String.t()
           }}
          | {:error, :not_found | :storage_unavailable | Ecto.Changeset.t()}

  @spec create_upload(Ctx.t(), map()) :: upload_result()
  def create_upload(%Ctx{} = ctx, attrs) do
    with {:ok, coach} <- Coaches.get_membership(ctx) do
      Repo.transact(fn -> insert_and_sign_upload(ctx.business_id, coach.id, attrs) end)
    end
  end

  @spec authorize_attach(Ctx.t(), String.t() | nil) :: :ok | {:error, :not_found}
  def authorize_attach(%Ctx{}, nil), do: :ok

  def authorize_attach(%Ctx{} = ctx, media_id) do
    Media
    |> Media.attachable(ctx.business_id)
    |> Repo.get(media_id)
    |> case do
      nil -> {:error, :not_found}
      _media -> :ok
    end
  end

  @spec public_representation(Media.t() | nil) :: public_media() | nil
  def public_representation(nil), do: nil

  def public_representation(%Media{} = media) do
    %{
      id: media.id,
      kind: if(media.external_url, do: :image, else: Media.kind(media.content_type)),
      content_type: media.content_type,
      byte_size: media.byte_size,
      url: media.external_url || public_url(media.storage_key)
    }
  end

  defp insert_and_sign_upload(business_id, coach_id, attrs) do
    id = Ecto.UUID.generate()
    changeset = Media.insert_changeset(business_id, :coach, coach_id, id, attrs)

    with {:ok, media} <- Repo.insert(changeset),
         {:ok, signed} <- Storage.presign_put(media.storage_key, store: :public),
         {:ok, public_url} <- Storage.public_url(media.storage_key) do
      {:ok,
       %{
         media: media,
         upload_url: signed.url,
         upload_url_expires_at: signed.expires_at,
         upload_headers: %{"Content-Type" => media.content_type, "Cache-Control" => @cache_control},
         public_url: public_url
       }}
    end
  end

  defp public_url(storage_key) do
    case Storage.public_url(storage_key) do
      {:ok, url} -> url
      {:error, _reason} -> nil
    end
  end
end
