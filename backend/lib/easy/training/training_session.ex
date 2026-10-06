defmodule Easy.Training.TrainingSession do
  use Ecto.Schema
  import Ecto.Changeset
  import Ecto.Query
  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id
  @type t :: %__MODULE__{}
  schema "training_sessions" do
    belongs_to :business, Easy.Orgs.Business
    belongs_to :client, Easy.Clients.Client
    belongs_to :plan_revision, Easy.Plans.Revision
    field :workout_id, :binary_id
    field :schedule_entry_id, :binary_id
    field :occurrence_date, :date
    field :local_date, :date
    field :timezone, :string
    field :recorded_by_type, Ecto.Enum, values: [:client, :coach], default: :client
    field :recorded_by_id, :binary_id
    field :request_id, :binary_id
    field :revision, :integer, default: 1
    field :state, Ecto.Enum, values: [:active, :completed, :discarded], default: :active
    field :started_at, :utc_datetime
    field :ended_at, :utc_datetime
    field :notes, :string
    field :prescription, :map, virtual: true
    has_many :performed_sets, Easy.Training.TrainingPerformedSet, foreign_key: :session_id
    timestamps(type: :utc_datetime)
  end

  @spec insert_changeset(String.t(), String.t(), {:client | :coach, String.t()}, map()) :: Ecto.Changeset.t()
  def insert_changeset(business_id, client_id, {actor_type, actor_id}, attrs) do
    %__MODULE__{}
    |> cast(attrs, [
      :request_id,
      :plan_revision_id,
      :workout_id,
      :schedule_entry_id,
      :occurrence_date,
      :local_date,
      :timezone,
      :started_at,
      :notes
    ])
    |> put_change(:business_id, business_id)
    |> put_change(:client_id, client_id)
    |> put_change(:recorded_by_type, actor_type)
    |> put_change(:recorded_by_id, actor_id)
    |> validate_required([:local_date, :timezone, :started_at])
    |> unique_constraint(:client_id, name: :training_sessions_one_active)
    |> unique_constraint(:request_id, name: :training_sessions_client_id_request_id_key)
    |> foreign_key_constraint(:plan_revision_id, name: :training_sessions_plan_revision_id_domain_fkey)
  end

  @spec update_changeset(t(), map()) :: Ecto.Changeset.t()
  def update_changeset(row, attrs),
    do:
      row
      |> cast(attrs, [:local_date, :notes])
      |> put_change(:revision, row.revision + 1)
      |> validate_required([:local_date])

  @spec for_client(Ecto.Queryable.t(), String.t(), String.t()) :: Ecto.Query.t()
  def for_client(query \\ __MODULE__, business_id, client_id),
    do: from(s in query, where: s.business_id == ^business_id and s.client_id == ^client_id)
end
