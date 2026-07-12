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
      join_keys: [chat_message_id: :id, attachment_id: :id],
      preload_order: {__MODULE__, :attachment_preload_order, []}

    timestamps(type: :utc_datetime_usec)
  end

  @spec insert_changeset(String.t(), String.t(), :coach | :client, String.t(), map()) ::
          Ecto.Changeset.t()
  def insert_changeset(business_id, conversation_id, sender_type, sender_id, attrs) do
    business_id
    |> insert_changeset(conversation_id, sender_type, sender_id, nil, attrs)
    |> validate_required([:body])
  end

  @spec insert_changeset(String.t(), String.t(), :coach | :client, String.t(), map() | nil, map()) ::
          Ecto.Changeset.t()
  def insert_changeset(business_id, conversation_id, sender_type, sender_id, embed, attrs) do
    %__MODULE__{}
    |> cast(attrs, [:body])
    |> put_change(:business_id, business_id)
    |> put_change(:conversation_id, conversation_id)
    |> put_change(:sender_type, sender_type)
    |> put_change(:sender_id, sender_id)
    |> put_embed(embed)
    |> validate_required([:business_id, :conversation_id, :sender_type, :sender_id])
    |> validate_length(:body, max: 4000)
  end

  defp put_embed(changeset, nil), do: changeset

  defp put_embed(changeset, %{type: type, id: id, snapshot: snapshot}) do
    changeset
    |> put_change(:embed_type, type)
    |> put_change(:embed_id, id)
    |> put_change(:embed_snapshot, snapshot)
  end

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
    from(message in query, preload: [:attachments])
  end

  @spec attachment_preload_order() :: keyword()
  def attachment_preload_order do
    [asc: dynamic([..., link], link.position)]
  end
end
