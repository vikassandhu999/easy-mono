defmodule Easy.Chat.Conversation do
  use Ecto.Schema

  alias Easy.Chat.Message
  alias Easy.Clients.Client
  alias Easy.Orgs

  import Ecto.Changeset
  import Ecto.Query

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  @type t :: %__MODULE__{}

  schema "conversations" do
    field :last_message_at, :utc_datetime_usec
    field :last_message_preview, :string
    # ponytail: shared read cursor per side — any coach reading marks the whole
    # team's side read; upgrade path is a per-coach read table if it ever matters.
    field :coach_last_read_at, :utc_datetime_usec
    field :client_last_read_at, :utc_datetime_usec
    field :unread_count, :integer, virtual: true

    belongs_to :business, Orgs.Business
    belongs_to :client, Client
    has_many :messages, Message

    timestamps(type: :utc_datetime)
  end

  @spec insert_changeset(String.t(), String.t()) :: Ecto.Changeset.t()
  def insert_changeset(business_id, client_id) do
    %__MODULE__{}
    |> change()
    |> put_change(:business_id, business_id)
    |> put_change(:client_id, client_id)
    |> unique_constraint([:business_id, :client_id])
  end

  @spec for_business(Ecto.Queryable.t(), String.t()) :: Ecto.Query.t()
  def for_business(query \\ __MODULE__, business_id),
    do: from(c in query, where: c.business_id == ^business_id)

  @spec for_client(Ecto.Queryable.t(), String.t(), String.t()) :: Ecto.Query.t()
  def for_client(query \\ __MODULE__, business_id, client_id),
    do: from(c in query, where: c.business_id == ^business_id and c.client_id == ^client_id)

  @spec recent(Ecto.Queryable.t()) :: Ecto.Query.t()
  def recent(query \\ __MODULE__),
    do: from(c in query, order_by: [desc_nulls_last: c.last_message_at, desc: c.inserted_at])

  @spec include_client(Ecto.Queryable.t()) :: Ecto.Query.t()
  def include_client(query \\ __MODULE__), do: from(c in query, preload: [:client])

  @spec select_coach_unread(Ecto.Queryable.t()) :: Ecto.Query.t()
  def select_coach_unread(query \\ __MODULE__) do
    from(c in query,
      select_merge: %{
        unread_count:
          fragment(
            "(SELECT count(*)::int FROM chat_messages m WHERE m.conversation_id = ? AND m.sender_type = 'client' AND (? IS NULL OR m.inserted_at > ?))",
            c.id,
            c.coach_last_read_at,
            c.coach_last_read_at
          )
      }
    )
  end

  @spec select_client_unread(Ecto.Queryable.t()) :: Ecto.Query.t()
  def select_client_unread(query \\ __MODULE__) do
    from(c in query,
      select_merge: %{
        unread_count:
          fragment(
            "(SELECT count(*)::int FROM chat_messages m WHERE m.conversation_id = ? AND m.sender_type = 'coach' AND (? IS NULL OR m.inserted_at > ?))",
            c.id,
            c.client_last_read_at,
            c.client_last_read_at
          )
      }
    )
  end
end
