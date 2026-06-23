defmodule Easy.Threads.Thread do
  use Ecto.Schema

  alias Easy.Clients.Client
  alias Easy.Orgs
  alias Easy.Threads.ThreadMessage
  alias Easy.Utils

  import Ecto.Changeset
  import Ecto.Query

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  @type t :: %__MODULE__{}

  schema "threads" do
    field :module, Ecto.Enum, values: [:nutrition, :training, :fitness, :profile, :general]
    field :subject_type, :string, default: "general"
    field :subject_ref, :map, default: %{}
    field :title, :string
    field :status, Ecto.Enum, values: [:open, :resolved, :archived], default: :open
    field :priority, Ecto.Enum, values: [:normal, :attention], default: :normal
    field :last_message_at, :utc_datetime
    field :last_message_preview, :string
    field :created_by_type, Ecto.Enum, values: [:coach, :client, :system]
    field :created_by_id, :binary_id

    belongs_to :business, Orgs.Business
    belongs_to :client, Client
    has_many :messages, ThreadMessage

    timestamps(type: :utc_datetime)
  end

  @spec insert_changeset(String.t(), String.t(), %{type: String.t(), id: String.t() | nil}, map()) ::
          Ecto.Changeset.t()
  def insert_changeset(business_id, client_id, creator, attrs) do
    %__MODULE__{}
    |> cast(attrs, [:module, :subject_type, :subject_ref, :title, :priority])
    |> put_change(:business_id, business_id)
    |> put_change(:client_id, client_id)
    |> put_change(:created_by_type, Utils.safe_to_atom(creator.type, ~w(coach client system)))
    |> put_change(:created_by_id, creator.id)
    |> validate_required([:module, :business_id, :client_id, :created_by_type])
  end

  @spec update_changeset(t(), map()) :: Ecto.Changeset.t()
  def update_changeset(thread, attrs) do
    thread
    |> cast(attrs, [:status, :priority, :title])
  end

  @spec for_business(Ecto.Queryable.t(), String.t()) :: Ecto.Query.t()
  def for_business(query \\ __MODULE__, business_id),
    do: from(t in query, where: t.business_id == ^business_id)

  @spec for_client(Ecto.Queryable.t(), String.t(), String.t()) :: Ecto.Query.t()
  def for_client(query \\ __MODULE__, business_id, client_id),
    do: from(t in query, where: t.business_id == ^business_id and t.client_id == ^client_id)

  @spec for_module(Ecto.Queryable.t(), atom() | nil) :: Ecto.Query.t()
  def for_module(query \\ __MODULE__, module)
  def for_module(query, nil), do: query
  def for_module(query, module), do: from(t in query, where: t.module == ^module)

  @spec for_status(Ecto.Queryable.t(), atom() | nil) :: Ecto.Query.t()
  def for_status(query \\ __MODULE__, status)
  def for_status(query, nil), do: query
  def for_status(query, status), do: from(t in query, where: t.status == ^status)

  @spec for_priority(Ecto.Queryable.t(), atom() | nil) :: Ecto.Query.t()
  def for_priority(query \\ __MODULE__, priority)
  def for_priority(query, nil), do: query
  def for_priority(query, priority), do: from(t in query, where: t.priority == ^priority)

  @spec recent(Ecto.Queryable.t()) :: Ecto.Query.t()
  def recent(query \\ __MODULE__) do
    from(t in query, order_by: [desc_nulls_last: t.last_message_at, desc: t.inserted_at])
  end

  @spec include_messages(Ecto.Queryable.t()) :: Ecto.Query.t()
  def include_messages(query \\ __MODULE__) do
    from(t in query, preload: [messages: ^ThreadMessage.oldest()])
  end
end
