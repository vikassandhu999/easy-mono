defmodule Easy.Attachments do
  alias Easy.Attachments.Attachment
  alias Easy.ClientAccess
  alias Easy.Coaches
  alias Easy.Ctx
  alias Easy.Repo
  alias Easy.Result
  alias Easy.Storage

  @type upload_result ::
          {:ok,
           %{
             attachment: Attachment.t(),
             upload_url: String.t(),
             upload_url_expires_at: DateTime.t(),
             upload_headers: %{String.t() => String.t()}
           }}
          | {:error, :not_found | :storage_unavailable | Ecto.Changeset.t()}

  @spec create_upload_for_client(Ctx.t(), String.t(), map()) :: upload_result()
  def create_upload_for_client(%Ctx{} = ctx, client_id, attrs) do
    with :ok <- ClientAccess.authorize_client_id(ctx, client_id),
         {:ok, coach} <- Coaches.get_membership(ctx) do
      create_upload_transaction(ctx.business_id, client_id, :coach, coach.id, attrs)
    end
  end

  @spec create_client_upload(Ctx.t(), map()) :: upload_result()
  def create_client_upload(%Ctx{} = ctx, attrs) do
    with {:ok, client_id} <- Ctx.fetch_client_id(ctx) do
      create_upload_transaction(ctx.business_id, client_id, :client, client_id, attrs)
    end
  end

  @type download :: %{
          id: String.t(),
          download_url: String.t(),
          download_url_expires_at: DateTime.t()
        }
  @type downloads_result ::
          {:ok, [download()]} | {:error, :invalid_attachments | :not_found | :storage_unavailable}

  @spec get_downloads(Ctx.t(), [String.t()]) :: downloads_result()
  def get_downloads(%Ctx{} = ctx, ids) do
    download_attachments(ctx, ids, &authorize_coach_attachments/2)
  end

  @spec get_client_downloads(Ctx.t(), [String.t()]) :: downloads_result()
  def get_client_downloads(%Ctx{} = ctx, ids) do
    download_attachments(ctx, ids, &authorize_client_attachments/2)
  end

  defp download_attachments(ctx, ids, authorize) do
    with {:ok, ids} <- Attachment.download_ids(ids),
         attachments <- load_ordered_attachments(ctx.business_id, ids),
         :ok <- require_complete_set(attachments, ids),
         :ok <- authorize.(ctx, attachments) do
      sign_downloads(attachments)
    end
  end

  defp create_upload_transaction(business_id, client_id, actor_type, actor_id, attrs) do
    Repo.transact(fn -> insert_and_sign_upload(business_id, client_id, actor_type, actor_id, attrs) end)
  end

  defp insert_and_sign_upload(business_id, client_id, actor_type, actor_id, attrs) do
    id = Ecto.UUID.generate()
    changeset = Attachment.insert_changeset(business_id, actor_type, actor_id, client_id, id, attrs)

    with {:ok, attachment} <- Repo.insert(changeset),
         {:ok, signed} <- Storage.presign_put(attachment.storage_key) do
      {:ok,
       %{
         attachment: attachment,
         upload_url: signed.url,
         upload_url_expires_at: signed.expires_at,
         upload_headers: %{"Content-Type" => attachment.content_type}
       }}
    end
  end

  defp load_ordered_attachments(business_id, ids) do
    attachments_by_id =
      Attachment
      |> Attachment.for_business(business_id)
      |> Attachment.for_ids(ids)
      |> Repo.all()
      |> Map.new(&{&1.id, &1})

    Enum.flat_map(ids, &List.wrap(Map.get(attachments_by_id, &1)))
  end

  defp require_complete_set(attachments, ids) do
    if length(attachments) == length(ids), do: :ok, else: {:error, :not_found}
  end

  defp authorize_coach_attachments(%Ctx{owner?: true}, _attachments), do: :ok

  defp authorize_coach_attachments(%Ctx{coach_id: coach_id} = ctx, attachments)
       when not is_nil(coach_id) do
    client_ids = Enum.map(attachments, & &1.client_id)
    ClientAccess.authorize_client_ids(ctx, client_ids)
  end

  defp authorize_coach_attachments(%Ctx{}, _attachments), do: {:error, :not_found}

  defp authorize_client_attachments(%Ctx{} = ctx, attachments) do
    with {:ok, client_id} <- Ctx.fetch_client_id(ctx),
         true <- Enum.all?(attachments, &(&1.client_id == client_id)) do
      :ok
    else
      _ -> {:error, :not_found}
    end
  end

  defp sign_downloads(attachments) do
    Result.traverse(attachments, fn attachment ->
      case Storage.presign_get(attachment.storage_key) do
        {:ok, signed} ->
          {:ok,
           %{
             id: attachment.id,
             download_url: signed.url,
             download_url_expires_at: signed.expires_at
           }}

        {:error, _reason} ->
          {:error, :storage_unavailable}
      end
    end)
  end
end
