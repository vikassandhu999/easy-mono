defmodule Easy.Chat.Message do
  use Ecto.Schema

  alias Easy.Attachments.Attachment
  alias Easy.Chat.Conversation
  alias Easy.Chat.MessageAttachment
  alias Easy.Orgs.Business
  alias Easy.Result

  import Ecto.Changeset
  import Ecto.Query

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  @type t :: %__MODULE__{}

  schema "chat_messages" do
    field :body, :string
    field :request_id, :binary_id
    field :request_fingerprint, :string
    field :embed_type, Ecto.Enum, values: [:training_session, :meal]
    field :embed_id, :binary_id
    field :embed_snapshot, :map
    field :sender_type, Ecto.Enum, values: [:coach, :client]
    field :sender_id, :binary_id
    field :sender_name, :string, virtual: true

    belongs_to :conversation, Conversation
    belongs_to :business, Business

    many_to_many :attachments, Attachment,
      join_through: MessageAttachment,
      join_keys: [chat_message_id: :id, attachment_id: :id]

    timestamps(type: :utc_datetime_usec)
  end

  @spec insert_changeset(String.t(), :coach | :client, String.t(), String.t(), map()) ::
          Ecto.Changeset.t()
  def insert_changeset(business_id, sender_type, sender_id, conversation_id, attrs) do
    %__MODULE__{}
    |> cast(attrs, [:body, :request_id])
    |> update_change(:body, &Easy.Utils.trim/1)
    |> put_change(:business_id, business_id)
    |> put_change(:conversation_id, conversation_id)
    |> put_change(:sender_type, sender_type)
    |> put_change(:sender_id, sender_id)
    |> validate_required([:business_id, :conversation_id, :sender_type, :sender_id])
    |> validate_length(:body, max: 4000)
    |> unique_constraint(:request_id, name: :chat_messages_sender_request_index)
    |> check_constraint(:request_id, name: :chat_messages_request_complete_check)
    |> foreign_key_constraint(:business_id)
    |> foreign_key_constraint(:conversation_id)
    |> foreign_key_constraint(:conversation_id, name: :chat_messages_conversation_business_id_fkey)
    |> check_constraint(:sender_type, name: :chat_messages_sender_type_check)
    |> check_constraint(:embed_type, name: :chat_messages_embed_type_check)
    |> check_constraint(:embed_id, name: :chat_messages_embed_complete_check)
  end

  @spec put_request_fingerprint(Ecto.Changeset.t(), [String.t()], map() | nil) :: Ecto.Changeset.t()
  def put_request_fingerprint(changeset, attachment_ids, embed_id) do
    case get_field(changeset, :request_id) do
      nil ->
        changeset

      _request_id ->
        payload = {get_field(changeset, :body), attachment_ids, embed_id}
        fingerprint = :sha256 |> :crypto.hash(:erlang.term_to_binary(payload)) |> Base.encode16(case: :lower)
        put_change(changeset, :request_fingerprint, fingerprint)
    end
  end

  @spec attachment_ids(Ecto.Changeset.t()) :: {:ok, [String.t()]} | {:error, Ecto.Changeset.t()}
  def attachment_ids(changeset) do
    ids = Map.get(changeset.params || %{}, "attachment_ids", [])

    cond do
      not is_list(ids) ->
        {:error, add_error(changeset, :attachment_ids, "is invalid")}

      length(ids) > 4 ->
        {:error, add_error(changeset, :attachment_ids, "should have at most 4 item(s)")}

      true ->
        with {:ok, ids} <- cast_attachment_ids(changeset, ids) do
          validate_unique_attachment_ids(changeset, ids)
        end
    end
  end

  defp validate_unique_attachment_ids(changeset, ids) do
    if length(Enum.uniq(ids)) == length(ids),
      do: {:ok, ids},
      else: {:error, add_error(changeset, :attachment_ids, "must be unique")}
  end

  defp cast_attachment_ids(changeset, ids) do
    Result.traverse(ids, fn id ->
      case Ecto.UUID.cast(id) do
        {:ok, id} -> {:ok, id}
        :error -> {:error, add_error(changeset, :attachment_ids, "is invalid")}
      end
    end)
  end

  @spec put_content(Ecto.Changeset.t(), [Attachment.t()], map() | nil) :: Ecto.Changeset.t()
  def put_content(changeset, [], nil), do: validate_required(changeset, [:body])
  def put_content(changeset, _attachments, embed), do: put_embed(changeset, embed)

  @spec embed_reference(Ecto.Changeset.t()) :: {:ok, map() | nil} | {:error, :not_found | Ecto.Changeset.t()}
  def embed_reference(changeset) do
    embed = normalize_embed(Map.get(changeset.params || %{}, "embed"))

    case {get_field(changeset, :sender_type), embed} do
      {_, nil} ->
        {:ok, nil}

      {_, %{"type" => type, "id" => id} = reference}
      when type in [:training_session, "training_session", :meal, "meal"] and is_binary(id) ->
        case Ecto.UUID.cast(id) do
          {:ok, id} -> {:ok, %{type: to_string(type), id: id, revision: Map.get(reference, "revision")}}
          :error -> {:error, :not_found}
        end

      _ ->
        {:error, add_error(changeset, :embed, "is invalid")}
    end
  end

  defp normalize_embed(embed) when is_map(embed), do: Map.new(embed, fn {key, value} -> {to_string(key), value} end)
  defp normalize_embed(embed), do: embed

  defp put_embed(changeset, nil), do: changeset

  defp put_embed(changeset, embed) when is_map(embed) do
    changeset
    |> put_embed_type(Map.get(embed, :type))
    |> put_embed_id(Map.get(embed, :id))
    |> put_embed_snapshot(Map.get(embed, :snapshot))
    |> validate_required([:embed_type, :embed_id, :embed_snapshot])
  end

  defp put_embed_type(changeset, nil), do: changeset

  defp put_embed_type(changeset, type) do
    case Ecto.Enum.cast_value(__MODULE__, :embed_type, type) do
      {:ok, value} -> put_change(changeset, :embed_type, value)
      :error -> add_error(changeset, :embed_type, "is invalid")
    end
  end

  defp put_embed_id(changeset, nil), do: changeset

  defp put_embed_id(changeset, id) do
    case Ecto.UUID.cast(id) do
      {:ok, value} -> put_change(changeset, :embed_id, value)
      :error -> add_error(changeset, :embed_id, "is invalid")
    end
  end

  defp put_embed_snapshot(changeset, nil), do: changeset
  defp put_embed_snapshot(changeset, snapshot) when is_map(snapshot), do: put_change(changeset, :embed_snapshot, snapshot)
  defp put_embed_snapshot(changeset, _snapshot), do: add_error(changeset, :embed_snapshot, "is invalid")

  @spec preview(t(), [Attachment.t()]) :: String.t()
  def preview(%__MODULE__{body: body}, _attachments) when is_binary(body),
    do: String.slice(body, 0, 200)

  def preview(%__MODULE__{embed_snapshot: %{"title" => title}}, _attachments),
    do: "Shared #{title}"

  def preview(_message, [_, _ | _] = attachments), do: "#{length(attachments)} attachments"
  def preview(_message, [%Attachment{content_type: "image/" <> _} | _]), do: "Photo"
  def preview(_message, [%Attachment{content_type: "video/" <> _} | _]), do: "Video"
  def preview(_message, [%Attachment{content_type: "audio/" <> _} | _]), do: "Voice note"
  def preview(_message, [_attachment | _]), do: "Attachment"

  @spec for_business(Ecto.Queryable.t(), String.t()) :: Ecto.Query.t()
  def for_business(query \\ __MODULE__, business_id),
    do: from(m in query, where: m.business_id == ^business_id)

  @spec for_ids(Ecto.Queryable.t(), [String.t()]) :: Ecto.Query.t()
  def for_ids(query \\ __MODULE__, ids), do: from(m in query, where: m.id in ^ids)

  @spec for_conversation(Ecto.Queryable.t(), String.t(), String.t()) :: Ecto.Query.t()
  def for_conversation(query \\ __MODULE__, business_id, conversation_id),
    do: from(m in for_business(query, business_id), where: m.conversation_id == ^conversation_id)

  @spec newest(Ecto.Queryable.t()) :: Ecto.Query.t()
  def newest(query \\ __MODULE__), do: from(m in query, order_by: [desc: m.inserted_at, desc: m.id])

  @spec unread_counts(Ecto.Queryable.t(), String.t(), [String.t()], :coach | :client) :: Ecto.Query.t()
  def unread_counts(query \\ __MODULE__, business_id, conversation_ids, reader) do
    {sender_type, cursor_field} =
      case reader do
        :coach -> {:client, :coach_last_read_at}
        :client -> {:coach, :client_last_read_at}
      end

    from(m in for_business(query, business_id),
      join: conversation in Conversation,
      on: conversation.id == m.conversation_id and conversation.business_id == m.business_id,
      where:
        m.conversation_id in ^conversation_ids and
          m.sender_type == ^sender_type and
          (is_nil(field(conversation, ^cursor_field)) or
             m.inserted_at > field(conversation, ^cursor_field)),
      group_by: m.conversation_id,
      select: {m.conversation_id, count(m.id)}
    )
  end

  @spec before_message(Ecto.Queryable.t(), t()) :: Ecto.Query.t()
  def before_message(query \\ __MODULE__, %__MODULE__{} = cursor) do
    from(m in query,
      where:
        m.inserted_at < ^cursor.inserted_at or
          (m.inserted_at == ^cursor.inserted_at and m.id < ^cursor.id)
    )
  end

  @spec include_attachments(Ecto.Queryable.t()) :: Ecto.Query.t()
  def include_attachments(query \\ __MODULE__) do
    from(message in query,
      left_join: link in MessageAttachment,
      on: link.chat_message_id == message.id and link.business_id == message.business_id,
      left_join: attachment in Attachment,
      on: attachment.id == link.attachment_id and attachment.business_id == message.business_id,
      order_by: [asc: link.position],
      preload: [attachments: attachment]
    )
  end

  @spec include_sender(Ecto.Queryable.t()) :: Ecto.Query.t()
  def include_sender(query \\ __MODULE__) do
    from(message in query,
      left_join: coach in Easy.Orgs.Coach,
      on: message.sender_type == :coach and coach.id == message.sender_id and coach.business_id == message.business_id,
      left_join: client in Easy.Clients.Client,
      on: message.sender_type == :client and client.id == message.sender_id and client.business_id == message.business_id,
      select_merge: %{
        sender_name:
          fragment(
            "COALESCE(?, ?, ?, ?, ?::text)",
            coach.preferred_name,
            coach.full_name,
            client.preferred_name,
            client.full_name,
            message.sender_type
          )
      }
    )
  end
end
