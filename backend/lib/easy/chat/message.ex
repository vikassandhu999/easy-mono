defmodule Easy.Chat.Message do
  use Ecto.Schema

  alias Easy.Attachments.Attachment
  alias Easy.Chat.Conversation
  alias Easy.Chat.MessageAttachment
  alias Easy.Orgs.Business

  import Ecto.Changeset
  import Ecto.Query

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  @type t :: %__MODULE__{}

  schema "chat_messages" do
    field :body, :string
    field :embed_type, Ecto.Enum, values: [:form_submission]
    field :embed_id, :binary_id
    field :embed_snapshot, :map
    field :sender_type, Ecto.Enum, values: [:coach, :client]
    field :sender_id, :binary_id

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
    business_id
    |> insert_changeset(sender_type, sender_id, conversation_id, nil, attrs)
    |> validate_required([:body])
  end

  @spec insert_changeset(String.t(), :coach | :client, String.t(), String.t(), map() | nil, map()) ::
          Ecto.Changeset.t()
  def insert_changeset(business_id, sender_type, sender_id, conversation_id, embed, attrs) do
    %__MODULE__{}
    |> cast(attrs, [:body])
    |> put_change(:business_id, business_id)
    |> put_change(:conversation_id, conversation_id)
    |> put_change(:sender_type, sender_type)
    |> put_change(:sender_id, sender_id)
    |> put_embed(embed)
    |> validate_required([:business_id, :conversation_id, :sender_type, :sender_id])
    |> validate_length(:body, max: 4000)
    |> check_constraint(:embed_type, name: :chat_messages_embed_type_check)
    |> check_constraint(:embed_id, name: :chat_messages_embed_complete_check)
  end

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

  @spec for_conversation(Ecto.Queryable.t(), String.t(), String.t()) :: Ecto.Query.t()
  def for_conversation(query \\ __MODULE__, business_id, conversation_id),
    do: from(m in query, where: m.business_id == ^business_id and m.conversation_id == ^conversation_id)

  @spec newest(Ecto.Queryable.t()) :: Ecto.Query.t()
  def newest(query \\ __MODULE__), do: from(m in query, order_by: [desc: m.inserted_at, desc: m.id])

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
end
