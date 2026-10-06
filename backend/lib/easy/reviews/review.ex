defmodule Easy.Reviews.Review do
  use Ecto.Schema
  import Ecto.Changeset
  import Ecto.Query
  alias Easy.Clients.Client
  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id
  @type t :: %__MODULE__{}
  schema "reviews" do
    field(:business_id, :binary_id)
    field(:client_id, :binary_id)
    belongs_to(:coach, Easy.Orgs.Coach)
    field(:reviewed_at, :utc_datetime_usec)
    field(:reviewed_through_seq, :integer)
    field(:seen_at, :utc_datetime_usec)
    field(:snapshot_key, :string)
    field(:request_fingerprint, :string)
    field(:assessment, Ecto.Enum, values: [:on_track, :needs_attention, :at_risk])
    field(:private_note, :string)
    belongs_to(:reply_message, Easy.Chat.Message)
    timestamps(type: :utc_datetime)
  end

  @spec insert_changeset(String.t(), String.t(), String.t(), map(), map()) :: Ecto.Changeset.t()
  def insert_changeset(business_id, coach_id, client_id, snapshot, attrs) do
    %__MODULE__{}
    |> update_changeset(attrs)
    |> put_change(:business_id, business_id)
    |> put_change(:coach_id, coach_id)
    |> put_change(:client_id, client_id)
    |> put_change(:reviewed_at, snapshot.reviewed_at)
    |> put_change(:reviewed_through_seq, snapshot.seq)
    |> put_change(:seen_at, snapshot.seen_at)
    |> foreign_key_constraint(:client_id)
    |> foreign_key_constraint(:coach_id)
    |> foreign_key_constraint(:business_id)
  end

  @spec update_changeset(t(), map()) :: Ecto.Changeset.t()
  def update_changeset(row, attrs) do
    row
    |> cast(attrs, [:assessment, :private_note])
    |> validate_required([:assessment])
    |> validate_length(:private_note, max: 10_000)
    |> check_constraint(:assessment, name: :reviews_assessment_check)
  end

  @spec for_client(Ecto.Queryable.t(), String.t(), String.t()) :: Ecto.Query.t()
  def for_client(query \\ __MODULE__, business_id, client_id),
    do: from(r in query, where: r.business_id == ^business_id and r.client_id == ^client_id)

  @spec newest(Ecto.Queryable.t()) :: Ecto.Query.t()
  def newest(query \\ __MODULE__), do: from(r in query, order_by: [desc: r.reviewed_at, desc: r.id])
  @spec current_review(Client.t(), t() | nil) :: t() | nil
  def current_review(%{current_term: nil}, _), do: nil
  def current_review(_, nil), do: nil

  def current_review(client, review) do
    date = Client.local_date(client, review.reviewed_at)
    if Date.compare(date, client.current_term.starts_on) != :lt, do: review
  end

  @spec due(Client.t(), t() | nil, Date.t()) :: map()
  def due(%{current_term: nil}, _, _), do: %{due: false, due_on: nil, overdue_days: 0, last_reviewed_at: nil}

  def due(client, review, today) do
    current = current_review(client, review)

    date =
      if current,
        do: Date.add(Client.local_date(client, current.reviewed_at), client.review_frequency_days),
        else: client.current_term.starts_on

    %{
      due: Date.compare(today, date) != :lt,
      due_on: date,
      overdue_days: max(Date.diff(today, date), 0),
      last_reviewed_at: current && current.reviewed_at
    }
  end
end
