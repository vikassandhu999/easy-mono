defmodule Easy.Attachments do
  alias Easy.Attachments.Attachment
  alias Easy.Clients.Client
  alias Easy.Ctx
  alias Easy.Repo
  alias Easy.Storage

  @spec create_client_upload(Ctx.t(), map()) ::
          {:ok,
           %{
             attachment: Attachment.t(),
             upload_url: String.t(),
             upload_url_expires_at: DateTime.t(),
             upload_headers: map()
           }}
          | {:error, :not_found | :storage_unavailable | Ecto.Changeset.t()}
  def create_client_upload(%Ctx{} = ctx, attrs) do
    with {:ok, client} <- get_client(ctx) do
      create_upload_transaction(ctx, client, attrs)
    end
  end

  defp create_upload_transaction(ctx, client, attrs) do
    case Repo.transaction(fn -> insert_and_sign_upload!(ctx, client, attrs) end) do
      {:ok, upload} -> {:ok, upload}
      {:error, reason} -> {:error, reason}
    end
  end

  defp insert_and_sign_upload!(ctx, client, attrs) do
    id = Ecto.UUID.generate()
    storage_key = storage_key(ctx.business_id, client.id, id, attrs["content_type"] || attrs[:content_type])
    attachment_attrs = attrs |> Map.new(fn {key, value} -> {to_string(key), value} end) |> Map.put("storage_key", storage_key)

    attachment =
      case Attachment.insert_changeset(
             ctx.business_id,
             client.id,
             id,
             :client,
             client.id,
             attachment_attrs
           )
           |> Repo.insert() do
        {:ok, attachment} -> attachment
        {:error, changeset} -> Repo.rollback(changeset)
      end

    case Storage.presign_put(attachment.storage_key) do
      {:ok, signed} ->
        %{
          attachment: attachment,
          upload_url: signed.url,
          upload_url_expires_at: signed.expires_at,
          upload_headers: %{"Content-Type" => attachment.content_type}
        }

      {:error, reason} ->
        Repo.rollback(reason)
    end
  end

  defp get_client(%Ctx{} = ctx) do
    Client
    |> Client.for_business(ctx.business_id)
    |> Client.for_user(ctx.user_id)
    |> Repo.one()
    |> case do
      nil -> {:error, :not_found}
      client -> {:ok, client}
    end
  end

  defp storage_key(business_id, client_id, attachment_id, content_type) do
    extension = Map.get(extension_by_content_type(), content_type, "bin")

    "businesses/#{business_id}/clients/#{client_id}/check-in-photos/#{attachment_id}.#{extension}"
  end

  defp extension_by_content_type do
    %{
      "image/jpeg" => "jpg",
      "image/png" => "png",
      "image/webp" => "webp",
      "image/heic" => "heic"
    }
  end
end
