defmodule Easy.Threads.ThreadMessage do
  use Ecto.Schema

  alias Easy.Threads.Thread

  import Ecto.Changeset
  import Ecto.Query

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  @type t :: %__MODULE__{}

  schema "thread_messages" do
    field :body, :string
    field :kind, :string, default: "message"
    field :author_type, Ecto.Enum, values: [:coach, :client, :system]
    field :author_id, :binary_id
    field :metadata, :map, default: %{}

    belongs_to :thread, Thread

    timestamps(type: :utc_datetime)
  end

  @spec insert_changeset(String.t(), %{type: String.t(), id: String.t() | nil}, map()) ::
          Ecto.Changeset.t()
  def insert_changeset(thread_id, author, attrs) do
    %__MODULE__{}
    |> cast(attrs, [:body, :kind])
    |> put_change(:thread_id, thread_id)
    |> put_change(:author_type, String.to_existing_atom(author.type))
    |> put_change(:author_id, author.id)
    |> validate_required([:body, :thread_id, :author_type])
  end

  @spec for_thread(Ecto.Queryable.t(), String.t()) :: Ecto.Query.t()
  def for_thread(query \\ __MODULE__, thread_id),
    do: from(m in query, where: m.thread_id == ^thread_id)

  @spec oldest(Ecto.Queryable.t()) :: Ecto.Query.t()
  def oldest(query \\ __MODULE__), do: from(m in query, order_by: [asc: m.inserted_at])
end
