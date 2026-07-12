defmodule Easy.Attachments do
  alias Easy.Attachments.Attachment
  alias Easy.Clients
  alias Easy.Clients.Client
  alias Easy.Ctx
  alias Easy.Orgs.Coach
  alias Easy.Repo
  alias Easy.Storage

  import Ecto.Query

  @type upload_result ::
          {:ok,
           %{
             attachment: Attachment.t(),
             upload_url: String.t(),
             upload_url_expires_at: DateTime.t(),
             upload_headers: map()
           }}
          | {:error, :not_found | :storage_unavailable | Ecto.Changeset.t()}

  @spec create_upload_for_client(Ctx.t(), String.t(), map()) :: upload_result()
  def create_upload_for_client(%Ctx{} = ctx, client_id, attrs) do
    with :ok <- Clients.authorize_client_id(ctx, client_id),
         {:ok, coach} <- get_coach(ctx) do
      create_upload_transaction(ctx.business_id, client_id, :coach, coach.id, attrs)
    end
  end

  @spec create_client_upload(Ctx.t(), map()) :: upload_result()
  def create_client_upload(%Ctx{} = ctx, attrs) do
    with {:ok, client} <- get_client(ctx) do
      create_upload_transaction(ctx.business_id, client.id, :client, client.id, attrs)
    end
  end

  @spec get_downloads(Ctx.t(), [String.t()]) ::
          {:ok, [map()]} | {:error, :invalid_attachments | :not_found | :storage_unavailable}
  def get_downloads(%Ctx{} = ctx, ids) do
    with :ok <- validate_download_ids(ids),
         attachments <- load_ordered_attachments(ctx.business_id, ids),
         :ok <- require_complete_set(attachments, ids),
         :ok <- authorize_attachments(ctx, attachments) do
      sign_downloads(attachments)
    end
  end

  defp create_upload_transaction(business_id, client_id, actor_type, actor_id, attrs) do
    case Repo.transaction(fn ->
           insert_and_sign_upload(business_id, client_id, actor_type, actor_id, attrs)
         end) do
      {:ok, upload} -> {:ok, upload}
      {:error, reason} -> {:error, reason}
    end
  end

  defp insert_and_sign_upload(business_id, client_id, actor_type, actor_id, attrs) do
    attrs = Map.new(attrs, fn {key, value} -> {to_string(key), value} end)
    id = Ecto.UUID.generate()
    storage_key = storage_key(business_id, client_id, id, attrs["content_type"])
    attachment_attrs = Map.put(attrs, "storage_key", storage_key)

    attachment =
      case Attachment.insert_changeset(
             business_id,
             client_id,
             id,
             actor_type,
             actor_id,
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

  defp validate_download_ids(ids)
       when is_list(ids) and ids != [] and length(ids) <= 50 do
    valid_ids? = Enum.all?(ids, &(is_binary(&1) and match?({:ok, _}, Ecto.UUID.cast(&1))))
    unique_ids? = MapSet.size(MapSet.new(ids)) == length(ids)

    if valid_ids? and unique_ids?, do: :ok, else: {:error, :invalid_attachments}
  end

  defp validate_download_ids(_ids), do: {:error, :invalid_attachments}

  defp load_ordered_attachments(business_id, ids) do
    attachments_by_id =
      Attachment
      |> Attachment.for_business(business_id)
      |> Attachment.with_ids(ids)
      |> Repo.all()
      |> Map.new(&{&1.id, &1})

    Enum.flat_map(ids, &List.wrap(Map.get(attachments_by_id, &1)))
  end

  defp require_complete_set(attachments, ids) do
    if length(attachments) == length(ids), do: :ok, else: {:error, :not_found}
  end

  defp authorize_attachments(%Ctx{owner?: true}, _attachments), do: :ok

  defp authorize_attachments(%Ctx{coach_id: coach_id} = ctx, attachments)
       when not is_nil(coach_id) do
    client_ids = attachments |> Enum.map(& &1.client_id) |> Enum.uniq()

    visible_client_ids =
      Client
      |> Client.for_business(ctx.business_id)
      |> Client.visible_to(ctx)
      |> where([client], client.id in ^client_ids)
      |> select([client], client.id)
      |> Repo.all()

    if MapSet.equal?(MapSet.new(client_ids), MapSet.new(visible_client_ids)),
      do: :ok,
      else: {:error, :not_found}
  end

  defp authorize_attachments(%Ctx{} = ctx, attachments) do
    with {:ok, client} <- get_client(ctx),
         true <- Enum.all?(attachments, &(&1.client_id == client.id)) do
      :ok
    else
      _ -> {:error, :not_found}
    end
  end

  defp sign_downloads(attachments) do
    Enum.reduce_while(attachments, {:ok, []}, fn attachment, {:ok, downloads} ->
      case Storage.presign_get(attachment.storage_key) do
        {:ok, signed} ->
          download = %{
            id: attachment.id,
            download_url: signed.url,
            download_url_expires_at: signed.expires_at
          }

          {:cont, {:ok, [download | downloads]}}

        {:error, _reason} ->
          {:halt, {:error, :storage_unavailable}}
      end
    end)
    |> case do
      {:ok, downloads} -> {:ok, Enum.reverse(downloads)}
      error -> error
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

  defp storage_key(business_id, client_id, attachment_id, content_type) do
    extension = Map.get(extension_by_content_type(), content_type, "bin")

    "businesses/#{business_id}/clients/#{client_id}/attachments/#{attachment_id}.#{extension}"
  end

  defp extension_by_content_type do
    %{
      "image/jpeg" => "jpg",
      "image/png" => "png",
      "image/webp" => "webp",
      "image/heic" => "heic",
      "video/mp4" => "mp4",
      "video/webm" => "webm",
      "video/quicktime" => "mov",
      "audio/webm" => "webm",
      "audio/mp4" => "m4a",
      "audio/mpeg" => "mp3"
    }
  end
end
