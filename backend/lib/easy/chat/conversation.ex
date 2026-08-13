defmodule Easy.Chat.Conversation do
  use Ecto.Schema

  alias Easy.Chat.Message
  alias Easy.Clients.Client
  alias Easy.Ctx
  alias Easy.Orgs

  import Ecto.Changeset
  import Ecto.Query

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  @type t :: %__MODULE__{}

  schema "conversations" do
    field :last_message_at, :utc_datetime_usec
    field :last_message_preview, :string
    field :last_message_role, Ecto.Enum, values: [:coach, :client]
    field :waiting_since, :utc_datetime_usec
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

  @spec waiting(Ecto.Queryable.t()) :: Ecto.Query.t()
  def waiting(query \\ __MODULE__), do: from(c in query, where: not is_nil(c.waiting_since))

  @spec for_visible_clients(Ecto.Queryable.t(), Ctx.t()) :: Ecto.Query.t()
  def for_visible_clients(query \\ __MODULE__, ctx)
  def for_visible_clients(query, %Ctx{owner?: true}), do: query

  def for_visible_clients(query, %Ctx{coach_id: coach_id}) when not is_nil(coach_id) do
    from(conversation in query,
      join: client in Client,
      on:
        client.id == conversation.client_id and
          client.business_id == conversation.business_id and
          client.assigned_coach_id == ^coach_id
    )
  end

  def for_visible_clients(query, %Ctx{}), do: from(conversation in query, where: false)

  @spec for_client_search(Ecto.Queryable.t(), String.t() | nil) :: Ecto.Query.t()
  def for_client_search(query \\ __MODULE__, term)
  def for_client_search(query, nil), do: query
  def for_client_search(query, ""), do: query

  def for_client_search(query, term) do
    pattern = Easy.Search.like_pattern(term)

    from(c in query,
      join: client in assoc(c, :client),
      where:
        ilike(fragment("concat_ws(' ', ?, ?)", client.first_name, client.last_name), ^pattern) or
          ilike(client.email, ^pattern) or
          ilike(client.phone, ^pattern)
    )
  end

  @spec recent(Ecto.Queryable.t()) :: Ecto.Query.t()
  def recent(query \\ __MODULE__),
    do: from(c in query, order_by: [desc_nulls_last: c.last_message_at, desc: c.inserted_at, desc: c.id])

  # The Replies queue order: longest-waiting first.
  @spec oldest(Ecto.Queryable.t()) :: Ecto.Query.t()
  def oldest(query \\ __MODULE__),
    do: from(c in query, order_by: [asc: c.waiting_since, asc: c.id])

  @spec include_client(Ecto.Queryable.t()) :: Ecto.Query.t()
  def include_client(query \\ __MODULE__), do: from(c in query, preload: [:client])
end
