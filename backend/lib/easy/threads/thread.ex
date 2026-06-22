defmodule Easy.Threads.Thread do
  use Ecto.Schema

  alias Easy.Clients.Client
  alias Easy.Orgs
  alias Easy.Threads.ThreadMessage

  import Ecto.Changeset
  import Ecto.Query

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  @modules ~w(nutrition training fitness profile general)
  @statuses ~w(open resolved archived)
  @priorities ~w(normal attention)
  @actor_types ~w(coach client system)

  @type t :: %__MODULE__{}

  @spec modules() :: [String.t()]
  def modules, do: @modules

  @spec statuses() :: [String.t()]
  def statuses, do: @statuses

  @spec priorities() :: [String.t()]
  def priorities, do: @priorities

  schema "threads" do
    field :module, :string
    field :subject_type, :string, default: "general"
    field :subject_ref, :map, default: %{}
    field :title, :string
    field :status, :string, default: "open"
    field :priority, :string, default: "normal"
    field :last_message_at, :utc_datetime
    field :last_message_preview, :string
    field :created_by_type, :string
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
    |> put_change(:created_by_type, creator.type)
    |> put_change(:created_by_id, creator.id)
    |> validate_required([:module, :business_id, :client_id, :created_by_type])
    |> validate_inclusion(:module, @modules)
    |> validate_inclusion(:priority, @priorities)
    |> validate_inclusion(:created_by_type, @actor_types)
  end

  @spec update_changeset(t(), map()) :: Ecto.Changeset.t()
  def update_changeset(thread, attrs) do
    thread
    |> cast(attrs, [:status, :priority, :title])
    |> validate_inclusion(:status, @statuses)
    |> validate_inclusion(:priority, @priorities)
  end

  @spec for_business(Ecto.Queryable.t(), String.t()) :: Ecto.Query.t()
  def for_business(query \\ __MODULE__, business_id),
    do: from(t in query, where: t.business_id == ^business_id)

  @spec for_client(Ecto.Queryable.t(), String.t()) :: Ecto.Query.t()
  def for_client(query \\ __MODULE__, client_id),
    do: from(t in query, where: t.client_id == ^client_id)

  @spec with_module(Ecto.Queryable.t(), String.t() | nil) :: Ecto.Query.t()
  def with_module(query \\ __MODULE__, module)
  def with_module(query, nil), do: query
  def with_module(query, module), do: from(t in query, where: t.module == ^module)

  @spec with_status(Ecto.Queryable.t(), String.t() | nil) :: Ecto.Query.t()
  def with_status(query \\ __MODULE__, status)
  def with_status(query, nil), do: query
  def with_status(query, status), do: from(t in query, where: t.status == ^status)

  @spec with_priority(Ecto.Queryable.t(), String.t() | nil) :: Ecto.Query.t()
  def with_priority(query \\ __MODULE__, priority)
  def with_priority(query, nil), do: query
  def with_priority(query, priority), do: from(t in query, where: t.priority == ^priority)

  @spec recent(Ecto.Queryable.t()) :: Ecto.Query.t()
  def recent(query \\ __MODULE__) do
    from(t in query, order_by: [desc_nulls_last: t.last_message_at, desc: t.inserted_at])
  end

  @spec with_messages(Ecto.Queryable.t()) :: Ecto.Query.t()
  def with_messages(query \\ __MODULE__) do
    from(t in query, preload: [messages: ^ThreadMessage.ordered()])
  end
end
