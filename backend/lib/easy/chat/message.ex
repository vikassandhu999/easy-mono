defmodule Easy.Chat.Message do
  use Ecto.Schema

  alias Easy.Chat.Conversation

  import Ecto.Changeset
  import Ecto.Query

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  @type t :: %__MODULE__{}

  schema "chat_messages" do
    field :body, :string
    field :sender_type, Ecto.Enum, values: [:coach, :client]
    field :sender_id, :binary_id

    belongs_to :conversation, Conversation

    timestamps(type: :utc_datetime_usec)
  end

  @spec insert_changeset(String.t(), :coach | :client, String.t(), map()) :: Ecto.Changeset.t()
  def insert_changeset(conversation_id, sender_type, sender_id, attrs) do
    %__MODULE__{}
    |> cast(attrs, [:body])
    |> put_change(:conversation_id, conversation_id)
    |> put_change(:sender_type, sender_type)
    |> put_change(:sender_id, sender_id)
    |> validate_required([:body, :conversation_id, :sender_type, :sender_id])
    |> validate_length(:body, max: 4000)
  end

  @spec for_conversation(Ecto.Queryable.t(), String.t()) :: Ecto.Query.t()
  def for_conversation(query \\ __MODULE__, conversation_id),
    do: from(m in query, where: m.conversation_id == ^conversation_id)

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
end
